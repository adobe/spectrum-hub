/**
 * Regenerates the Figma component roster (deps/figma/components.json).
 *
 * The Design column of the combined status table is driven by presence: every Figma
 * component set becomes an `Available` cell (see deps/build-status-index.js). This file
 * records where that roster comes from and how to rebuild it.
 *
 * Source of record — the S2 · Web Figma library:
 *   https://www.figma.com/design/xHBWBBIe2eo5vwoCeNrC4Q/S2---Web
 *
 * The roster is currently produced via the Figma MCP (component_sets for the file above),
 * then reshaped to the flat `[{ name, figmaPageId }]` form the builder reads. The helper
 * below sketches the equivalent REST call for when this is automated in the daily
 * workflow; it needs a Figma access token in the environment.
 */

const FIGMA_FILE = 'xHBWBBIe2eo5vwoCeNrC4Q';

/**
 * Fetches the file's component sets and maps them to the roster shape. Component sets
 * whose name starts with `.` are Figma-internal and skipped.
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
