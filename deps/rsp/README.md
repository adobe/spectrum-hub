# React Spectrum Component Properties

Extracts component prop metadata from [React Spectrum's](https://react-spectrum.adobe.com) `@adobe/react-spectrum` package and stores it as per-component JSON files in `data/`.

## How it works

React Spectrum publishes compiled TypeScript declaration files in `@adobe/react-spectrum/dist/types/src/{category}/{Component}.d.ts`. Two scripts work together, mirroring the SWC `sp-mixins.json` pattern:

- **`extract-props.js`** — Fetches each component's `.d.ts` file from unpkg, parses its own properties, then merges in shared base type properties from `data/rs-base-props.json`. Runs daily via GitHub Actions.
- **`extract-base-props.js`** — Fetches shared base types (`AriaBaseButtonProps`, `ButtonProps`, `StyleProps`, etc.) from `react-aria` and `@react-types/shared` and writes `data/rs-base-props.json`. Run manually when upstream base types change.

Unlike SWC's Custom Elements Manifest, React Spectrum has no structured metadata format — so properties are parsed directly from TypeScript source. Inherited props (from `@react-aria`, `@react-stately`, etc.) are not included.

## Running the extraction

**First time or after base types change:**

```sh
node deps/react-spectrum/extract-base-props.js
```

**Per-component extraction (daily / normal use):**

```sh
node deps/react-spectrum/extract-props.js
```

**In GitHub Actions:** The `update-react-spectrum-properties` workflow runs this same command daily at 6am UTC (and on manual dispatch). If the output changes, it commits the updated JSON files to `deps/react-spectrum/data/`.

## Adding a component

Edit `components.json`:

```json
{
  "Button": {
    "package": "button",
    "interface": "SpectrumButtonProps"
  }
}
```

- **Key** — the component name, used as the output filename (`Button.json`)
- **`category`** — the subdirectory under `dist/types/src/` (e.g. `button`, `textfield`)
- **`interface`** — the exact TypeScript interface name to extract from the `.d.ts` file
- **`extends`** — list of base type names from `data/rs-base-props.json` to merge in

To find the category and interface name, browse the package on [unpkg](https://unpkg.com/@adobe/react-spectrum/dist/types/src/) and look for the `Spectrum*Props` interface in the relevant file. Check what it `extends` to determine which entries to add to `extends`.

## Adding a new base type

Edit `extract-base-props.js` and add an entry to `BASE_SOURCES`, then re-run the script to update `data/rs-base-props.json`.
