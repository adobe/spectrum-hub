# SWC Component Properties

Extracts component property metadata from [Spectrum Web Components](https://github.com/adobe/spectrum-web-components) and stores it as per-component JSON files in `data/`.

## How it works

Each SWC npm package ships a `custom-elements.json` (Custom Elements Manifest) that describes its component properties. However, properties inherited from shared mixins (`Focusable`, `LikeAnchor`, `SizedMixin`, etc.) are not included in individual package manifests because those mixins live in separate packages that don't publish their own CEM.

To get a complete property list, two CEM extraction scripts are combined:

- **`extract-cem-components.js`** — Fetches each component's CEM from unpkg, walks its internal class hierarchy, and merges in shared mixin properties from `data/sp-mixins.json`. Runs daily via GitHub Actions.
- **`extract-cem-mixins.js`** — Extracts mixin/base class properties from a full local CEM. Run manually when SWC updates its shared base classes (last meaningful change was mid-2024).

## Running the extraction

**Locally:**

```sh
node deps/swc/extract-cem-components.js
```

**In GitHub Actions:** The `update-component-properties` workflow runs this same command daily at 6am UTC (and on manual dispatch). If the output changes, it commits the updated JSON files to `deps/swc/data/`.

## Adding a component

Edit `components.json`:

```json
{
  "sp-action-button": "action-button",
  "sp-button": "button",
  "sp-checkbox": "checkbox"
}
```

Keys are tag names, values are the npm package suffix (under `@spectrum-web-components/`).

## Updating mixins

Run `extract-cem-mixins.js` against a full CEM built from the SWC repo:

```sh
cd spectrum-web-components/1st-gen
yarn cem analyze --outdir .
cd ../../spectrum-docs
node deps/swc/extract-cem-mixins.js ../spectrum-web-components/1st-gen/custom-elements.json
```

This overwrites `data/sp-mixins.json`. Commit the result.
