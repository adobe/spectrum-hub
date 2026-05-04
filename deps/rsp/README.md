# React Spectrum Component Properties

Extracts component prop metadata from [React Spectrum's](https://react-spectrum.adobe.com) `@adobe/react-spectrum` package and stores it as per-component JSON files in `data/`.

## How it works

React Spectrum publishes compiled TypeScript declaration files in `@adobe/react-spectrum/dist/types/src/{category}/{Component}.d.ts`. Two scripts work together:

- **`extract-base-props.js`** — Builds a complete picture of the shared base type system and writes `data/rsp-base-props.json`. For `@react-types/shared`, all interfaces are auto-discovered via unpkg's `?meta` API — no manual configuration needed as new types are added upstream. For `react-aria`, files are listed manually in `REACT_ARIA_FILES` because react-aria contains 235 files organized by hook; only component-specific files are relevant and those are added as new component categories are registered. Runs daily via GitHub Actions.
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
- **`extends`** — *(optional)* list of base type names from `data/rsp-base-props.json` to merge in as inherited props. If omitted, `extract-props.js` auto-resolves base types by intersecting the interface's `extends` clause against known keys in `rsp-base-props.json`. Only add this manually when auto-resolution is incomplete — for example, when a base type is wrapped in a utility type like `Omit<BaseType, ...>` and can't be detected automatically.

To find the category and interface name, browse the package on [unpkg](https://unpkg.com/@adobe/react-spectrum/dist/types/src/) and look for the `Spectrum*Props` interface in the relevant file. If the script warns about untracked base types after adding a component, those names need to be added to `REACT_ARIA_FILES` in `extract-base-props.js` — see [Adding a new react-aria base type](#adding-a-new-react-aria-base-type) below.

## Adding a new react-aria base type

`@react-types/shared` types are discovered automatically — no changes needed when new types are added there.

For `react-aria`, add the relevant file URL to `REACT_ARIA_FILES` in `extract-base-props.js`, then run both scripts locally to update `data/rsp-base-props.json` and the affected component JSON files:

```js
const REACT_ARIA_FILES = [
  'https://unpkg.com/react-aria/dist/types/src/button/useButton.d.ts',
  'https://unpkg.com/react-aria/dist/types/src/textfield/useTextField.d.ts', // example
];
```

## Known limitations

**Parser scope**

`parseProps` uses a single-line regex and will silently skip or misparse:

- Multi-line type unions
- Generic types with angle brackets (e.g. `Array<string>`)
- Function signatures (e.g. `(val: T) => void`)
- Conditional or mapped types

Spot-check the output JSON against the RSP documentation when adding a new component. If output looks sparse, the component likely uses one of these patterns. Evaluate `ts-morph` if parser failures accumulate.

**`Omit<>` wrapping and prop exclusions**

RSP sometimes wraps a base type in a utility type to exclude specific props — for example, `Omit<AriaButtonProps<T>, 'onClick'>`. Auto-resolution detects word tokens in the header and intersects them against `rsp-base-props.json`, so `AriaButtonProps` would be flagged as untracked but `onClick` itself is not checked against what the `Omit` excludes.

In practice this is safe as long as the omitted prop does not appear in any of the base types that _are_ tracked. For `Button`, `onClick` lives in `PressEvents`, which is not listed in Button's `extends` config, so it is not included in the output. If upstream ever moves `onClick` into a tracked base type, the output would incorrectly include a prop RSP intentionally excludes — with no warning. Spot-check omit-heavy components when RSP releases a new version.

**Auto-resolution only sees directly tracked base types**

`extractExtends` returns names that exist in `rsp-base-props.json`. If a component extends a composite type (like `AriaButtonProps`) that itself extends tracked sub-types, those sub-types will not be resolved automatically. Use the manual `extends` field in `components.json` to list them explicitly.
