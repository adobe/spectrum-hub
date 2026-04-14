import { getConfig } from '../../scripts/ak.js';

const config = getConfig();

const PROPS_TO_LABELS = {
  attribute: 'Attribute',
  property: 'Property',
  type: 'Type',
  default: 'Default',
};


const decorateHeading = (headingRow) => {
  const tabs = headingRow.querySelector('ul');
  if (!tabs) return;

  const tabItems = tabs.querySelectorAll('li');
  // for (const tabItem of tabItems) {
  //   const { textContent } = tabItem;
  //   const btn = document.createElement('button');
  //   btn.textContent = textContent;
  //   tabItem.replaceChildren(btn);
  // }

  tabs.classList.add('table-tabs');
};

const decorateRows = (el, rows) => {
  for (const [idx, row] of rows.entries()) {
    row.classList.add('row', `row-${idx + 1}`);
    const cols = [...row.children];
    row.style = `--child-count: ${cols.length}`;
    if (idx === 0 && cols.length === 1) {
      decorateHeading(row);

      row.children[0].classList.add('heading-toggle');
    }
  }
};

const createHeaderRow = (properties) => {
  const headerRow = document.createElement('div');
  headerRow.classList.add('header-row');

  const headerCols = properties.map((key) => {
    const col = document.createElement('div');
    col.textContent = PROPS_TO_LABELS[key] || key.charAt(0).toUpperCase() + key.slice(1);
    return col;
  });

  headerRow.append(...headerCols);
  return headerRow;
};

const decorateDataRows = async (href) => {
  const resp = await fetch(href);
  if (!resp.ok) {
    config.log('dead!');
    return null;
  }
  const json = await resp.json();

  if (!json.length) return null;

  // Create header row from the keys of the first item
  const properties = Object.keys(json[0]);
  const headerRow = createHeaderRow(properties);

  // Create data rows
  const dataRows = json.map((props) => {
    const row = document.createElement('div');

    const cols = Object.values(props).map((value) => {
      const col = document.createElement('div');
      col.textContent = value;
      return col;
    });

    if (cols) row.append(...cols);

    return row;
  });

  return [headerRow, ...dataRows];
};

export default async function init(el) {
  const dataHref = el.querySelector('a[href$=".json"')?.href;
  if (dataHref) {
    const dataRows = await decorateDataRows(dataHref);
    if (dataRows) el.append(...dataRows);
  }
  const rows = [...el.children];
  decorateRows(el, rows);
}
