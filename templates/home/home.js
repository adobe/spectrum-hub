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

  // Move every element that precedes the heading into the banner, so the h1
  // is never scooped in regardless of how many intro elements authors add.
  const bannerChildrenElements = [];
  for (const child of homeHero.children) {
    if (child === heading) { break; }
    bannerChildrenElements.push(child);
  }
  bannerChildrenElements.forEach((child) => banner.append(child));

  if (banner.children.length) {
    homeHero.prepend(banner);
  }

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
