import { loadBlock } from '../../scripts/ak.js';

export default async function init() {
  const main = document.querySelector('main');

  const wrapper = document.createElement('div');
  wrapper.className = 'template-wrapper';

  const navRail = document.createElement('aside');
  navRail.className = 'nav-rail';

  // The global rail is loaded globally (scripts/lazy.js) and prepended into
  // `.nav-rail`. The section sidenav listens for `hub:section-selected`
  // (dispatched when a global rail button is clicked) and renders that
  // section's tree.
  const sitenav = document.createElement('div');
  sitenav.className = 'hub-section-sidenav';
  sitenav.setAttribute('aria-label', 'Second-level site navigation');

  const pageNav = document.createElement('nav');
  pageNav.className = 'page-nav';
  pageNav.setAttribute('aria-label', 'On this page');

  navRail.append(sitenav);
  main.replaceWith(wrapper);
  wrapper.append(navRail, main, pageNav);

  await loadBlock(pageNav);
}
