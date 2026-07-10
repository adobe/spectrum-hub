import { loadBlock } from '../../scripts/ak.js';

export default async function init() {
  const main = document.querySelector('main');
  const heading = main.querySelector('h1');
  heading.classList.add('heading-size-xxxxl');

  const parent = heading.closest('div');
  parent.className = 'home-hero';
  parent.nextElementSibling.append(parent);

  const homeHero = document.querySelector('.home-hero');
  const banner = document.createElement('div');
  banner.classList.add('home-banner');
  const bannerChildrenElements = [homeHero.firstElementChild, homeHero.children[1]];
  bannerChildrenElements.forEach((child) => banner.append(child));
  homeHero.prepend(banner);

  const wrapper = document.createElement('div');
  wrapper.className = 'template-wrapper';

  const navRail = document.createElement('aside');
  navRail.className = 'nav-rail';

  const sitenav = document.createElement('nav');
  sitenav.className = 'sitenav';
  sitenav.setAttribute('aria-label', 'Second-level site navigation');

  navRail.append(sitenav);
  main.replaceWith(wrapper);
  wrapper.append(navRail, main);

  await loadBlock(sitenav);
}
