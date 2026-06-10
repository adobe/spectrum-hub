/* These columns represent the "Core layout blocks" */
function decorateCols(cols) {
  for (const [idx, col] of cols.entries()) {
    col.classList.add('col', `col-${idx + 1}`);
  }
}

function decorateRows(el, rows) {
  for (const [idx, row] of rows.entries()) {
    row.classList.add('row', `row-${idx + 1}`);
    const cols = [...row.children];
    row.style = `--child-count: ${cols.length}`;
    decorateCols(cols);
  }
  if (rows.length && rows.every((row) => row.children.length === 1) && el.querySelector('img, picture')) {
    el.classList.add('centered');
  }
}

function detectImageRight(el, rows) {
  const firstMultiColRow = rows.find((row) => row.children.length >= 2);
  if (!firstMultiColRow) { return; }
  const cols = [...firstMultiColRow.children];
  const hasImage = cols.some((c) => c.querySelector('picture, img'));
  const hasNonImage = cols.some((c) => !c.querySelector('picture, img'));
  if (!hasImage || !hasNonImage) { return; }
  if (!cols[0].querySelector('picture, img')) {
    el.classList.add('image-right');
  }
}

function detectMultiUp(el, rows) {
  const multiColRows = rows.filter((r) => r.children.length >= 2);
  if (!multiColRows.length) { return; }
  const hasImageTextRow = multiColRows.some((row) => {
    const cols = [...row.children];
    return cols.some((c) => c.querySelector('img, picture'))
      && cols.some((c) => !c.querySelector('img, picture') && c.textContent.trim());
  });
  if (hasImageTextRow) { return; }
  const maxCols = Math.max(...multiColRows.map((r) => r.children.length));

  // On mobile, rows are transparent (display: contents) so cols become direct grid items.
  // Set order so col-N from every row groups together visually.
  // Formula: colIndex * rows.length + rowIndex keeps each column's items consecutive.
  rows.forEach((row, rowIdx) => {
    [...row.children].forEach((col, colIdx) => {
      col.style.order = colIdx * rows.length + rowIdx;
      col.style.setProperty('--row-idx', rowIdx + 1);
    });
  });

  el.classList.add('multi-up', `multi-up-${maxCols}`);
}

export default function init(el) {
  const rows = [...el.children];
  decorateRows(el, rows);
  detectImageRight(el, rows);
  detectMultiUp(el, rows);
}
