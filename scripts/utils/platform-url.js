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

export function isOnPlatformPage(path) {
  return path.startsWith('/platforms/');
}

export function isOnComponentsOverview(path) {
  return path === '/components' || path.startsWith('/components/');
}

export function isOnPlatformComponentPage(path) {
  const parts = path.split('/');
  return parts[1] === 'platforms' && !!parts[2] && parts[3] === 'components' && !!parts[4];
}

// Returns the part of the path after `/platforms/[impl]/`. Used by the picker
// to preserve the current section when the visitor switches implementations
// (e.g. `/platforms/rsp/overview` → `overview`, swap to swc → `/platforms/swc/overview`).
//   '/platforms/rsp/overview'           → 'overview'
//   '/platforms/rsp/components/button'  → 'components/button'
//   '/platforms/rsp/'                   → '' (impl root; caller should default)
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
// to the cross-implementation overview.
export function resolveTargetUrl(value, sectionSuffix) {
  if (value === 'all') {
    return '/components';
  }
  return `/platforms/${value}/${sectionSuffix}`;
}

export function getSectionPrefix(pathname) {
  const parts = pathname.split('/').filter(Boolean);
  if (!parts.length) {
    return null;
  }
  if (parts[0] === 'platforms' && parts[1]) {
    return `/platforms/${parts[1]}/`;
  }
  return `/${parts[0]}/`;
}
