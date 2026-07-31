import { loadStyle } from '../../scripts/ak.js';

export default async (el) => {
  const btn = el.querySelector('.btn');
  if (!btn) { return; }
  btn.closest('div').classList.add('se-button', 'size-m');
  await loadStyle('/deps/se/buttons.css');
};
