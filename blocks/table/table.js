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
    tableCell.textContent = props[key] || '-';
    return tableCell;
  }));

  return buildTableElement(headerCells, dataCells);
};

const initRowNavigation = (table) => {
  const getRows = () => [...table.querySelectorAll('tbody tr')];
  const rows = getRows();
  if (!rows.length) return;

  let active = rows[0];
  let groupFocused = false;

  rows[0].tabIndex = 0;
  rows.slice(1).forEach((r) => { r.tabIndex = -1; });

  const moveTo = (row) => {
    active.tabIndex = -1;
    active = row;
    row.tabIndex = 0;
    row.focus();
  };

  table.addEventListener('keydown', (e) => {
    if (!e.target.closest('tbody tr')) return;
    const rows = getRows();
    const rowIndex = rows.indexOf(active);

    let target;
    switch (e.key) {
      case 'ArrowDown': target = rows[rowIndex + 1]; break;
      case 'ArrowUp': target = rows[rowIndex - 1]; break;
      case 'Home': if (e.ctrlKey) target = rows[0]; break;
      case 'End': if (e.ctrlKey) target = rows[rows.length - 1]; break;
      default: return;
    }

    if (target) {
      e.preventDefault();
      moveTo(target);
    }
  });

  // While the group has focus, all rows drop to -1 so Tab exits cleanly.
  // Restore on the way out (borrowed from SWC 1st-gen RovingTabindexController).
  table.addEventListener('focusin', (e) => {
    const row = e.target.closest('tbody tr');
    if (!row) return;
    if (!groupFocused) {
      groupFocused = true;
      rows.forEach((r) => { r.tabIndex = -1; });
    }
    if (row !== active) {
      active.tabIndex = -1;
      active = row;
    }
    active.tabIndex = 0;
  });

  table.addEventListener('focusout', (e) => {
    if (!table.contains(e.relatedTarget)) {
      groupFocused = false;
      active.tabIndex = 0;
    }
  });
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
  if (!table) return;

  // finds the appropriate section heading in DA, and creates the table's accessible name
  // for users who navigate via table landmarks
  const h1 = document.querySelector('h1');
  const sectionHeading = el.closest('.section')?.querySelector('h2, h3, h4, h5, h6');
  const labelIds = [h1, sectionHeading].flatMap((heading) => {
    if (!heading) return [];
    if (!heading.id) heading.id = `table-heading-${Math.random().toString(36).slice(2)}`;
    return heading.id;
  });
  if (labelIds.length) table.setAttribute('aria-labelledby', labelIds.join(' '));

  initRowNavigation(table);
}
