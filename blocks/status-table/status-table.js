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

function buildHeader() {
  const thead = document.createElement('thead');
  const row = document.createElement('tr');
  const componentHead = document.createElement('th');
  componentHead.scope = 'col';
  componentHead.textContent = 'Component';
  row.append(componentHead);
  IMPLEMENTATIONS.forEach((impl) => {
    const th = document.createElement('th');
    th.scope = 'col';
    th.textContent = impl.label;
    row.append(th);
  });
  thead.append(row);
  return thead;
}

function buildCell(component, impl, statusData) {
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

function buildRow(component, statusByImpl) {
  const row = document.createElement('tr');
  const rowHead = document.createElement('th');
  rowHead.scope = 'row';
  rowHead.textContent = formatComponentLabel(component);
  row.append(rowHead);
  IMPLEMENTATIONS.forEach((impl) => {
    row.append(buildCell(component, impl, statusByImpl[impl.id]));
  });
  return row;
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

  const table = document.createElement('table');
  table.className = 'status-table';
  table.append(buildHeader());

  const tbody = document.createElement('tbody');
  components.forEach((component) => {
    tbody.append(buildRow(component, statusByImpl));
  });
  table.append(tbody);

  el.append(table);
}
