# Playground Coordinator Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Preserve every playground behavior while reducing duplicate requests and transferred bytes without delaying the first preview.

**Architecture:** Keep model construction, controls, disclosure, and serializers in the existing `playground.js` and `playground-data.js` browser graph. Add one page-level coordinator for shared fetches, frame lifecycle, messaging, and theme synchronization; generate a committed package-aware RSP runtime manifest during extraction; and use one dynamically imported renderer adapter inside each isolated iframe.

**Tech Stack:** Native ES modules, DOM APIs, `postMessage`, React Spectrum S2 from esm.sh, Spectrum Web Components from esm.sh, Node.js extraction scripts, Web Test Runner, Node test runner, Playwright, Chrome DevTools Protocol, axe-core

---

## Required context

Read before implementation:

- Design: `.ai/docs/specs/2026-09-11-playground-coordinator-design.md`
- Consumer contract: `deps/docs/PLAYGROUND-CONTRACT.md`
- Accessibility conventions: `test/a11y/README.md`
- Repository instructions: `.ai/README.md`

Use `@test-driven-development` for every behavior change. Use `@accessibility-compliance` when changing preview errors, labels, regions, or interaction tests. Use `@verification-before-completion` before each commit and before the final handoff.

Do not remove iframe isolation, add a browser bundling step, or split controls, disclosure, models, or serializers into new browser modules. The normal browser path may add only `playground-coordinator.js` in the parent and one selected adapter in each frame.

## Target file structure

### Parent browser graph

- `blocks/playground/playground.js`: authored metadata, model construction, controls, disclosure, serializers, iframe creation, and block composition
- `blocks/playground/playground-data.js`: workbook/catalog policy, property resolution, default/option overrides, and pure control helpers
- `blocks/playground/playground-coordinator.js`: the only new parent browser module; URL-keyed fetch cache, runtime-manifest loading, frame registry, one message listener, one body observer, errors, diagnostics, and cleanup

### Preview browser graph

- `blocks/playground/preview/index.html`: shared document and inline classic-script bootstrap for `shell-ready`, `preview-init`, queued updates, theme dispatch, and structured adapter errors
- `blocks/playground/preview/image-preview.js`: iOS and Android image renderer
- `deps/rsp/playground/rsp-preview.js`: RSP concrete URL imports, React tree construction, selected styles, overlays, sizing, updates, and fallback diagnostics
- `deps/swc/playground/swc-preview.js`: SWC registration, fragment mounting, labels, slots, icons, trigger repairs, and updates

Retain focused existing helpers such as `build-composite-element.js`, `apply-rsp-prop.js`, `overlay-triggers.js`, `apply-swc-prop.js`, `define-swc.js`, and the shared attribute/icon/unset helpers. Delete old shell/protocol helpers only after the shared shell passes all behavior tests.

### Node-only runtime-manifest graph

- `deps/rsp/playground-runtime-sources.js`: package-aware source configuration and canaries
- `deps/rsp/build-playground-runtime-manifest.js`: pure file-list, ESM-graph, CSS matching, ordering, and manifest-building functions
- `deps/rsp/generate-playground-runtime-manifest.js`: network/filesystem entry point
- `deps/rsp/playground/runtime-manifest.json`: committed generated artifact

Node-only helpers may remain separate because they do not add browser requests.

## Task 1: Characterize behavior and establish performance baselines

**Files:**

- Modify: `test/blocks/playground.test.js`
- Modify: `blocks/playground/index.html`
- Modify: `deps/rsp/playground/index.html`
- Modify: `deps/swc/playground/index.html`
- Create: `test/a11y/fixtures/playground-multiple.html`
- Create: `test/a11y/blocks/playground-performance.spec.js`
- Create: `test/a11y/baselines/playground-performance.json`
- Create: `test/a11y/baselines/playground-live-before.json`
- Create: `test/a11y/compare-playground-performance.js`
- Modify: `test/a11y/mocks.js`

- [ ] **Step 1: Add a two-playground unit fixture**

Add a helper that initializes two blocks with independently controlled iframe windows and fetch stubs. Cover one repeated-component pair and one distinct-component pair.

```js
async function initPlaygrounds(entries) {
  const blocks = entries.map((meta) => {
    const block = makeMetaEl(meta);
    document.body.append(block);
    return block;
  });
  await Promise.all(blocks.map((block) => init(block)));
  return blocks;
}
```

- [ ] **Step 2: Add passing characterization assertions**

Assert the current contract before refactoring:

- Workbook component and control tabs are fetched once per workbook URL.
- Repeated catalog and snippet URLs are fetched once by the parent.
- Each frame receives only its own readiness responses and updates.
- Snippet-authored text, boolean shorthand, and numeric expressions seed controls.
- Avatar uses numeric size options.
- `ImageIllustration` produces a copied external import and a typed live-preview value.

- [ ] **Step 3: Add deterministic request and byte instrumentation**

