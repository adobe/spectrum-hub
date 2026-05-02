import { loadBlock } from '../../scripts/ak.js';

export default async function init() {
  const main = document.querySelector('main');

  const wrapper = document.createElement('div');
  wrapper.className = 'template-wrapper';

  const sitenav = document.createElement('nav');
  sitenav.className = 'sitenav';
  await loadBlock(sitenav);

  main.replaceWith(wrapper);
  wrapper.append(sitenav, main);
}
