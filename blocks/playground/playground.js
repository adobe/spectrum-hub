import { getConfig } from '../../scripts/ak.js';
import {
  fetchPlaygroundSheets,
  getComponentProperties,
  buildControlsMap,
  resolveControl,
  findSwcProp,
  findRspProp,
} from './playground-data.js';
import './hub-picker/hub-picker.js';

// --- Pure helpers (exported for testing) ------------------------------------

export function parseBlockMetadata(el) {
  return [...el.children].reduce((acc, row) => {
    const key = row.children[0]?.textContent?.trim().toLowerCase();
    const valueCell = row.children[1];
    if (!key || !valueCell) { return acc; }
    const link = valueCell.querySelector('a');
    acc[key] = link ? link.href : valueCell.textContent.trim();
    return acc;
  }, {});
}

export function parseDefault(raw) {
  if (!raw) { return undefined; }
  const trimmed = raw.trim();
  if (!trimmed) { return undefined; }
  const quoted = trimmed.match(/^'(.*)'$/);
  return quoted ? quoted[1] : trimmed;
}

export function booleanStringToYesNo(raw) {
  if (raw === 'true') { return 'yes'; }
  if (raw === 'false') { return 'no'; }
  return raw;
}

export function yesNoToBoolean(value) {
  if (value === 'yes') { return true; }
  if (value === 'no') { return false; }
  return value;
}

// Formats an element the way a code editor would: each attribute on its own
// indented line, the closing bracket on the last attribute line, children
// indented below, and the closing tag on its own line. Collapses to a single
// line when there are no attributes.
function formatElement(tag, attrs, label) {
  if (!attrs.length) {
    return `<${tag}>${label}</${tag}>`;
  }
  const attrLines = attrs.map((attr) => `  ${attr}`).join('\n');
  return `<${tag}\n${attrLines}>\n  ${label}\n</${tag}>`;
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
    .map(([, { attribute, value }]) => (value === 'yes' ? attribute : `${attribute}="${value}"`));

  const textEntry = Object.entries(currentProps).find(([prop]) => TEXT_KEYS.has(prop));
  const label = textEntry?.[1]?.value ?? 'Label';

  return formatElement(tagName, attrs, label);
}

export function buildRspSnippet(componentName, currentProps) {
  const TEXT_KEYS = new Set(['text', 'label', 'children']);
  const attrs = Object.entries(currentProps)
    .filter(([prop, { value }]) => (
      !TEXT_KEYS.has(prop)
      && value !== undefined
      && value !== ''
      && value !== 'no'
    ))
    // RSP props are JSX prop names (camelCase), used as-authored — no attribute translation.
    .map(([prop, { value }]) => (value === 'yes' ? prop : `${prop}="${value}"`));

  const textEntry = Object.entries(currentProps).find(([prop]) => TEXT_KEYS.has(prop));
  const label = textEntry?.[1]?.value ?? 'Label';

  return formatElement(componentName, attrs, label);
}

// --- Code disclosure --------------------------------------------------------

function updateDisclosure(pre, buildSnippet, name, currentProps) {
  pre.textContent = buildSnippet(name, currentProps);
}

function buildCopyButton(pre) {
  const defaultLabel = 'Copy code';
  const button = document.createElement('button');
  button.type = 'button';
  button.classList.add('playground-copy');
  button.textContent = defaultLabel;

  let resetTimer;
  function flash(message, copied) {
    button.textContent = message;
    button.classList.toggle('is-copied', copied);
    clearTimeout(resetTimer);
    resetTimer = setTimeout(() => {
      button.textContent = defaultLabel;
      button.classList.remove('is-copied');
    }, 3000);
  }

  button.addEventListener('click', async () => {
    try {
      await navigator.clipboard.writeText(pre.textContent);
      flash('Copied', true);
    } catch {
      flash('Copy failed', false);
    }
  });

  return button;
}

// --- Controls ---------------------------------------------------------------

function buildPicker(label, options, currentValue, onChange) {
  const wrapper = document.createElement('div');
  wrapper.classList.add('playground-control');

  const labelEl = document.createElement('label');
  labelEl.textContent = label;

  const picker = document.createElement('hub-picker');
  picker.label = label;
  picker.options = options.map((opt) => ({ id: opt, label: opt }));
  picker.value = currentValue;

  picker.addEventListener('change', (e) => onChange(e.detail.value));
  wrapper.append(labelEl, picker);
  return wrapper;
}

// --- Fetch helpers ----------------------------------------------------------

