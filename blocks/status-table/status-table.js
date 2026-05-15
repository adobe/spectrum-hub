import { buildTableElement } from '../table/table.js';
import { IMPLEMENTATIONS } from '../../scripts/utils/implementations.js';
import { getComponentStatus } from '../../scripts/utils/component-status.js';
import { buildImplementationPath } from '../../scripts/utils/platform-url.js';

function formatComponentLabel(slug) {
  return slug.charAt(0).toUpperCase() + slug.slice(1).replace(/-/g, ' ');
}

async function fetchImplStatus(implId) {
  try {
    const resp = await fetch(`/deps/${implId}/data/status.json`);
    if (!resp.ok) {
      return null;
    }
    return await resp.json();
  } catch {
    return null;
  }
}

function unionComponents(statusByImpl) {
  const set = new Set();
  Object.values(statusByImpl).forEach((data) => {
    if (data?.components) {
      Object.keys(data.components).forEach((c) => set.add(c));
    }
  });
  return [...set].sort();
}

function buildHeaderCells() {
  const componentHead = document.createElement('th');
  componentHead.scope = 'col';
  componentHead.textContent = 'Component';

  const implHeads = IMPLEMENTATIONS.map((impl) => {
    const th = document.createElement('th');
    th.scope = 'col';
    th.textContent = impl.label;
    return th;
  });

  return [componentHead, ...implHeads];
}

function buildStatusCell(component, impl, statusData) {
  const td = document.createElement('td');
  const status = getComponentStatus(component, statusData);
  if (!status) {
    td.textContent = '—';
    td.setAttribute('aria-label', 'Not available');
    return td;
  }
  const link = document.createElement('a');
  link.href = buildImplementationPath(impl.id, component);
  link.className = `status-badge status-badge-${status}`;
  link.textContent = status;
  link.setAttribute('aria-label', `${formatComponentLabel(component)} in ${impl.label}: ${status}`);
  td.append(link);
  return td;
}

function buildRowCells(component, statusByImpl) {
  const rowHead = document.createElement('th');
  rowHead.scope = 'row';
  rowHead.textContent = formatComponentLabel(component);

  const statusCells = IMPLEMENTATIONS.map((impl) => (
    buildStatusCell(component, impl, statusByImpl[impl.id])
  ));

  return [rowHead, ...statusCells];
}

// Apply the same aria-labelledby + tabIndex behavior the table block applies,
// so the status-table inherits its accessible-name and keyboard-scroll story.
function labelTableFromSectionHeading(table, el) {
  const h1 = document.querySelector('h1');
  const sectionHeading = el.closest('.section')?.querySelector('h2, h3, h4, h5, h6');
  const labelIds = [h1, sectionHeading].flatMap((heading) => {
    if (!heading) {
      return [];
    }
    if (!heading.id) {
      heading.id = `table-heading-${Math.random().toString(36).slice(2)}`;
    }
    return heading.id;
  });
  if (labelIds.length) {
    table.setAttribute('aria-labelledby', labelIds.join(' '));
  }
  el.tabIndex = 0;
}

export default async function init(el) {
  const statusByImpl = {};
  await Promise.all(IMPLEMENTATIONS.map(async (impl) => {
    statusByImpl[impl.id] = await fetchImplStatus(impl.id);
  }));

  const components = unionComponents(statusByImpl);
  if (!components.length) {
    return;
  }

  const headerCells = buildHeaderCells();
  const dataCells = components.map((component) => buildRowCells(component, statusByImpl));

  const table = buildTableElement(headerCells, dataCells);
  table.classList.add('status-table');

  labelTableFromSectionHeading(table, el);
  el.append(table);
}
