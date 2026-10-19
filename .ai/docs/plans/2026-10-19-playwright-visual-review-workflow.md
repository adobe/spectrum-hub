# Playwright Visual Review Workflow Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add browser-based Playwright visual-diff review and targeted Linux baseline updates without introducing BackstopJS or an external review service.

**Architecture:** A small Node command validates the requested suite and action, then runs the repository in the same pinned Playwright Docker image used by CI. Review mode opens Playwright UI mode for expected, actual, and diff inspection. Approval mode requires an explicit Playwright filter and reruns only that selection with `--update-snapshots`; Git review remains the final approval boundary.

**Tech Stack:** Node.js 20, Playwright Test 1.62.1, Docker, the pinned `mcr.microsoft.com/playwright:v1.62.1-noble` image, Node's built-in test runner.

**Design spec:** `.ai/docs/specs/2026-09-17-playwright-visual-regression-testing-design.md`

---

## File structure

- Create `test/visual/review-command.js` for argument validation and deterministic Docker argument construction.
- Create `test/visual/review.js` as the executable entry point that invokes Docker and preserves its exit status.
- Create `test/visual/review-command.node.test.js` for validation, command construction, and safety tests without requiring Docker.
- Modify `package.json` to expose separate local and deployed review and approval commands.
- Modify `test/visual/README.md` to document the browser review flow, targeted approval, rejection, prerequisites, and CI fallback.
- Modify `.ai/docs/plans/2026-09-17-playwright-visual-regression-testing.md` to record the post-rollout review workflow amendment.

The command module must not contain screenshot comparison logic. Playwright remains responsible for running tests, generating attachments, and updating snapshots.

### Task 1: Define and test the command contract

**Files:**
- Create: `test/visual/review-command.js`
- Create: `test/visual/review-command.node.test.js`

- [ ] **Step 1: Write failing tests for valid review commands**

Add tests that import `buildVisualCommand()` and verify:

```js
const command = buildVisualCommand({
  action: 'review',
  suite: 'local',
  forwardedArgs: ['test/visual/blocks/card.spec.js', '--project=desktop-light'],
  cwd: '/repo',
  env: {},
});

assert.equal(command.executable, 'docker');
assert.deepEqual(command.args.slice(0, 4), [
  'run',
  '--rm',
  '--ipc=host',
  '--init',
]);
assert.ok(command.args.includes('127.0.0.1:9323:9323'));
assert.ok(command.args.includes('playwright.visual.config.js'));
assert.ok(command.args.includes('--ui'));
assert.ok(command.args.includes('--ui-host=0.0.0.0'));
assert.ok(command.args.includes('--ui-port=9323'));
assert.ok(command.args.includes('--update-snapshots=none'));
assert.ok(command.args.includes('test/visual/blocks/card.spec.js'));
assert.ok(command.args.includes('--project=desktop-light'));
```

Add a deployed review case that verifies:

- `playwright.visual.deployed.config.js` is selected.
- `VISUAL_BASE_URL` is passed to Docker.
- The URL value is not interpolated into a shell command.

- [ ] **Step 2: Write failing tests for targeted approval**

Verify that approval:

- Includes `--update-snapshots`.
- Preserves file, title, and project filters as separate arguments.
- Does not include UI mode or publish port `9323`.
- Rejects an empty filter list or a list containing only options such as `--project` or `--workers` with:

```text
Visual baseline approval requires a test file or title filter.
```

- Accepts a positional test-file argument, `-g <pattern>`, `--grep <pattern>`, or `--grep=<pattern>` as an approval target.

- [ ] **Step 3: Write failing tests for invalid input**

Cover:

- Unknown actions.
- Unknown suites.
- Missing deployed `VISUAL_BASE_URL`.
- Relative, non-HTTP, and malformed deployed URLs.
- Wrapper-owned Playwright options: `--config`, `-c`, `--update-snapshots`, `--ui`, `--ui-host`, `--ui-port`, and their `=<value>` forms.
- Project-only and worker-only approval arguments.
- A nonnumeric or out-of-range `PLAYWRIGHT_UI_PORT`, if the implementation supports overriding the default port.

