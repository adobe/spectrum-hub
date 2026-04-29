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

// supports manually inputting tables in DA
const buildTable = (rows) => {
  const [headerRow, ...dataRows] = rows;

  const tableHead = document.createElement('thead');
  tableHead.classList.add('header-row');

  const headRow = document.createElement('tr');
  headRow.classList.add('row');

  for (const col of headerRow.children) {
    const columnHeader = document.createElement('th');
    columnHeader.scope = 'col';
    columnHeader.innerHTML = col.innerHTML;
    headRow.append(columnHeader);
  }
  tableHead.append(headRow);

  const tableBody = document.createElement('tbody');
  for (const row of dataRows) {
    const bodyRow = document.createElement('tr');
    bodyRow.classList.add('row');

    for (const col of row.children) {
      const tableCell = document.createElement('td');
      tableCell.innerHTML = col.innerHTML;
      bodyRow.append(tableCell);
    }
    tableBody.append(bodyRow);
  }

  const table = document.createElement('table');
  table.append(tableHead, tableBody);
  return table;
};

const createHeaderRow = (properties) => {
  const tableHead = document.createElement('thead');
  tableHead.classList.add('header-row');

  const row = document.createElement('tr');
  row.classList.add('row');

  const headerCols = properties.map((key) => {
    const columnHeaders = document.createElement('th');
    columnHeaders.scope = 'col';
    columnHeaders.textContent = PROPS_TO_LABELS[key] || key.charAt(0).toUpperCase() + key.slice(1);
    return columnHeaders;
  });
  row.append(...headerCols);
  tableHead.append(row);
  return tableHead;
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

  const tableBody = document.createElement('tbody');

  // Create data rows
  for (const props of json) {
    const row = document.createElement('tr');
    row.classList.add('row');
    const tableCells = properties.map((key) => {
      const tableCell = document.createElement('td');
      tableCell.textContent = props[key] ?? '';
      return tableCell;
    });
    row.append(...tableCells);
    tableBody.append(row);
  }

  const table = document.createElement('table');
  table.append(createHeaderRow(properties), tableBody);
  return table;
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
