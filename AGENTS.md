# Agent instructions

Coding agents working in this repository should treat **`.ai/`** as the canonical location for project AI rules, skills, and related configuration. This file is a **bootstrap**: read it first, then follow the detailed catalog and paths below.

## First steps

1. **Read** [`.ai/README.md`](./.ai/README.md) for the full list of rules, skills, when they apply, and how to invoke skills.
2. **Apply** the rules that match the files and tasks you touch (see globs and activation notes in that README).
3. **Load** a skill when the task matches its purpose: each skill lives under `.ai/skills/<skill-name>/SKILL.md`.

## Where things live

| What                         | Location                                                                                           |
| ---------------------------- | -------------------------------------------------------------------------------------------------- |
| Rule catalog and usage       | [`.ai/README.md`](./.ai/README.md)                                                                 |
| Rule files (`.md`)           | [`.ai/rules/`](./.ai/rules/)                                                                       |
| Task workflows (skills)      | [`.ai/skills/`](./.ai/skills/) — each skill is typically `SKILL.md` in a subfolder                 |
| Design specs                 | [`.ai/docs/specs/`](./.ai/docs/specs/) — `YYYY-MM-DD-<topic>-design.md`                            |
| Implementation plans         | [`.ai/docs/plans/`](./.ai/docs/plans/) — `YYYY-MM-DD-<feature-name>.md`                            |

## Rules vs skills

- **Rules** enforce consistency (documentation shape, CSS conventions, branch naming guidance, and similar). Prefer the always-applied and glob-triggered rules from [`.ai/README.md`](./.ai/README.md) when editing matching paths.
- **Skills** are **on-demand** playbooks (for example explain-code, test-driven development, session handoff). When the user’s request fits a skill’s description, **read that skill’s `SKILL.md`** before doing the work.

## Specs and plans

Design specs and implementation plans live under **`.ai/docs/`**, alongside the rest of the project's agent documentation:

- **Specs** (brainstorming output, design docs): `.ai/docs/specs/YYYY-MM-DD-<topic>-design.md`
- **Plans** (implementation plans): `.ai/docs/plans/YYYY-MM-DD-<feature-name>.md`

This **overrides** the default paths used by the Superpowers plugin skills (`superpowers:brainstorming`, `superpowers:writing-plans`, `superpowers:subagent-driven-development`, `superpowers:executing-plans`, and `superpowers:requesting-code-review`), which write to `docs/superpowers/specs/` and `docs/superpowers/plans/`. When any of those skills instruct you to save to `docs/superpowers/…`, save to the matching `.ai/docs/…` path instead. Do not create a `docs/superpowers/` directory in this repository.

## Rule index

When a task matches one of the following, read and apply the corresponding rule file before responding:

| Task | Rule file |
| ---- | --------- |
| Writing or editing `.md` files | [`.ai/rules/write-documentation.md`](./.ai/rules/write-documentation.md) |
| Drafting a PR description | [`.ai/rules/pr-descriptions.md`](./.ai/rules/pr-descriptions.md) |
| Drafting a Jira ticket or GitHub issue | [`.ai/rules/issue-ticket.md`](./.ai/rules/issue-ticket.md) |

## Accessibility tests

The project runs axe-core WCAG 2.2 AA scans plus a Playwright `toMatchAriaSnapshot()` accessibility-tree check against every block and template. Tests live in `test/a11y/` and run on every PR via `.github/workflows/a11y.yml`.

### When you add a block or template

Each block gets its own pair of files — no shared registry to edit.

1. Create an HTML fixture in `test/a11y/fixtures/<name>.html` that initializes the block in isolation. Fixtures are served locally by `aem up` (falls back to a static file when one exists at the requested path) — load block CSS and JS directly with `<link>` and `<script type="module">`.
2. Create `test/a11y/blocks/<name>.spec.js`. Copy an existing file (e.g. [`test/a11y/blocks/card.spec.js`](./test/a11y/blocks/card.spec.js) for the simple case, or [`test/a11y/blocks/header.spec.js`](./test/a11y/blocks/header.spec.js) for one with mocked routes) as a template: define a `block` object (`name`, `path`, `readySelector`, optionally `routes`/`disableRules`/`ariaRoot`), then the light-mode axe test, the accessibility-tree snapshot test, and the dark-mode axe test, in that order, using `test`/`expect` from `../axe-test.js` and `gotoBlock`/`formatViolations` from `../block-a11y.js`.

`readySelector` is a CSS selector that appears in the DOM once the block has finished initializing (or `{ selector, state: 'detached' }` for a block that removes itself from the DOM on init).

For blocks that fetch remote data at runtime (header, footer, sitenav, schedule, playground, profile, component-status, page-hero, status-table, search, youtube), add a `routes` array to the `block` object. Each route intercepts a network request with `page.route()` and returns mock HTML or JSON so the test runs without a live server. Add reusable mock strings to [`test/a11y/mocks.js`](./test/a11y/mocks.js) and import them; keep one-off mocks inline in the spec file.