Create a Chromium-only Playwright test that opens `playground-multiple.html`, attaches a CDP session, records `Network.requestWillBeSent` and `Network.loadingFinished`, and writes a stable summary:

```js
{
  requests: [{ url, resourceType, encodedDataLength }],
  totals: { requests, encodedDataLength },
  marks: { firstShellReady, firstPreviewInit, firstPreviewMounted }
}
```

Route package/CDN URLs to deterministic fixtures. Run one warm-up in a disposable context, then five measured runs in fresh contexts with empty HTTP caches. Sort request records by normalized URL before comparing.

- [ ] **Step 4: Add a behavior-neutral baseline mount mark**

Make each current shell post `preview-mounted` immediately after its first successful mount, without changing readiness, data fetching, or rendering. The performance fixture uses navigation start to the first `preview-mounted` as the pre-refactor timing baseline. Check in the median request/byte baseline, current duplicate metadata/listing/style requests, and `git rev-parse HEAD` under a permanent `beforeRefactor` key; later tasks add final expectations without overwriting it.

Add `compare-playground-performance.js`, which accepts before/after JSON paths, verifies both contain five measured runs and source revisions, compares medians, and exits nonzero unless requests/encoded bytes decrease and first-preview time is within 5%.

- [ ] **Step 5: Capture the live pre-refactor benchmark**

Run the same Playwright spec without CDN route mocks:

```bash
PLAYGROUND_BENCHMARK_MODE=live \
PLAYGROUND_BENCHMARK_LABEL=before \
PLAYGROUND_BENCHMARK_OUTPUT=test/a11y/baselines/playground-live-before.json \
npx playwright test test/a11y/blocks/playground-performance.spec.js --project=chromium
```

Expected: PASS and a revisioned artifact containing five measured live-CDN runs.

- [ ] **Step 6: Run the baseline tests**

```bash
npm run test:file -- test/blocks/playground.test.js
npx playwright test test/a11y/blocks/playground-performance.spec.js --project=chromium
```

Expected: PASS and a stable baseline generated from mocked resources.

- [ ] **Step 7: Commit the characterization**

```bash
git add blocks/playground/index.html deps/rsp/playground/index.html deps/swc/playground/index.html test/blocks/playground.test.js test/a11y/fixtures/playground-multiple.html test/a11y/blocks/playground-performance.spec.js test/a11y/baselines/playground-performance.json test/a11y/baselines/playground-live-before.json test/a11y/compare-playground-performance.js test/a11y/mocks.js
git commit -m "test(playground): baseline multi-preview performance"
```

## Task 2: Generate the package-aware RSP runtime manifest

**Files:**

- Create: `deps/rsp/playground-runtime-sources.js`
- Create: `deps/rsp/build-playground-runtime-manifest.js`
- Create: `deps/rsp/generate-playground-runtime-manifest.js`
- Create: `deps/rsp/playground/runtime-manifest.json`
- Create: `test/extractions/rsp-runtime-manifest.node.test.js`
- Modify: `scripts/utils/implementations.js`
- Modify: `test/extractions/implementations.node.test.js`
- Modify: `deps/rsp/locate-published-files.js`
- Modify: `deps/rsp/discover-components.js`
- Modify: `deps/rsp/build-ts-checker.js`
- Modify: `deps/rsp/extract-props.js`
- Modify: `test/extractions/discover-components.node.test.js`
- Modify: `test/extractions/rsp-locate-published-files.node.test.js`
- Modify: `test/extractions/rsp-build-ts-checker.node.test.js`
- Modify: `.github/workflows/extract-rsp-properties.yml`
- Modify: `.github/workflows/test.yml`

- [ ] **Step 1: Write failing source-isolation and graph tests**

Use in-memory S2 and synthetic second-source fixtures. Assert:

- Every source retains its own package name/version, React imports, page styles, exports, and external modules.
- Relative and bare ESM imports resolve without leaking files between sources.
- Reachable module CSS is included and unrelated CSS is omitted.
- `ActionButton` includes `ProgressCircle.css`.
- `ImageIllustration` resolves to its public module and copied export name.
- Keys and arrays are emitted in stable lexical order.
- An unresolved configured entry, missing referenced module, or failed canary rejects generation.
- A version mismatch between extraction input and generated runtime source rejects generation.

- [ ] **Step 2: Run the manifest tests and verify they fail**

```bash
node --test test/extractions/rsp-runtime-manifest.node.test.js
```

Expected: FAIL because the source registry and generator do not exist.

- [ ] **Step 3: Define package-aware source configuration**

Add browser-neutral runtime source identity and fallback discovery data to the existing implementation registry module so the normal parent graph gains no module:

```js
export const PLAYGROUND_RUNTIME_SOURCES = {
  s2: {
    packageName: '@react-spectrum/s2',
    metadataUrl: 'https://esm.sh/@react-spectrum/s2/package.json',
    listingUrl: 'https://data.jsdelivr.com/v1/package/npm/@react-spectrum/s2@{version}/flat',
  },
};
```

