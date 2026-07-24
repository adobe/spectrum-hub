import { getConfig } from '../ak.js';

const { codeBase, iconViewBox } = getConfig();

const VIEW_BOX = iconViewBox ?? '0 0 20 20';

export const getSvgRef = (name, className, size = 20, viewBox = VIEW_BOX) => {
  const svg = `<svg class="${className}" viewBox="${viewBox}">
    <use href="${codeBase}/img/icons/s2-icon-${name}-${size}-n.svg#icon"></use>
  </svg>`;
  return document.createRange().createContextualFragment(svg).firstElementChild;
};

export const fetchSvgEl = async (path) => {
  const href = path.startsWith('/') ? `${codeBase}${path}` : path;
  const resp = await fetch(href);
  const text = await resp.text();
  const doc = new DOMParser().parseFromString(text, 'image/svg+xml');
  const svg = doc.querySelector('svg');
  // Prevent generic ID collisions
  if (svg.id === 'icon') { svg.removeAttribute('id'); }
  return svg;
};

export default function loadIcons(icons) {
  for (const icon of icons) {
    const name = icon.classList[1].substring(5);
    const svg = getSvgRef(name, icon.className);
    icon.replaceWith(svg);
  }
}

export async function picture2svg(picture) {
  const img = picture.querySelector('[src*=".svg"]');
  const { src } = img;
  // Prevent a duplicate download of the image
  picture.replaceChildren();
  const svg = await fetchSvgEl(src);
  picture.replaceWith(svg);
}
