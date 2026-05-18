export function getImplementationFromPath(path) {
  if (!path.startsWith('/platforms/')) {
    return null;
  }
  return path.split('/')[2];
}

export function getComponentFromPath(path) {
  return path.split('/')[4] || null;
}

export function buildImplementationPath(implementationId, componentId) {
  return `/platforms/${implementationId}/components/${componentId}`;
}

export function isOnPlatformComponentPage(path) {
  const parts = path.split('/');
  return parts[1] === 'platforms' && !!parts[2] && parts[3] === 'components' && !!parts[4];
}

// Returns the part of the path after `/platforms/[impl]/`. Used by the picker
// to preserve the current section when the visitor switches implementations
// (e.g. `/platforms/rsp/components/button` → swap to swc → `/platforms/swc/components/button`).
//   '/platforms/rsp/components/button'  → 'components/button'
//   '/platforms/rsp'                    → '' (impl root; caller should not append a trailing slash)
//   non-platform paths                  → null
export function getPlatformSectionSuffix(path) {
  const parts = path.split('/').filter(Boolean);
  if (parts[0] !== 'platforms' || !parts[1]) {
    return null;
  }
  return parts.slice(2).join('/');
}

// Builds the URL to navigate to when the picker changes. `sectionSuffix` is
// the path after the impl segment (preserved across the switch); 'all' routes
// to the cross-implementation overview. An empty suffix means the visitor is
// on a bare impl root — return `/platforms/[impl]` without a trailing slash,
// since AEM 404s on the trailing-slash form.
export function resolveTargetUrl(value, sectionSuffix) {
  if (value === 'all') {
    return '/components';
  }
  return sectionSuffix
    ? `/platforms/${value}/${sectionSuffix}`
    : `/platforms/${value}`;
}

export function getSectionPrefix(pathname) {
  const parts = pathname.split('/').filter(Boolean);
  if (!parts.length) {
    return null;
  }
  if (parts[0] === 'platforms' && parts[1]) {
    return `/platforms/${parts[1]}`;
  }
  return `/${parts[0]}`;
}
