// TODO(cache-rollout): Restore named imports after cached pre-preparation modules expire.
import * as componentPath from './component-path.js';
import * as componentSlice from './component-slice.js';
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

/** Both Design widgets consume the same platform-specific, build-selected references. */
export function getFigmaLinks(
  context,
  componentData,
  platforms = componentPath.platformsForContext(context),
) {
  if (!context || (context.platform === 'web' && !getImplementationById(context.impl))) {
    return [];
  }
  return platforms.flatMap((platform) => {
    let cell = componentData?.[platform]?.figma;
    // TODO(cache-rollout): Remove legacy Web reading after old status slices expire.
    if (platform === 'web' && componentData?.figmaPageId
      && !cell?.figmaSource && !cell?.figmaFile && !cell?.figmaPageId) {
      cell = {
        ...cell,
        figmaSource: 's2-web',
        figmaFile: FIGMA_SOURCES.find((entry) => entry.id === 's2-web').fileKey,
        figmaPageId: componentData.figmaPageId,
      };
    }
    if (!cell?.figmaPageId) { return []; }
    const source = FIGMA_SOURCES.find((entry) => entry.id === cell.figmaSource);
    if (!source || source.platform !== platform || !cell.figmaFile) {
      getConfig().log(new Error(`Invalid Figma reference for ${platform}/${context.slug}`));
      return [];
    }
    const href = figmaNodeUrl(cell.figmaPageId, source.id, cell.figmaFile);
    return href ? [{
      href,
      name: cell.figmaPageSource ?? context.slug,
      platform,
      label: componentPath.NATIVE_PLATFORMS[platform],
    }] : [];
  });
}

export async function decorateSeeInFigma(a, span) {
  const context = componentPath.componentContextFromPath(window.location.pathname);
  const platforms = componentPath.platformsForContext(context);
  const componentData = context
    ? await componentSlice.fetchComponentPageSlice(context, platforms) : null;
  const links = getFigmaLinks(context, componentData, platforms);
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
