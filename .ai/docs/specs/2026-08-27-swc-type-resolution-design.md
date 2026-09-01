# SWC named-type resolution for the component playground

**Date:** 2026-08-27
**Status:** Steps 1–3 (the extraction pipeline) implemented on `refactor-swc`. Step 4
(making the playground read each implementation's own options — the fix that actually
retires the premium/genai bug) and its live verification ship with the playground work
on `refactor-rsp`, since they are consumer changes rather than extraction ones.

## Problem

The component playground (`blocks/playground/`) renders live previews and auto-generated
controls (pickers, sliders, switches) for both React Spectrum (RSP) and Spectrum Web
Components (SWC) implementations of the same component, sourced from two independently
generated JSON catalogs: `deps/rsp/data/*.json` and `deps/swc/data/swc-*.json`.

`resolvePickerOptions()` (`blocks/playground/playground-data.js:157`) always tries RSP's
inline union type first, regardless of which implementation's page is being built, and
only falls back to a boolean check on the SWC row. This was a deliberate original
tradeoff — RSP's extractor already resolves inline union types (e.g. `'primary' |
'secondary' | ...'`), while SWC's extractor only records a bare named-alias string (e.g.
`"ButtonVariant"`) that can't be parsed into options at all — so borrowing RSP's resolved
list was the only way to get a picker on the SWC page too.

**The bug:** RSP's `Button` (and `LinkButton`) now support `variant` values `premium` and
`genai` that SWC's real `Button` does not support at all yet. Because
`resolvePickerOptions` borrows RSP's list unconditionally, the SWC Button playground page
offers `premium`/`genai` as selectable variants — options that don't exist on the
component it's supposedly controlling.

Confirmed via SWC's own real type (traced through the actual published package, not
guessed):

```ts
// @adobe/spectrum-wc-core, dist/components/button/Button.types.d.ts
export declare const BUTTON_VARIANTS: readonly ["primary", "secondary", "accent", "negative"];
export type ButtonVariant = (typeof BUTTON_VARIANTS)[number];
```

No `premium`, no `genai`. This is confirmed at both the locally-installed
`2.0.0-beta.0` and the CDN `@beta` (`2.0.0-beta.2`) — not a stale-local-package
artifact.

## Why this isn't a quick consumer-side fix

The obvious fix — make `resolvePickerOptions` implementation-aware, so an SWC page never
borrows RSP's list — was tried and **reverted** in this same investigation. It broke
`fillStyle`, `size`, and `variant` on the live SWC Button page entirely (no options at
all), because the AEM "controls" sheet does not currently curate options for these common
enum props — only for a couple of edge cases (e.g. `labelAlign`). Cutting the RSP
fallback removes the only source of options for props where SWC's own data is an
unparseable named alias, which is most enum-like SWC props today.

**The real fix has to happen at the SWC data source**: resolve SWC's own named-alias
types (e.g. `ButtonVariant`, `ButtonFillStyle`, `ElementSize`) to their actual literal
union at extraction time, the same way `deps/rsp/extract-props.js` already does for RSP
(see commit `ed11f05` and neighbors). Once `swc-button.json`'s `variant.type` reads
`'"primary" | "secondary" | "accent" | "negative"'` instead of `"ButtonVariant"`, the
existing `parsePickerOptions` already knows how to turn that into options — and an
implementation-aware `resolvePickerOptions` becomes safe to layer on top, because SWC's
own data will actually have something to offer instead of falling through to an empty
controls-sheet lookup.

## What's different from the RSP rewrite (why this isn't a copy-paste)

`deps/rsp/extract-props.js` crawls `@react-spectrum/s2`'s real `.d.ts` import graph via
`deps/rsp/ts-cdn-host.js` + `deps/rsp/cdn-resolve.js`, builds a real `ts.Program`, and
asks the checker for each prop's resolved type — the checker transparently resolves named
aliases to their underlying type when you read a `Type` object (`checker.typeToString()`
on a resolved `Type`, not a syntactic reference), which is exactly why RSP's catalog
already shows literal unions today.

The SWC extractor (`deps/swc/extract-cem-components.js`) has no compiler at all — it just
reads a pre-built `custom-elements.json` manifest (from the `custom-elements-manifest`
analyzer, fetched from CDN) and copies out `attribute.type.text` verbatim, which is
whatever the analyzer's default (non-type-resolving) mode wrote — a bare alias name for
anything that isn't inline in the source.

