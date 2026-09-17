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

function getMediaContainer(media) {
  const parent = media.parentElement;
  return parent?.matches('p') && !parent.textContent.trim() && parent.children.length === 1
    ? parent
    : media;
}

function hasMeaningfulContent(nodes) {
  return nodes.some((node) => node.nodeType === Node.ELEMENT_NODE
    || (node.nodeType === Node.TEXT_NODE && node.textContent.trim()));
}

/* The fixed-size image crop box lives on this wrapper (not .col directly) so a
 * caption can sit below it without being clipped by the box's own overflow. */
function wrapColumnImage(col) {
  const media = col.querySelector('picture, img');
  if (!media) { return null; }
  const existingFigure = col.querySelector('.col-image');
  if (existingFigure) { return existingFigure; }

  const mediaContainer = getMediaContainer(media);
  const captionNodes = [];
  for (let node = mediaContainer.nextSibling; node; node = node.nextSibling) {
    captionNodes.push(node);
  }

  const figure = document.createElement('figure');
  figure.className = 'col-image';
  const mediaFrame = document.createElement('div');
  mediaFrame.className = 'col-image-media';
  mediaContainer.replaceWith(figure);
  mediaFrame.append(media);
  figure.append(mediaFrame);

  if (hasMeaningfulContent(captionNodes)) {
    const figcaption = document.createElement('figcaption');
    figcaption.className = 'col-caption';
    figcaption.append(...captionNodes);
    figure.append(figcaption);
  }

  watchImageError(media);
  return figure;
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

  const gridColumns = Array.from({ length: maxCols }, () => {
    const gridColumn = document.createElement('div');
    gridColumn.className = 'grid-column';
    gridColumn.style.setProperty('--grid-row-count', rows.length);
    return gridColumn;
  });

  rows.forEach((row) => {
    [...row.children].forEach((col, colIndex) => {
      gridColumns[colIndex].append(col);
    });
    row.remove();
  });

  // Wrap rows in grid-container so @container queries on .columns can target a descendant —
  // a container cannot respond to its own container query.
  const gridContainer = document.createElement('div');
  gridContainer.className = 'grid-container';
  el.append(gridContainer);
  gridColumns.filter((gridColumn) => gridColumn.children.length).forEach((gridColumn) => {
    gridContainer.append(gridColumn);
  });

  el.classList.add('grid-layout', `grid-layout-${maxCols}`);
}

export default function init(el) {
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
