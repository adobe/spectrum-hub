# Playground coordinator design

Updated September 23, 2026.

## Summary

Simplify the playground and reduce its requests and transferred bytes without removing iframe isolation or delaying the first preview. A page-level coordinator will own shared data, frame lifecycle, and theme synchronization. A generated, package-aware RSP runtime manifest will replace browser-time package discovery and select only the styles each preview needs. Thin preview adapters will retain the rendering mechanics that differ between React Spectrum (RSP), Spectrum Web Components (SWC), and image previews.

This design preserves:

- Workbook-authored control selection and ordering
- RSP and SWC extracted property catalogs
- RSP and SWC snippet fragments
- Live previews in isolated iframes
- Copyable code that follows the live control state
- Composite components, overlays, slots, icons, labels, unset values, and implementation-specific naming
- Snippet-authored defaults and typed boolean and numeric JSX values
- External RSP modules such as illustrations and their copied import statements
- iOS and Android image previews
- Light, dark, and operating-system color schemes
- Existing accessibility behavior

## Current responsibilities

`blocks/playground/playground.js` currently owns:

- Authored metadata parsing
- Workbook, catalog, and snippet loading
- Control resolution and rendering
- Mutable property state
- Preview iframe creation and messaging
- Theme observation
- RSP and SWC snippet serialization
- Code disclosure and clipboard behavior

The preview documents repeat some of that work. They resolve component identity, acquire runtime metadata, interpret property semantics, parse the same snippet, and manage readiness, errors, and themes.

The implementation-specific rendering differences are valid. RSP creates React props and component trees. SWC upgrades custom elements and mutates attributes, slots, and content. A single universal renderer would obscure these differences rather than simplify them.

## Duplication to remove

### Data and network duplication

- Every RSP iframe fetches the same property catalog already fetched by its parent block. The frame uses it only to determine whether `label` is a real prop.
- Every RSP iframe fetches the same `@react-spectrum/s2` package metadata.
- Every RSP iframe fetches and parses the same jsDelivr flat-package listing to rediscover the package stylesheet set.
- Every RSP iframe loads every stylesheet published by S2, even when its component reaches only a small subset.
- The parent and iframe parse the same snippet independently. Parsing remains necessary in separate realms, but fetching and component-policy discovery do not.
- Each RSP and SWC iframe loads its own runtime modules and styles. Identical URLs may use the browser cache, but each iframe still creates a separate module graph and CSS object model.

The parent already avoids a duplicate snippet request. It fetches the snippet once and serves it through `markup-request` and `markup-response`.

### Lifecycle duplication

- Every playground block adds two global `message` listeners.
- Every playground block adds a `MutationObserver` to `document.body`.
- RSP, SWC, and image shells repeat document setup, readiness signaling, unsupported-implementation handling, theme wiring, and property-listener setup.
- The parent and shell both resolve component and implementation metadata.

### Policy duplication

The live preview and code serializer separately decide:

- Whether a value is content, a real label, an icon, a prop, or an attribute
- Whether an unset value removes a prop or attribute
- Which element owns an overlay route's props
- How authored names map to RSP exports or SWC tags
- Which root attributes and fragment content must be preserved

The mechanics must remain adapter-specific, but these decisions should come from one model.

## Proposed architecture

### Page-level coordinator

Create one `PlaygroundCoordinator` for the page. It owns:

- A URL-keyed promise cache
- The package-aware RSP runtime manifest
- Frame registration and cleanup
- One global `message` listener
- One body-theme observer
- Initial preview payloads
- Incremental property updates
- Structured preview errors

The coordinator routes messages by `event.source`. It removes a frame registration when its playground is disconnected.

Each playground initializes independently. The parent creates its iframe immediately after validating authored metadata, then loads that block's model inputs in parallel. A slow sibling never creates a page-wide barrier.

### Shared resources

The coordinator owns a small URL-keyed promise cache used by `playground.js` and `playground-data.js` for workbook tabs, property catalogs, snippet fragments, and the runtime manifest. Cache in-flight and settled promises by URL. Evict rejected promises so later attempts can retry, matching the current `cachedFetch` behavior.

The normal browser path does not fetch RSP package metadata or a package-file listing. Those inputs move to extraction time.

### Playground model

Build one model before rendering either the controls or preview. It contains:

- Authored component slug and implementation
- Resolved RSP export or SWC tag
- Property owner for routes such as RSP Tooltip
- Snippet fragment
- Control descriptors and current values
- Property classification and target information
- Overlay and preview configuration
- RSP runtime source, concrete module descriptors, external modules, and manifest-selected styles

