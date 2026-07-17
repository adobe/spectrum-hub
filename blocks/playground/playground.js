import { getConfig } from '../../scripts/ak.js';
import {
  fetchPlaygroundSheets,
  getComponentProperties,
  buildControlsMap,
  resolveControl,
  findSwcProp,
  findRspProp,
  cachedFetch,
  FREEFORM_CONTROLS,
  TEXT_KEYS,
} from './playground-data.js';
import { hasLabelProp } from '../../deps/rsp/playground/apply-rsp-prop.js';
import { pascalCase } from '../../deps/rsp/playground/pascal-case.js';
import '../../deps/se/se.js';

// --- Pure helpers ------------------------------------

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

// Collapses a burst of calls (e.g. every keystroke in a textfield control)
// into a single trailing call once `delayMs` has passed since the last one.
export function debounce(fn, delayMs) {
  let timer;
  return (...args) => {
    clearTimeout(timer);
    timer = setTimeout(() => fn(...args), delayMs);
  };
}

// Prints an element's real attribute list the way a code editor would.
function serializeAttrs(el) {
  return [...el.attributes].map((attr) => (attr.value === '' ? attr.name : `${attr.name}="${attr.value}"`));
}

// Recursively prints an element and any nested subcomponents (tabs >
// tab/tab-panel, RSP's Tabs > TabList > Tab, ...), one attribute per line.
// Collapses to a single line when there are no attributes/element children.
function serializeElement(el, depth = 0) {
  const indent = '  '.repeat(depth);
  const childIndent = '  '.repeat(depth + 1);
  const tag = el.localName;
  const attrs = serializeAttrs(el);
  const elementChildren = [...el.children];

  if (!elementChildren.length) {
    const text = el.textContent;
    if (!attrs.length) { return `${indent}<${tag}>${text}</${tag}>`; }
    const attrLines = attrs.map((attr) => `${childIndent}${attr}`).join('\n');
    return `${indent}<${tag}\n${attrLines}>\n${childIndent}${text}\n${indent}</${tag}>`;
  }

  const childLines = elementChildren.map((child) => serializeElement(child, depth + 1)).join('\n');
  if (!attrs.length) { return `${indent}<${tag}>\n${childLines}\n${indent}</${tag}>`; }
  const attrLines = attrs.map((attr) => `${childIndent}${attr}`).join('\n');
  return `${indent}<${tag}\n${attrLines}>\n${childLines}\n${indent}</${tag}>`;
}

// Extracts a composite component's real fragment root with its own attributes
// plus real subcomponent children (swc-tab/swc-tab-panel).
function parseHtmlFragmentRoot(markup) {
  if (!markup) { return null; }
  const template = document.createElement('template');
  template.innerHTML = markup.trim();
  return template.content.firstElementChild ?? null;
}

// Same idea as parseHtmlFragmentRoot, but for RSP's JSX snippet fragments.
function parseXmlFragmentRoot(markup) {
  if (!markup) { return null; }
  const doc = new DOMParser().parseFromString(markup.trim(), 'application/xml');
  if (doc.querySelector('parsererror')) { return null; }
  return doc.documentElement;
}

// hasRealLabelTarget prevents double-rendering "label" as both a real
// attribute and flat text content.
function applySnippetChildren(el, currentProps, fragmentRoot, hasRealLabelTarget = false) {
  const compositeChildren = [...(fragmentRoot?.children ?? [])];
  if (compositeChildren.length) {
    el.append(...compositeChildren.map((child) => child.cloneNode(true)));
    if (!hasRealLabelTarget) {
      const labelEntry = currentProps.label;
      const labelTarget = labelEntry && el.querySelector('[slot="label"]');
      if (labelTarget) { labelTarget.textContent = labelEntry.value; }
    }
    return;
  }
  const fallbackKeys = hasRealLabelTarget ? new Set(['text', 'children']) : TEXT_KEYS;
  const textEntry = Object.entries(currentProps).find(([prop]) => fallbackKeys.has(prop));
  el.textContent = textEntry?.[1]?.value ?? 'Label';
}

