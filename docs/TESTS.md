# Tests

Spectrum Hub uses separate runners for browser unit tests, Node tests,
accessibility checks, full-site link crawls, linting, and edge code. There is no
single root command that runs every repository check.

## Setup

Use Node.js 24 and install root dependencies:

```bash
nvm use
npm ci
```

Install Chromium for accessibility and link-check tests:

```bash
npx playwright install chromium
```

Install all three browsers before running the end-to-end smoke suite:

```bash
npx playwright install chromium firefox webkit
```

CI adds `--with-deps` because Linux runners also need browser system packages.

## Command matrix

| Command | What it covers | Typical use |
| --- | --- | --- |
| `npm test` | Root Web Test Runner unit tests plus extraction, indexer, and link-check Node tests | Core code validation |
| `npm run test:unit` | Browser unit tests matching `test/**/*.test.js` | Blocks, scripts, and browser helpers |
| `npm run test:watch` | Unit tests in watch mode | Local iteration |
| `npm run test:extractions` | `test/extractions/` Node tests | RSP/SWC extraction changes |
| `npm run test:indexer` | `test/indexer/` Node tests | Algolia index-record changes |
| `npm run test:links:unit` | `test/link-check/lib/` Node tests | Link crawler logic without crawling a site |
| `npm run test:a11y` | Playwright axe scans and accessibility-tree snapshots | Block, shared page structure, and custom-element accessibility |
| `npm run test:e2e` | Pattern Library smoke tests in Chromium, Firefox, and WebKit | Full-page composition and stable block hooks |
| `npm run test:e2e:ui` | The smoke suite in Playwright UI mode | Local smoke-test authoring and debugging |
| `PLAYWRIGHT_BASE_URL=<url> npm run test:e2e` | The same smoke suite against a deployed site | Branch preview or production validation |
| `npm run test:links:local` | Playwright crawl against local `aem up` | Full navigation/link validation |
| `LINKCHECK_BASE_URL=<url> npm run test:links:deployed` | Playwright crawl against a deployed site | Branch preview or production validation |
| `npm run lint` | JavaScript and CSS lint | Pull-request validation |
| `npm run lint:js` | ESLint only | JavaScript iteration |
| `npm run lint:css` | Stylelint only | CSS iteration |

