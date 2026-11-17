import { fetchComponentSlice } from './component-slice.js';
// TODO(cache-rollout): Restore named imports after cached pre-preparation modules expire.
import * as componentPath from './component-path.js';
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

// TODO(cache-rollout): Activate the platform-aware decorator in the second rollout branch.
export async function decorateSeeInFigma(a, span) {
  const parts = window.location.pathname.split('/').filter(Boolean);
  const idx = parts.indexOf('components');
  const componentSlug = idx >= 1 ? parts[idx + 1] ?? null : null;
  const componentData = componentSlug ? await fetchComponentSlice(componentSlug) : null;
  const href = figmaNodeUrl(componentData?.figmaPageId);
  if (!href) {
    a.remove();
    return;
  }
  a.href = href;
  a.setAttribute(
    'aria-label',
    `See in Figma. Opens ${componentData.web?.figma?.figmaPageSource ?? componentSlug} in a new tab.`,
  );
  a.target = '_blank';
  a.rel = 'noopener noreferrer';
  span.textContent = 'See in Figma';
}
