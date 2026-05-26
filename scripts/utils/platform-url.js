const PLATFORMS_PREFIX = '/platforms/';

export function getImplementationFromPath(path) {
  if (!path.startsWith(PLATFORMS_PREFIX)) { return null; }
  const after = path.slice(PLATFORMS_PREFIX.length);
  const [impl] = after.split('/');
  return impl || null;
}

export function getComponentFromPath(path) {
  if (!path.startsWith(PLATFORMS_PREFIX)) { return null; }
  const parts = path.slice(PLATFORMS_PREFIX.length).split('/');
  if (parts.length < 3 || !parts[2]) { return null; }
  return parts[2];
}

// Returns the part of the path after `/platforms/[impl]/`. Used by the picker
// to preserve the current section when the visitor switches implementations
export function getPlatformSectionSuffix(path) {
  if (!path.startsWith(PLATFORMS_PREFIX)) { return null; }
  const after = path.slice(PLATFORMS_PREFIX.length);
  const slashIdx = after.indexOf('/');
  return slashIdx === -1 ? '' : after.slice(slashIdx);
}

export function getSectionPrefix(path) {
  const impl = getImplementationFromPath(path);
  if (!impl) { return null; }
  return `${PLATFORMS_PREFIX}${impl}`;
}

export function buildImplementationPath(implId, suffix) {
  return `${PLATFORMS_PREFIX}${implId}${suffix}`;
}

export function isOnPlatformComponentPage(path) {
  return getComponentFromPath(path) !== null;
}

// Builds the URL to navigate to when the picker changes. `sectionSuffix` is
// the path after the impl segment (preserved across the switch); 'all' routes
// to the cross-implementation overview. An empty suffix means the visitor is
// on a bare impl root. Return `/platforms/[impl]` without a trailing slash,
// since AEM 404s on the trailing-slash form.
export function resolveTargetUrl(currentPath, targetId) {
  if (targetId === 'all') { return '/components'; }
  const sectionSuffix = getPlatformSectionSuffix(currentPath) ?? '';
  return buildImplementationPath(targetId, sectionSuffix);
}