The Node-only source registry imports that identity and adds extraction-only component rosters, external modules, and canaries:

```js
export const PLAYGROUND_RUNTIME_SOURCES = {
  s2: {
    packageName: '@react-spectrum/s2',
    componentRoster: new URL('./components.json', import.meta.url),
    externalModules: {
      ImageIllustration: {
        specifier: '@react-spectrum/s2/illustrations/gradient/generic1/Image',
        exportName: 'default',
      },
    },
    canaries: {
      ActionButton: ['/dist/private/ProgressCircle.css'],
    },
  },
};
```

Use distinct export names for the browser-neutral and Node-enriched registries if needed to avoid an import collision. Include provider, text, overlay, and shared composite entries in configuration rather than hard-coding them in the crawler. Tests must prove every implementation `runtimeSource` has fallback data and every Node source extends the same package identity.

- [ ] **Step 4: Implement pure runtime graph traversal**

`build-playground-runtime-manifest.js` must:

1. Resolve source package and peer React versions.
2. Normalize the published flat file list.
3. Fetch each configured public ESM entry through an injected loader.
4. Parse static `import`, `export ... from`, and literal dynamic-import specifiers.
5. Resolve relative modules inside the same concrete package version.
6. Traverse each entry with a shared URL cache and cycle protection.
7. Match reachable package modules to published CSS paths.
8. Emit concrete module descriptors, import URLs, selected styles, `allStyles`, and source versions.
9. Validate canaries and sort output deterministically.

Do not execute fetched modules or use regex to infer CSS from component names alone.

- [ ] **Step 5: Implement the generator CLI and committed artifact**

`generate-playground-runtime-manifest.js` supplies real fetch/filesystem adapters, builds every configured source, validates `schemaVersion`, and writes `deps/rsp/playground/runtime-manifest.json` with a trailing newline. Export `main()` for tests and run it only when invoked directly.

Support three deterministic modes:

- Default: resolve the latest concrete source versions and write the manifest.
- `--locked`: reuse source versions from the committed/current manifest while rebuilding against the current component roster.
- `--check`: reuse committed source versions, build the complete JSON string in memory, compare it byte-for-byte with the committed file, and exit nonzero with a regeneration instruction when they differ.

Unit-test matching, stale artifact, and locked-version cases.

- [ ] **Step 6: Add generation to the extraction workflow**

Resolve one concrete release before discovery, then keep that version locked through discovery, final manifest generation, and property extraction:

```yaml
- name: Resolve playground runtime versions
  run: node deps/rsp/generate-playground-runtime-manifest.js

- name: Discover published S2 components
  run: node deps/rsp/discover-components.js

- name: Generate manifest for discovered components
  run: node deps/rsp/generate-playground-runtime-manifest.js --locked
```

Add `deps/rsp/playground/runtime-manifest.json` to the workflow's `git add` command. Existing extraction tests must fail if regenerated output, source versions, or canaries are invalid.

After generation, run:

```yaml
- name: Verify committed runtime manifest
  run: node deps/rsp/generate-playground-runtime-manifest.js --check
```

Add the same `node deps/rsp/generate-playground-runtime-manifest.js --check` command to `.github/workflows/test.yml` after `npm ci`. This pull-request check regenerates against the committed exact versions, so source/config/roster drift cannot merge while upstream publication timing cannot make CI nondeterministic.

- [ ] **Step 7: Pin property extraction to the generated S2 version**

Read the generated `sources.s2.packageVersion` in both `discover-components.js` and `extract-props.js`. Pass it through discovery and `crawl()` to the CDN URL resolver. Extend `cdnUrlsForCanonicalPath()` so canonical `@react-spectrum/s2/...` paths use `@react-spectrum/s2@<manifest-version>/...`; leave dependency packages on their existing resolution rules.

Add tests proving component discovery and declaration URLs include the same manifest version and that a missing/invalid version fails before discovery or extraction. This makes the roster, property catalogs, and runtime modules originate from one S2 release rather than three independent `latest` resolutions.

- [ ] **Step 8: Run generation and extraction tests**

```bash
node deps/rsp/generate-playground-runtime-manifest.js
node deps/rsp/discover-components.js
node deps/rsp/generate-playground-runtime-manifest.js --locked
node deps/rsp/generate-playground-runtime-manifest.js --check
node --test test/extractions/rsp-runtime-manifest.node.test.js test/extractions/discover-components.node.test.js test/extractions/rsp-locate-published-files.node.test.js test/extractions/rsp-build-ts-checker.node.test.js test/extractions/resolve-stylesheet-hrefs.node.test.js
npm run lint:js
```

Expected: all commands exit 0; the committed manifest includes `ActionButton` → `ProgressCircle.css`.

- [ ] **Step 9: Commit the generator**

