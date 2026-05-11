# Spectrum Hub — testing plan (temporary)

> **Scratch doc.** Delete or replace after the approach is agreed and tracked in Jira (e.g. epic **SPDOCS-122**).

## Purpose

Grow automated testing so refactors (blocks, templates, `scripts/`, extraction pipelines) ship with regression safety. Align with existing tooling where possible and close gaps called out in `.github/PULL_REQUEST_TEMPLATE.md` (`npm test`, coverage for new code).

**Team decision (this plan):** Adopt **Playwright** (`@playwright/test`) for **page-level** checks against the **Pattern Library** (and similar previews), plus **`@axe-core/playwright`** for **automated accessibility** scans on those pages. Keep **Web Test Runner** for fast, fixture-based unit/integration tests.

## Current state

| Area | Notes |
| --- | --- |
| **Runner (unit / DOM fixtures)** | `@web/test-runner` (WTR) via `npm test` — Mocha + Chai + Sinon, browser-based, `--coverage` |
| **Runner (pages / a11y)** | **Planned:** `@playwright/test` + `@axe-core/playwright` — not yet in `package.json` |
| **Tests today** | `test/scripts/scripts.test.js`, `test/scripts/dapreview.test.js` only |
| **Config drift** | `package.json` references `./web-test-runner.config.mjs` in `test:file:watch`, but that file is **not** in the repo root (verify / add or drop the script) |
| **Lint** | `npm run lint` (ESLint + Stylelint) — not a substitute for unit/integration tests |
| **CI** | Workflows for `deps/rsp` and `deps/swc` extraction only; **no** workflow runs `npm test`, Playwright, or `npm run lint` on PRs yet |

## Goals

1. **CI signal:** Every PR runs `npm test` (and ideally `lint`) on Node LTS; failures block merge per team policy. Add a **Playwright** job that runs Pattern Library smoke + axe passes (see phases below).
2. **Critical paths covered:** `scripts/ak.js`, `scripts/scripts.js`, and high-churn **blocks** have focused tests (behavior and DOM outcomes, not pixel-perfect snapshots) — primarily via **WTR** and small fixtures.
3. **Pattern Library assurance:** **Playwright** loads Pattern Library URLs (local dev server and/or preview); tests assert **expected component / block classes** (or stable hooks) are present where blocks are rendered — simple render regression, not screenshots.
4. **Automated accessibility:** **`@axe-core/playwright`** runs on the same (or a defined subset of) Pattern Library pages — **complements** the manual a11y checklist in the PR template; it does not replace keyboard / screen reader testing.
5. **Extraction pipelines:** Optional **Node**-based tests or smoke scripts for `deps/rsp/*.js` and `deps/swc/*.js` (pure functions, golden JSON snippets, or “runs without throw” smoke).
6. **Documentation:** Short `README` or contributor note: how to run WTR, Playwright, install browsers (`npx playwright install`), base URL env vars.

Non-goals for v1 (revisit later): full visual regression suite, performance budgets, cross-browser matrix beyond Chromium for Playwright CI unless needed.

## Guiding principles

- **WTR** for code that assumes a browser DOM or ESM + `document` with **small HTML fixtures** (blocks, `loadPage`, decorators) — fast feedback.
- **Playwright** for **real URLs** (Pattern Library), navigation, and **class / structure smoke** that depends on full page composition.
- **`@axe-core/playwright`** for **automated a11y** violations on those pages; tune rules / include exclusions in code where false positives are accepted (document why).
- **Prefer Node `node:test`** (or small shell smoke) for extraction scripts that only need `fetch`/filesystem — avoids pulling browser into pure Node logic (evaluate per script).
- **Stable selectors:** Prefer roles, labels, or **data attributes** blocks expose; for class checks, target **contract classes** your blocks own — avoid brittle Spectrum-internal selectors.
- **Fast PR feedback:** Keep Playwright suite **small and parallel**; shard only if runtime grows.

## Playwright + axe (adopted stack)

| Package | Role |
| --- | --- |
| `@playwright/test` | Test runner, browsers, CI-friendly defaults, traces on failure |
| `@axe-core/playwright` | Inject axe and assert configurable violation budgets on Pattern Library routes |

**Why not Jest + Puppeteer here:** This repo is ESM-native (`"type": "module"`). Playwright’s runner fits page-level + a11y in **one** toolchain alongside WTR without duplicating browser automation patterns.

**Typical flow:** Start site (or use `baseURL` to staging), `page.goto` Pattern Library section, `expect(locator).toHaveClass(...)` / count block roots, then `injectAxe` + `checkA11y` (per `@axe-core/playwright` docs).

## Proposed phases

### Phase 0 — Hygiene (foundation)