Expected: each case throws a specific `Error`; no case silently falls back to the local suite or production.

- [ ] **Step 4: Run the focused tests and confirm failure**

Run:

```bash
node --test test/visual/review-command.node.test.js
```

Expected: FAIL because `review-command.js` does not exist or does not export the required function.

- [ ] **Step 5: Implement the command builder**

Export:

```js
export const PLAYWRIGHT_IMAGE = 'mcr.microsoft.com/playwright:v1.62.1-noble';
export const DEFAULT_UI_PORT = 9323;

export function buildVisualCommand({
  action,
  suite,
  forwardedArgs,
  cwd,
  env,
}) {
  // Validate input, select the config, and return:
  // { executable: 'docker', args: [...] }
}
```

Use a fixed shell program only to install dependencies and then execute Playwright:

```bash
npm ci --quiet && exec npx playwright test "$@"
```

Pass the Playwright options after the shell's positional-argument marker. Never concatenate user-supplied filters or `VISUAL_BASE_URL` into the shell program.

The Docker arguments must:

- Remove the container after exit.
- Use `--ipc=host` and `--init`.
- Mount the repository at `/work`.
- Mount an anonymous volume at `/work/node_modules` so host dependencies are not reused.
- Set `/work` as the working directory.
- Publish the selected UI port only in review mode and bind it to `127.0.0.1`, for example `127.0.0.1:9323:9323`.
- Pass `VISUAL_BASE_URL` only for the deployed suite.
- Use the exact image pinned by the visual GitHub Actions workflows.
- Force `--update-snapshots=none` in review mode so opening the UI cannot create or replace baselines.
- Reject wrapper-owned options before building Docker arguments so forwarded arguments cannot change the selected config, snapshot mode, UI host, or UI port.

Approval targeting must be semantic rather than based only on a nonempty argument list. Require at least one positional test-file filter or a complete `-g` or `--grep` title filter. A project, worker count, or reporter option may narrow an existing target but is not a target by itself.

Assert the complete Docker argument order in tests. Include a title filter containing spaces and shell metacharacters to prove filters remain separate positional arguments.

- [ ] **Step 6: Run the focused tests**

Run:

```bash
node --test test/visual/review-command.node.test.js
```

Expected: PASS.

- [ ] **Step 7: Run lint on the new module and tests**

Run:

```bash
npx eslint test/visual/review-command.js test/visual/review-command.node.test.js
```

Expected: PASS.

- [ ] **Step 8: Prepare a review checkpoint**

Stage only:

```bash
git add test/visual/review-command.js test/visual/review-command.node.test.js
```

Do not commit unless the user explicitly requests a commit.

### Task 2: Add the executable wrapper and npm commands

**Files:**
- Create: `test/visual/review.js`
- Modify: `package.json`
- Modify: `test/visual/review-command.node.test.js`

- [ ] **Step 1: Write failing CLI behavior tests**

Test an exported `runVisualCommand()` with an injected process runner so the tests do not require Docker:

```js
const calls = [];
const status = runVisualCommand(options, {
  spawn(command, args, spawnOptions) {
    calls.push({ command, args, spawnOptions });
    return { status: 0 };
  },
});

assert.equal(status, 0);
assert.equal(calls.length, 1);
assert.equal(calls[0].command, 'docker');
assert.equal(calls[0].spawnOptions.stdio, 'inherit');
```

Add cases for:

- Docker returning a nonzero status.
- Docker failing to start.
- A direct CLI call printing the validation error and exiting nonzero.

- [ ] **Step 2: Run the focused tests and confirm failure**

Run:

```bash
node --test test/visual/review-command.node.test.js
```

Expected: FAIL because the runner or CLI entry point is missing.

- [ ] **Step 3: Implement the runner**

`runVisualCommand()` must call `spawnSync()` with inherited standard streams. It must:

- Return Docker's exact numeric exit status.
- Throw an explicit error when Docker cannot start.
- Never convert a failed comparison or failed baseline update into success.

- [ ] **Step 4: Implement the CLI entry point**

