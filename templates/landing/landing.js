export default async function init() {
  const main = document.querySelector('main');

  const wrapper = document.createElement('div');
  wrapper.className = 'template-wrapper';

  const navRail = document.createElement('aside');
  navRail.className = 'nav-rail';

  const sitenav = document.createElement('div');
  sitenav.className = 'hub-section-sidenav';
  sitenav.setAttribute('aria-label', 'Second-level site navigation');

  navRail.append(sitenav);
  main.replaceWith(wrapper);
  wrapper.append(navRail, main);
}
