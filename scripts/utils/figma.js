import { fetchComponentPageSlice } from './component-slice.js';
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

export const NATIVE_PLATFORMS = { ios: 'iOS', android: 'Android' };

/** Both Design widgets consume the same platform-specific, build-selected references. */
export function getFigmaLinks(pathname, componentData) {
  const context = componentContextFromPath(pathname);
  if (!context || (context.platform === 'web' && !getImplementationById(context.impl))) {
    return [];
  }
  const platforms = context.platform === 'mobile' ? Object.keys(NATIVE_PLATFORMS) : [context.platform];
  return platforms.flatMap((platform) => {
    const cell = componentData?.[platform]?.figma;
    if (!cell?.figmaPageId) { return []; }
    const source = FIGMA_SOURCES.find((entry) => entry.id === cell.figmaSource);
    if (!source || source.platform !== platform || !cell.figmaFile) {
      getConfig().log(new Error(`Invalid Figma reference for ${platform}/${context.slug}`));
      return [];
    }
    const href = figmaNodeUrl(cell.figmaPageId, source.id, cell.figmaFile);
    return href ? [{
      href, name: cell.figmaPageSource ?? context.slug, platform, label: NATIVE_PLATFORMS[platform],
    }] : [];
  });
}

export async function decorateSeeInFigma(a, span) {
  const context = componentContextFromPath(window.location.pathname);
  const componentData = context ? await fetchComponentPageSlice(context) : null;
  const links = getFigmaLinks(window.location.pathname, componentData);
  if (!links.length) {
    a.remove();
    return;
  }
  const anchors = links.map((link, index) => {
    const anchor = index === 0 ? a : a.cloneNode(true);
    const text = context.platform === 'mobile' ? `See ${link.label} in Figma` : 'See in Figma';
    anchor.href = link.href;
    anchor.setAttribute('aria-label', `${text}. Opens ${link.name} in a new tab.`);
    anchor.target = '_blank';
    anchor.rel = 'noopener noreferrer';
    (index === 0 ? span : anchor.querySelector('span')).textContent = text;
    return anchor;
  });
  a.replaceWith(...anchors);
}