function buildSnippetElement(el, currentProps, fragmentRoot, hasRealLabelTarget, resolveAttribute) {
  if (fragmentRoot) {
    [...fragmentRoot.attributes].forEach((attr) => el.setAttribute(attr.name, attr.value));
  }
  Object.entries(currentProps).forEach(([prop, entry]) => {
    const { value } = entry;
    const isRealLabelProp = prop === 'label' && hasRealLabelTarget;
    const attribute = resolveAttribute(prop, entry);
    if ((TEXT_KEYS.has(prop) && !isRealLabelProp) || attribute === null || value === undefined || value === '' || value === 'no') { return; }
    el.setAttribute(attribute, value === 'yes' ? '' : value);
  });

  applySnippetChildren(el, currentProps, fragmentRoot, hasRealLabelTarget);
  return serializeElement(el);
}

export function buildSwcSnippet(tagName, currentProps, markup) {
  const el = document.createElement(tagName);
  const fragmentRoot = parseHtmlFragmentRoot(markup);
  // "label" is normally flat text content (see TEXT_KEYS), but if this SWC
  // component documents a real "label" attribute, apply it as an attribute
  // instead — currentProps.label.attribute already carries that name through
  // from resolveControl.
  const hasRealLabelAttribute = Boolean(currentProps.label?.attribute);
  return buildSnippetElement(
    el,
    currentProps,
    fragmentRoot,
    hasRealLabelAttribute,
    (prop, { attribute }) => attribute,
  );
}

