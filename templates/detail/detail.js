import { loadBlock } from '../../scripts/ak.js';

export default async function init() {
  // the main element lives within .template-wrapper
  const wrapper = document.querySelector('.template-wrapper');
  if (!wrapper) { return; }

  const pageNav = document.createElement('nav');
  pageNav.className = 'page-nav';
  pageNav.setAttribute('aria-label', 'On this page');

  wrapper.append(pageNav);

  await loadBlock(pageNav);
}
