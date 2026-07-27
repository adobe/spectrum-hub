/**
 * Source of truth for the web implementations the platform surfaces expose.
 *
 * Adding a new web implementation is intended to be a single edit here — every
 * block that lists or links implementations (picker, sitenav, related resources,
 * status table, implementation cards) imports from this file.
 *
 * Each `id` matches the data-extraction directory under `deps/` (e.g. `rsp` →
 * `deps/rsp/`) and the per-implementation source keys in status-model.js, so the
 * mapping from an implementation to its data source stays obvious.
 */

export const IMPLEMENTATIONS = [
  { id: 'rsp', label: 'React Spectrum', shortLabel: 'RSP' },
  { id: 'swc', label: 'Spectrum Web Components', shortLabel: 'SWC' },
];

/**
 * The combined, all-implementations view option. This is a picker/view concept,
 * not a data source — never pass its id to status-model or a data fetch.
 */
export const ALL_OPTION = { id: 'all', label: 'All' };

/**
 * @param {string} id
 * @returns {{ id: string, label: string, shortLabel: string } | null}
 */
export function getImplementationById(id) {
  return IMPLEMENTATIONS.find((impl) => impl.id === id) || null;
}

/**
 * @param {string} currentId
 * @returns {{ id: string, label: string, shortLabel: string }[]}
 */
export function getOtherImplementations(currentId) {
  return IMPLEMENTATIONS.filter((impl) => impl.id !== currentId);
}
