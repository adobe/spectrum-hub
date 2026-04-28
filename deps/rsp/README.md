# React Spectrum Component Properties

Extracts component prop metadata from [React Spectrum's](https://react-spectrum.adobe.com) `@adobe/react-spectrum` package and stores it as per-component JSON files in `data/`.

## How it works

React Spectrum publishes compiled TypeScript declaration files in `@adobe/react-spectrum/dist/types/src/{category}/{Component}.d.ts`. Two scripts work together:

- **`extract-base-props.js`** — Fetches shared base types (`AriaBaseButtonProps`, `ButtonProps`, `StyleProps`, etc.) from `react-aria` and `@react-types/shared` and writes `data/rsp-base-props.json`. Runs daily via GitHub Actions.
- **`extract-props.js`** — Fetches each component's `.d.ts` file from unpkg, parses its own properties, then merges in shared base type properties from `data/rsp-base-props.json`. Runs daily via GitHub Actions after `extract-base-props.js`.

Unlike SWC's Custom Elements Manifest, React Spectrum has no structured metadata format — so properties are parsed directly from TypeScript source.

## Running the extraction

Both scripts fetch directly from unpkg and can be run locally at any time. Run them in order:

```sh
node deps/rsp/extract-base-props.js
node deps/rsp/extract-props.js
```

**In GitHub Actions:** The `Update React Spectrum Component Properties` workflow runs both scripts daily at 7am UTC (and on manual dispatch), in the same order. If the output changes, it commits the updated JSON files to `deps/rsp/data/`.

## Adding a component

Edit `components.json`:

```json
{
  "Button": {
    "category": "button",
    "interface": "SpectrumButtonProps"
  }
}
```

- **Key** — the component name, used as the output filename (`Button.json`)
- **`category`** — the subdirectory under `dist/types/src/` (e.g. `button`, `textfield`)
- **`interface`** — the exact TypeScript interface name to extract from the `.d.ts` file
- **`extends`** — list of base type names from `data/rsp-base-props.json` to merge in

To find the category and interface name, browse the package on [unpkg](https://unpkg.com/@adobe/react-spectrum/dist/types/src/) and look for the `Spectrum*Props` interface in the relevant file. Check what it `extends` to determine which entries to add to `extends`.

## Adding a new base type

Edit `extract-base-props.js` and add an entry to `BASE_SOURCES`, then run both scripts locally to update `data/rsp-base-props.json` and the affected component JSON files.
