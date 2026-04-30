import { getConfig } from '../../scripts/ak.js';

const config = getConfig();

const PROPS_TO_LABELS = {
  attribute: 'Attribute',
  property: 'Property',
  type: 'Type',
  default: 'Default value',
  description: 'Description',
  inheritedFrom: 'Inherited from',
};

const buildTableElement = (headerCells, dataCells) => {
  const tableHead = document.createElement('thead');
  tableHead.classList.add('header-row');

  const headRow = document.createElement('tr');
  headRow.classList.add('row');
  headRow.append(...headerCells);
  tableHead.append(headRow);

  const tableBody = document.createElement('tbody');
  for (const cells of dataCells) {
    const bodyRow = document.createElement('tr');
    bodyRow.classList.add('row');
    bodyRow.append(...cells);
    tableBody.append(bodyRow);
  }

  const table = document.createElement('table');
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

  // gather all the available properties for dev table
  const properties = [...new Set(json.flatMap(Object.keys))];

  const headerCells = properties.map((key) => {
    const columnHeaders = document.createElement('th');
    columnHeaders.scope = 'col';
    columnHeaders.textContent = PROPS_TO_LABELS[key] || key.charAt(0).toUpperCase() + key.slice(1);
    return columnHeaders;
  });

  // Create data rows
  const dataCells = json.map((props) => properties.map((key) => {
    const tableCell = document.createElement('td');
    tableCell.textContent = props[key] ?? '';
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
}
