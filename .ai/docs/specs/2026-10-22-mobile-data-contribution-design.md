# Mobile component data: requirements, current design, and options

**Status:** Draft for review with the Spectrum iOS and Spectrum Android teams.

Spectrum Hub publishes a component status table and per-component documentation
pages for the web platform, built from data extracted daily from React Spectrum,
Spectrum Web Components, and the Figma library. We want the same for iOS and Android.

The surfaces are built and working against hand-authored placeholder data. What is
undecided is how real data gets from two private repositories into a public one.
This document sets out the requirements, describes how the existing pipelines work,
compares the approaches available to us, and recommends one.

## Requirements

1. **Machine-readable.** A person editing a file by hand is the state we are trying
   to leave, not a design.
2. **Refreshable without our involvement.** Status drifts with every release. Data
   that needs a Spectrum Hub engineer in the loop will go stale.
3. **Reviewable.** Every change arrives as a diff a human approves before it
   publishes. This is how the web pipelines work and it has caught real upstream
   breakage.
4. **No internal credentials in a public repository.** `adobe/spectrum-hub` is
   open source.
5. **Degrades safely.** A source that fails, returns nothing, or produces malformed
   output must not take the published site down or silently blank a table.
6. **Two levels of detail, independently useful.** Component availability alone
   powers the status table. Per-component property details power the documentation
   pages. The first is worth shipping without the second.

## How Spectrum Hub handles this data today

Every web source follows the same four stages. The boundaries matter, because the
mobile sources would slot into the same ones.

```
upstream source ──► extraction ──────► adapter ─────────► combined index ──► surfaces
                    deps/<impl>/       extraction-        deps/status-       status table,
                    components.json    status.js +        index.json         component pages,
                    deps/<impl>/data/  status-model.js    deps/status/       playground
                                                          <slug>.json
```

### Stage 1 — Extraction, per source

Each source has a directory under `deps/` holding two things: a **roster**
(`components.json`) naming what the source ships, and a **catalog** (`data/`) holding
one file per component.

| Source | Roster comes from | Catalog comes from |
| --- | --- | --- |
| React Spectrum | `discover-components.js`, against the published S2 docs site | `extract-props.js`, resolving `.d.ts` files from unpkg with the TypeScript compiler and type checker |
| Spectrum Web Components | `discover-components.js`, from the published Custom Elements Manifest | `extract-cem-components.js`, from the same manifest; also records the resolved version in `version.json` |
| Figma | `fetch-figma-components.js`, from the S2 Web library's component sets | None — presence in the library is the only signal |

Both code sources resolve from **public distribution**, not from a source
repository: npm and unpkg for React Spectrum, the published package for Spectrum Web
Components. Neither pipeline needs repository access or credentials.

### Stage 2 — The adapter boundary

Each source speaks its own vocabulary. React Spectrum has documentation maturity
(`stable`, `alpha`, `beta`, `rc`); Spectrum Web Components has declaration status
(`internal`, `preview`, `deprecated`). Nothing downstream ever sees those values.

`extraction-status.js` normalizes file shape and resolves a component-level status.
`status-model.js` maps each source's vocabulary onto one unified set — Available,
Experimental, Not available, Deprecated, Removed. A change in an upstream vocabulary
is absorbed there and never reaches the interface.

This is the extension point for a new platform: a new source adds a mapping entry.

### Stage 3 — The combined index

`build-status-index.js` joins the rosters onto canonical component names, resolves
each cell through the adapter, layers on manual overrides, and writes:

- `deps/status-index.json` — every component, every platform, plus an embedded
  legend so a single fetch is interpretable on its own
- `deps/status/<slug>.json` — one small file per component, so a documentation page
  fetches only what it needs
- `deps/impl-component-names.js` — the names each source's own docs site uses, for
  building outbound links

Membership is the union of every source. A component only one source ships is a
legitimate row, with the others reading Not available.

### Stage 4 — Delivery

Two GitHub Actions workflows, daily at 06:00 and 07:00 UTC, each: run that source's
extraction, rebuild the combined index, lint and test the output, and open a pull
request against `main` on a long-lived branch that is force-pushed each run. When the
output matches `main`, the workflow closes any open pull request and deletes the
branch, so a quiet week leaves no debris.

Validation runs inside the extraction workflow rather than on the resulting pull
request, because GitHub does not run workflows for pull requests opened with the
default token.

### What already exists for mobile

The surfaces are done and tested against placeholder data: `/mobile/status-table`
renders, component routes resolve, and the combined index carries both platforms.
`deps/ios/` and `deps/android/` are populated by hand and are **deliberately
approximate** — they demonstrate the shape, and are not a claim about either product.

## Constraints specific to mobile

Three facts rule out a straight copy of the web architecture.

1. **`adobe/spectrum-hub` is public.** Anyone with push access can read its secrets,
   so a credential granting read access to internal source would make public-repo
   write access a path to internal source.
2. **The `OneAdobe` organization enforces an IP allow list.** GitHub-hosted runners
   have public Azure addresses, so a correctly authorized token is still rejected.
3. **No public distribution exists.** Unlike React Spectrum and Spectrum Web
   Components, neither mobile library publishes anywhere a credential-less pipeline
   can read. We checked the CocoaPods trunk registry and the Swift Package Index, and
   confirmed anonymous access to the repository fails.

## Approaches

### A. Spectrum Hub pulls, using a service account

A bot account with read access to the mobile repositories, its token held in
`adobe/spectrum-hub` secrets, read by our existing daily workflows.

| Pros | Cons |
| --- | --- |
| Identical to the web architecture; one pipeline, one owner | The IP allow list rejects hosted runners regardless of the token, which likely makes this non-viable as written |
| Spectrum Hub owns the cadence, so staleness is visible to us | Puts a credential with internal read access in a public repository |
| No work for the mobile teams beyond granting access | Needs security review, and the risk is structural rather than a matter of care |

