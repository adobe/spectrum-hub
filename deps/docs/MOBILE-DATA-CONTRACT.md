# Mobile data contract

The contract for data arriving from the iOS and Android libraries. Those libraries are
private, so Spectrum Hub cannot extract from them the way it extracts from React Spectrum
and Spectrum Web Components. The mobile teams generate the files below and open a pull
request against this repository instead.

This doc is the **incoming** contract: what a mobile implementation produces and what is
enforced on it. For what the builder then does with those files — the roster join, status
resolution, slice writing, and pruning — see
[DATA-CONTRACT.md](./DATA-CONTRACT.md#the-mobile-rosters). For where every status and
alias file lives, see [STATUS-FILES.md](./STATUS-FILES.md).

iOS and Android are two **implementations** of one **platform**, `mobile`. Each has its
own directory under `deps/` and its own roster, and the two share a status table and a set
of component pages. `<implementation>` below is `ios` or `android`; the platform name
appears only in the builder's configuration, never in a path.

The data currently committed under `deps/ios/` and `deps/android/` is hand-written
placeholder data. It demonstrates the shape; no extraction produces it yet.

## Two phases

The contract has two halves that are independently useful, and the first ships without
the second.

| | Phase one | Phase two |
| --- | --- | --- |
| Produces | `deps/<implementation>/components.json` | `deps/<implementation>/data/<Name>.json`, one per component |
| Unlocks | The mobile component status table | Component options tables on component pages |
| Effort | Listing what the implementation ships | Introspecting each component's public API |

Phase one is a roster and nothing else. Membership is the signal: a component listed in
`components.json` is one that implementation ships, and
[`PLATFORM_CONFIG.mobile.presentFloor`](../build-status-index.js) floors it to Available
when no catalog accompanies it. A roster on its own produces complete status-table rows
with no warnings.

Phase one expresses one status directly: Available. Not available follows from omission —
a component one implementation lists and the other does not reads Not available in that
column on its own. Everything else comes from configuration this repository owns:
[`status-overrides.json`](../status-overrides.json) for Deprecated and maturity context
such as `Preview`, `deps/<implementation>/<implementation>-secondary-status.json` for
guidance such as "use the native component", and
[`roster-additions.json`](../roster-additions.json) for a component neither implementation
ships. Those entries are a bridge. Phase two derives the signals it can from the catalogs
and retires them.

## Roster — `deps/<implementation>/components.json`

Maps the name the implementation uses to the module subpath where the component lives.

```json
{
  "Button": "Sources/SpectrumComponents/Button",
  "Pop-up button": "Sources/SpectrumComponents/PopUpButton"
}
```

The key is the display name as documentation would write it; the status table derives its
row label from it, so `Pop-up button` renders exactly that way. Subpaths are relative to
the package root, so a version bump is one edit rather than one per path.

A component removed from this file is removed everywhere — its row, its cells, and its
`deps/status/<slug>.json` slice. Nothing in this file needs to describe a component the
implementation does not ship: a component one lists and the other does not already reads
Not available in the other column, and one that neither ships is carried by Spectrum Hub
in [`roster-additions.json`](../roster-additions.json), which is keyed by platform
(`web`, `mobile`) rather than by implementation.

## Version — `deps/<implementation>/version.json`

```json
{ "version": "2.0.0" }
```

The release the data came from. No status or API surface reads this file today; SWC's
equivalent is read only by the web playground, which pins a CDN version, and mobile has no
playground. It is recorded for provenance.

## Catalog — `deps/<implementation>/data/<Name>.json`

One file per component, a flat array of property rows. `<Name>` is the last segment of
that component's module subpath, which is what lets a display-name roster key like
`Pop-up button` sit beside a `PopUpButton.json` catalog.

```json
[
  {
    "property": "size",
    "type": "\"Small\" | \"Medium\" | \"Large\"",
    "kind": "enum",
    "values": ["Small", "Medium", "Large"],
    "optional": false,
    "default": "'medium'",
    "description": "The size of the button.",
    "since": "2.0.0"
  }
]
```

| Field | Required | Notes |
| --- | --- | --- |
| `property` | yes | The public name, as a consumer writes it. |
| `type` | yes | A display string, human-readable. Nothing branches on it. |
| `kind` | yes | One of `enum`, `boolean`, `text`, `number`, `unknown`. |
| `values` | yes | The allowed options in declaration order. Empty for non-enums. |
| `optional` | yes | Whether a consumer may omit the property. |
| `description` | yes | One or two sentences. |
| `default` | no | The default value, as a display string. |
| `since` | no | The release that introduced the property. |

Two structural rules hold across every catalog in this repository, web and mobile:
`kind` is `enum` if and only if `values` is non-empty, and `values` holds only primitives —
never `null`, `undefined`, or the strings `"null"` and `"undefined"`.

`kind`, `values`, and `optional` have no mobile reader today. The component options table
renders `property`, `type`, `default`, and `description`; the other three back the web
playground's interactive controls, and mobile points at the iOS and Android catalog apps
instead. They are required anyway, because a generator already introspecting types
produces them for free and retrofitting them later means regenerating every catalog.

These fields come from the same contract both web extractors write,
[`deps/shared/prop-contract.js`](../shared/prop-contract.js). One exception: the web
catalogs predate it and carry rows their upstream source does not describe, so `property`,
`type`, and `description` are enforced on the mobile catalogs only.

## Status

Status derives from the catalog rows rather than being stated separately, exactly as it
does for SWC. A component defaults to Available; a row carries `status` only when the
component is not generally available.

Resolution is unanimous or nothing. Only rows carrying `since` are considered, and they
must all agree — a `status` on one property does not mark the component.

| The catalog carries | The status table says |
| --- | --- |
| No catalog at all | Available |
| `since`, no `status` | Available |
| `since`, `status` on some rows | Available |
| `since` and `status: "preview"` on every row | Available (context `Preview`) |
| `since` and `status: "deprecated"` on every row | Deprecated |
| `status: "deprecated"` but no `since` | Available |

The vocabulary is SWC's, mapped in
[`SOURCE_MAPPINGS`](../../scripts/utils/status-model.js). A new mobile term is absorbed
there and reaches no surface directly.

## What is enforced, and where

The build and the test suite treat a missing catalog differently on purpose.

**The build is lenient.** A missing catalog costs that one component its maturity label
and publishes it as Available, silently — phase one is the whole roster in that state, so
it is not a condition worth warning about. An unparseable one does the same and warns. A
half-written catalog is a normal state while an implementation's generator is still being
built, and it should not take the index down. Configuration files get the opposite
treatment — see
[DATA-CONTRACT.md](./DATA-CONTRACT.md#configuration-is-read-strictly-catalogs-leniently).

**The tests are strict**, and which rules apply depends on the phase.
[`test/extractions/data-contract.node.test.js`](../../test/extractions/data-contract.node.test.js)
holds a single constant:

```js
const REQUIRE_MOBILE_CATALOGS = true;
```

| | `true` (both phases landed) | `false` (phase one only) |
| --- | --- | --- |
| Row shape: `kind`, `values`, primitives | enforced | enforced |
| Required fields on every row | enforced | enforced |
| Every roster entry has a catalog | enforced | not enforced |
| Catalog is populated | enforced | not enforced |
| Every catalog has a roster entry | enforced | enforced |

The last rule never relaxes: a catalog with no roster entry is a file nothing will read,
in either phase. Set `REQUIRE_MOBILE_CATALOGS` to `false` while an implementation has
shipped its roster and not its catalogs, and back to `true` once both have landed. The
rules that stay enforced in both columns apply to whatever rows do exist, so a partial
catalog is still held to the shape.

## Receiving a phase-one pull request

A team's first contribution is most likely a roster with no catalogs. Spectrum Hub has
four things to do on that pull request.

**1. Delete that implementation's `data/` directory.** The placeholder catalogs committed
during the POC are named for the placeholder roster, so a real `components.json` turns all
of them into orphans. `has a roster entry for every catalog` never relaxes, so the
check fails until they are gone.

**2. Set `REQUIRE_MOBILE_CATALOGS` to `false`** in
[`test/extractions/data-contract.node.test.js`](../../test/extractions/data-contract.node.test.js).
Note that it is one constant covering both `ios` and `android`. If one implementation has
shipped catalogs and the other has not, setting it to `false` stops enforcing catalogs for
both. Splitting it into `{ ios: …, android: … }` is the fix when that case arrives.

**3. Rebuild and commit the generated files.** `node deps/build-status-index.js` rewrites
`deps/status-index.json`, the `deps/status/<slug>.json` slices, and
`deps/impl-component-names.js`. A component that left the roster has its slice pruned in
the same run.

**4. Check the warnings that run prints.** `secondary for <implementation> targets
unmatched component` means an entry in
`deps/<implementation>/<implementation>-secondary-status.json` names a component the new
roster does not carry — either the name drifted or the component is gone, and the overlay
entry needs updating or removing. `override for unknown component` means the same for
[`status-overrides.json`](../status-overrides.json), whose keys are canonical names
(`NavigationBar`), not display names (`Navigation bar`).

Set `REQUIRE_MOBILE_CATALOGS` back to `true` in the pull request that brings that
implementation's catalogs, and delete the Hub-owned entries the catalogs now supply.
