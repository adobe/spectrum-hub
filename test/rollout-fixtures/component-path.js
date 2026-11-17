// Cached preparation helper, before pattern parsing was activated.
export const NATIVE_PLATFORMS = { ios: 'iOS', android: 'Android' };

export function platformsForContext(context) {
  if (!context) { return []; }
  return context.platform === 'mobile' ? Object.keys(NATIVE_PLATFORMS) : [context.platform];
}

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

function patternContextFromParts(parts) {
  const idx = parts.indexOf('patterns');
  if (idx < 2 || parts[idx - 2] !== 'web' || parts.length < idx + 3) { return null; }
  return { platform: 'web', impl: parts[idx - 1], slug: parts.at(-1) };
}

export function componentContextFromPath(pathname) {
  const parts = pathname.split('/').filter(Boolean);
  const idx = parts.indexOf('components');
  if (idx < 0) { return patternContextFromParts(parts); }
  if (idx === 1 && parts[0] === 'mobile' && parts.length === 3) {
    return { platform: 'mobile', impl: null, slug: parts[2] };
  }
  if (idx < 2 || !parts[idx + 1] || parts.length !== idx + 2) { return null; }
  const impl = parts[idx - 1];
  if (parts[idx - 2] === 'web') {
    return { platform: 'web', impl, slug: parts[idx + 1] };
  }
  if (parts[idx - 2] === 'mobile' && ['ios', 'android'].includes(impl)) {
    return { platform: impl, impl, slug: parts[idx + 1] };
  }
  return null;
}