### B. Spectrum Hub pulls, using a self-hosted runner

The same, but the workflow runs on a machine inside the Adobe network.

| Pros | Cons |
| --- | --- |
| Clears the IP allow list | GitHub documents self-hosted runners on public repositories as unsafe: a pull request from a fork runs arbitrary code on an in-network machine |
| Spectrum Hub still owns the cadence | Someone must own, patch, and monitor the runner |
| | Still requires the internal read credential in a public repository |

### C. Mobile teams push into Spectrum Hub

A workflow in each mobile repository generates the data and opens a pull request
against `adobe/spectrum-hub`.

| Pros | Cons |
| --- | --- |
| No Adobe credential in a public repository — the only credential is write access to one public repo | Cadence is owned by the mobile teams, so staleness is less visible to us |
| Runs where repository access already exists; no allow list to clear | Requires build work in two other teams' pipelines |
| Each team controls exactly what is published | Two more workflows, owned by people who do not use Spectrum Hub daily |
| Our continuous integration validates the contract on the incoming pull request | Our schema becomes a dependency of their release process |
| Same review experience as the existing web pipelines | |

### D. Mobile teams publish to a public location, Spectrum Hub pulls

Each platform publishes its roster and catalogs to somewhere credential-less — a
package registry, a public mirror repository, or an artifact store — and our existing
daily workflows read it.

| Pros | Cons |
| --- | --- |
| Restores the web architecture exactly: public source, hosted runner, no credentials anywhere | Nothing public exists today, so this is the largest piece of new work |
| Spectrum Hub owns the cadence again | Publishing anything publicly likely needs its own approvals |
| The published artifact is reusable by consumers other than us | A mirror is one more thing that can drift from its source |

### E. Keep the data hand-maintained

| Pros | Cons |
| --- | --- |
| Works today; no dependency on another team | Inaccurate by construction, and published on a public site |
| The shape is already proven | Goes stale silently, with no owner |
| | Fails requirements 1 and 2 outright |

## Recommendation

**Approach C**, split into two independent workflows, with **approach D** as the
better destination if public publishing ever becomes viable.

C is the only option that satisfies every requirement without asking anyone to accept
a credential in a public repository or an in-network runner attached to one. It also
puts generation next to the source of truth, where API changes are already visible.

### Why two workflows rather than one

| | Workflow 1: component status | Workflow 2: component options |
| --- | --- | --- |
| Produces | `components.json`, `version.json` | `data/<Name>.json`, one per component |
| Unlocks | The component status table | Property tables on component pages |
| Size | A few dozen lines | One file per component |
| Effort | Listing what you ship | Introspecting each component's public API |

Splitting them means the smaller, higher-value contribution is not blocked by the
larger one, the two can run on different cadences, and a team that can only deliver
the roster still ships something real.

## The data contract

What either delivery mechanism would produce. Both platforms use the same shapes,
which are the shapes the Spectrum Web Components pipeline already writes.

### Roster — `deps/<platform>/components.json`

Maps the name your platform uses to the module path where the component lives.
A component listed here is one your platform ships.

```json
{
  "Button": "Sources/SpectrumComponents/Button",
  "Pop-up button": "Sources/SpectrumComponents/PopUpButton"
}
```

The key is the display name, as you would write it in documentation — we derive the
table's row label from it, so `Pop-up button` renders exactly that way.

### Version — `deps/<platform>/version.json`

The release the data came from.

```json
{ "version": "2.0.0" }
```

### Catalog — `deps/<platform>/data/<Name>.json`

One file per component, a flat array of property rows. `<Name>` is the last segment
of that component's module path.

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
| `type` | yes | A display string. Human-readable only — nothing branches on it. |
| `kind` | yes | One of `enum`, `boolean`, `text`, `number`, `unknown`. |
| `values` | yes | The allowed options, in declaration order. Empty for non-enums. |
| `optional` | yes | Whether a consumer may omit the property. |
| `default` | no | The default value, as a display string. |
| `description` | yes | One or two sentences. |
| `since` | no | The release that introduced the property. |

Two rules our tests enforce, because the interactive playground builds controls from
these fields:

- `kind` is `enum` if and only if `values` is non-empty.
- `values` never contains `null`, `undefined`, or the strings `"null"` or
  `"undefined"`.

### Expressing maturity

Status is derived from the rows rather than stated separately, matching how Spectrum
Web Components already works.

| Your rows | We publish |
| --- | --- |
| Carry `since`, all sharing `status: "preview"` | Available, labelled Preview |
| Carry `since`, all sharing `status: "deprecated"` | Deprecated |
| Carry `since`, with no `status` | Available, labelled Stable |
| No row carries `since` | Available |

Add a `status` field only when a component is not generally available.

### Failure behaviour

A missing or unparseable catalog costs that one component its maturity label and logs
a warning. It does not fail the build or remove the component. A half-written catalog
is a normal state while a pipeline is being developed.

## Open questions

1. **Module paths for Android.** The iOS paths follow
   `Sources/SpectrumComponents/<Name>`. We do not know the Android equivalent and
   have left those values as bare component names.
2. **Maturity signals.** Does either platform record something equivalent to preview
   or deprecated that a generator could read, or would that be hand-maintained?
3. **Release workflow ownership.** Could existing release automation open an external
   pull request, or would this be a separate workflow?
4. **Components neither platform ships.** Some belong in the table as Not available
   with guidance — "defer to the native component". Membership currently comes from
   the rosters, so a component in neither roster has no row. Should one platform list
   it, or should we carry those rows on our side?
5. **Catalog scope.** Is every public property in scope, or only those a designer or
   documentation reader would care about?