```bash
git add scripts/utils/implementations.js deps/rsp/playground-runtime-sources.js deps/rsp/build-playground-runtime-manifest.js deps/rsp/generate-playground-runtime-manifest.js deps/rsp/playground/runtime-manifest.json deps/rsp/locate-published-files.js deps/rsp/discover-components.js deps/rsp/build-ts-checker.js deps/rsp/extract-props.js test/extractions/implementations.node.test.js test/extractions/rsp-runtime-manifest.node.test.js test/extractions/discover-components.node.test.js test/extractions/rsp-locate-published-files.node.test.js test/extractions/rsp-build-ts-checker.node.test.js .github/workflows/extract-rsp-properties.yml .github/workflows/test.yml
git commit -m "feat(playground): generate RSP runtime manifest"
```

## Task 3: Consolidate the serializable playground model in existing modules

**Files:**

- Modify: `blocks/playground/playground.js`
- Modify: `blocks/playground/playground-data.js`
- Modify: `test/blocks/playground.test.js`
- Modify: `test/extractions/playground-data.node.test.js`

- [ ] **Step 1: Write failing model-contract tests**

Export only the pure builders needed by tests. Assert that an RSP, SWC, Tooltip route, and image model can pass `structuredClone()` and contain:

```js
{
  component: 'avatar',
  implementation: 'rsp',
  adapter: 'rsp',
  previewName: 'Avatar',
  snippetMarkup: '<Avatar size={16} />',
  descriptors: [{
    property: 'size',
    valueKind: 'number',
    target: 'route-prop',
    defaultValue: 16,
  }],
  values: { size: 16 },
}
```

Also assert explicit targets for content, real labels, icons, route-owned props, overlay-owned props, and SWC attributes.

Add a deferred-fetch lifecycle test: after valid authored metadata is read, the iframe is attached and its `src` is assigned before workbook, catalog, or snippet promises resolve. Resolving one playground's inputs must not wait for a sibling's deferred inputs.

- [ ] **Step 2: Run focused tests and verify the new assertions fail**

```bash
npm run test:file -- test/blocks/playground.test.js
node --test test/extractions/playground-data.node.test.js
```

Expected: FAIL because current descriptors do not contain the complete preview policy.

- [ ] **Step 3: Add policy fields without creating a model module**

Extend `buildControlDescriptors()` and existing helpers in `playground.js`/`playground-data.js`. Preserve this default precedence exactly:

1. Cross-property safety override
2. Snippet-authored value
3. Catalog default
4. First control option
5. Placeholder only when no earlier source contributes a value

Keep booleans and numbers typed from fragment parsing through control state, messages, React props, and JSX serialization. Preserve Avatar's numeric option override and external illustration import serialization.

- [ ] **Step 4: Start each shell before awaiting model inputs**

After validating authored component and implementation metadata, create and attach that block's iframe immediately. Start workbook, catalog, snippet, and applicable runtime-manifest requests in parallel. Do not await another playground and do not add a page-wide `Promise.all`.

During this migration task, the existing shell can retain its current independent mount behavior. After the final protocol lands, the early shell waits at `shell-ready` until its own model is complete.

- [ ] **Step 5: Build one plain model before controls or initialization**

The model contains resolved names, snippet markup, descriptors, current values, prop owner, overlay configuration, adapter, runtime source, and implementation-specific targets. It contains no functions, DOM nodes, imported modules, `Map`, or `Set`.

Only after that block's inputs resolve, build its model, render its controls/disclosure, and make the model available to the current/final preview initialization path. Keep UI construction and serializers in `playground.js`; this task consolidates policy, not files.

- [ ] **Step 6: Run current behavior and model tests**

```bash
npm run test:file -- test/blocks/playground.test.js
node --test test/extractions/playground-data.node.test.js test/extractions/apply-rsp-prop.node.test.js test/extractions/build-composite-element.node.test.js
```

Expected: PASS with unchanged snippets, typed values, controls, overlays, and external imports.

- [ ] **Step 7: Commit the model consolidation**

```bash
git add blocks/playground/playground.js blocks/playground/playground-data.js test/blocks/playground.test.js test/extractions/playground-data.node.test.js
git commit -m "refactor(playground): centralize preview policy"
```

## Task 4: Add the page-level coordinator and shared resource ownership

**Files:**

- Create: `blocks/playground/playground-coordinator.js`
- Create: `test/blocks/playground-coordinator.test.js`
- Modify: `blocks/playground/playground.js`
- Modify: `blocks/playground/playground-data.js`
- Modify: `test/blocks/playground.test.js`
- Modify: `test/extractions/playground-data.node.test.js`

- [ ] **Step 1: Write failing coordinator tests**

Use two fake iframes with distinct `contentWindow` objects. Cover:

- One `message` listener and one body observer per coordinator.
- URL-keyed concurrent fetch sharing and settled-value reuse.
- Rejected fetch eviction and retry.
- `shell-ready` routing by `event.source`, not frame identifiers alone.
- Exactly one `preview-init` per registered frame.
- Targeted `prop-update`; theme broadcast to connected frames.
- `preview-mounted`, `preview-error`, and recovered `preview-diagnostic` callbacks.
- Unknown sources and mismatched frame identifiers are ignored.
- Explicit unregister and disconnected-frame pruning are idempotent.

