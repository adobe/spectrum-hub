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

const decorateDataRows = async (href) => {
  const resp = await fetch(href);
  if (!resp.ok) {
    config.log('dead!');
    return null;
  }
  const json = await resp.json();

  if (!json.length) return null;

  // gather all the available properties for dev table
  const properties = [...new Set(json.flatMap(Object.keys))];
  const headerRow = createHeaderRow(properties);

  // Create data rows
  const dataRows = json.map((props) => {
    const row = document.createElement('div');

    const cols = properties.map((key) => {
      const col = document.createElement('div');
      col.textContent = props[key] ?? '';
      return col;
    });

    if (cols) row.append(...cols);
    return row;
  });

  return [headerRow, ...dataRows];
};

export default async function init(el) {
  const data = {
    dataHref: el.querySelector('a[href$=".json"')?.href,
    title: el.children?.[0]?.children?.[0]?.querySelector('h2'),
    tabs: el.children?.[0]?.children?.[0]?.querySelector('ul'),
  };

  if (data.dataHref) {
    const dataRows = await decorateDataRows(data.dataHref);
    if (dataRows) el.append(...dataRows);
  }
  const rows = [...el.children];
  decorateHeading(data);
  decorateRows(rows);
}