The model is the shared policy boundary. Renderer adapters and serializers consume it rather than independently rediscovering the same facts.

Each property descriptor includes the authored property name, control type, options, current/default value, implementation prop key, DOM attribute when one exists, value classification, and apply target. The target identifies the route element, overlay owner, content, label, or icon destination without requiring the frame to inspect a catalog.

The model preserves the current default order:

1. Cross-property safety override
2. Snippet-authored value
3. Catalog default
4. First control option
5. Placeholder only when none of the previous sources contributes a value

RSP snippet values are parsed before entering control state. Boolean expressions remain booleans and numeric expressions remain numbers through controls, preview messages, React props, and copied JSX. Component-specific option overrides, including Avatar's numeric sizes, remain part of control resolution.

### Bundle-free browser boundaries

Spectrum Hub ships native JavaScript modules directly. New source files are new browser requests, so module count is part of the performance budget.

- Keep parent model construction, controls, disclosure, and format-specific serialization in `playground.js` and `playground-data.js`.
- Add only one page-level browser module, `playground-coordinator.js`.
- Keep the shared shell bootstrap inline because it is small and shell-specific.
- Dynamically import exactly one implementation adapter per iframe.
- Do not statically import RSP and SWC adapters into the same shell path.
- Keep extraction and manifest-generation helpers separate when useful; Node-only modules do not enter the browser request graph.

The RSP and SWC serializers remain visibly separate inside the parent module. Shared policy can use local pure functions without creating another network edge.

### Package-aware RSP runtime manifest

Add a Node-only generator to the RSP extraction workflow. It resolves each configured package's concrete version and React peer version, reads the published file listing once, and crawls each public runtime export's ESM graph. For every reachable package module, it records the matching published CSS file when one exists.

The committed manifest is keyed by runtime source:

```json
{
  "schemaVersion": 1,
  "sources": {
    "s2": {
      "packageName": "@react-spectrum/s2",
      "packageVersion": "1.0.0",
      "reactVersion": "19",
      "imports": {
        "react": "https://esm.sh/react@19",
        "reactDom": "https://esm.sh/react-dom@19/client"
      },
      "pageStyles": ["/page.css"],
      "allStyles": ["/dist/private/ActionButton.css"],
      "exports": {
        "ActionButton": {
          "modules": [
            {
              "url": "https://esm.sh/@react-spectrum/s2@1.0.0?bundle&exports=ActionButton",
              "exportName": "ActionButton"
            }
          ],
          "styles": [
            "/dist/private/ActionButton.css",
            "/dist/private/ProgressCircle.css"
          ]
        }
      },
      "externalModules": {
        "@react-spectrum/s2/illustrations/gradient/generic1/Image": {
          "modules": [
            {
              "url": "https://esm.sh/@react-spectrum/s2@1.0.0/illustrations/gradient/generic1/Image",
              "exportName": "ImageIllustration"
            }
          ],
          "styles": []
        }
      }
    }
  }
}
```

Existing RSP routes default to `runtimeSource: "s2"`. The schema and adapter are package-aware so a future `@react-spectrum/ai` source can be added without changing the coordinator or message protocol. This refactor does not add AI components.

Node-only source configuration defines how each `runtimeSource` resolves its package name, published entry modules, React peer, provider/text dependencies, public exports, external modules, and stylesheet base. The generator compiles those source-specific rules into concrete `modules`, `imports`, and style paths. The browser model only unions concrete module descriptors and URLs; the RSP adapter imports the supplied URLs and does not branch on `s2` or a package name. A future AI source can depend on modules from another source in the same generic descriptor list.

The generator writes keys and arrays in stable lexical order, includes `schemaVersion` and source package versions, and verifies that the versions used for property extraction and runtime generation match. The extraction workflow fails when regenerated output differs without the generated files being committed.

The generator fails closed when a configured entry cannot be crawled, a referenced package module is missing, or a required canary loses CSS. `ActionButton` retaining `ProgressCircle.css` is one canary. At runtime, the parent unions styles and module descriptors for the root export, snippet composites, overlays, and external modules. A missing export stylesheet entry falls back to that source's `allStyles`. Only a missing, unreadable, or invalid manifest invokes the current package metadata and flat-listing discovery as error recovery.

### Thin preview shell

Use `blocks/playground/preview/index.html` as the minimal preview document, with its short bootstrap inline. `scripts/utils/implementations.js` routes RSP and SWC to this shared shell; iOS and Android use the same shell's image adapter. The document reads only a frame identifier. It sends `shell-ready`, receives a single `preview-init` payload, and dynamically imports one adapter selected by the implementation registry:

