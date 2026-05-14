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

export function resolveTargetUrl(value, currentComponent) {
  if (value === 'all') {
    return '/components';
  }
  return buildImplementationPath(value, currentComponent);
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
