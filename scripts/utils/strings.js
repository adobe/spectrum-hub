// Turn a kebab-case slug into a human-readable label.
// 'action-button' => 'Action button'
export function formatLabel(slug) {
  if (!slug) { return ''; }
  return slug.split('-').map((word) => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
}

// Turn a heading's text into a URL-safe slug.
// 'Action Button!' => 'action-button'
export function slugify(text) {
  if (!text) { return ''; }
  return text.toLowerCase().replace(/\s+/g, '-');
}
