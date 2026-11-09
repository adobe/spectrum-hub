/**
 * Regenerates the Figma component roster (deps/figma/components.json).
 *
 * The Design column of the combined status table is driven by presence: every Figma
 * component set becomes an `Available` cell (see deps/build-status-index.js).
 *
 * discover-components.js supplies an authenticated caller and one registered source.
 * Only published component sets are discovered, not arbitrary frames or unpublished nodes.
 */

import { FIGMA_SOURCES } from '../../scripts/utils/figma-sources.js';

/**
 * `figmaPageId` is a component-set node ID, not a canvas/page ID.
 *
 * @param {(url: string) => Promise<object>} api - Authenticated Figma API caller.
 * @param {{ id: string, platform: string, fileKey: string }} source
 * @returns {Promise<object[]>}
 */
export async function fetchFigmaComponents(api, source = FIGMA_SOURCES[0]) {
  const data = await api(`https://api.figma.com/v1/files/${source.fileKey}/component_sets`);
  const sets = data?.meta?.component_sets;
  if (data?.error || (data?.status !== undefined && data.status !== 200)
    || !Array.isArray(sets)) {
    throw new Error(`${source.id}: invalid published component-sets response`);
  }
  for (const set of sets) {
    if (typeof set?.name !== 'string' || !set.name.trim()
      || typeof set.node_id !== 'string' || !/^\d+:\d+$/.test(set.node_id)
      || (set.file_key !== undefined && set.file_key !== source.fileKey)) {
      throw new Error(`${source.id}: invalid component-set name, node ID, or file identity`);
    }
  }
  return sets
    .filter((set) => !set.name.startsWith('.'))
    .map((set) => ({
      source: source.id,
      platform: source.platform,
      figmaFile: source.fileKey,
      name: set.name,
      figmaPageId: set.node_id,
    }));
}