- [ ] **Step 2: Run coordinator tests and verify they fail**

```bash
npm run test:file -- test/blocks/playground-coordinator.test.js
```

Expected: FAIL because `playground-coordinator.js` does not exist.

- [ ] **Step 3: Implement an injectable coordinator**

Provide a factory and production singleton:

```js
export function createPlaygroundCoordinator({
  hostWindow = window,
  themeRoot = document.body,
  fetchImpl = fetch,
  createObserver = (callback) => new MutationObserver(callback),
} = {}) {
  // cache, frame records, one listener, one observer
}

export const playgroundCoordinator = createPlaygroundCoordinator();
```

Expose `json(url)` and `text(url)` methods backed by one promise cache. Delete rejected entries. Register frames by iframe reference and route messages by `event.source === iframe.contentWindow`.

- [ ] **Step 4: Move production cache ownership into the coordinator**

Make `fetchPlaygroundSheets()` accept a loader instead of owning `fetchCache`. Update `playground.js` to use the coordinator for workbook tabs, catalogs, snippets, and later the runtime manifest. Retain `cachedFetch()` only if another non-playground caller needs it; otherwise remove it and migrate its tests.

- [ ] **Step 5: Connect current shell compatibility**

Temporarily route existing `preview-ready` and `markup-request` messages through the coordinator. Remove both per-block `window.message` listeners and each block's body observer. Keep the old payload and shell documents until Task 6.

- [ ] **Step 6: Run coordinator and block tests**

```bash
npm run test:file -- test/blocks/playground-coordinator.test.js test/blocks/playground.test.js
node --test test/extractions/playground-data.node.test.js
```

Expected: PASS; two blocks install one listener and observer and retain current rendering behavior.

- [ ] **Step 7: Commit the coordinator**

```bash
git add blocks/playground/playground-coordinator.js blocks/playground/playground.js blocks/playground/playground-data.js test/blocks/playground-coordinator.test.js test/blocks/playground.test.js test/extractions/playground-data.node.test.js
git commit -m "refactor(playground): coordinate page resources and frames"
```

## Task 5: Move the final initialization protocol into the current RSP shell

**Files:**

- Modify: `blocks/playground/playground.js`
- Modify: `blocks/playground/playground-coordinator.js`
- Modify: `deps/rsp/playground/index.html`
- Modify: `deps/rsp/playground/resolve-stylesheet-hrefs.js`
- Modify: `test/blocks/playground-coordinator.test.js`
- Modify: `test/blocks/playground.test.js`
- Modify: `test/extractions/resolve-stylesheet-hrefs.node.test.js`

- [ ] **Step 1: Write failing RSP initialization and fallback tests**

Assert:

- One manifest request serves two RSP models.
- The parent sends concrete React, ReactDOM, provider/component/external module descriptors and stylesheet URLs.
- Root, composite, overlay, and external-module requirements are unioned and deduplicated.
- A missing export stylesheet entry uses that source's `allStyles`.
- A missing, unreadable, or invalid manifest dynamically enters legacy discovery, emits `preview-diagnostic` with `recovered: true`, and still initializes.
- Normal operation requests neither package metadata nor the flat listing.
- `preview-mounted` is recorded independently for each frame.

- [ ] **Step 2: Run focused tests and verify they fail**

```bash
npm run test:file -- test/blocks/playground-coordinator.test.js test/blocks/playground.test.js
node --test test/extractions/resolve-stylesheet-hrefs.node.test.js
```

Expected: FAIL because RSP runtime discovery still belongs to the iframe.

- [ ] **Step 3: Resolve runtime requirements in the parent**

Load `/deps/rsp/playground/runtime-manifest.json` through the coordinator. For the model's `runtimeSource`, union concrete module descriptors and styles for:

- Root export
- Fragment composite tags
- Provider and text dependencies
- Overlay and prop-owner exports
- External modules from `resolveExternalComponent()`

Keep order stable and URLs deduplicated. Do not put package-specific import construction in the iframe.

- [ ] **Step 4: Add fallback-only browser discovery**

If manifest fetch or schema validation fails, read the model's `runtimeSource`, resolve its package metadata/listing templates from the browser-neutral `PLAYGROUND_RUNTIME_SOURCES` data in `scripts/utils/implementations.js`, dynamically import `resolve-stylesheet-hrefs.js`, and fetch through the coordinator. Return the current all-styles behavior and concrete runtime URLs for that configured source. This dynamic import must not occur on the normal path.

Do not branch on `s2` or package names. If fallback configuration for a requested source is absent, emit a fatal `preview-error` rather than silently using S2.

If only an export stylesheet entry is absent, use the manifest source's committed `allStyles`; do not perform network discovery.

- [ ] **Step 5: Introduce the final handshake in the current RSP shell**