`test/visual/review.js` parses:

```text
node test/visual/review.js <review|approve> <local|deployed> [Playwright filters...]
```

On validation or Docker startup failure, print the error to standard error and set `process.exitCode = 1`. Do not catch successful Playwright output or replace it with a custom summary.

- [ ] **Step 5: Add npm scripts**

Add:

```json
"test:visual:review": "node test/visual/review.js review local",
"test:visual:approve": "node test/visual/review.js approve local",
"test:visual:deployed:review": "node test/visual/review.js review deployed",
"test:visual:deployed:approve": "node test/visual/review.js approve deployed"
```

Callers forward filters after `--`, for example:

```bash
npm run test:visual:approve -- \
  test/visual/blocks/card.spec.js \
  --project=desktop-light
```

- [ ] **Step 6: Run unit tests and lint**

Run:

```bash
npm run test:visual:unit
npx eslint test/visual/review.js test/visual/review-command.js test/visual/review-command.node.test.js
```

Expected: 28 or more visual unit tests pass, with zero failures; ESLint passes.

- [ ] **Step 7: Verify command discovery without running Docker**

Run:

```bash
npm run | grep 'test:visual:.*review\|test:visual:.*approve'
```

Expected: all four new scripts are listed.

- [ ] **Step 8: Prepare a review checkpoint**

Stage only:

```bash
git add package.json test/visual/review.js test/visual/review-command.js test/visual/review-command.node.test.js
```

Do not commit unless the user explicitly requests a commit.

### Task 3: Verify the local browser review and approval flow

**Files:**
- Modify if required by a failing test: `test/visual/review-command.js`
- Modify if required by a failing test: `test/visual/review.js`

- [ ] **Step 1: Verify Docker is available**

Run:

```bash
docker version
```

Expected: the client can reach the Docker daemon.

If Docker is unavailable, stop this task and report the blocker. Unit tests can still pass, but the interactive workflow is not verified.

- [ ] **Step 2: Start local review mode**

First verify that the fixture is unchanged:

```bash
git diff --quiet -- test/a11y/fixtures/card.html
```

Expected: PASS. Stop if the fixture already has changes.

Create a controlled mismatch while preserving the original file:

```bash
cp test/a11y/fixtures/card.html test/a11y/fixtures/card.html.vrt-review-backup
node --input-type=module --eval "
  import { readFileSync, writeFileSync } from 'node:fs';
  const path = 'test/a11y/fixtures/card.html';
  const source = readFileSync(path, 'utf8');
  writeFileSync(path, source.replace('Card heading', 'Changed card heading'));
"
```

Confirm the only temporary source change is the heading:

```bash
git diff -- test/a11y/fixtures/card.html
```

Then run:

```bash
npm run test:visual:review -- \
  test/visual/blocks/card.spec.js \
  --project=desktop-light
```

Expected:

- The container installs dependencies.
- Playwright UI is available at `http://127.0.0.1:9323`.
- The card test appears in the UI.
- Running the test displays expected, actual, and diff attachments for the controlled mismatch.
- Review mode does not modify any `*-snapshots/` file.

- [ ] **Step 3: Stop review mode cleanly**

Stop the command with `Ctrl+C`.

Expected: the Docker container exits and is removed.

Restore the exact fixture immediately:

```bash
cp test/a11y/fixtures/card.html.vrt-review-backup test/a11y/fixtures/card.html
rm test/a11y/fixtures/card.html.vrt-review-backup
git diff --quiet -- test/a11y/fixtures/card.html
test ! -e test/a11y/fixtures/card.html.vrt-review-backup
```

Expected: PASS. Do not continue while the controlled mismatch remains.

- [ ] **Step 4: Verify the approval guard**

Run:

```bash
npm run test:visual:approve
```

Expected: FAIL before Docker starts with the targeted-filter error.

Run:

```bash
npm run test:visual:approve -- --project=desktop-light
```

Expected: FAIL before Docker starts because a project is not a test-file or title target.

- [ ] **Step 5: Verify a targeted no-change approval**

Run:

