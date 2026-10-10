---
name: new-block-workflow
description: Use when creating a new Spectrum Hub block from its initial authored contract through implementation, accessibility checks, local preview, and optional delivery.
---

# New Block Workflow

Actively coordinate one new-block contribution from intent through verified
implementation. Sequence the owning skills and guides; do not duplicate their
technical reference material.

## Required skills and guides

Load each skill when its phase begins:

| Concern | Required skill |
| --- | --- |
| Test-first behavior | `test-driven-development` |
| Block structure and authored contract | `create-new-block` |
| Block CSS and design tokens | `stylesheet-conventions` |
| Semantics, interaction, and accessibility | `accessibility-compliance` |
| Core loader or page lifecycle changes | `eds-performance-review` |
| User-requested commit | `conventional-commits` |

Use [Blocks](../../../docs/BLOCKS.md),
[Content authoring](../../../docs/CONTENT_AUTHORING.md), and
[Tests](../../../docs/TESTS.md) for contributor-facing detail.

## Coordinate the workflow

### 1. Define the contract

Clarify the block's purpose, closest code owner, authored rows and cells,
variants, representative page, invalid-input behavior, and composition type:
authored, programmatic, or link-triggered. Resolve materially different
contracts before implementation.

### 2. Inspect current patterns

Inspect comparable blocks, their focused tests, the loader contract, and the
representative authored shape. Verify drift-prone facts against current source,
`package.json`, and test configuration.

### 3. Start test-first

Load `test-driven-development`. Write the smallest focused unit test for the
next behavior and run it. Confirm it fails for the expected behavioral reason
before writing production code.

### 4. Implement the minimum block

Load `create-new-block`; load `stylesheet-conventions` when CSS is involved.
Add only enough JavaScript and CSS to pass the failing test. Keep block-specific
behavior inside `init(el)`. Repeat red-green-refactor for each behavior.

Project CSS uses kebab-case, block-prefixed child/state classes and short root
variants. It does not use BEM.

### 5. Build in accessibility

Load `accessibility-compliance` while choosing semantic elements, keyboard and
focus behavior, announcements, motion, and responsive targets. Do not postpone
accessibility until an axe scan.

Add:

- `test/a11y/fixtures/<name>.html` with the raw authored row/cell shape
- `test/a11y/blocks/<name>.spec.js` with light-mode axe, an accessibility-tree
  snapshot, and dark-mode contrast checks

### 6. Run focused validation

Use current repository commands, starting with:

```bash
npm run test:file -- test/blocks/<name>.test.js
npm run lint:js
npm run lint:css
npx playwright test test/a11y/blocks/<name>.spec.js
```

Run `test/a11y/coverage.spec.js` when validating the new file mapping or an
exclusion. Escalate only to other suites affected by the changed files; do not
call `npm test` the full test suite.

A failed check returns to the phase that owns the failure. Do not continue with
success-shaped fallback language.

### 7. Verify authored behavior

Ask before starting `npx aem up`. When authorized, verify the representative
page with its real authored shape, responsive layouts, light and dark schemes,
and relevant keyboard or screen reader behavior.

DA and branch-preview checks can require contributor access. Record an
unavailable check as blocked, name the exact contributor action, and do not
report it as passed.

### 8. Deliver only when requested

Commits, pushes, and pull requests are separate external effects. Perform each
only after an explicit request for that operation.

For a commit, load `conventional-commits` and inspect the branch and working
tree. For a pull request, follow the current repository PR-description skill
and include applicable branch-preview and validation evidence.

## Conditional lifecycle review

Check proposed ownership before implementation and inspect the final diff.
Load `eds-performance-review` when:

- the work changes `scripts/scripts.js`, `scripts/ak.js`, `scripts/lazy.js`, or
  `scripts/postlcp.js`
- the design proposes automatic composition, link-triggered loading, a CSS
  opt-out, eager/LCP behavior, or work outside the block's `init()`

Apply its lifecycle test before implementing that branch. Require measured
evidence for timing changes. If the review rejects core-loader ownership, move
the behavior into the block. If lifecycle files remain changed, run both the
block checks and affected lifecycle tests.

## Permission and completion gates

Ask before:

- installing dependencies or browsers
- starting a local server
- changing or publishing DA content
- committing
- pushing
- creating a pull request

Report each check as passed, failed, blocked, or not requested. Do not claim the
workflow is complete without fresh evidence for focused unit behavior, affected
lint, the block accessibility spec and coverage, authorized local authored-shape
verification, and conditional lifecycle tests. A commit or pull request is not
required for implementation completion.

## Common mistakes

| Mistake | Correction |
| --- | --- |
| Starting `aem up` because preview is “implied” | Ask before starting a service |
| Inventing `npm run up` or a test command | Verify commands in `package.json` and `docs/TESTS.md` |
| Using BEM | Use project kebab-case class naming |
| Treating axe as the accessibility design | Define semantics and interaction before implementation |
| Hoisting a block fetch into `scripts.js` | Run lifecycle review and keep block behavior in `init()` |
| Proceeding after a known failure | Return to the owning phase and preserve the evidence |

