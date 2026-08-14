# Vendored dependencies

This directory holds third-party code copied verbatim into the Lambda so the
function stays self-contained: it deploys as a raw zip with no `npm install` and
no `node_modules` (see [`../../deploy.sh`](../../deploy.sh)).

## `node-html-parser.mjs`

- **Upstream:** [`node-html-parser`](https://www.npmjs.com/package/node-html-parser)
- **Version:** 9.0.1
- **License:** MIT
- **Source file:** `node_modules/node-html-parser/dist/index.mjs`, copied
  verbatim. That build is a single self-contained ES module with **zero external
  runtime imports** (its own deps, `css-select` and `entities`, are inlined), so
  it runs unchanged on `nodejs22.x` (and any Web-standard JS runtime) with no
  bundler.

Used by [`../audience.js`](../audience.js) to locate `audience-*` content blocks
for server-side removal. Chosen over JSDOM / Cloudflare `HTMLRewriter` because it
is service-agnostic.

### Updating

`node-html-parser` is already a dependency of the repo root, so bump it there and
re-copy the built file:

```sh
# from the repo root, after updating the root dependency
cp node_modules/node-html-parser/dist/index.mjs \
   workers/website-lambda/lib/vendor/node-html-parser.mjs
```

Then update the version noted above and re-run the Lambda test suite
(`cd workers/website-lambda && npx vitest run`).
