import { loadBlock } from '../../scripts/ak.js';

export default async function init() {
  const main = document.querySelector('main');

  const wrapper = document.createElement('div');
  wrapper.className = 'template-wrapper';

  const sitenav = document.createElement('nav');
  sitenav.className = 'sitenav';
  sitenav.setAttribute('aria-label', 'Second-level site navigation');

  const pageNav = document.createElement('nav');
  pageNav.className = 'page-nav';
  pageNav.setAttribute('aria-label', 'On this page');

  await Promise.all([loadBlock(sitenav), loadBlock(pageNav)]);

  main.replaceWith(wrapper);
  wrapper.append(sitenav, pageNav, main);
}
