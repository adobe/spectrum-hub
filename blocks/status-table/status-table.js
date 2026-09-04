import '../../deps/se/se.js';
import { getConfig } from '../../scripts/ak.js';
import { STATUSES } from '../../scripts/utils/status-model.js';
import { fetchSvgEl } from '../../scripts/utils/svg.js';
import { getImplementationById, IMPLEMENTATIONS } from '../../scripts/utils/implementations.js';
import { toCsv, downloadCsv } from '../../scripts/utils/csv.js';
import { toSlug } from '../../scripts/utils/component-path.js';

const config = getConfig();

const CSV_FILENAME = 'component-status.csv';

// The block binds to the build-time combined index (deps/build-status-index.js). Authors
// may point it at a different index by dropping a JSON link in the block; otherwise it
// reads the canonical one.
const DEFAULT_INDEX = '/deps/status-index.json';

// Site-wide published-page list (aem.live convention). A component can be Available in
// Figma/RSP/SWC well before its documentation page is written, so this is the source of
// truth for whether a status-table link actually resolves to a live page.
const QUERY_INDEX = '/query-index.json';

const NOT_AVAILABLE = 'not-available';

// The platform segment of the component-page route `/<platform>/<impl>/components/<slug>`.
// Web-scoped today; hoisted here for when per-platform tables (mobile, desktop) arrive.
const PLATFORM = 'web';

// Route segment for a Figma-only component (no code implementation) — not a
// registered implementation itself, just the URL segment its Figma cell links to.
const DESIGN_ONLY = 'design-only';

// A cell links to its internal component page; a column links when it's a registered
// code implementation. Figma also links, but only for design-only rows.
const LINKED_STATUSES = new Set(['available', 'experimental']);
const isLinkableColumn = (columnId) => getImplementationById(columnId) !== null;

/** True when no registered code implementation (rsp, swc, ...) has this component. */
const isDesignOnly = (web = {}) => IMPLEMENTATIONS.every(
  (impl) => (web[impl.id]?.status ?? NOT_AVAILABLE) === NOT_AVAILABLE,
);

/**
 * Reads the site's published-page list so link generation can confirm a target page
 * actually exists, not just that the data says it should. Returns null when the index
 * can't be read (network error or non-2xx) — callers fall back to trusting `hasPage`
 * rather than hiding every link on a transient fetch failure.
 */
async function fetchPublishedPaths() {
  try {
    const resp = await fetch(`${config.codeBase}${QUERY_INDEX}`);
    if (!resp.ok) { return null; }
    const { data } = await resp.json();
    return new Set((data ?? []).map((row) => row.path));
  } catch {
    return null;
  }
}

/**
 * The internal component-page URL for a status cell, or null when it shouldn't link.
 * `publishedPaths` (from fetchPublishedPaths) gates the result on the page actually being
 * live — a component can be Available in the roster well before its doc page is written.
 * Passing null (index unreadable) skips that gate.
 */
const componentPageHref = (columnId, status, name, web, cell = {}, publishedPaths = null) => {
  const { hasPage = true, page } = cell;
  if (!name || !LINKED_STATUSES.has(status) || !hasPage) { return null; }
  // `page` (deps/build-status-index.js's override pipeline) redirects a row that keeps its
  // own statuses/cells to a slug shared with another component documented on the same page.
  const slug = page ?? toSlug(name);

  let path = null;
  if (columnId === 'figma') {
    if (isDesignOnly(web)) { path = `/${PLATFORM}/${DESIGN_ONLY}/components/${slug}`; }
  } else if (isLinkableColumn(columnId)) {
    path = `/${PLATFORM}/${columnId}/components/${slug}`;
  }
  if (!path) { return null; }

  return (publishedPaths && !publishedPaths.has(path)) ? null : path;
};

// explicitly reset table roles so that when the CSS display property changes on small
// screens the accessibility tree is unaffected — WCAG 1.3.1 (Info and Relationships).
const withRole = (node, role) => {
  node.role = role;
  return node;
};

/**
 * The column-header text repeated inside a body cell. Only the narrow stacked layout
 * shows it — there the `thead` is clipped out of view, so without this the statuses
 * arrive with no indication of which implementation they belong to. `aria-hidden`
 * because the real `<th scope="col">` already names the cell for assistive tech; a
 * second copy would announce every header twice.
 */
