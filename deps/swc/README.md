# SWC Component Properties

Extracts component property metadata from [Spectrum Web Components](https://github.com/adobe/spectrum-web-components) 2nd-gen and stores it as per-component JSON files in `data/`.

## How it works

The 2nd-gen SWC package (`@adobe/spectrum-wc`) uses one Custom Elements Manifest (`custom-elements.json`) that describes its component properties. The extractor reads that manifest once, then filters declarations by `tagName`.

For now, the CEM is generated manually from the SWC repo. The CEM is not published with `@adobe/spectrum-wc` yet (the Spectrum Web Components team will be publishing it eventually). When it is published, the same extractor can fetch it from unpkg or jsDelivr.

- **`extract-cem-components.js`** — Reads a local CEM path when one is provided, otherwise fetches the `@adobe/spectrum-wc` CEM from unpkg and falls back to jsDelivr. It formats each component declaration's `attributes` array directly, including inherited attributes already present in the CEM.
- **`extract-cem-mixins.js`** — Legacy helper for extracting mixin/base class properties from a full local CEM. Normal 2nd-gen component extraction should not need this because inherited attributes are already included on each component declaration.

Component metadata lives on the CEM declaration object:

- `status` comes from `@status`. It is a lifecycle and visibility label that answers "should consumers use this?" Current values are `preview`, `deprecated`, and `internal`. Components without `status` are implicitly stable and public. Generated property rows keep this data for future use, but the site's "Component Options" table does not render it as a column today.
- `since` comes from `@since`. It answers "when did this land?" Early components such as button and color loupe may use `0.0.1`; later components use `2.0.0` after the versioning convention was standardized.
- npm dist-tags such as `latest`, `next`, and any future `beta` tags describe the package-level release channel. If component-level lifecycle status is needed in docs, use `status`, not npm dist-tags.

## Running the extraction

**Using the current manual CEM path:**

```sh
cd ../spectrum-web-components/2nd-gen/packages/swc
yarn analyze
cd ../../../../spectrum-hub
node deps/swc/extract-cem-components.js ../spectrum-web-components/2nd-gen/packages/swc/.storybook/custom-elements.json
```

**Using the published package CEM, once it is available:**

```sh
node deps/swc/extract-cem-components.js
```

**In GitHub Actions:** The `update-component-properties` workflow is intended to use the published-package command once the CEM is included in `@adobe/spectrum-wc`. Until then, the scheduled run is disabled to avoid daily failured. Update the data manually with the local CEM path above.

## Future work

- Once `custom-elements.json` is published with `@adobe/spectrum-wc`, `node deps/swc/extract-cem-components.js` can run without a local path in GitHub Actions.
- Re-enable fully automated daily extraction after the CEM is available from package CDNs such as unpkg or jsDelivr.
- If docs need component lifecycle labels later, use the generated `status` field. We are preserving it in JSON now, but not rendering it in the data table.

## Adding a component

Edit `components.json`:

```json
[
  "swc-badge",
  "swc-button",
  "swc-divider"
]
```

Entries are component tag names. They are matched against declarations in the single `@adobe/spectrum-wc` CEM.

## Updating mixins

**This is a legacy manual maintenance task.** The 2nd-gen component extractor consumes inherited attributes directly from each component declaration, so `data/swc-mixins.json` should not need regular updates.

`data/swc-mixins.json` should be refreshed when:

- A SWC release notes changes to shared base classes or mixins (`Focusable`, `LikeAnchor`, `SizedMixin`, etc.)
- A newly added component is missing expected inherited properties in its output JSON
- SWC bumps a major version

To update, run `extract-cem-mixins.js` against a full CEM built from the SWC repo:

```sh
cd spectrum-web-components/2nd-gen/packages/swc
yarn analyze
cd ../../../../spectrum-hub
node deps/swc/extract-cem-mixins.js ../spectrum-web-components/2nd-gen/packages/swc/.storybook/custom-elements.json
```

This overwrites `data/swc-mixins.json`. Commit the result and re-run `extract-cem-components.js` locally to verify the component output files look correct before pushing.
