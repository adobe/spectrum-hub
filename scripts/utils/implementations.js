// Source of truth for the implementations the platform picker exposes.
// Adding a new web implementation is intended to be a single edit here —
// every block (picker, sitenav, related-resources, status-table,
// implementation-cards) imports from this file.
//
// Slug values match the data-extraction directory names under `deps/` so
// the URL → data-source mapping stays obvious (e.g. `/platforms/rsp/...`
// corresponds to `deps/rsp/`).

export const IMPLEMENTATIONS = [
  { id: 'rsp', label: 'React Spectrum' },
  { id: 'swc', label: 'Spectrum Web Components' },
];

export const ALL_OPTION = { id: 'all', label: 'All' };

export function getImplementationById(id) {
  return IMPLEMENTATIONS.find((impl) => impl.id === id) || null;
}

export function getOtherImplementations(currentId) {
  return IMPLEMENTATIONS.filter((impl) => impl.id !== currentId);
}
