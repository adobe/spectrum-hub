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

function createColumnsGrid(el) {
  let gridClass;
  if (el.classList.contains('grid-2')) {
    gridClass = 'grid-2';
  } else if (el.classList.contains('grid-3')) {
    gridClass = 'grid-3';
  }
  if (!gridClass) { return; }

  const wrapperClass = `columns-${gridClass}`;
  if (el.parentElement?.classList.contains(wrapperClass)) { return; }

  const group = [el];
  let prev = el.previousElementSibling;
  while (prev?.classList.contains('columns') && prev.classList.contains(gridClass)) {
    group.unshift(prev);
    prev = prev.previousElementSibling;
  }
  let next = el.nextElementSibling;
  while (next?.classList.contains('columns') && next.classList.contains(gridClass)) {
    group.push(next);
    next = next.nextElementSibling;
  }

  const wrapper = document.createElement('div');
  wrapper.classList.add(wrapperClass);
  group[0].before(wrapper);
  group.forEach((col) => wrapper.append(col));
}

export default function init(el) {
  const rows = [...el.children];
  createColumnsGrid(el, rows);
  decorateRows(el, rows);
  detectImageRight(el, rows);
}
