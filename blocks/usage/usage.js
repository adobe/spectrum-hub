const INDICATOR_TYPES = {
  docheck: 'do',
  dontcross: 'dont',
  neutralminus: 'neutral',
};

const INDICATOR_LABELS = {
  do: 'Recommended',
  dont: 'Not recommended',
  neutral: 'Use with care',
};

function findIndicatorType(cell) {
  const icon = cell?.querySelector('.icon');
  if (!icon) { return undefined; }
  const match = [...icon.classList]
    .map((c) => /^icon-(docheck|dontcross|neutralminus)$/.exec(c))
    .find(Boolean);
  return match ? INDICATOR_TYPES[match[1]] : undefined;
}

function buildPanel(mediaCell, captionCell, indicatorCell) {
  const type = findIndicatorType(indicatorCell) ?? 'do';

  const figure = document.createElement('figure');
  figure.className = `usage-panel usage-panel-${type}`;
  if (mediaCell) { figure.append(...mediaCell.childNodes); }

  const badge = document.createElement('span');
  badge.className = 'usage-indicator';
  const label = document.createElement('span');
  label.className = 'visually-hidden';
  label.textContent = INDICATOR_LABELS[type];
  badge.append(label);
  figure.append(badge);

  const captionText = captionCell?.textContent.trim();
  if (captionText) {
    const figcaption = document.createElement('figcaption');
    figcaption.className = 'usage-caption';
    figcaption.textContent = captionText;
    figure.append(figcaption);
  }

  return figure;
}

/*
 * Stacked shape (default): rows come in groups of three per panel —
 * [media (+ leading content cell on the very first row)], [caption], [indicator].
 * A single panel is just the one-group case of this same pattern.
 */
function buildStackedPanels(rows, content) {
  const panels = [];
  for (let i = 0; i < rows.length; i += 3) {
    const mediaRow = rows[i];
    if (!mediaRow) { break; }
    const cells = [...mediaRow.children];
    const hasLeadingContent = i === 0 && cells.length > 1;
    if (hasLeadingContent) { content.append(...cells[0].childNodes); }
    const mediaCell = hasLeadingContent ? cells[1] : cells[0];

    panels.push(buildPanel(mediaCell, rows[i + 1]?.children[0], rows[i + 2]?.children[0]));
  }
  return panels;
}

/*
 * Side-by-side shape: a single group of three rows — [media, caption, indicator] —
 * where each row holds one cell per panel, plus an optional leading content cell
 * in the media row. A panel column always carries a semantic indicator icon, so
 * the content column (if any) is whichever one doesn't.
 */
function buildSideBySidePanels([mediaRow, captionRow, indicatorRow], content) {
  if (!mediaRow) { return []; }
  const mediaCells = [...mediaRow.children];
  const captionCells = [...(captionRow?.children ?? [])];
  const indicatorCells = [...(indicatorRow?.children ?? [])];

  const contentIndex = mediaCells.findIndex((_, i) => !findIndicatorType(indicatorCells[i]));
  if (contentIndex !== -1) { content.append(...mediaCells[contentIndex].childNodes); }

  return mediaCells
    .map((cell, i) => (
      i === contentIndex ? null : buildPanel(cell, captionCells[i], indicatorCells[i])
    ))
    .filter(Boolean);
}

/*
 * Side-by-side is a shape, not just an authored variant class: if the caption
 * and indicator rows each hold more than one cell, those rows describe more
 * than one panel, so the whole three-row group is shared across N columns
 * rather than each panel getting its own row-group.
 */
function isSideBySideShape(rows) {
  return rows.length === 3
    && (rows[1]?.children.length ?? 0) > 1
    && (rows[2]?.children.length ?? 0) > 1;
}

export default function init(el) {
  const rows = [...el.children];
  const content = document.createElement('div');
  content.className = 'usage-content';

  const isSideBySide = isSideBySideShape(rows);
  const panels = isSideBySide
    ? buildSideBySidePanels(rows, content)
    : buildStackedPanels(rows, content);

  el.classList.toggle('side-by-side', isSideBySide);
  el.classList.toggle('has-content', content.childNodes.length > 0);
  el.style.setProperty('--usage-panel-count', panels.length);
  el.replaceChildren(...(content.childNodes.length ? [content] : []), ...panels);
}
