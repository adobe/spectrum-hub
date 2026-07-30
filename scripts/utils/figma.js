import { getConfig } from '../ak.js';

// TODO: ensure this actually works once the status-table block has merged
// The S2 Figma file; each component's frame is addressed by node id.
const FIGMA_FILE_URL = 'https://www.figma.com/design/xHBWBBIe2eo5vwoCeNrC4Q/S2---Web';
const FIGMA_STATUS_PATH = '/deps/figma/component-status.json';

function slugifyName(name) {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

function componentSlugFromPath(pathname) {
  const parts = pathname.split('/').filter(Boolean);
  const idx = parts.indexOf('components');
  return idx >= 1 ? parts[idx + 1] ?? null : null;
}

// The stored id uses a colon (e.g. "9230:3620"); Figma node ids in URLs are hyphenated
// ("9230-3620").
export function resolveFigmaUrl(componentSlug, data) {
  if (!componentSlug) { return null; }
  const entry = data.find((row) => slugifyName(row.name) === componentSlug);
  if (!entry?.figmaPageId) { return null; }
  const nodeId = entry.figmaPageId.replace(':', '-');
  return `${FIGMA_FILE_URL}?node-id=${nodeId}&m=dev`;
}

export async function fetchFigmaData() {
  const { codeBase = '' } = getConfig();
  try {
    const resp = await fetch(`${codeBase}${FIGMA_STATUS_PATH}`);
    return resp.ok ? resp.json() : [];
  } catch {
    return [];
  }
}

// the widget removes itself when the component has no entry (or the data is unavailable).
export async function decorateSeeInFigma(a, span) {
  const componentSlug = componentSlugFromPath(window.location.pathname);
  const data = componentSlug ? await fetchFigmaData() : [];
  const href = resolveFigmaUrl(componentSlug, data);
  if (!href) {
    a.remove();
    return;
  }
  a.href = href;
  a.target = '_blank';
  a.rel = 'noopener noreferrer';
  span.textContent = 'See in Figma';
}