- [ ] Resolve **missing `web-test-runner.config.mjs`**: add a minimal config (root dir, test file pattern, coverage thresholds optional) **or** remove `--config` from `test:file:watch` if redundant.
- [ ] Add **GitHub Actions workflow** (e.g. `.github/workflows/test.yml`): `checkout`, `setup-node` (20.x to match extraction workflows), `npm ci`, `npm test`, optionally `npm run lint`.
- [ ] Confirm `npm test` passes cleanly on a clean clone (document any required env vars or skips).

### Phase 1 — Scripts and author-kit core

- [ ] Expand tests for **`scripts/scripts.js`** / **`scripts/ak.js`**: config boundaries (`setConfig`, `loadArea`), locale paths, `decorateArea` behaviors not yet asserted.
- [ ] Keep **`dapreview`** tests reliable (timing/assertions on `performance` entries can be flaky — consider mocking or looser assertions).

### Phase 2 — Blocks (incremental)

- [ ] Pick **2–3 high-traffic blocks** (e.g. header, hero, table, footer — align with roadmap) and add `test/blocks/<name>.test.js`.
- [ ] Pattern: import default export / named `decorate`, feed minimal `document.body.innerHTML` fixture, run decorator, assert DOM structure, ARIA, or event hooks as appropriate.
- [ ] Document fixture conventions in README (inline HTML strings vs `test/fixtures/*.html`).

### Phase 3 — Playwright: Pattern Library render smoke

- [ ] Add devDependencies: `@playwright/test`, `@axe-core/playwright`.
- [ ] Add `playwright.config` (ESM): `baseURL` from env (e.g. `PLAYWRIGHT_BASE_URL`) for local vs CI preview; default `testDir` e.g. `e2e/` or `tests/playwright/`.
- [ ] **Class / structure checks:** For each agreed Pattern Library route, assert block regions expose **expected classes or data attributes** (document the contract in comments or a small shared map).
- [ ] Scripts: `npm run test:e2e`, `npm run test:e2e:ui` (optional); document `npx playwright install` for new contributors.
- [ ] **CI:** Extend `.github/workflows/test.yml` (or add `playwright.yml`): install deps, install Playwright browsers, start static server / preview **or** point `baseURL` at deployed preview secret; run Playwright (reuse official cache/action patterns as needed).

### Phase 4 — Playwright: automated accessibility (axe)

- [ ] On the same (or subset) Pattern Library pages, run **`@axe-core/playwright`** after navigation (and after any needed `waitForLoadState`).
- [ ] Configure **allowed rules / tags** (e.g. WCAG 2.2 AA scope) and document exclusions for known false positives.
- [ ] Treat failures as **CI blockers** once stable; until then, allow `test.fixme` or soft thresholds only with a dated follow-up ticket.

### Phase 5 — Extraction pipelines (Node)

- [ ] For `deps/rsp/extract-*.js` / `deps/swc/extract-*.js`: add **snapshot or golden-file** tests for small parse helpers, or a **`npm run test:extract`** smoke that runs extractors against cached fixtures with `NODE_OPTIONS` / mocked `fetch` if needed.
- [ ] Keep extraction CI workflows as-is; add a separate **test** job that does not commit artifacts.

## Suggested Jira breakdown

| Ticket idea | Epic |
| --- | --- |
| Phase 0: WTR config + CI test/lint workflow | SPDOCS-122 |
| Phase 1: `ak.js` / `scripts.js` coverage | SPDOCS-122 |
| Phase 2: Block tests (per block or batch) | SPDOCS-122 |
| Phase 3: Playwright Pattern Library class/structure smoke | SPDOCS-122 |
| Phase 4: `@axe-core/playwright` on Pattern Library routes | SPDOCS-122 |
| Phase 5: Extraction script tests | SPDOCS-122 |

## Open questions

- **Browser in CI:** WTR uses Puppeteer/Chrome — confirm runners support it (memory, sandbox flags).
- **Playwright base URL:** Serve Pattern Library via **local static server + command**, **Helix/AEM preview**, or **deployed branch preview** — pick one primary path for CI and document env vars.
- **Coverage gates:** Enforce minimum % globally or per-folder first?
- **`dapreview` / `da.js`:** Keep integration-style test or mark optional when `tools/` not present?

## References

- `package.json` — `test`, `test:watch`, `test:file` scripts  
- `test/scripts/*.test.js` — existing WTR examples  
- [Playwright](https://playwright.dev/) — test runner and browser automation  
- [`@axe-core/playwright`](https://github.com/dequelabs/axe-core-npm/tree/develop/packages/playwright) — axe integration for Playwright  
- `.github/PULL_REQUEST_TEMPLATE.md` — reviewer expectations for tests and a11y  
- `.ai/skills/create-new-block/SKILL.md` — asks block testing convention; update when Phase 2 pattern exists  

---

*Last updated: assumes team adopts Playwright + `@axe-core/playwright` for Pattern Library and a11y automation.*