const buildCellLabel = (text) => {
  const label = document.createElement('span');
  label.className = 'status-table-cell-label';
  label.setAttribute('aria-hidden', 'true');
  label.textContent = text;
  return label;
};

/** A body cell's value, wrapped so it stays one grid item beside its label. */
const buildCellValue = () => {
  const value = document.createElement('span');
  value.className = 'status-table-cell-value';
  return value;
};

/** A colored status dot + its unified label; `data-status` is the CSS/color hook. */
const buildBadge = (cell) => {
  const status = STATUSES[cell?.status] ?? STATUSES[NOT_AVAILABLE];

  const badge = document.createElement('span');
  badge.className = 'status-table-status-light';

  const dot = document.createElement('span');
  dot.className = 'status-table-dot';
  dot.setAttribute('data-status', status.id);
  dot.style.setProperty('--status-color', `var(${status.color})`);
  dot.setAttribute('aria-hidden', 'true');

  const label = document.createElement('span');
  label.className = 'status-table-label';
  label.textContent = status.label;
  label.style.setProperty('--status-color', `var(${status.color})`);

  badge.append(dot, label);
  return badge;
};

/** One implementation cell: the status badge plus an optional secondary guidance line. */
const buildStatusCell = (cell, context = {}) => {
  const {
    columnId, columnLabel, componentName, componentLabel, web, publishedPaths,
  } = context;
  const td = withRole(document.createElement('td'), 'cell');
  const value = buildCellValue();
  td.append(buildCellLabel(columnLabel), value);

  const badge = buildBadge(cell);
  const href = componentPageHref(columnId, cell?.status, componentName, web, cell, publishedPaths);
  if (href) {
    const status = STATUSES[cell.status];
    const link = document.createElement('a');
    link.className = 'status-table-link';
    link.href = href;
    // Expose the status color at the link level so the CSS hover/focus styles can apply
    link.style.setProperty('--status-color', `var(${status.color})`);
    // give each link an accessible name that says where it goes — WCAG 2.4.4 (Link Purpose,
    // In Context).
    link.setAttribute('aria-label', `${componentLabel}, ${status.label} in ${columnLabel}`);
    link.append(badge);
    value.append(link);
  } else {
    value.append(badge);
  }

  if (cell?.secondary) {
    const secondary = document.createElement('span');
    secondary.className = 'status-table-secondary';
    secondary.textContent = cell.secondary;
    value.append(secondary);
  }
  return td;
};

const buildTable = (index, publishedPaths) => {
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
  for (const { id, label } of columns) {
    const th = withRole(document.createElement('th'), 'columnheader');
    th.scope = 'col';
    th.dataset.col = id;
    th.textContent = label;
    headRow.append(th);
  }
  const thead = withRole(document.createElement('thead'), 'rowgroup');
  thead.classList.add('header-row');
  thead.append(headRow);

  const componentLabel = componentHead.textContent;

  const tbody = withRole(document.createElement('tbody'), 'rowgroup');
  for (const component of index.components ?? []) {
    const row = withRole(document.createElement('tr'), 'row');
    row.classList.add('row');

    const nameCell = withRole(document.createElement('th'), 'rowheader');
    nameCell.scope = 'row';
    const nameValue = buildCellValue();
    nameValue.textContent = component.label ?? component.name;
    nameCell.append(buildCellLabel(componentLabel), nameValue);
    row.append(nameCell);

    const web = component.platforms?.web ?? {};
    for (const { id, label } of columns) {
      const cell = buildStatusCell(web[id], {
        columnId: id,
        columnLabel: label,
        componentName: component.name,
        componentLabel: component.label ?? component.name,
        web,
        publishedPaths,
      });
      cell.dataset.col = id;
      row.append(cell);
    }
    tbody.append(row);
  }

  const table = withRole(document.createElement('table'), 'table');
  table.className = 'status-table-table';
  table.append(thead, tbody);
  return table;
};

/**
 * The status ids that actually occur in the rendered table, in canonical STATUSES order.
 * Mirrors the cell fallback so a missing cell counts as Not available, matching the table.
 */
const presentStatusIds = (index) => {
  const columns = index.implementations?.web ?? [];
  const present = new Set();
  for (const component of index.components ?? []) {
    const web = component.platforms?.web ?? {};
    for (const { id } of columns) {
      present.add(web[id]?.status ?? NOT_AVAILABLE);
    }
  }
  return Object.keys(STATUSES).filter((id) => present.has(id));
};

