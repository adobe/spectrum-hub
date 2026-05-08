import { loadBlock } from '../../scripts/ak.js';

export default async function init() {
  const main = document.querySelector('main');

  const wrapper = document.createElement('div');
  wrapper.className = 'template-wrapper';

  const sidenav = document.createElement('nav');
  sidenav.className = 'sidenav';
  sidenav.setAttribute('aria-label', 'Second-level site navigation');

  const inPageNav = document.createElement('nav');
  inPageNav.className = 'in-page-nav';
  inPageNav.setAttribute('aria-label', 'On this page');

  await Promise.all([loadBlock(sidenav), loadBlock(inPageNav)]);

  main.replaceWith(wrapper);
  wrapper.append(sidenav, main, inPageNav);
}
