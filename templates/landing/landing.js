import { loadBlock } from '../../scripts/ak.js';

export default async function init() {
  const main = document.querySelector('main');

  const wrapper = document.createElement('div');
  wrapper.className = 'template-wrapper';

  const sidenav = document.createElement('nav');
  sidenav.className = 'sidenav';
  sidenav.setAttribute('aria-label', 'Second-level site navigation');
  await loadBlock(sidenav);

  main.replaceWith(wrapper);
  wrapper.append(sidenav, main);
}