/**
 * Always-visible status definition cards — one per status present in the data. Absent
 * statuses (e.g. Deprecated/Removed today) get no card, so the key only explains what
 * the table actually shows.
 */
const buildStatusCards = (index) => {
  const cards = document.createElement('ul');
  cards.className = 'status-table-cards';
  for (const id of presentStatusIds(index)) {
    const { label, definition, color } = STATUSES[id];
    const card = document.createElement('li');
    card.className = 'status-table-card';
    card.setAttribute('data-status', id);
    card.style.setProperty('--status-color', `var(${color})`);

    const term = document.createElement('span');
    term.className = 'status-table-card-label';
    term.textContent = label;

    const desc = document.createElement('span');
    desc.className = 'status-table-card-definition';
    desc.textContent = definition;

    card.append(term, desc);
    cards.append(card);
  }
  return cards;
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

/**
 * A search control that filters the table down to rows by compoenent name.
 */
const buildSearch = (table, announce) => {
  const wrap = document.createElement('div');
  wrap.className = 'status-table-search-wrap';

  const toggle = document.createElement('button');
  toggle.type = 'button';
  toggle.className = 'status-table-search-toggle';
  toggle.setAttribute('aria-expanded', 'false');
  const toggleLabel = document.createElement('span');
  toggleLabel.className = 'visually-hidden';
  toggleLabel.textContent = 'Search components';
  toggle.append(toggleLabel);

  const input = document.createElement('se-input');
  input.className = 'status-table-search';
  input.setAttribute('type', 'search');
  // Keep the label as the field's accessible name, but hide it visually — the search
  // icon and placeholder make the field self-evident.
  input.setAttribute('label', 'Search components');
  input.setAttribute('hide-label', '');
  input.setAttribute('placeholder', 'Search components…');

  const filter = (query) => {
    let visible = 0;
    for (const row of table.querySelectorAll('tbody tr')) {
      const name = row.querySelector('th .status-table-cell-value')?.textContent.toLowerCase() ?? '';
      row.hidden = query !== '' && !name.includes(query);
      if (!row.hidden) { visible += 1; }
    }
    // report the result count so screen-reader users hear the filtered total without moving focus.
    announce(`${visible} component${visible === 1 ? '' : 's'}`);
  };

  const open = async () => {
    wrap.classList.add('status-table-search-active');
    toggle.setAttribute('aria-expanded', 'true');
    await input.updateComplete;
    input.focus();
  };

  const close = () => {
    wrap.classList.remove('status-table-search-active');
    toggle.setAttribute('aria-expanded', 'false');
    filter('');
    toggle.focus();
  };

  toggle.addEventListener('click', open);
  input.addEventListener('input', () => filter((input.value ?? '').trim().toLowerCase()));
  // se-input's built-in clear ("x") button fires this — same event blocks/search listens
  // for to collapse the header search back down to its icon button.
  input.addEventListener('clear', close);

  wrap.append(toggle, input);
  return wrap;
};

/**
 * A switch that reveals the muted secondary-status guidance lines. Details are hidden by
 * default; the toggle just flips a modifier class the CSS keys off of.
 */
const buildDetailsToggle = (el) => {
  const toggle = document.createElement('se-switch');
  toggle.className = 'status-table-details-toggle';
  toggle.name = 'status-table-details';
  toggle.textContent = 'Show details';
  toggle.addEventListener('change', () => {
    el.classList.toggle('status-table-show-details', toggle.checked);
  });
  return toggle;
};

/* TODO: filters are postponed to a future release */
/** Shows or hides every header and body cell belonging to one implementation column. */
const setColumnVisible = (table, id, visible) => {
  for (const cell of table.querySelectorAll(`[data-col="${id}"]`)) {
    cell.hidden = !visible;
  }
};

/**
 * A "Columns" button that opens a popover of checkboxes, one per implementation column,
 * letting readers hide columns they don't care about. The Component column always stays.
 */
/* eslint-disable-next-line */
const buildColumnFilter = (columns, table, announce) => {
  const wrap = document.createElement('div');
  wrap.className = 'status-table-filter';

  const popoverId = `status-table-columns-${Math.random().toString(36).slice(2)}`;

  const button = document.createElement('button');
  button.type = 'button';
  button.className = 'status-table-filter-button';
  button.classList.add('btn', 'btn-secondary');
  button.setAttribute('popovertarget', popoverId);
  // Icon-only button: the filter glyph rides on a CSS ::before mask, so the label is
  // visually hidden but stays the button's accessible name.
  const buttonLabel = document.createElement('span');
  buttonLabel.className = 'visually-hidden';
  buttonLabel.textContent = 'Filter columns';
  button.append(buttonLabel);

  const popover = document.createElement('div');
  popover.className = 'status-table-filter-popover';
  popover.id = popoverId;
  popover.setAttribute('popover', '');

  for (const { id, label } of columns) {
    const toggle = document.createElement('se-checkbox');
    toggle.className = 'status-table-column-toggle';
    toggle.name = `status-table-col-${id}`;
    toggle.setAttribute('data-col', id);
    toggle.checked = true;
    toggle.textContent = label;
    toggle.addEventListener('change', () => {
      setColumnVisible(table, id, toggle.checked);
      announce(`${label} column ${toggle.checked ? 'shown' : 'hidden'}`);
    });
    popover.append(toggle);
  }

  wrap.append(button, popover);
  return wrap;
};

/**
 * An "Export CSV" control that downloads the current table as a CSV file.
 * Note for test doubles: this is init()'s second fetch, after the status index.
 */
const buildExportButton = async (index) => {
  const button = document.createElement('button');
  const downloadIcon = await fetchSvgEl('/img/icons/s2-icon-download-20-n.svg');
  downloadIcon.setAttribute('aria-hidden', 'true');
  button.type = 'button';
  button.classList.add('status-table-export', 'action-button', 'action-button-quiet');
  button.textContent = 'Download CSV';

  button.prepend(downloadIcon);

  button.addEventListener('click', () => downloadCsv(CSV_FILENAME, toCsv(buildCsvRows(index))));
  return button;
};

/**
 * Sorting for the table, shared by two affordances that drive a single sort state:
 *  - Clickable column headers — the mechanism on wide screens. Follows the WAI-ARIA APG
 *    "Sortable Table" pattern
 *  - A "Sort by" toolbar control (a column `se-select` + a direction button) — intended
 *    as the affordance for the stacked layout, currently CSS-disabled behind a TODO, so
 *    that layout has no sort affordance at all today.
 */
/**
 * Sort headers are only operable while the thead is on screen — below the container
 * breakpoint the stacked layout clips it away, so the buttons come out of the tab order
 * and the a11y tree rather than expose controls nobody can reach (WCAG 2.1.1, 4.1.2).
 * The CSS container query owns that breakpoint and publishes it as
 * `--status-table-headers-visible`, so the two can't drift apart. Reads empty (and so
 * hides) on a detached table — call this once the table is in the document.
 */
const syncHeaderAccessibility = (table) => {
  const visible = getComputedStyle(table)
    .getPropertyValue('--status-table-headers-visible').trim() === '1';
  for (const button of table.querySelectorAll('.status-table-sort-header')) {
    button.tabIndex = visible ? 0 : -1;
    button.setAttribute('aria-hidden', String(!visible));
  }
};

const buildSorting = (table, columns, announce) => {
  const COMPONENT = 'component';
  const sortable = [{ id: COMPONENT, label: 'Component' }, ...columns];
  let activeId = COMPONENT;
  let direction = 'ascending';

  const headers = new Map();
  let select;
  let dirButton;

  const sortKey = (row, id) => (id === COMPONENT
    ? row.querySelector('th[scope="row"] .status-table-cell-value')?.textContent
    : row.querySelector(`td[data-col="${id}"] .status-table-label`)?.textContent) ?? '';

  // Reflect the current sort onto both affordances (headers' aria-sort + the control).
  const reflect = () => {
    for (const [id, th] of headers) {
      th.setAttribute('aria-sort', id === activeId ? direction : 'none');
      th.dataset.sort = id === activeId ? direction : '';
    }
    if (select) { select.value = activeId; }
    if (dirButton) {
      dirButton.dataset.direction = direction;
      dirButton.setAttribute('aria-label', direction === 'ascending' ? 'Sort ascending' : 'Sort descending');
    }
  };

  const sortBy = (id, dir) => {
    activeId = id;
    direction = dir;
    const tbody = table.querySelector('tbody');
    const rows = [...tbody.querySelectorAll('tr')].sort(
      (a, b) => sortKey(a, id).localeCompare(sortKey(b, id), undefined, { numeric: true, sensitivity: 'base' }),
    );
    if (dir === 'descending') { rows.reverse(); }
    tbody.append(...rows);
    reflect();
    announce(`Sorted by ${sortable.find((c) => c.id === id)?.label ?? id}, ${dir}`);
  };

  // Wire one sortable header into a button. A repeat click on the active column flips
  // the direction; a click on a new column starts it ascending.
  const wireHeader = (th, id) => {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'status-table-sort-header';
    const text = document.createElement('span');
    text.textContent = th.textContent;
    const icon = document.createElement('span');
    icon.className = 'status-table-sort-icon';
    icon.setAttribute('aria-hidden', 'true');
    button.append(text, icon);
    button.addEventListener('click', () => {
      sortBy(id, activeId === id && direction === 'ascending' ? 'descending' : 'ascending');
    });
    // Named independently of the button's content, so hiding the button in the stacked
    // layout (see syncHeaderAccessibility) doesn't blank out the column's name.
    th.setAttribute('aria-label', text.textContent);
    th.replaceChildren(button);
    headers.set(id, th);
  };

  for (const th of table.querySelectorAll('thead th')) {
    const id = th.dataset.col ?? COMPONENT;
    if (sortable.some((c) => c.id === id)) { wireHeader(th, id); }
  }

  // A container query can't be observed with matchMedia, so watch the element itself.
  // init() does the first sync, once the table is attached and the flag is readable.
  new ResizeObserver(() => syncHeaderAccessibility(table)).observe(table);

  // The small-screen "Sort by" control: a column select plus a direction toggle.
  const control = document.createElement('div');
  control.className = 'status-table-sort';
  select = document.createElement('se-select');
  select.className = 'status-table-sort-select';
  select.setAttribute('label', 'Sort by');
  for (const { id, label } of sortable) {
    const option = document.createElement('option');
    option.value = id;
    option.textContent = label;
    select.append(option);
  }
  select.addEventListener('change', () => sortBy(select.value, direction));
  dirButton = document.createElement('button');
  dirButton.type = 'button';
  dirButton.className = 'status-table-sort-direction';
  dirButton.addEventListener('click', () => {
    sortBy(activeId, direction === 'ascending' ? 'descending' : 'ascending');
  });
  control.append(select, dirButton);

  // Load sorted by Component ascending so the shown order matches the control's state.
  sortBy(COMPONENT, 'ascending');
  return control;
};

/**
 * A visually-hidden polite live region plus an `announce` fn that writes into it.
 *
 * WAI-ARIA APG live-region pattern via `role="status"` (WCAG 4.1.3 Status Messages):
 * `role="status"` carries an implicit `aria-live="polite"` + `aria-atomic="true"`
 */
const buildAnnouncer = () => {
  const region = document.createElement('div');
  region.className = 'visually-hidden';
  region.setAttribute('role', 'status');
  const announce = (message) => { region.textContent = message; };
  return { region, announce };
};

/** The controls row above the table: search, show-details, column filter, and export. */
const buildToolbar = async (index, table, el, announce) => {
  const columns = index.implementations?.web ?? [];
  const toolbar = document.createElement('div');
  toolbar.className = 'status-table-toolbar';

  const toggleAndExportWrapper = document.createElement('div');
  toggleAndExportWrapper.className = 'status-table-toolbar-wrapper';
  toggleAndExportWrapper.append(
    buildDetailsToggle(el),
    // TODO: uncomment when filters are ready for post-V1
    // buildColumnFilter(columns, table, announce)
    await buildExportButton(index),
  );
  toolbar.append(
    buildSearch(table, announce),
    buildSorting(table, columns, announce),
    toggleAndExportWrapper,
  );
  return toolbar;
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
  const publishedPaths = await fetchPublishedPaths();

  const table = buildTable(index, publishedPaths);
  labelTable(el, table);

  const { region, announce } = buildAnnouncer();
  el.replaceChildren(
    buildStatusCards(index),
    await buildToolbar(index, table, el, announce),
    table,
    region,
  );

  // Only now is the table in the document, so the container query's flag actually
  // resolves; the ResizeObserver in buildSorting keeps it current from here.
  syncHeaderAccessibility(table);

  // Scrollable-region pattern (WAI-ARIA APG + WCAG 2.1.1 Keyboard, 4.1.2 Name/Role/Value):
  // the table scrolls horizontally on wide viewports, so the block is exposed as a named
  // landmark region and made focusable
  el.setAttribute('role', 'region');
  el.setAttribute('aria-label', 'Component availability');
  el.tabIndex = 0;
}
