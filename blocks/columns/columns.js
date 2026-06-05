/* These columns represent the "Core layout blocks" */
function decorateCols(el, cols) {
  for (const [idx, col] of cols.entries()) {
    col.classList.add('col', `col-${idx + 1}`);
  }
}

function decorateRows(el, rows) {
  for (const [idx, row] of rows.entries()) {
    row.classList.add('row', `row-${idx + 1}`);
    const cols = [...row.children];
    row.style = `--child-count: ${cols.length}`;
    decorateCols(el, cols);
  }
  if (rows.length && rows.every((row) => row.children.length === 1) && el.querySelector('img, picture')) {
    el.classList.add('centered');
  }
}

function detectImageRight(el, rows) {
  const firstMultiColRow = rows.find((row) => row.children.length >= 2);
  if (!firstMultiColRow) { return; }
  if (!firstMultiColRow.children[0].querySelector('picture, img')) {
    el.classList.add('image-right');
  }
}

export default function init(el) {
  const rows = [...el.children];
  decorateRows(el, rows);
  detectImageRight(el, rows);
}
