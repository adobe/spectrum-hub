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
    if (cols.length === 1) {
      row.classList.add('single-col');
    }
    decorateCols(el, cols);
  }
}

function isAltTextRow(contentRow, altRow) {
  if (!contentRow.querySelector('picture, img')) { return false; }
  if (altRow.querySelector('picture')) { return false; }

  const contentCols = [...contentRow.children];
  const altCols = [...altRow.children];

  return contentCols.every((col, idx) => {
    if (col.querySelector('picture, img')) { return true; }
    return !altCols[idx]?.textContent.trim();
  });
}

function applyAltFromRow(cols, altCols) {
  cols.forEach((col, idx) => {
    const img = col.querySelector('picture img, img');
    const alt = altCols[idx]?.textContent.trim();
    if (!img || !alt) { return; }
    img.setAttribute('alt', alt);
  });
}

function applyAltText(rows) {
  if (rows.length < 2) { return rows; }

  const [contentRow, altRow, ...rest] = rows;
  if (!isAltTextRow(contentRow, altRow)) { return rows; }

  applyAltFromRow([...contentRow.children], [...altRow.children]);
  altRow.remove();
  return [contentRow, ...rest];
}

function detectImageRight(el, rows) {
  if (el.classList.contains('image-right')) { return; }
  const firstMultiColRow = rows.find((row) => row.children.length >= 2);
  if (!firstMultiColRow) { return; }
  if (!firstMultiColRow.children[0].querySelector('picture, img')) {
    el.classList.add('image-right');
  }
}

export default function init(el) {
  const rows = applyAltText([...el.children]);
  decorateRows(el, rows);
  detectImageRight(el, rows);
}
