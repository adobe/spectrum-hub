// Source of truth for the implementations the platform picker exposes.
// Adding a new web implementation is intended to be a single edit here-
// every block (picker, sitenav, related-resources, status-table,
// implementation-cards) imports from this file.

export const IMPLEMENTATIONS = [
  { id: 'rsp', label: 'React Spectrum' },
  { id: 'swc', label: 'Spectrum Web Components' },
];

export const ALL_OPTION = { id: 'all', label: 'All' };

export function getImplementationById(id) {
  return IMPLEMENTATIONS.find((impl) => impl.id === id);
}

export function getOtherImplementations(currentId) {
  return IMPLEMENTATIONS.filter((impl) => impl.id !== currentId);
}
