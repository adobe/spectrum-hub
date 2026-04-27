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
    if (cols.length === 1) row.classList.add('single-col');
    decorateCols(el, cols);
  }
}

export default function init(el) {
  const rows = [...el.children];
  decorateRows(el, rows);
}
