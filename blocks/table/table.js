import { getConfig } from '../../scripts/ak.js';

const config = getConfig();

const PROPS_TO_LABELS = {
  attribute: 'Attribute',
  property: 'Property',
  type: 'Type',
  default: 'Default value',
  description: 'Description',
  inheritedFrom: 'Inherited from',
  required: 'Required',
};

const PROP_ORDER = Object.keys(PROPS_TO_LABELS);

// Base types whose props apply to every RSP component (layout, spacing, etc.) — not useful
// in a component-specific API table.
const EXCLUDED_SOURCES = new Set(['StyleProps']);

const buildTableElement = (headerCells, dataCells) => {
  const tableHead = document.createElement('thead');
  tableHead.classList.add('header-row');
  // explicitly resetting table roles so that when the CSS display property changes on
  // small screens, no accessibility issues arise (WCAG 1.3.1 (Info and Relationships))
  tableHead.role = 'rowgroup';

  const headRow = document.createElement('tr');
  headRow.classList.add('row');
  headRow.role = 'row';
  headerCells.forEach((cell) => { cell.role = 'columnheader'; });
  headRow.append(...headerCells);
  tableHead.append(headRow);

  const tableBody = document.createElement('tbody');
  tableBody.role = 'rowgroup';
  for (const cells of dataCells) {
    const bodyRow = document.createElement('tr');
    bodyRow.classList.add('row');
    bodyRow.role = 'row';
    cells.forEach((cell) => { cell.role = 'cell'; });
    bodyRow.append(...cells);
    tableBody.append(bodyRow);
  }

  const table = document.createElement('table');
  table.role = 'table';
  table.append(tableHead, tableBody);
  return table;
};

// supports manually inputting tables in DA
const buildTable = (rows) => {
  const [headerRow, ...dataRows] = rows;

  const headerCells = [...headerRow.children].map((col) => {
    const columnHeader = document.createElement('th');
    columnHeader.scope = 'col';
    columnHeader.innerHTML = col.innerHTML;
    return columnHeader;
  });

  const dataCells = dataRows.map((row) => [...row.children].map((col) => {
    const tableCell = document.createElement('td');
    tableCell.innerHTML = col.innerHTML;
    return tableCell;
  }));

  return buildTableElement(headerCells, dataCells);
};

// supports populating data table with extracted JSON via a link
const buildDataTable = async (href) => {
  const resp = await fetch(href);
  if (!resp.ok) {
    config.log('Table data fetch failed:', href);
    return null;
  }
  const json = await resp.json();

  if (!json.length) return null;

  const rows = json.filter((prop) => !EXCLUDED_SOURCES.has(prop.inheritedFrom));

  // gather all the available properties for dev table, in canonical column order
  const allKeys = [...new Set(rows.flatMap(Object.keys))];
  const properties = [
    ...PROP_ORDER.filter((k) => allKeys.includes(k)),
    ...allKeys.filter((k) => !PROP_ORDER.includes(k)),
  ];

  const headerCells = properties.map((key) => {
    const columnHeaders = document.createElement('th');
    columnHeaders.scope = 'col';
    columnHeaders.textContent = PROPS_TO_LABELS[key] || key.charAt(0).toUpperCase() + key.slice(1);
    return columnHeaders;
  });

  // Create data rows
  const dataCells = rows.map((props) => properties.map((key) => {
    const tableCell = document.createElement('td');
    tableCell.textContent = props[key] || '-';
    return tableCell;
  }));

  return buildTableElement(headerCells, dataCells);
};

export default async function init(el) {
  const dataHref = el.querySelector('a[href$=".json"]')?.href;

  if (dataHref) {
    const table = await buildDataTable(dataHref);
    if (table) el.replaceChildren(table);
  } else {
    const table = buildTable([...el.children]);
    el.replaceChildren(table);
  }

  const table = el.querySelector('table');
  const h1 = document.querySelector('h1');

  // finds the appropriate section heading in DA, and creates the table's accessible name
  // for users who navigate via table landmarks
  const sectionHeading = el.closest('.section')?.querySelector('h2, h3, h4, h5, h6');
  const labelIds = [h1, sectionHeading].flatMap((heading) => {
    if (!heading) return [];
    if (!heading.id) heading.id = `table-heading-${Math.random().toString(36).slice(2)}`;
    return heading.id;
  });
  if (table && labelIds.length) table.setAttribute('aria-labelledby', labelIds.join(' '));
  el.tabIndex = 0;
}
