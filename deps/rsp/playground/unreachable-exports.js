// Authored slugs `@react-spectrum/s2` ships no runtime export for, so no live preview is
// possible: the `./*` subpath 404s, the shipped `src/` can't resolve its own relative
// imports (no `./src/*` in the exports map), and bundling it needs `ui-icons/`, which
// ships only `.d.ts`. Re-check against the package's own named-export list:
// https://unpkg.com/@react-spectrum/s2@<version>/dist/types/exports/index.d.ts
export const UNREACHABLE_RSP_EXPORTS = new Set([
  'clear-button',
  'coach-mark',
  'icon',
  'modal',
  'popover-base',
  'text-field-base',
]);