Building the equivalent resolution pipeline for SWC is not a drop-in reuse of the RSP
pipeline, for a few confirmed reasons:

1. **Two-package split.** `@adobe/spectrum-wc`'s components import shared types (e.g.
   `ButtonVariant`) from a *second* package — currently `@adobe/spectrum-wc-core` in the
   CDN `@beta` — not from itself. The RSP pipeline only ever resolves within
   `@react-spectrum/s2` plus a small fixed set of known peer packages
   (`deps/rsp/cdn-resolve.js`'s `PACKAGE_BASES`); the SWC equivalent needs its own map,
   and needs to be re-verified whenever that map's package name/version changes (see next
   point).

2. **Local `node_modules` is not a safe source.** The installed `@adobe/spectrum-wc` is
   pinned at `2.0.0-beta.0` in `package.json`, but the CEM this pipeline actually fetches
   at generation time comes from the `@beta` **dist-tag**, currently resolving to
   `2.0.0-beta.2` (recorded in `deps/swc/version.json`). Confirmed drift between those
   two: `2.0.0-beta.0`'s local install is missing components entirely (e.g.
   `close-button` doesn't exist locally yet), and the peer package was renamed
   (`@spectrum-web-components/core` locally vs. `@adobe/spectrum-wc-core` at
   `@beta.2`). Any resolution pipeline must crawl the CDN at the **exact version
   `deps/swc/version.json` records**, the same way RSP's `ts-cdn-host.js` crawls CDN
   `.d.ts` files live rather than trusting a local install.