async function fetchJson(url) {
  const resp = await fetch(url);
  if (!resp.ok) { throw new Error(`Failed to fetch ${url}: ${resp.status}`); }
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
  const buildSnippet = implementation === 'rsp' ? buildRspSnippet : buildSwcSnippet;
  const previewName = implementation === 'rsp' ? componentTitle : tagName;

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
    const descriptor = resolveControl(
      property,
      implementation,
      controlsMap,
      rspProps,
      swcProps,
      // eslint-disable-next-line no-console
      (message) => console.warn(`Playground (${component}): ${message}`),
    );
    if (!descriptor) { return acc; }
    const swcRow = findSwcProp(property, swcProps);
    const rspRow = findRspProp(property, rspProps);
    const rawDefault = parseDefault(swcRow?.default ?? rspRow?.default) ?? descriptor.options[0];
    const defaultValue = booleanStringToYesNo(rawDefault);
    currentProps[property] = { value: defaultValue, attribute: descriptor.attribute };
    acc.push({ property, ...descriptor, defaultValue });
    return acc;
  }, []);

  // "swc" pages are dev-owned static shells (blocks/playground/static-html/<component>.html)
  // that import the component from the SWC CDN, so a page only wires up its own component.
  // Other implementations still go through the generic router.
  const iframeUrl = implementation === 'swc'
    ? `${base}/blocks/playground/static-html/${component}.html`
    : `${base}/blocks/playground/static-html/index.html?component=${encodeURIComponent(component)}&implementation=${encodeURIComponent(implementation)}`;

  const iframe = document.createElement('iframe');
  iframe.src = iframeUrl;
  iframe.title = `${componentTitle} component preview`;
  iframe.setAttribute('loading', 'lazy');

  function postPropUpdate(property, attribute, value) {
    const normalized = yesNoToBoolean(value);
    iframe.contentWindow?.postMessage({ type: 'prop-update', property, attribute, value: normalized }, '*');
  }

  function sendAllProps() {
    Object.entries(currentProps).forEach(([property, { value, attribute }]) => {
      postPropUpdate(property, attribute, value);
    });
  }

  function getForcedScheme() {
    const { classList } = document.body;
    if (classList.contains('dark-scheme')) { return 'dark'; }
    if (classList.contains('light-scheme')) { return 'light'; }
    return null;
  }

  function postThemeUpdate() {
    iframe.contentWindow?.postMessage({ type: 'theme-update', scheme: getForcedScheme() }, '*');
  }

  iframe.addEventListener('load', () => {
    sendAllProps();
    postThemeUpdate();
  });

  // The site's light/dark toggle (blocks/action-button) swaps a class on
  // document.body without a page reload, so keep the iframe in sync live.
  new MutationObserver(postThemeUpdate)
    .observe(document.body, { attributes: true, attributeFilter: ['class'] });

  const pre = document.createElement('pre');
  updateDisclosure(pre, buildSnippet, previewName, currentProps);

  const controlsPanel = document.createElement('div');
  controlsPanel.classList.add('playground-controls');
  controlsPanel.setAttribute('aria-label', 'Component controls');

  descriptors.forEach(({ property, options, defaultValue, attribute }) => {
    if (!options.length) { return; }
    const picker = buildPicker(property, options, defaultValue, (value) => {
      currentProps[property].value = value;
      postPropUpdate(property, attribute, value);
      updateDisclosure(pre, buildSnippet, previewName, currentProps);
    });
    controlsPanel.appendChild(picker);
  });

  const disclosure = document.createElement('div');
  disclosure.classList.add('playground-disclosure');

  const codeWrapper = document.createElement('div');
  codeWrapper.classList.add('playground-code');
  codeWrapper.append(buildCopyButton(pre), pre);

  // The code (and copy button) stay visible at all times; this button only
  // grows/shrinks the visible height — collapsed to a max-height in CSS —
  // rather than showing/hiding the code the way <details> would.
  const expandButton = document.createElement('button');
  expandButton.type = 'button';
  expandButton.classList.add('playground-expand');
  expandButton.textContent = 'Expand code';
  expandButton.setAttribute('aria-expanded', 'false');
  expandButton.addEventListener('click', () => {
    const expanded = disclosure.classList.toggle('is-expanded');
    expandButton.textContent = expanded ? 'Collapse code' : 'Expand code';
    expandButton.setAttribute('aria-expanded', String(expanded));
  });

  disclosure.append(codeWrapper, expandButton);

  const previewArea = document.createElement('div');
  previewArea.classList.add('playground-preview');
  previewArea.appendChild(iframe);

  const layout = document.createElement('div');
  layout.classList.add('playground-layout');
  layout.append(previewArea, controlsPanel);

  el.replaceChildren(layout, disclosure);
}
