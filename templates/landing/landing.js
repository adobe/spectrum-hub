import { loadBlock } from '../../scripts/ak.js';

export default async function init() {
  const main = document.querySelector('main');

  const wrapper = document.createElement('div');
  wrapper.className = 'template-wrapper';

  // Left rail: picker (above) + sitenav (below).
  // The picker block self-gates on URL — empty on non-platform pages, so the
  // `.picker` container is harmless when this template renders /foundations
  // or other non-platform landings.
  const leftRail = document.createElement('div');
  leftRail.className = 'left-rail';

  const picker = document.createElement('div');
  picker.className = 'picker';

  const sitenav = document.createElement('nav');
  sitenav.className = 'sitenav';
  sitenav.setAttribute('aria-label', 'Second-level site navigation');

  leftRail.append(picker, sitenav);

  await Promise.all([loadBlock(picker), loadBlock(sitenav)]);

  main.replaceWith(wrapper);
  wrapper.append(leftRail, main);
}