Install the shell listener before sending `shell-ready`. Wait for one matching `preview-init`; import only concrete URLs from the payload; append selected styles without blocking the component mount; then send `preview-mounted`. Queue ordered `prop-update` and latest `theme-update` messages that arrive before initialization.

Use `preview-error` only when the preview cannot initialize/update. Use `preview-diagnostic` for recovered manifest discovery.

- [ ] **Step 6: Add a temporary stylesheet comparison switch**

Allow tests and local manual review to choose manifest-selected styles or the manifest's `allStyles`. Default production to selected styles after representative components, including ActionButton, render equivalently. Mark this switch for mandatory removal in Task 8.

- [ ] **Step 7: Run protocol and request tests**

```bash
npm run test:file -- test/blocks/playground-coordinator.test.js test/blocks/playground.test.js
node --test test/extractions/resolve-stylesheet-hrefs.node.test.js
npx playwright test test/a11y/blocks/playground-performance.spec.js --project=chromium
```

Expected: PASS; normal RSP initialization uses one local manifest request and zero package metadata/flat-listing requests.

- [ ] **Step 8: Commit parent-owned RSP initialization**

```bash
git add blocks/playground/playground.js blocks/playground/playground-coordinator.js deps/rsp/playground/index.html deps/rsp/playground/resolve-stylesheet-hrefs.js test/blocks/playground-coordinator.test.js test/blocks/playground.test.js test/extractions/resolve-stylesheet-hrefs.node.test.js test/a11y
git commit -m "refactor(playground): initialize RSP from the runtime manifest"
```

## Task 6: Build the shared inline shell and isolated adapters

**Files:**

- Create: `blocks/playground/preview/index.html`
- Create: `blocks/playground/preview/image-preview.js`
- Create: `deps/rsp/playground/rsp-preview.js`
- Create: `deps/swc/playground/swc-preview.js`
- Create: `test/blocks/image-preview.test.js`
- Create: `test/blocks/rsp-preview.test.js`
- Create: `test/blocks/swc-preview.test.js`
- Modify: `blocks/playground/preview-shell.css`

- [ ] **Step 1: Write failing shell and adapter contract tests**

Extract the inline bootstrap source in tests and run it with injected message/import hooks. Cover:

- Listener installation before `shell-ready`.
- One accepted `preview-init`.
- Exactly one adapter URL imported from the payload.
- Ordered pre-init property updates and latest theme delivery.
- Messages for another frame ignored.
- Adapter-load, runtime-import, stylesheet-load, fragment-parse, mount, and update failures use stable phases.

Every adapter returns:

```js
{
  update({ property, value }),
  updateTheme(scheme),
  destroy(),
}
```

- [ ] **Step 2: Run adapter tests and verify they fail**

```bash
npm run test:file -- test/blocks/image-preview.test.js test/blocks/rsp-preview.test.js test/blocks/swc-preview.test.js
```

Expected: FAIL because the shared shell and adapters do not exist.

- [ ] **Step 3: Create the shared document with inline classic-script bootstrap**

Keep common markup, `preview-shell.css`, shared fonts, and a short classic `<script>` in `index.html`. The script reads only a safe frame identifier, sends `shell-ready`, receives `preview-init`, calls the dynamic `import(adapterUrl)` expression, forwards updates/theme, and reports structured failures.

Do not create `bootstrap.js`, a shared adapter module, or statically import all adapters.

- [ ] **Step 4: Move image behavior unchanged**

Preserve sorted image paths, default-image fallback, unset omission, and prop-derived alt text from `blocks/playground/index.html`.

- [ ] **Step 5: Move RSP behavior behind the adapter contract**

Preserve typed JSX values, `Provider`, text/icon composition, composite trees, external illustration modules, overlays, prop ownership, virtualized/full-width/vertical sizing, color scheme, remount behavior, nonblocking selected styles, and `preview-mounted`.

The adapter imports only supplied concrete URLs and does not branch on `s2`, package names, or future AI sources.

- [ ] **Step 6: Move SWC behavior behind the adapter contract**

Preserve family-tag discovery, component definitions, root failure versus secondary-member degradation, fragment mounting, native-root fallback, labels, slots, icons, trigger/open behavior, `for` reassertion after upgrade, and version-matched `swc.css`.

- [ ] **Step 7: Leave production routes on old shells**

Do not change `scripts/utils/implementations.js` yet. Adapter work remains unreachable in production until Task 7 performs one atomic cutover.

- [ ] **Step 8: Run adapters and existing helper suites**

```bash
npm run test:file -- test/blocks/image-preview.test.js test/blocks/rsp-preview.test.js test/blocks/swc-preview.test.js test/blocks/apply-attribute.test.js test/blocks/apply-label-prop.test.js test/blocks/apply-swc-prop.test.js test/blocks/build-icon-svg.test.js test/blocks/define-swc.test.js
node --test test/extractions/apply-rsp-prop.node.test.js test/extractions/build-composite-element.node.test.js test/extractions/compose-preview-children.node.test.js test/extractions/overlay-triggers.node.test.js
```

Expected: PASS.

