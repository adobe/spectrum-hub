# Link check

A [Playwright](https://playwright.dev/) crawl that walks the site's navigation and reports every broken link it finds, rather than stopping at the first one. It's on-demand/scheduled (see [`.github/workflows/link-check.yml`](../../.github/workflows/link-check.yml)), not a PR gate — a full-site crawl is slower and more prone to third-party flakiness than the per-block checks in [`test/a11y/`](../a11y/).

## Why this exists (prior art)

No Adobe/EDS platform feature does an automated, whole-site link crawl for us:

- **AEM's built-in Link Checker** validates links in content stored *in AEM*, and does not cover EDS document-based authoring (our source is documents, not AEM).
- **AEM Sites Optimizer / SpaceCat** offers `broken-internal-links` / `broken-backlinks` audits for EDS, but internal-link detection is RUM-based ("if no one clicks the link, it won't be found"), runs weekly, and is an entitlement-gated product — not a proactive crawl in this repo's CI.
- **Milo's Preflight** does per-page link checks, but only interactively (launched from the sidekick, one page at a time) and its full status validation depends on the VPN-gated internal "Spidy" service.

This crawl fills that gap: proactive, whole-site, runs in our own CI on a schedule. Its render-based discovery and HEAD→GET status pattern mirror what Milo's Preflight does per page.

## How it works

The crawl is split into two independent passes:

1. **Discovery** ([`link-check.spec.js`](./link-check.spec.js)) — starting at `/`, each page is rendered with `page.goto()` + `waitForLoadState('networkidle')` (the same convention as [`test/a11y/accessibility.homepage.spec.js`](../a11y/accessibility.homepage.spec.js)), because this site hydrates nav, footer, and block content client-side — a raw HTTP fetch of a page's HTML never contains its real links. Every `<a href>` found is classified ([`lib/crawl.js`](./lib/crawl.js)) as an internal page to queue, an external link to check, a same-page hash link to validate against the current DOM, or skipped (`mailto:`, `tel:`, `javascript:`).
2. **Validation** — once discovery finishes (or hits the page cap), every unique internal/external URL found is checked with a parallel `request.head()` → `request.get()` fallback (via [`mapWithConcurrency`](../../tools/indexer/aem-client.js), reused from the Algolia indexer), not by re-rendering it. This is what makes the crawl fast — status checks are cheap HTTP requests, not browser navigations.

A broken link doesn't stop the run: the whole crawl uses a single `expect.soft()` at the end, so every page still gets visited and every link still gets checked even after the first failure. A Markdown + JSON report is written to `test-results/link-check/` and attached to the Playwright HTML report either way.

**Internal vs external breakage.** The report splits broken links into two sections, and the run only *fails* on internal breakage — our own pages, hash targets, and malformed hrefs. External failures (a third-party WAF hiccup, a rate limit, a transient 5xx) are listed for visibility but don't redden a scheduled run, since they aren't our content to fix and would otherwise bury real internal problems. Status checks also retry once on a network error or 5xx to absorb one-off blips.

## Known false positives to watch for

Some external sites' WAFs behave inconsistently with HEAD requests or with certain User-Agent strings:

- **HEAD/GET inconsistency** (e.g. Figma always 404s HEAD but 200s GET for the same URL) — handled by the GET fallback whenever HEAD fails.
- **User-Agent-based blocking** — deliberately *not* worked around by spoofing a browser UA. w3.org's WAF 403s a spoofed desktop-Chrome string while allowing Playwright's own default UA through on both verbs; the default is the safer choice, not just the honest one. If a new site shows up as a false positive, check the actual failure mode (`curl -I` vs `curl` with and without `-A`) before reaching for a UA change — it's easy to fix one site and break another.

## Running it

```bash
# Against a local aem up dev server (spins one up automatically on :3002)
npm run test:links:local

# Against a deployed site (defaults to production; override with LINKCHECK_BASE_URL)
npm run test:links:deployed
LINKCHECK_BASE_URL=https://<branch>--spectrum-hub--adobe.aem.page npm run test:links:deployed
```

Useful overrides:

- `LINKCHECK_MAX_PAGES` (default 300) — caps how many pages discovery renders. The report notes when the crawl was truncated by this cap.
- `LINKCHECK_CONCURRENCY` (default 8) — how many link-status checks run in parallel during validation.
