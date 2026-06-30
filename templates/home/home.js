export default async function init() {
  const main = document.querySelector('main');
  const heading = main.querySelector('h1');
  heading.classList.add('heading-size-xxxxl');
  const parent = heading.closest('div');
  parent.className = 'home-column';
  parent.nextElementSibling.append(parent);

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

  navRail.append(sitenav);
  main.replaceWith(wrapper);
  wrapper.append(navRail, main);
}