```bash
npm run test:visual:approve -- \
  test/visual/blocks/card.spec.js \
  --project=desktop-light
```

Expected: PASS. No unrelated snapshot path changes.

- [ ] **Step 6: Verify deployed validation**

Run:

```bash
npm run test:visual:deployed:review
```

Expected: FAIL before Docker starts because `VISUAL_BASE_URL` is missing.

Do not run a deployed approval against production. Use a commit-specific preview only when one is available.

### Task 4: Document review, approval, and rejection

**Files:**
- Modify: `test/visual/README.md`
- Modify: `.ai/docs/plans/2026-09-17-playwright-visual-regression-testing.md`

- [ ] **Step 1: Update the baseline ownership language**

Replace statements that only GitHub Actions can produce committable baselines. State that the pinned Linux Playwright environment is authoritative whether it runs locally through Docker or in GitHub Actions.

- [ ] **Step 2: Document browser review**

Add the exact local command:

```bash
npm run test:visual:review
```

Explain:

- Open `http://127.0.0.1:9323`.
- Filter to failed tests.
- Use the expected, actual, diff, and overlay views.
- Stop the command when review is complete.

- [ ] **Step 3: Document targeted approval**

Add examples for a file and project:

```bash
npm run test:visual:approve -- \
  test/visual/blocks/card.spec.js \
  --project=desktop-light
```

Add a title-filter example:

```bash
npm run test:visual:approve -- \
  --grep='card default' \
  --project=desktop-light
```

State that approval updates only the selected Linux baselines. Require reviewers to inspect `git diff --stat`, the PNG changes, and the related implementation before committing.

- [ ] **Step 4: Document rejection**

State that rejection means leaving the baseline unchanged, fixing the implementation or nondeterminism, and rerunning the comparison. Do not describe baseline deletion or replacement as rejection.

- [ ] **Step 5: Document deployed commands**

Add:

```bash
VISUAL_BASE_URL=https://<commit-preview-host> \
  npm run test:visual:deployed:review
```

and a targeted deployed approval example. Preserve the requirements that the URL be commit-specific, the suite run one worker, and local and deployed snapshot directories remain separate.

- [ ] **Step 6: Preserve the workflow fallback**

Keep the manual GitHub Actions instructions for developers without Docker and for shared baseline artifacts. Clarify that the workflow and local container use the same pinned image.

- [ ] **Step 7: Record the amendment in the original implementation plan**

Add a completed or follow-up task describing:

- The four npm commands.
- The tested command builder and runner.
- The pinned-container review contract.
- The targeted approval guard.
- The updated documentation.

- [ ] **Step 8: Validate documentation formatting**

Run:

```bash
git diff --check
```

Expected: PASS.

### Task 5: Final verification

**Files:**
- Verify all changed files.

- [ ] **Step 1: Run the complete visual unit suite**

Run:

```bash
npm run test:visual:unit
```

Expected: PASS with zero failures.

- [ ] **Step 2: Run targeted lint**

Run:

```bash
npx eslint test/visual/review.js test/visual/review-command.js test/visual/review-command.node.test.js
```

Expected: PASS.

- [ ] **Step 3: Verify Playwright test discovery is unchanged**

Run:

```bash
npx playwright test --config=playwright.visual.config.js --list
VISUAL_BASE_URL=https://example.com \
  npx playwright test --config=playwright.visual.deployed.config.js --list
```

Expected: the existing local and deployed tests are discovered. The command wrapper does not add or remove visual scenarios.

- [ ] **Step 4: Check repository changes**

Run:

```bash
git status --short
git diff --check
```

Expected:

- Only the planned command, test, package, and documentation files changed.
- No generated reports, result directories, `node_modules`, or screenshots are staged unless a deliberate targeted approval changed them.

- [ ] **Step 5: Request code review**

Use the repository `code-review` skill to inspect the final diff for command-injection risks, accidental broad snapshot updates, platform assumptions, and documentation mismatches.

- [ ] **Step 6: Commit only with explicit authorization**

When requested, use the repository `conventional-commits` skill and commit only the approved files.
