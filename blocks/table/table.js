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

const decorateHeading = ({ tabs }) => {
  if (!tabs) return;
  tabs.classList.add('table-tabs');
};

const decorateRows = (rows) => {
  let nextIsHeader = false;
  for (const [idx, row] of rows.entries()) {
    row.classList.add('row', `row-${idx + 1}`);
    const cols = [...row.children];
    row.style = `--child-count: ${cols.length}`;
    if (idx === 0 && cols.length === 1) {
      row.children[0].classList.add('heading-toggle');
      nextIsHeader = true;
    } else if (nextIsHeader && !row.classList.contains('header-row')) {
      row.classList.add('header-row');
      nextIsHeader = false;
    }
  }
};

const createHeaderRow = (properties) => {
  const tableHead = document.createElement('thead');
  tableHead.classList.add('header-row');

  const row = document.createElement('tr');

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
    const tableCells = properties.map((key) => {
      const tableCell = document.createElement('td');
      tableCell.textContent = props[key] ?? '';
      return tableCell;
    })
    row.append(...tableCells);
    tableBody.append(row);
  }

  const table = document.createElement('table');
  table.append(createHeaderRow(properties), tableBody)
  return table;
};

export default async function init(el) {
  const data = {
    dataHref: el.querySelector('a[href$=".json"')?.href,
    title: el.children?.[0]?.children?.[0]?.querySelector('h2'),
    tabs: el.children?.[0]?.children?.[0]?.querySelector('ul'),
  };

  if (data.dataHref) {
    const table = await buildDataTable(data.dataHref);
    if (table) el.replaceChildren(table);
  }
  const rows = [...el.children];
  decorateHeading(data);
  decorateRows(rows);
}
