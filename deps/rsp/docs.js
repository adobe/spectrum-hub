export const RSP_DOCS_BASE = 'https://react-spectrum.adobe.com';

// AI components share a page and its prerelease badge.
export function docsPageName(componentName, pkg = 's2') {
  return pkg === 'ai' ? 'ai-components' : componentName;
}

export function componentDocsUrl(componentName, pkg) {
  const page = docsPageName(componentName, pkg);
  const anchor = page === componentName ? '' : `#${componentName.toLowerCase()}`;
  return `${RSP_DOCS_BASE}/${page}.html${anchor}`;
}