- [ ] **Step 9: Commit the adapters**

```bash
git add blocks/playground/preview blocks/playground/preview-shell.css deps/rsp/playground/rsp-preview.js deps/swc/playground/swc-preview.js test/blocks
git commit -m "refactor(playground): add isolated preview adapters"
```

## Task 7: Cut every implementation over to the shared shell

**Files:**

- Modify: `scripts/utils/implementations.js`
- Modify: `blocks/playground/playground.js`
- Modify: `blocks/playground/playground-coordinator.js`
- Modify: `test/extractions/implementations.node.test.js`
- Modify: `test/blocks/playground-coordinator.test.js`
- Modify: `test/blocks/playground.test.js`
- Modify: `test/a11y/blocks/playground-performance.spec.js`

- [ ] **Step 1: Write failing registry and end-to-end protocol tests**

Assert:

- RSP and SWC route to `blocks/playground/preview/index.html`.
- Their registry entries supply explicit adapter URLs and RSP defaults to `runtimeSource: 's2'`.
- Explicit iOS/Android models use the image adapter.
- Unsupported implementations retain the existing authoring error instead of silently becoming image previews.
- The iframe query contains only a frame identifier.
- SWC and image frames use `shell-ready` → `preview-init` → `preview-mounted`.
- Theme/property updates reach only the intended frame.
- No frame fetches catalogs, snippets, manifests, package metadata, or flat listings.

- [ ] **Step 2: Run cutover tests and verify they fail**

```bash
npm run test:file -- test/blocks/playground-coordinator.test.js test/blocks/playground.test.js
node --test test/extractions/implementations.node.test.js
```

Expected: FAIL against the old registry and compatibility protocol.

- [ ] **Step 3: Extend registry data without creating implementation branches**

Each live implementation supplies `shell`, `adapter`, snippet location/extension, tag pattern, and optional runtime source. Build the serializable `preview-init` in `playground.js`; the coordinator only routes it.

- [ ] **Step 4: Route all frames to the shared shell**

Register the frame before assigning its `src`. On `shell-ready`, send one complete model with adapter URL, snippet, descriptors/current values, overlay metadata, theme, and concrete RSP runtime URLs/styles when applicable.

- [ ] **Step 5: Remove coordinator compatibility handling**

Delete support for `preview-ready`, `markup-request`, and `markup-response`. Keep controls and code mounted when `preview-error` occurs. Render an accessible error/status only inside the affected playground.

- [ ] **Step 6: Update deterministic performance expectations**

Keep `beforeRefactor` immutable and add `afterRefactor` expectations. Assert the final trace improves on the saved baseline and requires:

- Two workbook requests per unique workbook.
- One catalog/snippet request per unique URL.
- One runtime-manifest request per page.
- Zero normal package metadata/flat-listing requests.
- Manifest-selected styles only.
- One parent message listener and body observer.
- Relative to `beforeRefactor`, the only new normal-path local module URLs are one coordinator and the selected adapter for each implementation in use. Existing helper-module requests retained by an adapter stay in the trace and do not count as newly introduced modules.
- All three timing marks present without a page-wide barrier.
- Lower total request count and encoded bytes than Task 1.

- [ ] **Step 7: Run final protocol and performance tests**

```bash
npm run test:file -- test/blocks/playground-coordinator.test.js test/blocks/playground.test.js test/blocks/image-preview.test.js test/blocks/rsp-preview.test.js test/blocks/swc-preview.test.js
node --test test/extractions/implementations.node.test.js
npx playwright test test/a11y/blocks/playground-performance.spec.js --project=chromium
```

Expected: PASS with the final protocol and request ownership.

- [ ] **Step 8: Commit the cutover**

```bash
git add scripts/utils/implementations.js blocks/playground/playground.js blocks/playground/playground-coordinator.js test/blocks test/extractions/implementations.node.test.js test/a11y
git commit -m "refactor(playground): route previews through one protocol"
```

## Task 8: Remove obsolete shells and migration switches

**Files:**

- Delete: `blocks/playground/index.html`
- Delete: `blocks/playground/preview-params.js`
- Delete: `deps/rsp/playground/index.html`
- Delete: `deps/swc/playground/index.html`
- Delete: `deps/shared/playground/prop-listener.js`
- Delete: `deps/shared/playground/theme-sync.js`
- Delete: obsolete tests for deleted helpers, if no longer used
- Modify: `blocks/playground/playground.js`
- Modify: `deps/rsp/playground/rsp-preview.js`
- Modify: `test/blocks/playground.test.js`

- [ ] **Step 1: Prove old paths and messages are unused**

```bash
rg "markup-request|markup-response|preview-ready|deps/(rsp|swc)/playground/index\\.html|blocks/playground/index\\.html|prop-listener|theme-sync" blocks deps scripts test
```

Expected: matches only in files scheduled for deletion or tests intentionally proving absence.

- [ ] **Step 2: Remove the old documents and protocol helpers**

