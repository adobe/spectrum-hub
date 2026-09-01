import { fetchComponentSlice } from './component-slice.js';

// The S2 Figma file; each component's frame is addressed by node id.
const FIGMA_FILE_URL = 'https://www.figma.com/design/xHBWBBIe2eo5vwoCeNrC4Q/S2---Web';

function componentSlugFromPath(pathname) {
  const parts = pathname.split('/').filter(Boolean);
  const idx = parts.indexOf('components');
  return idx >= 1 ? parts[idx + 1] ?? null : null;
}

// The stored id uses a colon (e.g. "9230:3620"); Figma node ids in URLs are hyphenated
// ("9230-3620").
export function figmaNodeUrl(figmaPageId) {
  if (!figmaPageId) { return null; }
  const nodeId = figmaPageId.replace(':', '-');
  return `${FIGMA_FILE_URL}?node-id=${nodeId}&m=dev`;
}

// the widget removes itself when the component has no slice (or no resolved Figma node).
// Reads the same build-time status slice as blocks/component-status.js, so a
// `web.figma.figmaPageSource` override (deps/status-overrides.json) that redirects a
// component's Figma link — e.g. Calendar borrowing Date and time field's page — applies
// here too, instead of this widget re-deriving its own answer from the raw Figma roster.
export async function decorateSeeInFigma(a, span) {
  const componentSlug = componentSlugFromPath(window.location.pathname);
  const componentData = componentSlug ? await fetchComponentSlice(componentSlug) : null;
  const href = figmaNodeUrl(componentData?.figmaPageId);
  if (!href) {
    a.remove();
    return;
  }
  a.href = href;
  a.target = '_blank';
  a.rel = 'noopener noreferrer';
  span.textContent = 'See in Figma';
}
