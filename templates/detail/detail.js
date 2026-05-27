import { loadBlock } from '../../scripts/ak.js';

export default async function init() {
  const main = document.querySelector('main');

  const wrapper = document.createElement('div');
  wrapper.className = 'template-wrapper';

  // the left rail area houses both the platform picker and sitenav elements
  const leftRail = document.createElement('section');
  leftRail.classList.add('left-rail');

  // the right rail area houses the in-page nav and "related resources"
  const rightRail = document.createElement('section');
  rightRail.classList.add('right-rail');

  const picker = document.createElement('div');
  picker.className = 'picker';

  const sitenav = document.createElement('nav');
  sitenav.className = 'sitenav';
  sitenav.setAttribute('aria-label', 'Second-level site navigation');

  leftRail.append(picker, sitenav);

  const pageNav = document.createElement('nav');
  pageNav.className = 'page-nav';
  pageNav.setAttribute('aria-label', 'On this page');

  const relatedResources = document.createElement('aside');
  relatedResources.className = 'related-resources';

  rightRail.append(pageNav, relatedResources);

  await Promise.all([
    loadBlock(picker),
    loadBlock(sitenav),
    loadBlock(pageNav),
    loadBlock(relatedResources),
  ]);

  main.replaceWith(wrapper);
  wrapper.append(leftRail, main, rightRail);
}
