# Plan: retarget SWC extraction to 2nd-gen

The current extraction pipeline targets 1st-gen Spectrum Web Components (`@spectrum-web-components/*`). This plan covers the changes needed to retarget it to the 2nd-gen package (`@adobe/spectrum-wc`).

## Background

2nd-gen SWC consolidates all components into a single package (`@adobe/spectrum-wc` at `0.0.4`). Tag names use the `swc-` prefix (e.g., `swc-badge`) instead of `sp-`. The `@spectrum-web-components/core` package provides base classes and mixins, and its source is included in the same CEM via the analyzer config globs — which eliminates the `sp-mixins.json` maintenance problem.

**Button and ActionButton are not yet implemented in 2nd-gen.** This migration cannot be completed until those components ship. Use this document for planning and spot-checking assumptions when they do.

## Key structural differences from 1st-gen

| | 1st-gen | 2nd-gen |
|---|---|---|
| npm scope | `@spectrum-web-components/{component}` | `@adobe/spectrum-wc` (single package) |
| Tag prefix | `sp-*` | `swc-*` |
| CEM location | Per-package root `custom-elements.json` | `.storybook/custom-elements.json` (single file) |
| Mixins in CEM | External — not in package CEM | Internal — core is in the analyzer globs |

## Changes required

### 1. `extract-cem-components.js` — fetch strategy

1st-gen fetches one CEM per component:
```
https://unpkg.com/@spectrum-web-components/{pkg}/custom-elements.json
```

2nd-gen has one CEM for all components. The script needs to fetch it once and reuse it for all lookups:

```js
const cem = await fetchCEM(); // fetch once
for (const [tag, _] of Object.entries(ALLOW_LIST)) {
  // find component by tagName within the shared CEM
}
```

Until the package is published with a CEM, build it locally from the 2nd-gen monorepo following the same process documented in the [Updating mixins](./README.md#updating-mixins) section of this README — substitute the 2nd-gen path and run `yarn analyze` from `spectrum-web-components/2nd-gen/packages/swc`. Use the resulting `.storybook/custom-elements.json` to validate extraction logic before the package ships.

Once the package is published, the CDN URL will depend on where the CEM lands. The `package.json` currently declares `"customElements": ".storybook/custom-elements.json"` but `files` only includes `dist/` — confirm with the SWC team where the CEM will be published before finalizing the URL.

### 2. `extract-cem-components.js` — mixin handling

1st-gen stops at external package boundaries and falls back to `sp-mixins.json` to fill in mixin props. In 2nd-gen, `@spectrum-web-components/core` is included in the CEM analyzer globs alongside `components/**/*.ts`. Base classes like `BadgeBase` appear in the same CEM as the component.

This means `collectFromCEM` should be able to walk the full inheritance chain without stopping — no external refs to resolve. The `sp-mixins.json` fallback and `collectExternalRefs` logic may be removable entirely, or can be left as a no-op safety net.

Verify this assumption by checking the built CEM once button is implemented: confirm that the button's base class declaration appears in the same CEM file.

### 3. `components.json` — update tag names and remove package suffix

1st-gen maps tag names to package suffixes:
```json
{
  "sp-button": "button",
  "sp-action-button": "action-button"
}
```

2nd-gen has no per-component package. The value is no longer needed for the CDN URL. Update the format to just list tag names, or simplify to an array, once the button tag names are known.

Expected tag names based on the `swc-*` prefix pattern seen in other components:
- `sp-button` → `swc-button`
- `sp-action-button` → `swc-action-button`

Confirm by searching the 2nd-gen source for `@element` JSDoc tags on button class declarations when they are implemented.

### 4. Data files — regenerate

After script changes, regenerate component data files and spot-check against the 2nd-gen Storybook or documentation for Button and ActionButton. Confirm `size` appears (2nd-gen components are expected to align with S2 sizing).

## What does not change

- The CEM walking logic in `collectFromCEM` and `collectExternalRefs` should require little or no modification — the CEM format (Custom Elements Manifest spec) is the same.
- `formatAttr` output shape is unchanged — `attribute`, `property`, `type`, `default`, `description`, `inheritedFrom` fields remain valid.
- `components.json` as the configuration entry point stays the same.
- The `EXCLUDED_SOURCES` filter in `blocks/table/table.js` does not need updating — mixin names that make it into `inheritedFrom` can be evaluated once the new data files are generated.

## Prerequisites before implementation

1. Button and ActionButton land in `@adobe/spectrum-wc`
2. Confirm `swc-button` and `swc-action-button` tag names in source
3. Confirm published CEM location with SWC team