3. **Mixin-sourced attributes need cross-package path rebasing.** Many attributes (e.g.
   `size` via `SizedMixin`, `pending` via `PendingMixin`) are inherited from mixins, and
   the CEM already records this: `member.inheritedFrom = { name, module }`. The `module`
   value is a **monorepo-relative** source path — e.g. `../core/mixins/sized-mixin.ts` —
   which does not map directly onto the published package's directory layout. Confirmed
   the actual published file lives at `@adobe/spectrum-wc-core`'s `dist/mixins/
   sized-mixin.d.ts` (root-level `dist/mixins/`, not nested under a `core/` segment) — so
   the `../core/` prefix has to be stripped and the remainder rebased onto the *other*
   package's `dist/` root. This is a discoverable, describable transform, but it needs
   verification against a representative sample of the ~35 SWC components' mixins before
   it can be trusted to run unattended over the whole catalog — a wrong rebase would
   silently produce an unresolvable type (falls back to today's alias-name behavior, so
   at least fails safe) or, worse, resolve to the wrong file's export of a
   same-named type.

4. **Lit's `Base` intersection-type pattern.** Component classes are commonly declared as
   `class Button extends Button_base` where `Button_base` is a synthesized `typeof
   ButtonBase & (abstract new (...args) => SomeMixinInterface)` intersection (Lit's mixin
   convention). This doesn't block per-property resolution (we only need
   `checker.getTypeAtLocation()` on the specific class-field node the CEM already told us
   about, not full inheritance-chain resolution — the CEM's `inheritedFrom` already did
   that flattening), but it's worth calling out as a shape the checker needs to parse
   successfully, unlike RSP's plainer `interface X extends Y` shape.

## Proposed approach (as planned)

1. New module(s) under `deps/swc/`, structurally parallel to `ts-cdn-host.js` /
   `cdn-resolve.js`, but with:
   - A `PACKAGE_BASES`-equivalent map covering at least `@adobe/spectrum-wc` and
     `@adobe/spectrum-wc-core` (named/versioned as of whatever `deps/swc/version.json`
     says *at generation time* — this map may need to be re-derived per run rather than
     hardcoded, since the peer package name itself has already changed once).
   - A path-rebasing rule for `inheritedFrom.module` (monorepo-relative) → published
     `dist/` path, verified against a representative sample of mixins before trusting it
     for the full catalog.
2. Extend `deps/swc/extract-cem-components.js` (or add a post-processing pass over its
   output) to, per attribute whose `type.text` is a bare identifier (not a primitive, not
   already a union): locate the declaring file (component's own `mod.path` for
   own-attributes, `inheritedFrom.module` rebased for inherited ones), crawl its import
   graph, build a `ts.Program`, and resolve the property's real type via
   `checker.typeToString(checker.getTypeAtLocation(...))` — writing the resolved string
   back into the same `type` field, matching the shape RSP's catalog already uses.
3. Regenerate all `deps/swc/data/swc-*.json` files (~35 components) and diff every one —
   not just Button — checking for: values that look suspiciously wrong (empty resolution,
   an unrelated type name, a giant/garbage union), and confirm every previously-bare-alias
   enum prop now shows a real union while non-enum types (interfaces, `ReactNode`-alikes,
   generics) still correctly fall through unresolved.
4. Once SWC data carries real resolved unions, revisit `resolvePickerOptions()` /
   `resolveControl()` in `blocks/playground/playground-data.js` to prefer each
   implementation's *own* type before ever considering the other's — this is safe now
   because SWC's own type will actually resolve for the common cases, and only true
   named-interface/generic types (rare) fall through to the controls-sheet curated
   fallback, same role that fallback already plays for `labelAlign` today.
5. Full re-run of `test/extractions/playground-data.node.test.js` and
   `test/blocks/playground.test.js`, plus live spot-checks (this repo's dev server, `aem
   up`) across at least: Button (the motivating case), a mixin-inherited prop (`size` or
   `pending`), and a component with a genuinely unresolvable SWC-only type (to confirm the
   controls-sheet fallback still engages correctly and doesn't regress).

## Implementation notes (what actually shipped, and how it differs from the plan)

- **The package-resolution map didn't need to be hand-maintained at all.** Rather than
  a `PACKAGE_BASES`-style table, `deps/swc/cdn-resolve.js` resolves bare specifiers
  dynamically from each package's own published `exports` map (fetched and cached per
  package+version) — `@adobe/spectrum-wc`'s own manifest is fetched once per run,
  `findCorePackageName()` finds its `@adobe/*`-scoped "core" dependency (whatever it's
  currently named), and every subsequent bare specifier is resolved the same generic
  way. This is more robust to a future rename than a static table would have been.
  Third-party runtime deps (`lit`, `@lit-labs/observers`, `@floating-ui/dom`,
  `colorjs.io`) resolve through this same mechanism when a file happens to import them
  (confirmed they get crawled too, not skipped) — harmless, since none of the enum
  types this pipeline resolves depend on them.
- **The `../core/` rebase held with zero exceptions** across the full current catalog
  (verified against every `inheritedFrom.module` value the live CEM records, not just
  Button's) — `rebaseInheritedModule()` in `cdn-resolve.js` implements exactly the one
  prefix-strip rule from the plan.
- **No *general* heritage-chain walking was needed, confirmed empirically**:
  `type.getBaseTypes()` returns an empty array for every SWC component class checked
  (the Lit `class X extends X_base` intersection pattern defeats it, exactly as
  anticipated) — but reading a property directly off a class/interface's own
  `getPropertiesOfType()` works regardless, so `resolve-attribute-types.js`'s
  `findMemberType()` never needed to resolve heritage at all for the *base* case.
- **One level of override-checking WAS needed, and was added after initial ship**: a
  subclass commonly *narrows* an inherited mixin property — e.g. Button's own
  `size: ButtonSize` (`"s"|"m"|"l"|"xl"`) narrows `SizedMixin`'s generic
  `size: ElementSize` (`"xxs"|"xs"|"s"|"m"|"l"|"xl"|"xxl"`) — and the CEM attributes
  the property to the mixin file either way, with no indication a narrower override
  exists. Originally documented as an accepted limitation (v1 shipped resolving to the
  mixin's wider type), but a user report ("I only see s/m/l/xl on Button, not the full
  xxs–xxl list") made clear this needed fixing, not just documenting. Fix:
  `collectResolutionTargets()` now also takes `superclassName` (from the CEM's
  `componentDecl.superclass.name`, e.g. "ButtonBase" — a field already present on
  every component declaration, `{name, package}`, confirmed across a sample of 8
  components) and `resolveTargets()` checks that direct superclass's own declared
  members first (via a new `findNamedDeclarationMember()`, searching the *already*
  shared-crawled program for a class/interface with that name — no second file
  resolution needed, since the component's own entry file already transitively pulls
  in its superclass's file via its normal import graph), falling back to the
  CEM-attributed mixin file only when the superclass doesn't override the member.
  This narrows (doesn't eliminate) the residual limitation to: a narrowing declared
  *two or more* hops up the chain (not just the direct superclass) still resolves to
  the mixin's wider type. Not hit in the current catalog (verified: every previously
  `ElementSize`-typed `size` attribute across all components now resolves to a
  component-specific range — `s/m/l/xl` for most, `s/m/l` for Divider/
  IllustratedMessage/ProgressCircle/Popover, `s/m/l/xl/xs` for Icon — none left at the
  generic 7-value range), but would need a second superclass hop if it ever is.
- **Two gotchas found only through failing tests / live verification, not anticipated in
  the original plan:**
  - `checker.typeToString()` silently truncates long unions (e.g. Badge's ~20-value
    `variant`) to `"a" | "b" | ... N more ..."` unless called with
    `ts.TypeFormatFlags.NoTruncation`. Would have shipped a silently-incomplete,
    syntactically-plausible-looking union without the "does not truncate a long union"
    unit test catching it.
  - `checker.typeToString()` prefers printing a type's own attached alias name (e.g.
    "BadgeVariant") over expanding it, for a *plain* `type X = "a" | "b"` alias —
    confirmed this doesn't affect any *real* SWC type (they all use the
    `(typeof CONST_ARRAY)[number]` indexed-access idiom, which doesn't retain the alias
    tag through evaluation), but `resolve-attribute-types.js`'s `typeToDisplayString()`
    stringifies each union member individually rather than the whole aliased type, so
    it's correct regardless of which shape a future component uses.
- **One real bug found during this work, unrelated to the feature itself**: an `Edit`
  tool call corrupted a literal space into a NUL byte inside `ts-cdn-host.js` mid-session
  (silently broke `resolveModuleNameLiterals`'s cache-key lookup, making every cross-file
  type resolve to `any`) — caught only because `grep`/`od` on the file mysteriously
  returned nothing (treated it as binary). Worth remembering as a class of failure: if a
  grep that should obviously match returns nothing, check for embedded NUL bytes before
  assuming the code logic itself is wrong.
- **`resolvePickerOptions`/`resolveControl`'s implementation-aware fix** (Step 4) is the
  exact same shape that was tried and reverted earlier in this investigation — it's safe
  *now* only because Steps 1–3 above made SWC's own data actually resolve for the common
  cases. Verified live (not just via unit tests, per the checklist below) on SWC Button,
  Accordion, and Badge pages before considering this done.

## Out of scope for this pass

- Fixing the "premium"/"genai" mismatch by any means other than resolving SWC's real
  type — no manual exclusion list, no data hand-edit. (A narrower interim
  exclusion-list fix was considered and explicitly declined in favor of this.)
- Any change to `deps/rsp/extract-props.js` — RSP's resolution already works correctly;
  this is purely about bringing SWC's extraction up to the same standard.
- Auto-detecting the peer-package rename (`@spectrum-web-components/core` →
  `@adobe/spectrum-wc-core`) generically — for now, assume the current run's dependency
  graph is read from each package's own published `package.json` `dependencies` field
  (already confirmed this is fetchable per-version from the CDN), not hardcoded.

## Verification checklist (completed)

- [x] Regenerated `deps/swc/data/swc-button.json`'s `variant` reads a resolved union
      matching `BUTTON_VARIANTS` exactly (no premium/genai) — confirmed both in the
      committed JSON and live in the browser (shadow-DOM `<option>` list).
- [x] A mixin-inherited enum prop (`size` / `ElementSize`) resolves correctly across
      multiple components that use `SizedMixin` (Button, Icon, Avatar, Accordion, ...
      — every occurrence across the full regenerated catalog reviewed, see the diff).
- [x] A component/prop combination with a genuinely unresolvable SWC type still falls
      back to the controls-sheet curated options (or the "no control shown" warning) —
      `labelAlign`-shaped case covered by `resolve-attribute-types.node.test.js` and
      `playground-data.node.test.js`; no such case remains in the real catalog (every
      named-alias type in the current live CEM resolved successfully).
- [x] Full `deps/swc/data/*.json` diff reviewed component-by-component before commit —
      no silent truncation (caught and fixed a real truncation bug — see
      "Implementation notes" above) and no garbage values across all 22 changed files.
- [x] *(verified, but shipping on `refactor-rsp` — see Status above.)*
      `resolvePickerOptions`/`resolveControl` made implementation-aware only after the
      above was verified, with live SWC Button/Accordion/Badge pages spot-checked in a
      browser (not just unit tests) — confirmed no console warnings and the exact
      expected option sets in each case, including that RSP's own Button page still
      correctly shows premium/genai (it's not a bug there — RSP genuinely supports
      them).