`npm test` is the core suite, not the full suite. It does not run Playwright
accessibility scans, end-to-end smoke tests, full link crawls, lint, or the two
edge packages under `workers/` (see [Edge tests](#edge-tests)).

## Browser unit tests

[`web-test-runner.config.mjs`](../web-test-runner.config.mjs) collects
`test/**/*.test.js`, then excludes `test/extractions/`, `test/indexer/`, and
`test/link-check/` — those are Node tests with their own commands. The config also
accepts `test/**/*.test.html`, though no fixture-page tests use that form today.
Specifiers like `lit` resolve through `nodeResolve` rather than a browser import map.
Tests commonly use Mocha, Chai, and Sinon.

Run one file:

```bash
npm run test:file -- test/blocks/example.test.js
```

Run files matching a path pattern:

```bash
npm run test:file -- "test/scripts/**/*.test.js"
```

Prefer testing observable block output and focused helper behavior. Reset the
DOM, stubs, local storage, and imported state between cases so results do not
depend on execution order.

Use inline DOM setup in `*.test.js` for focused block and helper behavior. Keep
the markup near the assertion, and extract a local helper when several cases
share the same authored shape.

The repository does not currently use a generic `test/fixtures/*.html`
directory for Web Test Runner. Use a standalone HTML fixture only when the
behavior requires a real page load or the full decoration pipeline. Playwright
accessibility fixtures belong in `test/a11y/fixtures/` and must follow
[`test/a11y/README.md`](../test/a11y/README.md). Do not move small unit-test
markup into a shared HTML file only to reduce line count.

## Accessibility tests

`test/a11y/` uses Playwright to run:

- axe-core WCAG 2.2 AA scans
- `toMatchAriaSnapshot()` accessibility-tree assertions
- block/custom-element coverage checks

Each block and shared custom element must have a matching spec. Fixtures live
under `test/a11y/fixtures/` and model the authored HTML before decoration.

Run the suite:

```bash
npm run test:a11y
```

Specs are grouped by what they cover: `test/a11y/blocks/<name>.spec.js` for blocks and
`test/a11y/custom-components/<name>.spec.js` for the shared `se-*` elements. Run one:

```bash
npx playwright test test/a11y/blocks/columns.spec.js
```

Update a snapshot only after reviewing the semantic change:

```bash
npx playwright test test/a11y/blocks/columns.spec.js --update-snapshots
```

Read [`test/a11y/README.md`](../test/a11y/README.md) before adding or changing a
fixture. It documents the page harness, route mocks, authored-markup constraints,
snapshot conventions, and known issues.

## End-to-end smoke tests

`test/e2e/` uses Playwright to verify that representative Pattern Library pages
load and compose stable repository-owned block hooks. The initial routes are:

| Route | Expected hook |
| --- | --- |
| `/docs/pattern-library/cards` | `.card-content-container` |
| `/docs/pattern-library/table` | `.table table` |
| `/docs/pattern-library/playground` | `.playground-layout` |

Run the local suite:

```bash
npm run test:e2e
```

The smoke configuration starts `aem up` on port 3003 and proxies public content
from the main `.aem.live` origin. To run the same contract against a deployed
environment:

```bash
PLAYWRIGHT_BASE_URL=https://<branch>--spectrum-hub--adobe.aem.live npm run test:e2e
```

Set `PLAYWRIGHT_BASE_URL` inline as shown or export it in your shell. The test
command does not load the repository's `.env` file.

Use Web Test Runner for focused JavaScript behavior that can be expressed with
an isolated DOM. Use the smoke suite when a regression would appear only after
a complete page loads and decorates its blocks. Keep smoke assertions on
repository-owned classes or data attributes. Do not assert exact copy,
screenshots, or Spectrum implementation internals.

Web Test Runner collects coverage during `test:unit`, `test:file`, and watch
runs because those scripts pass `--coverage`. Playwright smoke tests protect
page composition and do not produce JavaScript coverage.

Before opening a pull request, use the repository template to record which
automated suites ran and how affected pages were browser tested. Automated
tests do not replace the template's manual keyboard and screen-reader checks
when a change affects interaction, semantics, or accessibility.

## Link checks

`npm run test:links:unit` validates crawler logic with Node tests and is included in
`npm test`.

`npm run test:links:local` starts `aem up` on port 3002 and crawls the local site
in Chromium. To crawl a deployed site instead:

```bash
LINKCHECK_BASE_URL=https://<branch>--spectrum-hub--adobe.aem.page npm run test:links:deployed
```

The scheduled GitHub workflow crawls
`https://main--spectrum-hub--adobe.aem.live` daily and accepts a different
`base_url` through manual dispatch.

## Extraction and indexer tests

The extraction suites validate the scripts that convert upstream React Spectrum
and Spectrum Web Components metadata into repository-owned generated data:

```bash
npm run test:extractions
```

The indexer suite validates record construction, URL handling, and content
normalization without writing to Algolia:

```bash
npm run test:indexer
```

Use the indexer's dry-run mode for end-to-end record generation:

```bash
node tools/indexer/index.js --dry-run
```

It still fetches the configured source index but does not publish records.

## Edge tests

"Edge packages" means the two directories under `workers/`. Each is a self-contained
npm package with its own `package.json`, lockfile, and `node_modules`, so the root
`npm test` does not reach them. [`eslint.config.js`](../eslint.config.js) ignores
`workers/**` for the same reason. Install and run each one on its own.

`workers/website-lambda/` is the current AWS Lambda edge behind CloudFront:

```bash
cd workers/website-lambda
npm ci
npx vitest run
```

`workers/website/` is the legacy Cloudflare Worker, kept as reference rather than
deployed:

```bash
cd workers/website
npm ci
npm test
```

The two commands differ because `workers/website` declares vitest as a devDependency and
defines `"test": "vitest run"`, so `npm test` works there. `workers/website-lambda`
declares no vitest devDependency and no `test` script, even though it has test files
throughout `lib/`, `handlers/`, and `cloudfront-functions/` — so its suite has to be
invoked with `npx`, which fetches vitest from the registry at run time.

Run the Lambda tests when changing authentication, JWT/session behavior,
audience filtering, query-index or sitemap filtering, cache semantics, secrets,
CloudFront functions, or the proxy handler.

## CI mapping

| Workflow | Trigger | Checks |
| --- | --- | --- |
| `.github/workflows/lint.yml` | Pull requests to `main` | Root JavaScript and CSS lint |
| `.github/workflows/test.yml` | Pull requests to `main` | Unit, extraction, indexer, and link-unit matrix |
| `.github/workflows/a11y.yml` | Pull requests to `main` | Playwright accessibility suite and coverage |
| `.github/workflows/e2e.yml` | Pull requests to `main` | Chromium, Firefox, and WebKit Pattern Library smoke tests |
| `.github/workflows/link-check.yml` | Daily 06:00 UTC/manual | Full deployed-site crawl, with an optional `base_url` input |
| `.github/workflows/index-algolia.yml` | Every 12 hours/manual | Algolia record build and publish |
| `.github/workflows/extract-rsp-properties.yml` | Daily 07:00 UTC/manual | Refresh generated RSP data, then rebuild the status index |
| `.github/workflows/extract-swc-properties.yml` | Daily 06:00 UTC/manual | Refresh generated SWC data, then rebuild the status index |

Read the workflow when reproducing a CI failure. It is authoritative for the
Node version, environment variables, browser installation, and command.

## What to run

| Change | Minimum focused validation |
| --- | --- |
| Block JavaScript | Targeted unit test and block accessibility spec |
| Block CSS | `npm run lint:css` and block accessibility spec |
| `scripts.js`, `ak.js`, or `lazy.js` | Related unit tests, affected accessibility specs, then `npm test` |
| Accessibility fixture/harness | Targeted spec plus the a11y coverage spec |
| Full-page composition or stable page hooks | `npm run test:e2e` |
| RSP/SWC extraction | `npm run test:extractions` and the relevant regeneration command |
| Algolia indexer | `npm run test:indexer` and dry-run when configuration is available |
| Link crawler | `npm run test:links:unit`, then the local or deployed crawl |
| Lambda edge | Lambda Vitest suite |
| Documentation only | Link/path and factual-command review; no code suite unless docs are generated or executable |

Escalate from the smallest command that covers the change. Before opening a pull
request, run every independent suite affected by the files changed.

## Related guides

- [Architecture](./ARCHITECTURE.md)
- [Blocks](./BLOCKS.md)
- [Dependencies and generated data](./DEPS.md)
