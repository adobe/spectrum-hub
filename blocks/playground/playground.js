import { getConfig } from '../../scripts/ak.js';
import {
  fetchPlaygroundSheets,
  getComponentProperties,
  buildControlsMap,
  resolveControl,
  normalizePropertyName,
} from '../../scripts/utils/playground-data.js';

// --- Pure helpers (exported for testing) ------------------------------------

export function parseBlockMetadata(el) {
  return [...el.children].reduce((acc, row) => {
    const key = row.children[0]?.textContent?.trim().toLowerCase();
    const valueCell = row.children[1];
    if (!key || !valueCell) return acc;
    const link = valueCell.querySelector('a');
    acc[key] = link ? link.href : valueCell.textContent.trim();
    return acc;
  }, {});
}

export function parseDefault(raw) {
  if (!raw) return undefined;
  const trimmed = raw.trim();
  if (!trimmed) return undefined;
  const quoted = trimmed.match(/^'(.*)'$/);
  return quoted ? quoted[1] : trimmed;
}

export function buildSwcSnippet(tagName, currentProps) {
  const TEXT_KEYS = new Set(['text', 'label', 'children']);
  const attrs = Object.entries(currentProps)
    .filter(([prop, { attribute, value }]) => (
      !TEXT_KEYS.has(prop)
      && attribute !== null
      && value !== undefined
      && value !== ''
      && value !== 'no'
    ))
    .map(([, { attribute, value }]) => (value === 'yes' ? attribute : `${attribute}="${value}"`))
    .join(' ');

  const textEntry = Object.entries(currentProps).find(([prop]) => TEXT_KEYS.has(prop));
  const label = textEntry?.[1]?.value ?? 'Label';

  const attrStr = attrs ? ` ${attrs}` : '';
  return `<${tagName}${attrStr}>${label}</${tagName}>`;
}

// --- Code disclosure --------------------------------------------------------

function updateDisclosure(pre, tagName, currentProps) {
  pre.textContent = buildSwcSnippet(tagName, currentProps);
}

// --- Controls ---------------------------------------------------------------

function buildPicker(label, options, currentValue, onChange) {
  const wrapper = document.createElement('div');
  wrapper.classList.add('playground-control');

  const labelEl = document.createElement('label');
  const id = `playground-picker-${label}`;
  labelEl.htmlFor = id;
  labelEl.textContent = label;

  const select = document.createElement('select');
  select.id = id;

  options.forEach((opt) => {
    const option = document.createElement('option');
    option.value = opt;
    option.textContent = opt;
    if (opt === currentValue) option.selected = true;
    select.appendChild(option);
  });

  select.addEventListener('change', () => onChange(select.value));
  wrapper.append(labelEl, select);
  return wrapper;
}

// --- Fetch helpers ----------------------------------------------------------

async function fetchJson(url) {
  const resp = await fetch(url);
  if (!resp.ok) throw new Error(`Failed to fetch ${url}: ${resp.status}`);
  return resp.json();
}

// --- Default export (DOM wiring, not unit-tested) ---------------------------

export default async function init(el) {
  const config = getConfig();
  const meta = parseBlockMetadata(el);
  const { implementation, component } = meta;

  if (!implementation || !component) {
    config.log('sandbox block: missing implementation or component metadata', el);
    el.remove();
    return;
  }

  const base = config.codeBase;
  const spreadsheetUrl = meta.spreadsheet ?? `${base}/playground-data.json`;
  const componentTitle = component.split('-').map((p) => p.charAt(0).toUpperCase() + p.slice(1)).join('');
  const tagName = `swc-${component}`;

  let rspProps = [];
  let swcProps = [];
  let componentsSheet = [];
  let controlsSheet = [];

  try {
    [{ componentsSheet, controlsSheet }, rspProps, swcProps] = await Promise.all([
      fetchPlaygroundSheets(spreadsheetUrl),
      fetchJson(`${base}/deps/rsp/data/${componentTitle}.json`).then((d) => d.props ?? d).catch(() => []),
      fetchJson(`${base}/deps/swc/data/swc-${component}.json`).catch(() => []),
    ]);
  } catch (err) {
    config.log('sandbox block: data fetch failed', err);
    el.remove();
    return;
  }

  const controlsMap = buildControlsMap(controlsSheet);
  const authoredProps = getComponentProperties(component, componentsSheet);

  const currentProps = {};

  const descriptors = authoredProps.reduce((acc, property) => {
    const descriptor = resolveControl(property, implementation, controlsMap, rspProps, swcProps);
    if (!descriptor) return acc;
    const swcRow = swcProps.find((p) => p.property === property)
      ?? swcProps.find((p) => p.property === normalizePropertyName(property));
    const rspRow = rspProps.find((p) => p.property === property);
    const rawDefault = parseDefault(swcRow?.default ?? rspRow?.default) ?? descriptor.options[0];
    const defaultValue = rawDefault === 'true' ? 'yes' : rawDefault === 'false' ? 'no' : rawDefault;
    currentProps[property] = { value: defaultValue, attribute: descriptor.attribute };
    acc.push({ property, ...descriptor, defaultValue });
    return acc;
  }, []);

  const iframeUrl = `${base}/component-playground/index.html?component=${encodeURIComponent(component)}&implementation=${encodeURIComponent(implementation)}`;

  const iframe = document.createElement('iframe');
  iframe.src = iframeUrl;
  iframe.title = `${componentTitle} component preview`;
  iframe.setAttribute('loading', 'lazy');

  function postPropUpdate(property, attribute, value) {
    const normalized = value === 'yes' ? true : value === 'no' ? false : value;
    iframe.contentWindow?.postMessage({ type: 'prop-update', property, attribute, value: normalized }, '*');
  }

  function sendAllProps() {
    Object.entries(currentProps).forEach(([property, { value, attribute }]) => {
      postPropUpdate(property, attribute, value);
    });
  }

  iframe.addEventListener('load', sendAllProps);

  const pre = document.createElement('pre');
  updateDisclosure(pre, tagName, currentProps);

  const controlsPanel = document.createElement('div');
  controlsPanel.classList.add('playground-controls');
  controlsPanel.setAttribute('aria-label', 'Component controls');

  descriptors.forEach(({ property, options, defaultValue, attribute }) => {
    if (!options.length) return;
    const picker = buildPicker(property, options, defaultValue, (value) => {
      currentProps[property].value = value;
      postPropUpdate(property, attribute, value);
      updateDisclosure(pre, tagName, currentProps);
    });
    controlsPanel.appendChild(picker);
  });

  const details = document.createElement('details');
  details.classList.add('playground-disclosure');
  const summary = document.createElement('summary');
  summary.textContent = 'View code';
  details.append(summary, pre);

  const previewArea = document.createElement('div');
  previewArea.classList.add('playground-preview');
  previewArea.appendChild(iframe);

  const layout = document.createElement('div');
  layout.classList.add('playground-layout');
  layout.append(previewArea, controlsPanel);

  el.replaceChildren(layout, details);
}
