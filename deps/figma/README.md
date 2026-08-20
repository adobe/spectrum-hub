# Figma component roster

Tracks which components exist in the S2 · Web Figma library, for the Design column of the combined status table (see [`deps/build-status-index.js`](../build-status-index.js) and [`deps/docs/DATA-CONTRACT.md`](../docs/DATA-CONTRACT.md)).

## Source of record

The [S2 · Web](https://www.figma.com/design/xHBWBBIe2eo5vwoCeNrC4Q/S2---Web) Figma file. The roster is every component set in that file, fetched from the Figma REST API's `component_sets` endpoint.

## How it works

| File | Role |
| ---- | ---- |
| **`fetch-figma-components.js`** | `fetchFigmaComponents(api)` calls the file's `component_sets` endpoint and maps each set to `{ name, figmaPageId }`, dropping Figma-internal sets (name starts with `.`). Takes an already-authenticated `api(url)` caller so the fetch logic stays independent of how the caller authenticates. |
| **`discover-components.js`** | Regenerates `component-status.json` from the file: builds an authenticated caller from `FIGMA_TOKEN`, calls `fetchFigmaComponents`, sorts by name, and writes the result. `component-status.json` is a generated artifact — do not hand-edit it. |

Despite its name, `figmaPageId` is the component set's **node ID**, not a Figma page (canvas) ID — the field name was kept for compatibility with `build-status-index.js`, which reads it to link a component's status-table row back to its Figma node.

## Running discovery

Requires a Figma personal access token ([Figma docs](https://www.figma.com/developers/api#access-tokens)):

```sh
FIGMA_TOKEN=your-token node deps/figma/discover-components.js
```

**Then rebuild the combined status index so the rest of the site picks up the change:**

```sh
node deps/build-status-index.js
```

`deps/status-index.json` and every `deps/status/<slug>.json` are generated artifacts built from `component-status.json`, not read from it directly — each carries its own copy of `figmaPageId`, written in at build time. Skipping this step leaves those files pointing at whatever `figmaPageId` values were current the *last* time the index was built, even though `component-status.json` itself is up to date.

This is currently a manual, two-step process — there is no scheduled GitHub Actions workflow for Figma yet, unlike the daily `extract-rsp-properties.yml` and `extract-swc-properties.yml` workflows, which run their own discovery step and then `build-status-index.js` as part of the same job. Rerun both steps after the Figma library changes, then commit the updated `component-status.json`, `deps/status-index.json`, and `deps/status/`.

## `component-status.json` schema

A generated array of every non-internal component set, sorted by name:

```json
[
  { "name": "Accordion", "figmaPageId": "10093:987" },
  { "name": "Action bar", "figmaPageId": "9892:747" }
]
```

- **`name`** — the component set's display name in Figma, used as the Figma-source key when joining rosters in `build-status-index.js`.
- **`figmaPageId`** — the component set's node ID (see the naming note above), used to link out to the node in Figma.

## `figma-secondary-status.json`

A hand-maintained overlay, not generated. It gives supplemental context for names that don't get their own top-level row in the status table — for example, `Date Field` ships as part of the `Date and time` component set in Figma, so its row explains that with `"context": "Use date and time component"`. `build-status-index.js` reads this file to attach that context to the matching row.

## Adding or fixing a component

**Preferred:** Run `node deps/figma/discover-components.js` to regenerate `component-status.json` from the live Figma file, then `node deps/build-status-index.js` to propagate it into `deps/status-index.json` and `deps/status/`. New or renamed component sets are picked up automatically — no hand-editing.

**When a component is missing from output:**

- The component set's name starts with `.` — Figma-internal sets are always excluded.
- The component isn't a component set yet (for example, a single component or a frame) — only component sets are enumerated.
- `FIGMA_TOKEN` is missing, expired, or lacks access to the S2 · Web file.

## Known limitations

- **No CI workflow yet.** Discovery only runs when someone runs `discover-components.js` locally and commits the result, so `component-status.json` can drift from the live file between runs.
- **Regenerating `component-status.json` without rerunning `build-status-index.js` leaves stale `figmaPageId` values in `deps/status-index.json` and `deps/status/*.json`.** The two scripts aren't wired together — see [Running discovery](#running-discovery).
- **`figmaPageId` is a node ID, not a page ID** — see the naming note in [How it works](#how-it-works). Kept as-is to avoid a breaking rename in `build-status-index.js` and `deps/status/*.json`.
