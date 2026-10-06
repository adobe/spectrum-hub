# Tests

Spectrum Hub uses separate runners for browser unit tests, Node tests,
accessibility checks, full-site link crawls, linting, and edge code. There is no
single root command that runs every repository check.

## Setup

Use Node.js 20 and install root dependencies:

```bash
npm ci
```

Install Chromium before the Playwright suites:

```bash
npx playwright install chromium
```

CI uses `npx playwright install --with-deps chromium` because the Linux runner
also needs browser system packages.

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
| `npm run test:links:local` | Playwright crawl against local `aem up` | Full navigation/link validation |
| `LINKCHECK_BASE_URL=<url> npm run test:links:deployed` | Playwright crawl against a deployed site | Branch preview or production validation |
| `npm run lint` | JavaScript and CSS lint | Pull-request validation |
| `npm run lint:js` | ESLint only | JavaScript iteration |
| `npm run lint:css` | Stylelint only | CSS iteration |

`npm test` is the core suite, not the full suite. It does not run Playwright
accessibility scans, full link crawls, lint, or the edge packages.

## Browser unit tests

Web Test Runner runs `test/**/*.test.js` in headless Chrome using the project's
import map. Tests commonly use Mocha, Chai, and Sinon.

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

Run one spec:

```bash
npx playwright test test/a11y/example.spec.js
```

Update a snapshot only after reviewing the semantic change:

```bash
npx playwright test test/a11y/example.spec.js --update-snapshots
```

Read [`test/a11y/README.md`](../test/a11y/README.md) before adding or changing a
fixture. It documents the page harness, route mocks, authored-markup constraints,
snapshot conventions, and known issues.

## Link checks

`npm run test:links:unit` validates crawler logic with Node tests and is included in
`npm test`.

`npm run test:links:local` starts `aem up` on port 3002 and crawls the local site
in Chromium. To crawl a deployed site instead:

```bash
LINKCHECK_BASE_URL=https://<branch>--spectrum-hub--adobe.aem.page \
  npm run test:links:deployed
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

Edge packages are outside the root `npm test`.

Current AWS Lambda tests:

```bash
cd workers/website-lambda
npm ci
npx vitest run
```

Legacy Cloudflare Worker tests:

```bash
cd workers/website
npm ci
npm test
```

Run the Lambda tests when changing authentication, JWT/session behavior,
audience filtering, query-index or sitemap filtering, cache semantics, secrets,
CloudFront functions, or the proxy handler.

## CI mapping

| Workflow | Trigger | Checks |
| --- | --- | --- |
| `.github/workflows/lint.yml` | Pull requests to `main` | Root JavaScript and CSS lint |
| `.github/workflows/test.yml` | Pull requests to `main` | Unit, extraction, indexer, and link-unit matrix |
| `.github/workflows/a11y.yml` | Pull requests to `main` | Playwright accessibility suite and coverage |
| `.github/workflows/link-check.yml` | Daily/manual | Full deployed-site crawl |
| `.github/workflows/index-algolia.yml` | Every 12 hours/manual | Algolia record build and publish |
| extraction workflows | Scheduled/manual | Refresh generated RSP and SWC data |

Read the workflow when reproducing a CI failure. It is authoritative for the
Node version, environment variables, browser installation, and command.

## What to run

| Change | Minimum focused validation |
| --- | --- |
| Block JavaScript | Targeted unit test and block accessibility spec |
| Block CSS | `npm run lint:css` and block accessibility spec |
| `scripts.js`, `ak.js`, or `lazy.js` | Related unit tests, affected accessibility specs, then `npm test` |
| Accessibility fixture/harness | Targeted spec plus the a11y coverage spec |
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