- `rsp-preview.js`
- `swc-preview.js`
- `image-preview.js`

The adapters retain implementation-specific mounting:

- RSP imports the concrete React, ReactDOM, component, provider, overlay, and external-module URLs supplied by the model; constructs composites and overlays; handles RSP sizing; and rerenders through `Provider`.
- SWC imports and registers the custom-element family used by the fragment; applies attributes, labels, slots, and icons.
- Image preview resolves the iOS or Android image variant.

The frame no longer fetches a catalog, snippet, RSP package manifest, or package-file listing. The RSP adapter appends manifest-selected stylesheet links without waiting for every stylesheet before mounting, matching the current non-blocking rendering behavior.

## Message protocol

Replace the current readiness and markup exchange with:

### `shell-ready`

Sent once after the shell installs its message listener.

### `preview-init`

Sent once by the coordinator. It includes:

- Frame identifier
- Component and implementation
- Resolved export or tag
- Snippet fragment
- Current property values and descriptors
- Theme
- Overlay and prop-owner metadata
- RSP runtime source, concrete module descriptors and import URLs, and stylesheet URLs when applicable

### `prop-update`

Sent after a control change. It carries the changed property and normalized value. The adapter uses model-provided target information rather than resolving catalog policy again.

### `theme-update`

Sent by the single coordinator observer when the forced scheme changes.

### `preview-mounted`

Sent after an adapter mounts its first preview. The coordinator uses it to record first-preview timing and to distinguish initialization from later updates.

### `preview-error`

Sent by an adapter when preview initialization or rendering fails:

```js
{
  type: 'preview-error',
  phase: 'runtime-import',
  message: 'Failed to load SWC component',
  url: 'https://esm.sh/...'
}
```

Supported phases are `adapter-load`, `runtime-import`, `stylesheet-load`, `fragment-parse`, `mount`, and `update`. The phase is stable for parent rendering and tests; the message and URL provide implementation-specific detail.

The parent can distinguish a preview-only CDN failure from a fatal workbook or authoring failure. Controls and code remain usable when only the live preview fails.

### `preview-diagnostic`

Sent when initialization recovers from a nonfatal problem. Manifest recovery uses:

```js
{
  type: 'preview-diagnostic',
  severity: 'warning',
  phase: 'manifest-resolve',
  recovered: true,
  message: 'Runtime manifest unavailable; using package discovery',
  url: '/deps/rsp/playground-runtime-manifest.json'
}
```

Diagnostics can be logged or measured without replacing the live preview with an error state. `preview-error` is reserved for a preview that did not initialize or could not apply an update.

`markup-request`, `markup-response`, and `preview-ready` are removed after all adapters use `preview-init`.

## Request model

For multiple playgrounds on one page:

| Resource | Current | Proposed |
| --- | --- | --- |
| Workbook tabs | Two per workbook through the parent cache | Unchanged |
| Property catalog | One per component in the parent; RSP repeats it in the frame | One per unique URL |
| Snippet | One per component in the parent | Unchanged |
| RSP runtime manifest | None | One local request per page |
| RSP package metadata | One per RSP iframe | Zero in normal operation |
| RSP flat-package listing | One per RSP iframe | Zero in normal operation |
| RSP stylesheets | Every published stylesheet per RSP iframe | Dependency-complete union for that frame |
| Parent message listeners | Two per block | One per page |
| Body theme observers | One per block | One per page |
| Preview document | One per block | Unchanged |
| Component runtime import | One component-specific import per iframe | Unchanged |
| New local browser modules | None | One coordinator plus one selected adapter per frame |

Iframe isolation prevents JavaScript module evaluation and CSS application from being shared across previews. Parent-side prefetching or a service worker would not remove that per-realm work and would add lifecycle complexity.

The performance contract covers local and external resources. A representative multi-playground page must reduce request count and transferred bytes without increasing its local JavaScript request count beyond the coordinator and selected adapters.

## Error handling

- Missing implementation or component metadata remains a fatal authoring error.
- Workbook failure remains fatal because controls cannot be resolved.
- Missing optional catalog or snippet data keeps the current warning and degradation behavior.
- CDN module or stylesheet failures affect only the preview.
- A missing export stylesheet entry uses that source's committed `allStyles` fallback.
- A missing, unreadable, or invalid manifest uses the current browser-time discovery path and reports a recovered `preview-diagnostic`.
- Adapter errors identify the phase and URL when available.
- Rejected cached requests are removed so a later playground can retry.
- The coordinator does not convert errors into success-shaped empty data unless the current contract explicitly treats that resource as optional.

