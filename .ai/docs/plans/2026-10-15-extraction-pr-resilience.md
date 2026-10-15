# Extraction PR Resilience Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Publish changed SWC and RSP extraction output as a reviewable pull request even when validation fails, while keeping the workflow conclusion failed and showing reviewers a concise failure report.

**Architecture:** Add one shared Node.js formatter for validation outcomes and bounded log excerpts. Both extraction workflows will run lint and extraction tests with `continue-on-error`, generate the pull request and job-summary report, publish changed output, then use a final guard step to restore a failed workflow conclusion.

**Tech Stack:** GitHub Actions YAML, Node.js 20, `node:test`, GitHub CLI

---

Do not create commits unless the user explicitly requests them. This repository
session does not grant commit permission by default.

### Task 1: Specify the validation report contract

**Files:**
- Create: `.github/scripts/extraction-validation-report.js`
- Create: `test/extractions/extraction-validation-report.node.test.js`

- [ ] **Step 1: Write the failing success-report test**

Create `test/extractions/extraction-validation-report.node.test.js` and import
`buildValidationReport` from the new script. Add a test with both outcomes set
to `success`.

```js
import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { buildValidationReport } from '../../.github/scripts/extraction-validation-report.js';

describe('buildValidationReport', () => {
  it('reports both validation commands as passed', () => {
    const report = buildValidationReport({
      lintOutcome: 'success',
      testOutcome: 'success',
      lintLog: '',
      testLog: '',
      runUrl: 'https://github.com/adobe/spectrum-hub/actions/runs/123',
    });

    assert.match(report, /Passed: `npm run lint:js`/);
    assert.match(report, /Passed: `npm run test:extractions`/);
    assert.doesNotMatch(report, /\[!WARNING\]/);
  });
});
```

- [ ] **Step 2: Write the failing failure-report test**

Add a test that verifies a failed extraction test creates a warning, names the
failed command, links the Actions run, and includes the useful missing-shell
assertion.

```js
it('warns reviewers and includes concise failure details', () => {
  const report = buildValidationReport({
    lintOutcome: 'success',
    testOutcome: 'failure',
    lintLog: '',
    testLog: [
      'not ok 43 - every mapped component has a per-component shell',
      'mapped components without a shell: menu, thumbnail',
      "code: 'ERR_ASSERTION'",
    ].join('\n'),
    runUrl: 'https://github.com/adobe/spectrum-hub/actions/runs/123',
  });

  assert.match(report, /> \[!WARNING\]/);
  assert.match(report, /Failed: `npm run test:extractions`/);
  assert.match(report, /mapped components without a shell: menu, thumbnail/);
  assert.match(report, /\[View the workflow run\]\(https:\/\/github\.com\/adobe\/spectrum-hub\/actions\/runs\/123\)/);
});
```

- [ ] **Step 3: Write the failing bounded-output test**

Add a test with more than 40 matching error lines and one line longer than 300
characters. Assert the report contains no more than 40 detail lines and does
not retain the full oversized line.

Use these contract limits:

```js
const MAX_DETAIL_LINES = 40;
const MAX_LINE_LENGTH = 300;
```

- [ ] **Step 4: Run the new test to verify it fails**

Run:

```sh
node --test test/extractions/extraction-validation-report.node.test.js
```

Expected: FAIL because
`.github/scripts/extraction-validation-report.js` does not exist.

- [ ] **Step 5: Implement the report formatter**

Create `.github/scripts/extraction-validation-report.js` with these exported
functions:

```js
export function selectFailureDetails(log) {
  // Return at most 40 non-empty, trimmed lines.
  // Prefer lines containing:
  //   not ok
  //   ERR_
  //   AssertionError
  //   mapped components without a shell
  //   error
  //   failed
  // If no line matches, use the last 40 non-empty lines.
  // Truncate every returned line to 300 characters.
}

export function buildValidationReport({
  lintOutcome,
  testOutcome,
  lintLog,
  testLog,
  runUrl,
}) {
  // Always start with "## Validation".
  // Use "Passed:" or "Failed:" list items for both commands.
  // When either command failed, add a GitHub Markdown warning alert,
  // the run link, and indented plain-text detail lines selected only
  // from logs whose corresponding command failed.
}
```

