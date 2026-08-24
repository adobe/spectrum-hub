/* These columns represent the "Core layout" block along with 2- and 3-column grid layouts. */

/* Remove empty cols so they don't create phantom grid gaps, especially on mobile. */
function isEmptyCol(col) {
  return !col.textContent.trim() && !col.querySelector('picture, img');
}

/* Marks the img so .col-image's fallback background (see columns.css) only
 * shows once the browser confirms it can't render the image */
function watchImageError(media) {
  const img = media.matches('img') ? media : media.querySelector('img');
  img?.addEventListener('error', () => img.classList.add('img-error'), { once: true });
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
  watchImageError(media);
  return figure;
}

/* A caption row mirrors the image row's shape. If the image row is "singleCol" (no other populated
 * column), that shape is ambiguous with plain content, so we check for a second row before
 * we know the first one was just content and apply the caption. */
function extractCaptions(el) {
  let lastImageRow = null;
  let pendingCaptionRow = null;
  let foundSecondRow = false;

  const applyCaption = (imageRow, imgIndex, captionRow) => {
    const figure = wrapColumnImage(imageRow.children[imgIndex]);
    if (figure) {
      const figcaption = document.createElement('figcaption');
      figcaption.className = 'col-caption';
      figcaption.textContent = captionRow.children[imgIndex].textContent.trim();
      figure.after(figcaption);
    }
    captionRow.remove();
  };

  const flushPending = (imageRow, imgIndex) => {
    if (foundSecondRow) {
      applyCaption(imageRow, imgIndex, pendingCaptionRow);
    }
    pendingCaptionRow = null;
    foundSecondRow = false;
  };

  for (const row of [...el.children]) {
    const cols = [...row.children];
    const { row: imageRow, imgIndex, singleCol } = lastImageRow ?? {};
    const captionCol = imageRow && cols.length === imageRow.children.length ? cols[imgIndex] : null;
    const isCaptionRow = captionCol
      && captionCol.textContent.trim()
      && !captionCol.querySelector('picture, img')
      && cols.every((c, i) => i === imgIndex || isEmptyCol(c));

    if (isCaptionRow && singleCol) {
      if (pendingCaptionRow) { foundSecondRow = true; }
      pendingCaptionRow = row;
    } else if (isCaptionRow) {
      applyCaption(imageRow, imgIndex, row);
      lastImageRow = null;
    } else {
      flushPending(imageRow, imgIndex);
      const imageCols = cols.filter((c) => c.querySelector('picture, img'));
      if (imageCols.length === 1) {
        const newImgIndex = cols.indexOf(imageCols[0]);
        lastImageRow = {
          row,
          imgIndex: newImgIndex,
          singleCol: cols.every((c, i) => i === newImgIndex || isEmptyCol(c)),
        };
      } else {
        lastImageRow = null;
      }
    }
  }
  flushPending(lastImageRow?.row, lastImageRow?.imgIndex);
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