For templates, call `setConfig({ components: [], hostnames: [], linkBlocks: [] })` before `init()` in the fixture script — templates use `loadBlock()` internally, which requires `components` to be defined.

Some blocks render arbitrary, CMS-authored content passed through verbatim (e.g. `fragment`) rather than a fixed structure — an a11y scan of a canned mock wouldn't test anything real. These are explicitly excluded via the `EXCLUDED` set in [`test/a11y/coverage.spec.js`](./test/a11y/coverage.spec.js) rather than given a spec file. A block whose render output isn't deterministic yet (a known bug), or that removes its own root from the DOM on init, should skip the accessibility-tree snapshot test specifically (with a comment explaining why — see `schedule.spec.js`/`section-metadata.spec.js`) while keeping its axe tests.

Playwright's file/line attribution follows wherever `test()` is actually called — so the light/dark `test(...)` calls must live directly in `test/a11y/blocks/<name>.spec.js`, not inside a shared helper function, or failures will misreport as coming from `block-a11y.js`.

#### Accessibility-tree snapshot test

Alongside the axe scans, each block spec has one more test asserting the block's accessible tree matches a known-good shape — this catches semantic regressions (a heading demoted to a `div`, a landmark losing its name, a role getting clobbered) that axe's rule-based scan won't flag as long as no WCAG rule is technically violated. Pattern (modeled on the one already in use in the sibling `spectrum-web-components` repo):

```js
test(`${block.name} block matches its expected accessibility tree`, async ({ page }, testInfo) => {
  // Mobile Chrome also runs on the Chromium engine, so `browserName` alone can't isolate a
  // single run — check the project by name to actually run this once, not twice.
  test.skip(testInfo.project.name !== 'chromium', 'ARIA tree is browser/viewport-agnostic; only the chromium project needs to run it');

  await gotoBlock(page, block);

  await expect(page.locator(block.ariaRoot ?? `.${block.name}`)).toMatchAriaSnapshot(`
    - ...
  `);
});
```

- **One test, not a light/dark pair** — tree structure doesn't vary by color scheme.
- **Gate to the `chromium` project by name, not the `browserName` fixture.** `Mobile Chrome` also runs on the Chromium engine, so `browserName !== 'chromium'` alone lets it slip through as a redundant second run.
- **`ariaRoot`** is an optional field on the `block` object for the block's root locator selector; it defaults to `` `.${block.name}` ``. Set it explicitly when the block's root isn't that class — e.g. it replaces itself with a custom element (`profile` → `se-profile`, `search` → `sh-search`, `youtube` → `.video`) or uses an id instead of a class (`sitenav` → `#sitenav`).
- **Generate/update the snapshot** with `npx playwright test test/a11y/blocks/<name>.spec.js --project=chromium -g "accessibility tree" --update-snapshots`. This writes a `test-results/rebaselines.patch` rather than patching the spec file directly — review it, then `git apply test-results/rebaselines.patch` and delete `test-results/`.
- Review the generated tree like any other diff, and treat it as living documentation: update the snapshot when a tree change is intentional, fix the block when it isn't.

### When you change a block or template

| What changed | What to update |
| --- | --- |
| A WCAG violation is introduced | Fix the accessibility issue in the block |
| The init-produced DOM structure changes | Update `readySelector` in `test/a11y/blocks/<name>.spec.js`, and regenerate the accessibility-tree snapshot if the change was intentional |
| A fetch URL or response format changes | Update the `routes` mock in `test/a11y/blocks/<name>.spec.js` (and/or `test/a11y/mocks.js`) |

### File locations

| What | Path |
| --- | --- |
| Shared AxeBuilder fixture (`test`/`expect`/`makeAxeBuilder`) | `test/a11y/axe-test.js` |
| Shared per-block test utilities (`gotoBlock`, `formatViolations`) | `test/a11y/block-a11y.js` |
| Shared mock HTTP responses | `test/a11y/mocks.js` |
| Per-block spec files (one per block/template) | `test/a11y/blocks/<name>.spec.js` |
| Coverage check (fails if a block under `blocks/` has no spec file) | `test/a11y/coverage.spec.js` |
| HTML fixtures (one per block/template) | `test/a11y/fixtures/` |
| GitHub Actions workflow | `.github/workflows/a11y.yml` |

### Running a single block's tests

Playwright's CLI treats file-path arguments as regexes matched against forward-slash paths — always use forward slashes, even in PowerShell on Windows, or the match silently fails:

```bash
npx playwright test test/a11y/blocks/card.spec.js
```

## IDE-specific folders

Some editors load extra project config from their own directories (for example `.cursor/` and `.claude/`). Those locations are thin adapters that symlink back to `.ai/`. **`.ai/` remains the portable source of truth** for rules and skills documented here. If instructions conflict, prefer **`.ai/README.md`** and the files under **`.ai/rules/`** and **`.ai/skills/`**.
