// Cached main helper, before platform exports existed.
export function toSlug(name) {
  return name
    .replace(/([a-z0-9])([A-Z])/g, '$1-$2')
    .replace(/([A-Z])([A-Z][a-z])/g, '$1-$2')
    .toLowerCase();
}

export function implAndSlugFromPath(pathname) {
  const parts = pathname.split('/').filter(Boolean);
  const idx = parts.indexOf('components');
  if (idx < 1) { return { impl: null, slug: null }; }
  return { impl: parts[idx - 1] ?? null, slug: parts[idx + 1] ?? null };
}
