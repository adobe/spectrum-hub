/* These columns represent the "Core layout" block along with 2- and 3-column grid layouts. */

/* Remove empty cols so they don't create phantom grid gaps, especially on mobile. */
function isEmptyCol(col) {
  return !col.textContent.trim() && !col.querySelector('picture, img');
}

/* The fixed-size image crop box lives on this wrapper (not .col directly) so a
 * caption can sit below it without being clipped by the box's own overflow. */
function wrapColumnImage(col) {
  const media = col.querySelector('picture, img');
  if (!media || col.querySelector('.col-image')) { return null; }
  const figure = document.createElement('figure');
  figure.className = 'col-image';
  media.replaceWith(figure);
  figure.append(media);
  return figure;
}

/*
 * Captions are authored as a trailing row: same column count as the image row
 * it describes, with the caption text in the same column index as the image
 */
function extractCaptions(el) {
  let lastImageRow = null;

  for (const row of [...el.children]) {
    const cols = [...row.children];
    const { row: imageRow, imgIndex } = lastImageRow ?? {};
    const captionCol = imageRow && cols.length === imageRow.children.length ? cols[imgIndex] : null;
    const isCaptionRow = captionCol
      && captionCol.textContent.trim()
      && !captionCol.querySelector('picture, img')
      && cols.every((c, i) => i === imgIndex || isEmptyCol(c));

    if (isCaptionRow) {
      const figure = wrapColumnImage(imageRow.children[imgIndex]);
      if (figure) {
        const figcaption = document.createElement('figcaption');
        figcaption.className = 'col-caption';
        figcaption.textContent = captionCol.textContent.trim();
        figure.after(figcaption);
      }
      row.remove();
      lastImageRow = null;
    } else {
      const imageCols = cols.filter((c) => c.querySelector('picture, img'));
      lastImageRow = imageCols.length === 1 ? { row, imgIndex: cols.indexOf(imageCols[0]) } : null;
    }
  }
}

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
  if (rows.length && rows.every((row) => row.children.length === 1) && el.querySelector('picture, img')) {
    el.classList.add('centered');
  }
}

function detectImageRight(el, rows) {
  const firstMultiColRow = rows.find((row) => row.children.length >= 2);
  if (!firstMultiColRow) { return; }
  const cols = [...firstMultiColRow.children];
  if (!cols.some((c) => c.querySelector('picture, img'))) { return; }
  if (!cols[0].querySelector('picture, img')) {
    el.classList.add('image-right');
  }
}

/* columns can be their own block, or be combined into multi-row and multi-col grid layouts */
function applyGridLayout(el, rows) {
  const multiColRows = rows.filter((r) => r.children.length >= 2);
  if (!multiColRows.length) { return; }
  const hasImageTextRow = multiColRows.some((row) => {
    const cols = [...row.children];
    return cols.some((c) => c.querySelector('picture, img'))
      && cols.some((c) => !c.querySelector('picture, img') && c.textContent.trim());
  });
  if (hasImageTextRow) { return; }
  const maxCols = Math.max(...multiColRows.map((r) => r.children.length));

  // On small screens, rows are transparent (display: contents) so cols become direct grid items.
  // Set order so col-N from every row groups together visually.
  // Formula: colIndex * rows.length + rowIndex keeps each column's items consecutive.
  rows.forEach((row, rowIndex) => {
    [...row.children].forEach((col, colIndex) => {
      col.style.order = colIndex * rows.length + rowIndex;
      col.style.setProperty('--row-idx', rowIndex + 1);
    });
  });

  // Wrap rows in grid-container so @container queries on .columns can target a descendant —
  // a container cannot respond to its own container query.
  const gridContainer = document.createElement('div');
  gridContainer.className = 'grid-container';
  el.append(gridContainer);
  rows.forEach((row) => gridContainer.append(row));

  el.classList.add('grid-layout', `grid-layout-${maxCols}`);
}

export default function init(el) {
  // Pair caption rows with their image
  extractCaptions(el);

  for (const row of [...el.children]) {
    for (const col of [...row.children]) {
      if (isEmptyCol(col)) {
        col.remove();
      }
    }
    // Remove rows left empty after column pruning.
    if (!row.children.length) {
      row.remove();
    }
  }

  const rows = [...el.children];
  for (const row of rows) {
    for (const col of row.children) {
      wrapColumnImage(col);
    }
  }

  decorateRows(el, rows);
  detectImageRight(el, rows);
  applyGridLayout(el, rows);
}
