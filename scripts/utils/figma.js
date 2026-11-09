import { fetchComponentSlice } from './component-slice.js';
import { componentContextFromPath } from './component-path.js';
import { FIGMA_SOURCES } from './figma-sources.js';
import { getImplementationById } from './implementations.js';
import { getConfig } from '../ak.js';

// The stored id uses a colon (e.g. "9230:3620"); Figma node ids in URLs are hyphenated
// ("9230-3620").
export function figmaNodeUrl(figmaPageId, sourceId, fileKey) {
  if (!figmaPageId) { return null; }
  const id = sourceId === undefined ? 's2-web' : sourceId;
  const source = FIGMA_SOURCES.find((entry) => entry.id === id);
  if (!source || (fileKey !== undefined && fileKey !== source.fileKey)
    || typeof figmaPageId !== 'string' || !/^\d+:\d+$/.test(figmaPageId)) {
    getConfig().log(new Error(`Invalid Figma source/file/node reference: ${sourceId}`));
    return null;
  }
  const nodeId = figmaPageId.replace(':', '-');
  return `https://www.figma.com/design/${source.fileKey}/${source.urlName}?node-id=${nodeId}&m=dev`;
}

/** Both Design widgets consume this platform-specific, build-selected reference. */
export function getFigmaLink(pathname, componentData) {
  const context = componentContextFromPath(pathname);
  if (!context || (context.platform === 'web' && !getImplementationById(context.impl))) {
    return null;
  }
  const cell = componentData?.[context.platform]?.figma;
  if (!cell?.figmaPageId) { return null; }
  const source = FIGMA_SOURCES.find((entry) => entry.id === cell.figmaSource);
  if (!source || source.platform !== context.platform || !cell.figmaFile) {
    getConfig().log(new Error(`Invalid Figma reference for ${context.platform}/${context.slug}`));
    return null;
  }
  const href = figmaNodeUrl(cell.figmaPageId, source.id, cell.figmaFile);
  return href ? { href, name: cell.figmaPageSource ?? context.slug } : null;
}

export async function decorateSeeInFigma(a, span) {
  const context = componentContextFromPath(window.location.pathname);
  const componentData = context ? await fetchComponentSlice(context.slug) : null;
  const link = getFigmaLink(window.location.pathname, componentData);
  if (!link) {
    a.remove();
    return;
  }
  a.href = link.href;
  a.setAttribute(
    'aria-label',
    `See in Figma. Opens ${link.name} in a new tab.`,
  );
  a.target = '_blank';
  a.rel = 'noopener noreferrer';
  span.textContent = 'See in Figma';
}
