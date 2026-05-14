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
