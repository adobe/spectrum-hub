// Reuses the site-wide `/img/icons/s2-icon-<name>-20-n.svg#icon` convention
// (see scripts/utils/svg.js, blocks/card/card.js).
export function iconHref(name) {
  return `/img/icons/s2-icon-${name}-20-n.svg#icon`
}

const SVG_NS = 'http://www.w3.org/2000/svg';

// Split from buildIconSvg so a caller can drop it into an existing <svg>
// (e.g. a fragment's `<svg slot="icon">`) instead of nesting a second one.
export function buildIconUse(name) {
  const use = document.createElementNS(SVG_NS, 'use');
  use.setAttribute('href', iconHref(name));
  return use;
}

// Used by the SWC shell only — RSP builds its own <svg> via React.createElement.
export function buildIconSvg(name) {
  const svg = document.createElementNS(SVG_NS, 'svg');
  svg.setAttribute('viewBox', '0 0 20 20');
  svg.appendChild(buildIconUse(name));
  return svg;
}