## Migration

1. Add behavior, request, transfer-size, and first-preview measurements for multiple playgrounds.
2. Generate and commit the package-aware S2 runtime manifest without changing runtime behavior.
3. Consolidate current model behavior, including snippet defaults, typed values, and external modules.
4. Introduce the coordinator and replace per-block message listeners and theme observers.
5. Introduce `shell-ready`, `preview-init`, and `preview-mounted` in the current RSP shell, initially sending the current all-styles configuration.
6. Move RSP runtime metadata and manifest-selected stylesheet URLs to the parent through that payload. Compare current all-styles and manifest-selected previews.
7. Move RSP, SWC, and image mounting into one dynamically selected adapter per frame.
8. Remove the old shell bootstraps, markup protocol, and temporary comparison switch.

Each step should leave the existing playground tests green. Avoid combining manifest generation, coordinator ownership, and protocol replacement in one change.

## Testing

### Unit coverage

- URL-keyed resource caching and rejection eviction
- Package-aware runtime-manifest generation and source isolation
- Runtime module graph traversal, stylesheet matching, canaries, and all-styles fallback
- Model construction for RSP, SWC, image previews, aliases, and prop-owner routes
- Snippet-authored default precedence and typed boolean/numeric values
- Component option overrides, including Avatar's numeric size options
- External RSP module imports and stylesheet unions
- Coordinator routing by frame source
- Coordinator cleanup when frames are removed
- One-time initialization and incremental updates
- Property classification for content, labels, icons, booleans, attributes, and unset values
- Existing RSP and SWC serializer behavior
- Existing adapter-specific helpers

### Integration coverage

Create a fixture with two playgrounds. Assert:

- The workbook tabs are fetched once each.
- Each distinct catalog and snippet is fetched once.
- Two RSP playgrounds share one local runtime-manifest request.
- Normal operation fetches neither package metadata nor the flat listing.
- The frames do not fetch catalogs, snippets, package metadata, or the flat listing.
- Each RSP frame requests only its manifest-selected styles.
- Snippet-authored boolean/numeric defaults reach controls, preview props, and copied JSX with their types intact.
- Component option overrides reach the control and preview end to end.
- Copied snippets include required external-module imports, and the preview imports the same concrete module descriptor.
- A missing manifest takes the discovery fallback, emits a recovered diagnostic, and still mounts the preview.
- Each frame still imports and renders its own component runtime.
- Theme and property updates reach only the intended frame.
- A preview failure does not remove controls or code.

### Performance coverage

Use a Chromium Playwright fixture containing repeated and distinct RSP and SWC playgrounds. Run one unmeasured warm-up followed by five measured runs. Start each measured run in a new browser context with an empty HTTP cache; normal within-page caching remains enabled so duplicate URLs behave as they do for a reader. Record request URLs and `Network.loadingFinished.encodedDataLength` through the Chrome DevTools Protocol, plus `shell-ready`, `preview-init`, and `preview-mounted`. First-preview time is navigation start to the first `preview-mounted`.

Check in the current implementation's request and byte baseline for deterministic, mocked CDN responses. CI uses those fixtures to enforce exact request ownership and a lower total encoded byte count. A separate live-CDN benchmark runs before and after the refactor on the same machine and network conditions; its five-run median first-preview time must not exceed the baseline median by more than 5%. The timing comparison is a release acceptance check, not a per-commit CI threshold.

Normal operation must:

- Eliminate browser-time package metadata and flat-listing requests
- Reduce total requests and transferred bytes
- Avoid a page-wide initialization barrier
- Avoid increasing browser JavaScript module requests beyond the approved coordinator and selected-adapter budget
- Keep the five-run median first-preview time within 5% of the same-environment baseline

CI enforces deterministic request ownership and resource selection. The benchmark reports timing rather than using a flaky hard millisecond threshold.

### Accessibility coverage

Retain axe-core and accessibility-tree checks. Add a two-playground interaction case to confirm:

- Labels and regions remain distinct.
- Focus remains on the operated control.
- Updating one playground does not announce or mutate the other.
- Preview errors are exposed without replacing usable controls or code.

## Non-goals

- Removing iframe isolation
- Sharing a JavaScript runtime or CSS object model between previews
- Adding a runtime bundling/build step
- Replacing extracted catalogs or workbook authoring
- Combining RSP and SWC into one renderer
- Changing component behavior, control defaults, or snippet output
- Adding `@react-spectrum/ai` components in this refactor
