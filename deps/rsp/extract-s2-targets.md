# Plan: retarget extraction to Spectrum 2

The current extraction pipeline targets `@adobe/react-spectrum` (v3 classic). This plan covers the changes needed to retarget it to `@react-spectrum/s2` (Spectrum 2), which has a different package structure, component interfaces, and base type system.

## Background

S2 components live in `@react-spectrum/s2`. They extend `react-aria-components` (RAC) base types rather than `@react-types/shared` and `react-aria`. S2 also uses a two-interface pattern: component-specific props (like `size`, `variant`, `staticColor`) are defined in a private local interface (e.g., `ButtonStyleProps`) that the exported interface extends. The current extractor doesn't handle local interfaces.

## Changes required

### 1. `extract-props.js` — CDN URL pattern

S2 components are all at the top level of `src/` with no category subdirectory.

**Current:**
```
https://unpkg.com/@adobe/react-spectrum/dist/types/src/{category}/{Component}.d.ts
```

**New:**
```
https://unpkg.com/@react-spectrum/s2/dist/types/src/{Component}.d.ts
```

Remove the `category` field from `CDN_URLS` and from `components.json`.

### 2. `extract-props.js` — local interface resolution

S2 component-specific props are defined in private (non-exported) local interfaces within the same `.d.ts` file. For example, `ButtonProps` extends `ButtonStyleProps`, but `ButtonStyleProps` is not in `rsp-base-props.json` — it's declared in the same file.

The extractor needs a new step: after fetching the source file, detect any interfaces referenced in the target interface's `extends` clause that exist in the same file (not in `rsp-base-props.json`), parse them, and merge their props in as "own" props before merging external base types.

**Suggested approach:**

1. After `extractInterfaceBlock`, call `extractExtends` to get the full list of referenced names.
2. For names not found in `rsp-base-props.json`, try `extractInterfaceBlock(source, name)` on the same source string.
3. If a block is found, parse it with `parseProps` and prepend those props to `ownProps` (local interface props are component-specific, not inherited).

### 3. `extract-base-props.js` — add `react-aria-components` as a source

S2 extends RAC types (`react-aria-components`) rather than `@react-types/shared`. The current base props catalog covers `@react-types/shared` (auto-discovered) and specific `react-aria` files (manual list). RAC types need to be added.

RAC publishes types at:
```
https://unpkg.com/react-aria-components/dist/types/{ComponentName}.d.ts
```

The same manual-list approach used for `react-aria` applies here — add the relevant component files to a new `RAC_FILES` constant in `extract-base-props.js` as new component categories are registered. Start with the button-related file:
```
https://unpkg.com/react-aria-components/dist/types/Button.d.ts
```

### 4. `components.json` — update interface names and remove `category`

| Component | Current interface | S2 interface | Current category |
|---|---|---|---|
| `Button` | `SpectrumButtonProps` | `ButtonProps` | `button` |
| `ActionButton` | `SpectrumActionButtonProps` | `ActionButtonProps` | `button` |

Remove the `category` field from all entries. Remove the manual `extends` override on `Button` — auto-resolution should handle it once RAC base types are in `rsp-base-props.json`.

**New `components.json`:**
```json
{
  "Button": {
    "interface": "ButtonProps"
  },
  "ActionButton": {
    "interface": "ActionButtonProps"
  }
}
```

### 5. `rsp-base-props.json` and component data files — regenerate

After the script changes, run both scripts locally to rebuild:

```sh
node deps/rsp/extract-base-props.js
node deps/rsp/extract-props.js
```

Spot-check `Button.json` and `ActionButton.json` against the [S2 Button docs](https://react-spectrum.adobe.com/s2/Button.html) and [S2 ActionButton docs](https://react-spectrum.adobe.com/s2/ActionButton.html). Confirm `size` appears for both components.

## Expected output after changes

**`Button.json` own props:** `variant`, `fillStyle`, `size`, `staticColor`, `children`

**`ActionButton.json` own props:** `size`, `staticColor`, `isQuiet`, `isEmphasized` (from `ActionButtonStyleProps`)

## Notes

- The `StyleProps` filter in `blocks/table/table.js` (`EXCLUDED_SOURCES`) may need updating. S2 uses a different `StyleProps` interface from `@react-spectrum/s2/style-utils`, not `@react-types/shared`. Verify the `inheritedFrom` value in the new output and update the set accordingly.
- S2's `ButtonProps` marks `isQuiet` as deprecated (it still exists for backward compatibility). The extractor will include it — consider whether to filter deprecated props at the display layer.
- The `required` field behavior is unchanged: S2 interfaces use `?` for optional props, so the existing logic applies.
