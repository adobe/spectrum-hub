---
name: code-review
description: Use for "review", "code review", "review my changes", "review this PR", "check this diff", or "is this ready to merge". Read-only review of local changes or a GitHub pull request for defects, regressions, and tests that give false confidence. Covers design-token validation for CSS changes, reuse of existing code for JavaScript changes, and before-and-after screenshots for the pull request description.
---

# Code Review

Find what the change breaks. Stay read-only: the deliverable is findings, not fixes.

## 1. Pin the diff

| Target | Command |
| --- | --- |
| Working tree | `git diff HEAD`, plus untracked files from `git status --short` |
| Branch | `git diff <base>...HEAD` |
| Pull request | `gh pr diff <n>`; base from `gh pr view <n> --json baseRefName` |

Ask one focused question when different base choices materially change the diff.
Do not guess a pull request's target branch.

## 2. State the intent

Write one sentence: what is this change trying to do? Pull it from the request, PR body, commits, or linked issue. Judge every finding against it. If you can't write it, ask before reviewing.

Two phases run outside this boundary, and only after the user authorizes them:
the [screenshot capture](#visual-evidence-for-the-pull-request) and the
[blocking-finding fix](#blocking-finding-fix-offer). Both come after the
findings are reported. Neither starts without an explicit selection.

## 3. Review

Read the full diff, then only the callers, consumers, tests, and authored content it touches. Trace repeated initialization, async ordering and cleanup, stale state, and compatibility with existing callers and authored contracts.

Check that tests would fail if the intended behavior were removed or broken,
including DOM changes and other side effects, not just return values.

Read the specialist guidance for each kind of change in the diff:

| Change | Read |
| --- | --- |
| Semantic or interactive UI | `../accessibility-compliance/SKILL.md` |
| `scripts.js`, `ak.js`, lifecycle, CLS, LCP | `../eds-performance-review/SKILL.md` |
| CSS, tokens, schemes, responsive, class names | `../stylesheet-conventions/SKILL.md` |
| New block or changed block contract | `../create-new-block/SKILL.md` |
| Generated dependency or status data | `deps/README.md` and the owning `deps/docs/` contract |
| Tests or CI | `docs/TESTS.md`, `package.json`, the relevant workflow |

Specialist skills include implementation steps; skip them. Nothing in a review changes files, Git state, snapshots, dependencies, services, or GitHub.

Confirm a suspicion with the smallest non-mutating check: run one test, grep one caller. Mark each finding `verified` or `inferred`.

- Run the [design-token audit](#design-token-audit-css-changes) when the diff
  touches any `.css` file.
- Run the [reuse audit](#reuse-audit-javascript-changes) when the diff adds or
  rewrites JavaScript.
- Report only issues introduced or exposed by the change.

## Design-token audit (CSS changes)

`stylesheet-conventions` owns the token names, scales, and CSS conventions. This
audit is the review pass over a diff; read that skill for the values rather than
restating them here.

Nothing enforces tokens automatically. `.stylelintrc.json` extends
`stylelint-config-standard` and adds no token rule, so `npm run lint:css` passes
on a hardcoded color. Read the added lines.

Start from the literals the diff introduces:

```bash
git diff --unified=0 -- '*.css' \
  | grep -E '^\+' \
  | grep -vE 'var\(--' \
  | grep -iE '#[0-9a-f]{3,8}|rgba?\(|hsla?\(|[0-9]+px|[0-9]+rem'
```

Then confirm a replacement exists before naming it in a finding:

```bash
grep -n -- '--s2-spacing-300' styles/styles.css
```

Check each hit against this list:

| Pattern in the diff | Why it is a finding |
| --- | --- |
| A color literal where a token exists | Spectrum color tokens resolve through `light-dark()`. A literal pins one scheme, so the element keeps its light value in dark mode. Name the token. |
| A new literal for a translucent color | Alpha variants belong in `rgb(from var(--token) r g b / <alpha>)` so they track the token. |
| A spacing, radius, font-size, or line-height literal matching a token value exactly | The value stops tracking the token library on the next sync. |
| An edit inside the generated token block in `styles/styles.css` | That block is regenerated from the Spectrum 2 token library, so the edit is lost on the next sync. |
| A custom property declared in a block stylesheet that more than one block needs | Shared values belong in `styles/styles.css`; per-block copies drift. |
| `min-width`/`max-width` media queries, unscoped selectors, or a transition with no `prefers-reduced-motion` branch | Repository convention violations from `stylesheet-conventions`. |

A `px` value that no token covers is not automatically a defect. Ask for intent
or record a residual risk instead of inventing a token name.

Severity guidance:

- A literal that breaks dark mode, a forced scheme, or reduced motion is `SEV3`
  — behavior is partially broken for a subset of users.
- An edit to generated output that will be overwritten is `SEV3` or `SEV2`,
  depending on whether anything else depends on the edited value.
- A literal that matches its token exactly and renders identically in both
  schemes is `SEV5`.

## Reuse audit (JavaScript changes)

New JavaScript has to earn its place. For every function, module, constant,
listener, or dependency the diff adds, look for the mechanism that already does
the job before accepting it.

Search in this order:

1. `scripts/utils/` — the home for reusable browser helpers. List it rather
   than recalling its contents: `ls scripts/utils`.
2. `scripts/ak.js` and `scripts/scripts.js` — generic decoration and page setup
   that already runs for every block, including eager LCP image priority,
   section-ordered lazy loading, and link auto-blocking. `eds-performance-review`
   owns these; load it rather than duplicating its checks.
3. `deps/` — vendored runtimes and generated data, with contracts in
   `deps/README.md` and `deps/docs/`.
4. Sibling blocks — a block that solves the same problem usually means the
   helper belongs in `scripts/utils/` instead of a second copy.
5. The platform — a browser API the repository already relies on beats a
   hand-rolled equivalent.

```bash
ls scripts/utils
grep -rn "<behavior or export name>" scripts blocks deps tools --include='*.js'
```

`docs/ARCHITECTURE.md` holds the "Where a change belongs" table. Use it to judge
placement, not just duplication:

| Pattern in the diff | Why it is a finding |
| --- | --- |
| Logic copied from an existing module into a block | The copy and the original drift. Name the import path that replaces it. |
| A second implementation of an existing helper with different semantics | Name the handling the new version drops — the error path, the empty case, the cleanup — because that difference is the reachable failure. |
| A helper added to `scripts/utils/` that only one block calls | `docs/ARCHITECTURE.md` places single-block behavior in the block. |
| A new `package.json` dependency covering something already vendored in `deps/` | Adds supply-chain and build surface for no new behavior. |
| Per-block code reproducing generic `ak.js` or `scripts.js` decoration | Point back to the shared mechanism rather than the parallel one. |

Report reuse as a finding only when you can name the existing export **and**
show it covers the changed call sites. When the existing helper almost fits, ask
whether extending it was considered instead of asserting that it fits. A reuse
observation with no named alternative is a style preference, and the finding
threshold below excludes it.

Severity guidance:

- `SEV3` when the duplicate already behaves differently from the original in a
  way the change reaches. Name the input that diverges.
- `SEV4` when the duplicate matches today and the cost is future divergence.
- Do not report a refactor the change does not require.

## 4. Filter

Report a finding only if you can point at the changed line that causes it and
describe a reachable failure scenario or a concrete maintainability or
test-confidence risk. Drop pre-existing issues, style preferences, refactors the
change doesn't need, and "add tests" without naming the unprotected behavior.
Use a question or residual risk when evidence is inconclusive.

| SEV | Meaning |
| --- | --- |
| SEV1 | Outage, data loss, or exploitable security hole. Blocks merge. |
| SEV2 | Major functionality broken. Blocks merge. |
| SEV3 | Partially broken or moderate impact. |
| SEV4 | Minor functional issue or concrete maintainability risk. |
| SEV5 | Objective cosmetic defect or repo-convention violation. Never a preference. |

## 5. Report

```text
Reviewed: <diff command or PR> against <base>
Intent: <one sentence>

[SEV2 · verified] scripts/example.js:42 — data-loading promise resolves to undefined
<Failure scenario>. <Smallest fix direction>.
```

Order by severity, `verified` before `inferred`. Then, only if non-empty: **Questions**, **Residual risks**.

No findings: write `No qualifying findings.` and any residual risks. No praise, no diff summary.

## After the review

Both post-review phases are offers, not steps. Ask once, in a single prompt,
listing the screenshot capture alongside any eligible blocking finding. The
review stays read-only until the user selects something.

### Visual evidence for the pull request

Offer to capture screenshots when the diff changes what renders: block CSS,
`styles/`, block markup or DOM construction, templates, icons, or fragments.
Skip the offer for a diff limited to tests, documentation, tooling, or
generated data.

Capture before-and-after pairs when a previous state exists. A new block has no
before state, so capture the after shot alone and say why. Add a second pair for
each condition the change affects: dark scheme when color changed, mobile
viewport when layout changed.

Pick the route first. Prefer an authored page that renders the changed block.
When no page covers it, the fixtures in `test/a11y/fixtures/` render blocks in
isolation. Ask which page to use when the diff does not point at one.

Serve the working tree, then serve the merge base from a second worktree:

```bash
npx aem up --port 3001 --no-open
```

```bash
REPO=$(git rev-parse --show-toplevel)
BASE=$(git merge-base origin/main HEAD)
git worktree add -b review-before "$REPO/.worktrees/review-before" "$BASE"
(cd "$REPO/.worktrees/review-before" && "$REPO/node_modules/.bin/aem" up --port 3002 --no-open)
```

Run both servers in the background. Reuse an `aem up` already listening on 3001
rather than starting a second one.

Create the worktree on a branch, as above, rather than with `--detach`.
`aem up` reads the branch from the worktree's `HEAD` file, and a detached `HEAD`
sends it down a path that does not understand linked worktrees.

Both servers proxy the same content origin —
`https://main--spectrum-hub--adobe.aem.page` — because `aem up` derives the
origin from the `origin` remote and always uses `main`, never the local branch.
The pair therefore differs only in the code under review, which is the point.

Capture each pair at the same route, viewport, and scheme — a pair that differs
in anything but the change proves nothing:

```bash
npx playwright screenshot --viewport-size "1280,800" --full-page \
  "http://localhost:3002/<route>" .screenshots/<name>-before.png
npx playwright screenshot --viewport-size "1280,800" --full-page \
  "http://localhost:3001/<route>" .screenshots/<name>-after.png
```

Add `--color-scheme dark` for the dark pair and `--device "Pixel 5"` for the
mobile pair.

Then stop both servers and remove the worktree and its branch:

```bash
git worktree remove --force "$REPO/.worktrees/review-before"
git branch -D review-before
```

Constraints for this phase:

- `.worktrees/` and `.screenshots/` are ignored by Git. Never commit the images
  or the worktree.
- Never commit, stash, or reset inside the worktree, and never touch the user's
  checked-out branch. The `review-before` branch exists so the merge base can be
  served, not edited, and it is deleted during cleanup.
- `aem up` proxies the AEM origin, which answers anonymous requests with `401`.
  Icons, `query-index.json`, and authored content render only while the
  developer's `aem-cli` login is valid. When part of the page fails to load, say
  so with the screenshot instead of presenting a broken render as the change.
- The after shot includes uncommitted working-tree changes. State that when the
  review target was committed changes only.

Report the absolute path of every image so the user can drag it into GitHub,
then hand over a block they can paste into the **Screenshots (if applicable)**
section of the pull request template:

```markdown
### Screenshots (if applicable)

| Before | After |
| --- | --- |
| <drag `hero-before.png` here> | <drag `hero-after.png` here> |

Route `/products/hero-demo` at 1280×800, light scheme.
```

Add one row per condition and name that condition under the table. GitHub
uploads images only from the pull request author, so the images stay local
until the user drops them in. `write-pr-descriptions` owns the rest of the body.

### Blocking-finding fix offer

SEV1 and SEV2 findings are blocking review outcomes. When either severity is
reported, finish by asking whether the user wants the agent to fix a specific
SEV1 or SEV2 finding:

- Use structured interaction when the client supports it. List each eligible finding as a separate choice and include an option to review the findings before making changes.
- Otherwise, use a plain-text fallback that asks the user to identify the specific SEV1 or SEV2 finding they want fixed.

The review remains read-only until the user selects a finding. That selection authorizes a separate implementation phase for only the selected finding.

Do not offer to fix SEV3 through SEV5 findings automatically. Those findings require human review before a separate, explicit implementation request.
