import { getConfig } from '../ak.js';

const { codeBase } = getConfig();

export default function loadIcons(icons) {
  for (const icon of icons) {
    const name = icon.classList[1].substring(5);
    const svg = `<svg class="${icon.className}">
        <use href="${codeBase}/img/icons/s2-icon-${name}-20-n.svg#icon"></use>
    </svg>`;
    icon.insertAdjacentHTML('afterend', svg);
    icon.remove();
  }
}

export async function picture2svg(picture) {
  const img = picture.querySelector('[src*=".svg"]');
  const { src } = img;
  // Prevent a duplicate download of the image
  picture.replaceChildren();
  const resp = await fetch(src);
  const text = await resp.text();
  const doc = new DOMParser().parseFromString(text, 'image/svg+xml');
  const svg = doc.querySelector('svg');
  picture.replaceWith(svg);
}