export function buildRspSnippet(componentName, currentProps, markup, hasRealLabelProp = false) {
  // needed for RSP's PascalCase component names.
  const xmlDoc = document.implementation.createDocument(null, null, null);
  const el = xmlDoc.createElement(componentName);
  const fragmentRoot = parseXmlFragmentRoot(markup);
  // RSP prop names are used as-authored, unlike SWC.
  return buildSnippetElement(el, currentProps, fragmentRoot, hasRealLabelProp, (prop) => prop);
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

// Maps a property's "control" type (from the controls sheet) to a rendered
// `se-*` element (deps/se/se.js).

function buildPickerControl(property, options, currentValue, onChange) {
  const select = document.createElement('se-select');
  select.label = property;
  select.append(...options.map((opt) => {
    const option = document.createElement('option');
    option.value = opt;
    option.textContent = opt;
    return option;
  }));
  select.value = currentValue;
  select.addEventListener('change', (e) => onChange(e.target.value));
  return select;
}

function buildSwitchControl(property, currentValue, onChange) {
  // se-switch has no `label` prop (unlike se-select/se-input) — its visible
  // text is slotted content, and its value convention is a `checked` boolean
  // rather than the 'yes'/'no' strings used elsewhere, so it's converted here.
  const switchToggle = document.createElement('se-switch');
  switchToggle.name = property;
  switchToggle.checked = currentValue === 'yes';
  switchToggle.textContent = property;
  switchToggle.addEventListener('change', (e) => onChange(e.target.checked ? 'yes' : 'no'));
  return switchToggle;
}

// Shared by the textfield and slider controls below — both are a plain
// se-input that differs only in `type` and which event fires the update.
function buildSeInputControl(inputType, eventName, property, currentValue, onChange) {
  const input = document.createElement('se-input');
  input.type = inputType;
  input.label = property;
  input.value = currentValue ?? '';
  input.addEventListener(eventName, (e) => onChange(e.target.value));
  return input;
}

function buildSegmentedControl(property, options, currentValue, onChange) {
  const control = document.createElement('se-segmentedcontrol');
  const fieldset = document.createElement('fieldset');
  const legend = document.createElement('legend');
  legend.textContent = property;
  fieldset.append(legend);

  options.forEach((opt) => {
    const label = document.createElement('label');
    const radio = document.createElement('input');
    radio.type = 'radio';
    radio.name = `playground-${property}`;
    radio.value = opt;
    radio.checked = opt === currentValue;
    const span = document.createElement('span');
    span.textContent = opt;
    label.append(radio, span);
    fieldset.append(label);
  });

  fieldset.addEventListener('change', (e) => onChange(e.target.value));
  control.append(fieldset);
  return control;
}

// Falls back to buildPickerControl for any other controlType.
const CONTROL_BUILDERS = {
  // 'input' (not 'change') so the preview/snippet update as the user types,
  // not only once the field loses focus.
  textfield: (property, options, currentValue, onChange) => (
    buildSeInputControl('text', 'input', property, currentValue, onChange)
  ),
  slider: (property, options, currentValue, onChange) => (
    buildSeInputControl('range', 'change', property, currentValue, onChange)
  ),
  switch: (property, options, currentValue, onChange) => (
    buildSwitchControl(property, currentValue, onChange)
  ),
  segmentedControl: buildSegmentedControl,
};

function buildControl(controlType, property, options, currentValue, onChange) {
  const build = CONTROL_BUILDERS[controlType] ?? buildPickerControl;
  const wrapper = document.createElement('div');
  wrapper.classList.add('playground-control');
  wrapper.appendChild(build(property, options, currentValue, onChange));
  return wrapper;
}

// --- Fetch helpers ----------------------------------------------------------

// Shared via cachedFetch (playground-data.js) — more than one playground
// block on a page commonly requests the same per-component prop-data or
// markup fragment (e.g. two variants of the same component).
function fetchOrThrow(url, readBody) {
  return cachedFetch(url, async () => {
    const resp = await fetch(url);
    if (!resp.ok) { throw new Error(`Failed to fetch ${url}: ${resp.status}`); }
    return readBody(resp);
  });
}

function fetchJson(url) {
  return fetchOrThrow(url, (resp) => resp.json());
}

function fetchText(url) {
  return fetchOrThrow(url, (resp) => resp.text());
}

// --- Block wiring helpers (each a distinct job init() delegates to) --------

// Resolves the URL-safe pieces derived from this block's authored metadata:
// PascalCase title, code-disclosure name, dev-authored fragment markup URL
// (drives both the live preview and, for composites, subcomponent structure),
// and which preview shell renders the live iframe.
function resolveComponentMeta(component, implementation, base) {
  const componentTitle = pascalCase(component);
  const previewName = implementation === 'rsp' ? componentTitle : `swc-${component}`;
  const markupUrl = implementation === 'rsp'
    ? `${base}/deps/rsp/playground/snippets/${component}.jsx`
    : `${base}/deps/swc/playground/snippets/${component}.html`;
  // RSP and SWC each have their own preview shell; anything else (ios/android,
  // unrecognized) falls back to this block's own generic shell.
  let previewShellPath;
  if (implementation === 'rsp') {
    previewShellPath = 'deps/rsp/playground/index.html';
  } else if (implementation === 'swc') {
    previewShellPath = 'deps/swc/playground/index.html';
  } else {
    previewShellPath = 'blocks/playground/index.html';
  }
  return {
    componentTitle, previewName, markupUrl, previewShellPath,
  };
}

// Only the spreadsheet fetch is allowed to reject and abort init(); a missing
// prop-data file or markup fragment (leaf component) degrades to empty instead.
async function fetchPlaygroundInputs(base, componentTitle, component, spreadsheetUrl, markupUrl) {
  const [
    { componentsSheet, controlsSheet }, rspProps, swcProps, snippetMarkup,
  ] = await Promise.all([
    fetchPlaygroundSheets(spreadsheetUrl),
    fetchJson(`${base}/deps/rsp/data/${componentTitle}.json`).then((d) => d.props ?? d).catch(() => []),
    fetchJson(`${base}/deps/swc/data/swc-${component}.json`).catch(() => []),
    fetchText(markupUrl).catch(() => ''),
  ]);
  return {
    componentsSheet, controlsSheet, rspProps, swcProps, snippetMarkup,
  };
}

// Populates `currentProps` as a side effect — it's the live source of truth
// the code disclosure, iframe messaging, and control callbacks all read/write.
function buildControlDescriptors(
  component,
  implementation,
  authoredProps,
  controlsMap,
  rspProps,
  swcProps,
  currentProps,
) {
  return authoredProps.reduce((acc, property) => {
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
    let rawDefault = parseDefault(swcRow?.default ?? rspRow?.default) ?? descriptor.options[0];
    // A textfield with no authored default would otherwise start empty —
    // populate it with a placeholder label instead.
    if (descriptor.controlType === 'textfield' && rawDefault === undefined) {
      rawDefault = 'Label';
    }
    // Freeform controls (textfield, slider) hold real values, not the yes/no
    // convention used for boolean-ish picker/segmentedControl options.
    const defaultValue = FREEFORM_CONTROLS.has(descriptor.controlType)
      ? rawDefault
      : booleanStringToYesNo(rawDefault);
    currentProps[property] = {
      value: defaultValue, attribute: descriptor.attribute, controlType: descriptor.controlType,
    };
    acc.push({ property, ...descriptor, defaultValue });
    return acc;
  }, []);
}

function createPreviewIframe(iframeUrl, title) {
  const iframe = document.createElement('iframe');
  iframe.src = iframeUrl;
  iframe.title = title;
  iframe.setAttribute('loading', 'lazy');
  return iframe;
}

function wireIframeMessaging(iframe, currentProps) {
  function postPropUpdate(property, attribute, value, controlType) {
    const normalized = FREEFORM_CONTROLS.has(controlType) ? value : yesNoToBoolean(value);
    iframe.contentWindow?.postMessage({ type: 'prop-update', property, attribute, value: normalized }, '*');
  }

  function sendAllProps() {
    Object.entries(currentProps).forEach(([property, { value, attribute, controlType }]) => {
      postPropUpdate(property, attribute, value, controlType);
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

  // The iframe's own document does an async fetch (per-component markup) and/or
  // network load (esm.sh for rsp) before it registers its prop-update listener,
  // so the outer iframe's `load` event fires well before that listener exists —
  // sending on `load` alone would silently drop the first batch of prop values.
  // The iframe explicitly signals readiness once it's actually listening.
  window.addEventListener('message', (event) => {
    if (event.source !== iframe.contentWindow) { return; }
    if (event.data?.type !== 'preview-ready') { return; }
    sendAllProps();
  });

  iframe.addEventListener('load', () => {
    postThemeUpdate();
  });

  // The site's light/dark toggle (blocks/action-button) swaps a class on
  // document.body without a page reload, so keep the iframe in sync live.
  new MutationObserver(postThemeUpdate)
    .observe(document.body, { attributes: true, attributeFilter: ['class'] });

  return postPropUpdate;
}

// onControlChange fires after currentProps is already updated — the caller
// only has to react (post the update, refresh the code disclosure, ...).
function buildControlsPanel(descriptors, currentProps, onControlChange) {
  const controlsPanel = document.createElement('div');
  controlsPanel.classList.add('playground-controls');
  controlsPanel.setAttribute('aria-label', 'Component controls');

  descriptors.forEach(({
    property, controlType, options, defaultValue, attribute,
  }) => {
    if (!options.length && !FREEFORM_CONTROLS.has(controlType)) { return; }
    const control = buildControl(controlType, property, options, defaultValue, (value) => {
      currentProps[property].value = value;
      onControlChange(property, attribute, value, controlType);
    });
    controlsPanel.appendChild(control);
  });

  return controlsPanel;
}

// Expand button only grows/shrinks the visible height (max-height in CSS),
// rather than showing/hiding the code the way <details> would.
function buildCodeDisclosure(pre) {
  const disclosure = document.createElement('div');
  disclosure.classList.add('playground-disclosure');

  const codeWrapper = document.createElement('div');
  codeWrapper.classList.add('playground-code');
  codeWrapper.append(buildCopyButton(pre), pre);

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
  return disclosure;
}

// --- Default export (DOM wiring, not unit-tested) ---------------------------

// How long a control's changes must pause before the code disclosure rebuilds.
const DISCLOSURE_DEBOUNCE_MS = 200;

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
  const {
    componentTitle, previewName, markupUrl, previewShellPath,
  } = resolveComponentMeta(component, implementation, base);

  let componentsSheet;
  let controlsSheet;
  let rspProps;
  let swcProps;
  let snippetMarkup;

  try {
    ({
      componentsSheet, controlsSheet, rspProps, swcProps, snippetMarkup,
    } = await fetchPlaygroundInputs(base, componentTitle, component, spreadsheetUrl, markupUrl));
  } catch (err) {
    config.log('sandbox block: data fetch failed', err);
    el.remove();
    return;
  }

  // Whether THIS component's own RSP data documents a real "label" prop
  // (e.g. Meter, AvatarGroup) — see buildRspSnippet's hasRealLabelProp param
  // and apply-rsp-prop.js's matching resolveRspPropKey for the live-preview
  // side of this same decision.
  const hasRealLabelProp = hasLabelProp(rspProps);

  const buildSnippet = implementation === 'rsp'
    ? (name, props) => buildRspSnippet(name, props, snippetMarkup, hasRealLabelProp)
    : (name, props) => buildSwcSnippet(name, props, snippetMarkup);

  const controlsMap = buildControlsMap(controlsSheet);
  const authoredProps = getComponentProperties(component, componentsSheet);

  const currentProps = {};
  const descriptors = buildControlDescriptors(
    component,
    implementation,
    authoredProps,
    controlsMap,
    rspProps,
    swcProps,
    currentProps,
  );

  // Each implementation's shell (previewShellPath, resolved above) reads
  // ?component & ?implementation from the URL. For swc it fetches the matching
  // markup fragment (deps/swc/playground/snippets/<component>.html); for rsp it
  // loads from esm.sh; for ios/android it shows the image viewer.
  const iframeUrl = `${base}/${previewShellPath}?component=${encodeURIComponent(component)}&implementation=${encodeURIComponent(implementation)}`;
  const iframe = createPreviewIframe(iframeUrl, `${componentTitle} component preview`);
  const postPropUpdate = wireIframeMessaging(iframe, currentProps);

  const pre = document.createElement('pre');
  updateDisclosure(pre, buildSnippet, previewName, currentProps);

  // The live preview (postPropUpdate) stays synchronous for instant visual
  // feedback; only the code-snippet rebuild — a full re-clone + re-serialize
  // of the fragment on every call — is debounced, so a burst of keystrokes in
  // a textfield control collapses into a single rebuild once typing pauses.
  const debouncedUpdateDisclosure = debounce(
    () => updateDisclosure(pre, buildSnippet, previewName, currentProps),
    DISCLOSURE_DEBOUNCE_MS,
  );

  const controlsPanel = buildControlsPanel(
    descriptors,
    currentProps,
    (property, attribute, value, controlType) => {
      postPropUpdate(property, attribute, value, controlType);
      debouncedUpdateDisclosure();
    },
  );

  const disclosure = buildCodeDisclosure(pre);

  const previewArea = document.createElement('div');
  previewArea.classList.add('playground-preview');
  previewArea.appendChild(iframe);

  const layout = document.createElement('div');
  layout.classList.add('playground-layout');
  layout.append(previewArea, controlsPanel);

  el.replaceChildren(layout, disclosure);
}