The failure report should follow this structure:

```md
## Validation

> [!WARNING]
> Validation failed. This pull request contains new release data, but it is not
> ready to merge. Resolve the failures below before merging.

- Passed: `npm run lint:js`
- Failed: `npm run test:extractions`

[View the workflow run](...)

### Failure details

    not ok 43 - every mapped component has a per-component shell
    mapped components without a shell: menu, thumbnail
    code: 'ERR_ASSERTION'
```

Add a command-line entry point that reads:

- `LINT_OUTCOME`
- `TEST_OUTCOME`
- `RUN_URL`
- the lint log path from `process.argv[2]`
- the extraction-test log path from `process.argv[3]`

Write the Markdown report to standard output. Treat a missing log file as an
empty log, but do not hide other file-reading errors.

- [ ] **Step 6: Run the new test to verify it passes**

Run:

```sh
node --test test/extractions/extraction-validation-report.node.test.js
```

Expected: PASS.

### Task 2: Specify the resilient workflow lifecycle

**Files:**
- Modify: `test/extractions/workflows.node.test.js`

- [ ] **Step 1: Add helpers for locating validation and final-guard steps**

Extend the test helpers so assertions can find:

- the changed-output lint step by the real `npm run lint:js` command
- the changed-output extraction-test step by the real
  `npm run test:extractions` command
- the changed-output pull request step by
  `git push --force origin "$BRANCH"`
- the final guard by its real `exit 1` command and validation outcome
  references

Do not require the final guard to use the same exact `if:` string as the normal
changed-output steps. It should support:

```yaml
if: always() && steps.stage.outputs.changed == 'true'
```

- [ ] **Step 2: Replace the old combined-validation assertion**

Replace the assertion that both commands run in one validation step with
assertions that each extraction workflow:

- has separate lint and extraction-test steps
- gives both steps stable IDs
- sets `continue-on-error: true` on both steps
- captures each command through `tee` into `$RUNNER_TEMP`
- enables `pipefail` so the pipeline preserves the command failure
- runs both validation steps before the pull request step

- [ ] **Step 3: Add report-generation assertions**

Assert the changed-output description step:

- runs `.github/scripts/extraction-validation-report.js`
- passes `${{ steps.<id>.outcome }}` values through environment variables
- passes `${{ github.server_url }}/${{ github.repository }}/actions/runs/${{ github.run_id }}`
  as the run URL
- appends the generated validation Markdown to the pull request body
- appends the same Markdown to `$GITHUB_STEP_SUMMARY`

- [ ] **Step 4: Add final-guard assertions**

Assert each workflow has a final step after the pull request reconciliation
step that:

- uses `if: always() && steps.stage.outputs.changed == 'true'`
- checks both validation step outcomes
- exits with status 1 when either outcome is not `success`

Keep the existing assertions for checkout, concurrency, timeout, default
branch, pull request update/create, and unchanged-output cleanup.

- [ ] **Step 5: Run the workflow tests to verify they fail**

Run:

```sh
node --test test/extractions/workflows.node.test.js
```

Expected: FAIL because the current workflows stop at the first validation
failure and have no final guard.

### Task 3: Refactor the SWC extraction workflow

**Files:**
- Modify: `.github/workflows/extract-swc-properties.yml`
- Test: `test/extractions/workflows.node.test.js`

- [ ] **Step 1: Split and soften validation**

Replace `Verify the extraction before proposing it` with:

```yaml
- name: Lint extracted output
  id: lint
  if: steps.stage.outputs.changed == 'true'
  continue-on-error: true
  run: |
    set -o pipefail
    npm run lint:js 2>&1 | tee "$RUNNER_TEMP/lint.log"

- name: Test extracted output
  id: extraction_tests
  if: steps.stage.outputs.changed == 'true'
  continue-on-error: true
  run: |
    set -o pipefail
    npm run test:extractions 2>&1 | tee "$RUNNER_TEMP/extraction-tests.log"
```

Keep the comment explaining why validation happens inside the extraction
workflow, since pull requests opened with `GITHUB_TOKEN` do not trigger their
own `pull_request` checks.

