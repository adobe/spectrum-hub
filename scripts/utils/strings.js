// Small string helpers shared across blocks. Kept lean — both functions are
// 1–2 lines and were duplicated across sitenav, status-table, and page-nav.

// Turn a kebab-case slug into a human-readable label.
//   'action-button' → 'Action button'
export function formatLabel(slug) {
  return slug.charAt(0).toUpperCase() + slug.slice(1).replace(/-/g, ' ');
}

// Turn a heading's text into a URL-safe slug.
//   'Action Button!' → 'action-button'
export function slugify(text) {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}