Delete only files with no remaining import/registry references. Retain shared fonts, unset options, attributes, text keys, and icon helpers used by adapters.

- [ ] **Step 3: Remove the all-styles comparison switch**

Production RSP initialization must always use manifest-selected styles, with `allStyles` reserved for a missing export stylesheet entry and browser-time discovery reserved for a missing/unreadable/invalid manifest.

- [ ] **Step 4: Run focused suites and absence search**

```bash
npm run test:file -- test/blocks/playground-coordinator.test.js test/blocks/playground.test.js test/blocks/image-preview.test.js test/blocks/rsp-preview.test.js test/blocks/swc-preview.test.js
npm run test:extractions
rg "markup-request|markup-response|preview-ready|deps/(rsp|swc)/playground/index\\.html|blocks/playground/index\\.html" blocks deps scripts test
```

Expected: tests pass; the final search has no runtime references.

- [ ] **Step 5: Commit cleanup**

```bash
git add -A blocks/playground deps/rsp/playground deps/swc/playground deps/shared/playground test
git commit -m "refactor(playground): remove legacy preview shells"
```

## Task 9: Complete accessibility, documentation, and performance acceptance

**Files:**

- Modify: `test/a11y/blocks/playground.spec.js`
- Modify: `test/a11y/fixtures/playground-multiple.html`
- Create: `test/a11y/baselines/playground-live-after.json`
- Modify: `deps/docs/PLAYGROUND-CONTRACT.md`
- Modify: `deps/rsp/README.md`
- Modify: `deps/swc/README.md`
- Modify: `.ai/docs/specs/2026-09-11-playground-coordinator-design.md` only if implementation decisions changed

- [ ] **Step 1: Add two-playground accessibility interaction coverage**

Assert:

- Labels and regions remain distinct.
- Changing one control retains focus.
- The other playground does not mutate or announce.
- A preview error is exposed in the affected block without replacing controls/code.
- A recovered diagnostic does not create an error alert.
- Axe-core and the accessibility-tree snapshot pass after interaction.

- [ ] **Step 2: Run focused accessibility tests**

```bash
npx playwright test test/a11y/blocks/playground.spec.js test/a11y/blocks/playground-performance.spec.js --project=chromium
```

Expected: PASS.

- [ ] **Step 3: Update contracts and implementation documentation**

Document:

- Default precedence and typed values.
- Parent-owned models/resources and one coordinator per page.
- Package-aware runtime sources and generated manifest ownership.
- `shell-ready`, `preview-init`, `prop-update`, `theme-update`, `preview-mounted`, `preview-diagnostic`, and `preview-error`.
- Selected-style, `allStyles`, and discovery fallback rules.
- Which runtime requests remain per iframe and why.
- How to add another runtime source without changing the coordinator/protocol/adapters.

- [ ] **Step 4: Run repository validation**

```bash
npm run lint
npm test
npm run test:a11y
```

Expected: all commands exit 0.

- [ ] **Step 5: Run the live-CDN acceptance benchmark**

On the same machine and network used for Task 1, capture the final five-run artifact and compare it to the preserved revisioned baseline:

```bash
PLAYGROUND_BENCHMARK_MODE=live \
PLAYGROUND_BENCHMARK_LABEL=after \
PLAYGROUND_BENCHMARK_OUTPUT=test/a11y/baselines/playground-live-after.json \
npx playwright test test/a11y/blocks/playground-performance.spec.js --project=chromium

node test/a11y/compare-playground-performance.js \
  test/a11y/baselines/playground-live-before.json \
  test/a11y/baselines/playground-live-after.json
```

The Playwright command records request count, encoded bytes, cache status, `git rev-parse HEAD`, and navigation-to-first-`preview-mounted` for each run. The comparison command prints both medians and exits nonzero on a failed acceptance condition.

Acceptance:

- Requests and encoded bytes decrease.
- The final median first-preview duration is no more than 5% above the baseline median.
- Each frame initializes when its own inputs resolve; no sibling barrier appears.

If timing exceeds the threshold, profile the regression and fix it before claiming completion. Do not weaken the threshold or substitute a single run.

- [ ] **Step 6: Verify final browser-module and fallback budgets**

Use the deterministic performance trace to confirm the normal path loads only the new coordinator and selected adapter modules. Run the missing-manifest fixture separately and confirm only that degraded path imports discovery code and requests metadata/listing.

- [ ] **Step 7: Commit documentation and final coverage**

```bash
git add test/a11y deps/docs/PLAYGROUND-CONTRACT.md deps/rsp/README.md deps/swc/README.md .ai/docs/specs/2026-09-11-playground-coordinator-design.md
git commit -m "docs(playground): document coordinated previews"
```

- [ ] **Step 8: Inspect the final diff**

```bash
git status --short
BASE=$(git merge-base HEAD origin/main)
git diff --check "$BASE"..HEAD
git diff --stat "$BASE"..HEAD
```

Expected: no whitespace errors, no temporary comparison switch, no unexpected generated files, and no unrelated changes.
