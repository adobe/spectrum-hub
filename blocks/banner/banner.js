import { loadStyle, removeForAudience } from '../../scripts/ak.js';

export default async (el) => {
  const rows = el.querySelectorAll(':scope > div');
  const cols = el.querySelectorAll(':scope > div > div');
  cols.forEach((col) => {
    if (!col.textContent) { col.remove(); }
  });
  // Two rows means public content on top, private content on bottom
  const gated = rows.length > 1;
  if (gated) {
    await removeForAudience({ privateEl: rows[1], publicEl: rows[0] });
  }

  const btn = el.querySelector('.btn');
  if (!btn) { return; }
  btn.closest('div').classList.add('se-button', 'size-m');
  await loadStyle('/deps/se/buttons.css');
};
