import { loadBlock } from '../../scripts/ak.js';

export default async function init() {
  const main = document.querySelector('main');

  const wrapper = document.createElement('div');
  wrapper.className = 'template-wrapper';

  const navRail = document.createElement('section');
  navRail.className = 'nav-rail';

  const sitenav = document.createElement('div');
  sitenav.className = 'section-sidenav';
  sitenav.setAttribute('aria-label', 'Second-level site navigation');

  const pageNav = document.createElement('nav');
  pageNav.className = 'page-nav';
  pageNav.setAttribute('aria-label', 'On this page');

  navRail.append(sitenav);
  main.replaceWith(wrapper);
  wrapper.append(navRail, main, pageNav);

  await Promise.all([loadBlock(sitenav), loadBlock(pageNav)]);
}
