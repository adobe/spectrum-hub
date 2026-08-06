// Shared by blocks/search/search.js and blocks/sitenav/sitenav.js, which
// can't import from each other directly: sitenav.js's module body is a
// side-effecting IIFE that fetches and injects the whole sitenav rail on
// import, which search must not force onto a page that loads search but
// intentionally has no sitenav. This module has no side effects, so both
// can depend on it safely.
export const SEARCH_EXPAND_EVENT = 'sitenav:expand-level1';
