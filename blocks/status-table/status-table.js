import { getConfig } from '../../scripts/ak.js';
import { STATUSES } from '../../scripts/utils/status-model.js';
import { toCsv, downloadCsv } from '../../scripts/utils/csv.js';

const config = getConfig();

const CSV_FILENAME = 'component-status.csv';

// The block binds to the build-time combined index (deps/build-status-index.js). Authors
// may point it at a different index by dropping a JSON link in the block; otherwise it
// reads the canonical one.
const DEFAULT_INDEX = '/deps/status-index.json';

const NOT_AVAILABLE = 'not-available';

// explicitly reset table roles so that when the CSS display property changes on small
// screens the accessibility tree is unaffected — WCAG 1.3.1 (Info and Relationships).
const withRole = (node, role) => {
  node.role = role;
  return node;
};

/** A colored status dot + its unified label; `data-status` is the CSS/color hook. */
const buildBadge = (cell) => {
  const status = STATUSES[cell?.status] ?? STATUSES[NOT_AVAILABLE];

  const badge = document.createElement('span');
  badge.className = 'status-table__badge';

  const dot = document.createElement('span');
  dot.className = 'status-table__dot';
  dot.setAttribute('data-status', status.id);
  dot.style.setProperty('--status-color', `var(${status.color})`);
  dot.setAttribute('aria-hidden', 'true');

  const label = document.createElement('span');
  label.className = 'status-table__label';
  label.textContent = status.label;

  badge.append(dot, label);
  return badge;
};

/** One implementation cell: the status badge plus an optional secondary guidance line. */
const buildStatusCell = (cell) => {
  const td = withRole(document.createElement('td'), 'cell');
  td.append(buildBadge(cell));
  if (cell?.secondary) {
    const secondary = document.createElement('span');
    secondary.className = 'status-table__secondary';
    secondary.textContent = cell.secondary;
    td.append(secondary);
  }
  return td;
};

const buildTable = (index) => {
  // Columns come from the index (each `{ id, label }`), never hard-coded — onboarding a
  // source is a data change. Figma rides here as a column without being a code
  // implementation in scripts/utils/implementations.js.
  const columns = index.implementations?.web ?? [];

  const headRow = withRole(document.createElement('tr'), 'row');
  headRow.classList.add('row');
  const componentHead = withRole(document.createElement('th'), 'columnheader');
  componentHead.scope = 'col';
  componentHead.textContent = 'Component';
  headRow.append(componentHead);
  for (const { label } of columns) {
    const th = withRole(document.createElement('th'), 'columnheader');
    th.scope = 'col';
    th.textContent = label;
    headRow.append(th);
  }
  const thead = withRole(document.createElement('thead'), 'rowgroup');
  thead.classList.add('header-row');
  thead.append(headRow);

  const tbody = withRole(document.createElement('tbody'), 'rowgroup');
  for (const component of index.components ?? []) {
    const row = withRole(document.createElement('tr'), 'row');
    row.classList.add('row');

    const nameCell = withRole(document.createElement('th'), 'rowheader');
    nameCell.scope = 'row';
    nameCell.textContent = component.label ?? component.name;
    row.append(nameCell);

    const web = component.platforms?.web ?? {};
    for (const { id } of columns) {
      row.append(buildStatusCell(web[id]));
    }
    tbody.append(row);
  }

  const table = withRole(document.createElement('table'), 'table');
  table.className = 'status-table__table';
  table.append(thead, tbody);
  return table;
};

/** Always-visible legend defining every unified status. */
const buildLegend = () => {
  const legend = document.createElement('ul');
  legend.className = 'status-table__legend';
  for (const { id, label, definition, color } of Object.values(STATUSES)) {
    const item = document.createElement('li');
    item.className = 'status-table__legend-item';

    const dot = document.createElement('span');
    dot.className = 'status-table__dot';
    dot.setAttribute('data-status', id);
    dot.style.setProperty('--status-color', `var(${color})`);
    dot.setAttribute('aria-hidden', 'true');

    const term = document.createElement('span');
    term.className = 'status-table__legend-label';
    term.textContent = label;

    const desc = document.createElement('span');
    desc.className = 'status-table__legend-definition';
    desc.textContent = definition;

    item.append(dot, term, desc);
    legend.append(item);
  }
  return legend;
};

/** Text for one status cell in the CSV export: the unified label plus any guidance. */
const cellCsvText = (cell) => {
  const status = STATUSES[cell?.status] ?? STATUSES[NOT_AVAILABLE];
  return cell?.secondary ? `${status.label} (${cell.secondary})` : status.label;
};

/** Flattens the index to CSV rows mirroring the rendered table (Component + columns). */
const buildCsvRows = (index) => {
  const columns = index.implementations?.web ?? [];
  const header = ['Component', ...columns.map((column) => column.label)];
  const body = (index.components ?? []).map((component) => {
    const web = component.platforms?.web ?? {};
    return [
      component.label ?? component.name,
      ...columns.map((column) => cellCsvText(web[column.id])),
    ];
  });
  return [header, ...body];
};

/** An "Export CSV" control that downloads the current table as a CSV file. */
const buildExportButton = (index) => {
  const button = document.createElement('button');
  button.type = 'button';
  button.className = 'status-table__export';
  button.textContent = 'Export CSV';
  button.classList.add('btn', 'btn-primary');
  button.addEventListener('click', () => downloadCsv(CSV_FILENAME, toCsv(buildCsvRows(index))));
  return button;
};

/**
 * Names the table from the nearest heading that precedes it, so it gets its own
 * accessible name rather than borrowing an unrelated one (mirrors blocks/table).
 */
const labelTable = (el, table) => {
  const h1 = document.querySelector('h1');
  const section = el.closest('.section');
  const sectionHeading = [...(section?.querySelectorAll('h2, h3, h4, h5, h6') ?? [])]
    // eslint-disable-next-line no-bitwise
    .filter((h) => el.compareDocumentPosition(h) & Node.DOCUMENT_POSITION_PRECEDING)
    .at(-1);
  const labelIds = [h1, sectionHeading].flatMap((heading) => {
    if (!heading) { return []; }
    if (!heading.id) {
      heading.id = `status-table-heading-${Math.random().toString(36).slice(2)}`;
    }
    return heading.id;
  });
  if (labelIds.length) { table.setAttribute('aria-labelledby', labelIds.join(' ')); }
};

export default async function init(el) {
  const href = el.querySelector('a[href$="status-index.json"]')?.href ?? DEFAULT_INDEX;

  const resp = await fetch(href);
  if (!resp.ok) {
    config.log('Status table index fetch failed:', href);
    return;
  }
  const index = await resp.json();

  const table = buildTable(index);
  labelTable(el, table);

  el.replaceChildren(buildExportButton(index), buildLegend(), table);
  el.tabIndex = 0;
}