- [ ] **Step 2: Generate the SWC validation report**

Add these environment values to `Describe what changed`:

```yaml
env:
  LINT_OUTCOME: ${{ steps.lint.outcome }}
  TEST_OUTCOME: ${{ steps.extraction_tests.outcome }}
  RUN_URL: ${{ github.server_url }}/${{ github.repository }}/actions/runs/${{ github.run_id }}
```

Before constructing the pull request body, run:

```sh
node .github/scripts/extraction-validation-report.js \
  "$RUNNER_TEMP/lint.log" \
  "$RUNNER_TEMP/extraction-tests.log" \
  > "$RUNNER_TEMP/validation.md"
```

Replace the unconditional statement that both commands passed with:

```sh
cat "$RUNNER_TEMP/validation.md"
```

After writing `pr-body.md`, append the same report to the job summary:

```sh
cat "$RUNNER_TEMP/validation.md" >> "$GITHUB_STEP_SUMMARY"
```

- [ ] **Step 3: Preserve pull request publication**

Keep `Commit to a branch and open a PR` conditioned only on:

```yaml
if: steps.stage.outputs.changed == 'true'
```

Do not add validation-success conditions to the commit, push, `gh pr edit`, or
`gh pr create` commands.

- [ ] **Step 4: Add the final SWC validation guard**

After pull request reconciliation, add:

```yaml
- name: Fail when extraction validation failed
  if: always() && steps.stage.outputs.changed == 'true'
  env:
    LINT_OUTCOME: ${{ steps.lint.outcome }}
    TEST_OUTCOME: ${{ steps.extraction_tests.outcome }}
  run: |
    if [ "$LINT_OUTCOME" != "success" ] || [ "$TEST_OUTCOME" != "success" ]; then
      echo "Extraction output was published, but validation failed." >&2
      exit 1
    fi
```

- [ ] **Step 5: Run the workflow tests**

Run:

```sh
node --test test/extractions/workflows.node.test.js
```

Expected: the SWC lifecycle assertions pass. RSP-specific assertions may still
fail until Task 4.

### Task 4: Apply the same lifecycle to RSP

**Files:**
- Modify: `.github/workflows/extract-rsp-properties.yml`
- Test: `test/extractions/workflows.node.test.js`

- [ ] **Step 1: Add the same validation steps and IDs**

Use the same `lint` and `extraction_tests` IDs, `continue-on-error`, `pipefail`,
temporary log names, report environment variables, report command, job-summary
append, and final guard used by SWC.

Keep the RSP-specific extraction commands, generated paths, commit message,
pull request title, and roster-delta input unchanged.

- [ ] **Step 2: Run the workflow tests**

Run:

```sh
node --test test/extractions/workflows.node.test.js
```

Expected: PASS for both extraction workflows.

### Task 5: Validate the complete change

**Files:**
- Verify: `.github/scripts/extraction-validation-report.js`
- Verify: `.github/workflows/extract-swc-properties.yml`
- Verify: `.github/workflows/extract-rsp-properties.yml`
- Verify: `test/extractions/extraction-validation-report.node.test.js`
- Verify: `test/extractions/workflows.node.test.js`

- [ ] **Step 1: Run the focused report and workflow tests**

Run:

```sh
node --test \
  test/extractions/extraction-validation-report.node.test.js \
  test/extractions/workflows.node.test.js
```

Expected: PASS.

- [ ] **Step 2: Run the full extraction suite**

Run:

```sh
npm run test:extractions
```

Expected: PASS against the current committed extraction data.

- [ ] **Step 3: Run JavaScript lint**

Run:

```sh
npm run lint:js
```

Expected: PASS.

- [ ] **Step 4: Review the final diff**

Run:

```sh
git --no-pager diff --check
git --no-pager diff -- \
  .github/scripts/extraction-validation-report.js \
  .github/workflows/extract-swc-properties.yml \
  .github/workflows/extract-rsp-properties.yml \
  test/extractions/extraction-validation-report.node.test.js \
  test/extractions/workflows.node.test.js
```

Expected: no whitespace errors, no unrelated changes, and identical lifecycle
semantics for SWC and RSP.
