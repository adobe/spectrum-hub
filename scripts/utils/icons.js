import { getConfig } from '../ak.js';

const { codeBase } = getConfig();

export default function loadIcons(icons) {
  for (const icon of icons) {
    const name = icon.classList[1].substring(5);
    const svg = `<svg class="${icon.className}">
        <use href="${codeBase}/img/icons/${name}.svg#${name}"></use>
    </svg>`;
    icon.insertAdjacentHTML('afterend', svg);
    icon.remove();
  }
}
