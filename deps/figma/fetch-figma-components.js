/**
 * Fetch helpers for the Figma component roster (deps/figma/component-status.json).
 *
 * The Design column of the combined status table is driven by presence: every Figma
 * component set becomes an `Available` cell (see deps/build-status-index.js).
 *
 * Source of record — the S2 · Web Figma library:
 *   https://www.figma.com/design/xHBWBBIe2eo5vwoCeNrC4Q/S2---Web
 *
 * deps/figma/discover-components.js calls fetchFigmaComponents below with an
 * authenticated REST caller (needs a Figma access token — see deps/figma/README.md) to
 * regenerate component-status.json. That script is the entry point for running discovery;
 * this file only holds the fetch/mapping logic.
 */

const FIGMA_FILE = 'xHBWBBIe2eo5vwoCeNrC4Q';

/**
 * Fetches the file's component sets and maps them to the roster shape written to
 * component-status.json by discover-components.js: `{ name, figmaPageId }`, sorted by
 * name there. 
 * Component sets whose name starts with `.` are Figma-internal and skipped.
 *
 * `figmaPageId` is each set's node ID, not a Figma page/canvas ID — the field name
 * predates a since-removed page-level helper and was kept for compatibility with
 * `build-status-index.js` and `deps/status/*.json`, which already key on it. See
 * deps/figma/README.md for the full naming note.
 *
 * @param {(url: string) => Promise<object>} api - Authenticated Figma API caller.
 * @returns {Promise<{ name: string, figmaPageId: string }[]>}
 */
export async function fetchFigmaComponents(api) {
  const data = await api(`https://api.figma.com/v1/files/${FIGMA_FILE}/component_sets`);
  const sets = data?.meta?.component_sets ?? [];
  return sets
    .filter((set) => !set.name.startsWith('.'))
    .map((set) => ({ name: set.name, figmaPageId: set.node_id }));
}
