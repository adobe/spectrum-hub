import { getConfig } from '../../scripts/ak.js';
import {
  fetchPlaygroundSheets,
  getComponentProperties,
  buildControlsMap,
  resolveControl,
  findProp,
  cachedFetch,
  FREEFORM_CONTROLS,
  TEXT_KEYS,
} from './playground-data.js';
import { hasLabelProp } from '../../deps/rsp/playground/apply-rsp-prop.js';
import { resolveRspComponentName } from '../../deps/rsp/playground/pascal-case.js';
import { getPlaygroundConfig } from '../../scripts/utils/implementations.js';
import { isUnsetOption, optionLabel } from '../../deps/shared/playground/unset-control-options.js';
import { OVERLAY_TRIGGERS, overlayShape, propsOwner } from '../../deps/rsp/playground/overlay-triggers.js';
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

// Prints an element's real attribute list the way a code editor would. A value already
// wrapped in braces (e.g. an onPress handler) is a JSX expression, not a string — rendered
// unquoted (`name={value}`) instead of the usual `name="value"`.
function serializeAttrs(el) {
  return [...el.attributes].map((attr) => {
    if (attr.value === '') { return attr.name; }
    if (attr.value.startsWith('{') && attr.value.endsWith('}')) { return `${attr.name}=${attr.value}`; }
    return `${attr.name}="${attr.value}"`;
  });
}

// Recursively prints an element and any nested subcomponents (tabs >
// tab/tab-panel, RSP's Tabs > TabList > Tab, ...), one attribute per line.
// Collapses to a single line when there are no attributes/element children.
// `selfClosing` (RSP/JSX only — real HTML custom elements can't self-close)
// renders a childless, textless element as `<Tag />` instead of `<Tag></Tag>`.
function serializeElement(el, depth = 0, selfClosing = false) {
  const indent = '  '.repeat(depth);
  const childIndent = '  '.repeat(depth + 1);
  const tag = el.localName;
  const attrs = serializeAttrs(el);
  const elementChildren = [...el.children];

  if (!elementChildren.length) {
    const text = el.textContent;
    if (selfClosing && !text) {
      const attrLines = attrs.map((attr) => `${childIndent}${attr}`).join('\n');
      return attrs.length ? `${indent}<${tag}\n${attrLines}\n${indent}/>` : `${indent}<${tag} />`;
    }
    if (!attrs.length) { return `${indent}<${tag}>${text}</${tag}>`; }
    const attrLines = attrs.map((attr) => `${childIndent}${attr}`).join('\n');
    return `${indent}<${tag}\n${attrLines}>\n${childIndent}${text}\n${indent}</${tag}>`;
  }

  const childLines = elementChildren.map((child) => serializeElement(child, depth + 1, selfClosing)).join('\n');
  if (!attrs.length) { return `${indent}<${tag}>\n${childLines}\n${indent}</${tag}>`; }
  const attrLines = attrs.map((attr) => `${childIndent}${attr}`).join('\n');
  return `${indent}<${tag}\n${attrLines}>\n${childLines}\n${indent}</${tag}>`;
}

// Matched by tag, not first-child — a trigger-anchored component (popover/tooltip)
// has a real trigger element ahead of it; other siblings are returned separately.
function parseHtmlFragmentRoot(markup, tagName) {
  if (!markup) { return { fragmentRoot: null, siblings: [] }; }
  const template = document.createElement('template');
  template.innerHTML = markup.trim();
  const children = [...template.content.children];
  const fragmentRoot = children.find((el) => el.localName === tagName) ?? children[0] ?? null;
  return { fragmentRoot, siblings: children.filter((el) => el !== fragmentRoot) };
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
  // A fragment authored with no text of its own (e.g. Divider's `<Divider />`) has no
  // text slot at all — leave it empty instead of injecting a placeholder it can't take.
  if (fragmentRoot && !fragmentRoot.textContent) { return; }

  // A text control's value wins; failing that the fragment's own text is the authored
  // content and must survive. 'Label' is only a placeholder for a component that has
  // neither — without this a component with no text control at all (tooltip: placement,
  // delay, trigger, none of them TEXT_KEYS) rendered the literal word "Label".
  const fallbackKeys = hasRealLabelTarget ? new Set(['text', 'children']) : TEXT_KEYS;
  const textEntry = Object.entries(currentProps).find(([prop]) => fallbackKeys.has(prop));
  el.textContent = textEntry?.[1]?.value ?? fragmentRoot?.textContent ?? 'Label';
}

// `attributeTarget` is where controlled props land, which is not always `el`: a route
// whose props are declared on its trigger (propsOwner in overlay-triggers.js) serializes
// them onto the wrapper. Text and children always belong to `el` — they are the route's
// own content regardless of which export declares the props.
function buildSnippetElement(
  el,
  currentProps,
  fragmentRoot,
  hasRealLabelTarget,
  resolveAttribute,
  attributeTarget = el,
) {
  if (fragmentRoot) {
    [...fragmentRoot.attributes].forEach((attr) => el.setAttribute(attr.name, attr.value));
  }
  Object.entries(currentProps).forEach(([prop, entry]) => {
    const { value } = entry;
    const isRealLabelProp = prop === 'label' && hasRealLabelTarget;
    const attribute = resolveAttribute(prop, entry);
    // An unset sentinel ("None"/"default") is the control's label for an absent prop,
    // never real markup — the same reason the apply path removes it rather than
    // reflecting it. Compared via isUnsetOption so a new sentinel can't slip through.
    const isUnset = value === undefined || value === '' || value === 'no' || isUnsetOption(value);
    if ((TEXT_KEYS.has(prop) && !isRealLabelProp) || attribute === null || isUnset) { return; }
    attributeTarget.setAttribute(attribute, value === 'yes' ? '' : value);
  });

  applySnippetChildren(el, currentProps, fragmentRoot, hasRealLabelTarget);
}

export function buildSwcSnippet(tagName, currentProps, markup) {
  const { fragmentRoot, siblings } = parseHtmlFragmentRoot(markup, tagName);
  // A handful of components (e.g. link) render as native markup with no
  // swc-<name> custom element of their own — build the disclosure/live
  // element with the fragment's real root tag instead of the assumed one.
  const el = document.createElement(fragmentRoot?.localName ?? tagName);
  // "label" is normally flat text content (see TEXT_KEYS), but if this SWC
  // component documents a real "label" attribute, apply it as an attribute
  // instead — currentProps.label.attribute already carries that name through
  // from resolveControl.
  const hasRealLabelAttribute = Boolean(currentProps.label?.attribute);
  buildSnippetElement(
    el,
    currentProps,
    fragmentRoot,
    hasRealLabelAttribute,
    (prop, { attribute }) => attribute,
  );
  const rootMarkup = serializeElement(el);
  // A trigger-anchored component's real usage needs its trigger too, or the
  // `for="..."` on the copied snippet dangles — include it verbatim.
  if (!siblings.length) { return rootMarkup; }
  return [...siblings.map((sibling) => serializeElement(sibling)), rootMarkup].join('\n');
}

export function buildRspSnippet(
  componentName,
  currentProps,
  markup,
  hasRealLabelProp = false,
  routeName = null,
) {
  // needed for RSP's PascalCase component names.
  const xmlDoc = document.implementation.createDocument(null, null, null);
  const el = xmlDoc.createElement(componentName);
  const fragmentRoot = parseXmlFragmentRoot(markup);

  // Some routes need a real Trigger wrapper to be usable; a route with no
  // `trigger` of its own (e.g. toast) fires imperatively instead,
  // so its Button is a sibling line rather than a parent (overlay-triggers.js).
  const shape = overlayShape(routeName);
  const overlayTrigger = OVERLAY_TRIGGERS[routeName];
  // Built before the props are applied, because for a route whose props are declared on
  // the trigger (tooltip) this is what they serialize onto.
  const trigger = shape === 'wrap' ? xmlDoc.createElement(overlayTrigger.trigger) : null;

  // RSP prop names are used as-authored, unlike SWC.
  buildSnippetElement(
    el,
    currentProps,
    fragmentRoot,
    hasRealLabelProp,
    (prop) => prop,
    trigger && propsOwner(routeName) ? trigger : el,
  );

  if (shape === 'none') { return serializeElement(el, 0, true); }

  const triggerButton = xmlDoc.createElement('Button');
  triggerButton.textContent = overlayTrigger.triggerLabel;

  if (shape === 'sibling') {
    triggerButton.setAttribute('onPress', `{() => ${overlayTrigger.queueExport}.info('${overlayTrigger.toastMessage}')}`);
    triggerButton.setAttribute('variant', 'accent');
    return [serializeElement(triggerButton), serializeElement(el, 0, true)].join('\n');
  }

  trigger.append(triggerButton, el);
  return serializeElement(trigger, 0, true);
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

  // Button-text-only feedback isn't reliably announced once the button already
  // has focus — this live region backs it up (mirrors status-table.js's announcer).
  const status = document.createElement('span');
  status.className = 'visually-hidden';
  status.setAttribute('role', 'status');

  let resetTimer;
  function flash(message, copied) {
    button.textContent = message;
    button.classList.toggle('is-copied', copied);
    status.textContent = message;
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

  const fragment = document.createDocumentFragment();
  fragment.append(button, status);
  return fragment;
}

// Maps a property's "control" type (from the controls sheet) to a rendered
// `se-*` element (deps/se/se.js).
function buildPickerControl(property, options, currentValue, onChange) {
  const select = document.createElement('se-select');
  select.label = property;
  select.labelPosition = 'side';
  select.append(...options.map((opt) => {
    const option = document.createElement('option');
    // An unset sentinel is opaque by design — optionLabel is what a reader sees.
    option.value = opt;
    option.textContent = optionLabel(opt);
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
  switchToggle.labelPosition = 'side';
  switchToggle.addEventListener('change', (e) => onChange(e.target.checked ? 'yes' : 'no'));
  return switchToggle;
}

// Shared by the textfield and slider controls below — both are a plain
// se-input that differs only in `type` and which event fires the update.
function buildSeInputControl(inputType, eventName, property, currentValue, onChange) {
  const input = document.createElement('se-input');
  input.labelPosition = 'side';
  input.type = inputType;
  input.label = property;
  input.value = currentValue ?? '';
  input.addEventListener(eventName, (e) => onChange(e.target.value));
  return input;
}

function buildSegmentedControl(property, options, currentValue, onChange) {
  const control = document.createElement('se-segmentedcontrol');
  control.labelPosition = 'side';
  control.label = property;
  const fieldset = document.createElement('fieldset');

  options.forEach((opt) => {
    const label = document.createElement('label');
    const radio = document.createElement('input');
    radio.type = 'radio';
    radio.name = `playground-${property}`;
    radio.value = opt;
    radio.checked = opt === currentValue;
    const span = document.createElement('span');
    span.textContent = optionLabel(opt);
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

// The block's own shell: an image viewer for an implementation with no live
// preview (ios/android). It needs no snippet and no prop catalog.
const GENERIC_SHELL = 'blocks/playground/index.html';

/**
 * Where this component's preview comes from, resolved entirely from
 * scripts/utils/implementations.js — adding an implementation is an edit there,
 * not a branch here.
 *
 * Every lookup keyed off the component — snippet file, overlay trigger, sizing set —
 * uses the authored slug. `componentTitle` is the one exception: RSP's real export
 * name, which the data fetch and the code disclosure's tag both need, and which
 * diverges from the authored slug for a minority of components.
 */
export function resolveComponentMeta(component, implementation, base) {
  const componentTitle = resolveRspComponentName(component);
  // Which export's catalog holds this route's props. The same as its own component for
  // every route but tooltip, whose props RSP declares on TooltipTrigger.
  const propsTitle = propsOwner(component) ?? componentTitle;
  const config = getPlaygroundConfig(implementation);
  if (!config) {
    return {
      componentTitle,
      propsTitle,
      previewName: componentTitle,
      markupUrl: null,
      previewShellPath: GENERIC_SHELL,
    };
  }
  return {
    componentTitle,
    propsTitle,
    previewName: config.tagPattern
      .replace('{Pascal}', componentTitle)
      .replace('{slug}', component),
    markupUrl: `${base}/${config.snippetDir}/${component}.${config.snippetExt}`,
    previewShellPath: config.shell,
  };
}

// Only the spreadsheet fetch is allowed to reject and abort init(); a missing
// prop-data file or markup fragment (leaf component) degrades to empty instead.
async function fetchPlaygroundInputs(base, componentMeta, component, impl, spreadsheetUrl) {
  const { propsTitle, markupUrl } = componentMeta;
  // Exactly one catalog: the page's own. Fetching both guaranteed a 404 on every RSP
  // page (most RSP components have no SWC counterpart) and was what let one
  // implementation's option lists leak onto the other's controls.
  const catalogUrl = {
    rsp: `${base}/deps/rsp/data/${propsTitle}.json`,
    swc: `${base}/deps/swc/data/swc-${component}.json`,
  }[impl];
  const [{ componentsSheet, controlsSheet }, propRows, snippetMarkup] = await Promise.all([
    fetchPlaygroundSheets(spreadsheetUrl),
    // No catalog is a normal state, not a failure: ios/android ship none, and a leaf
    // component may have no data file. `d.props ?? d` absorbs the one remaining shape
    // difference between the catalogs — rsp wraps its rows, swc is a bare array.
    catalogUrl ? fetchJson(catalogUrl).then((d) => d.props ?? d).catch(() => []) : [],
    // markupUrl is null for an implementation with no live preview — the generic
    // image-viewer shell never asks for markup.
    markupUrl ? fetchText(markupUrl).catch(() => '') : '',
  ]);
  return {
    componentsSheet, controlsSheet, propRows, snippetMarkup,
  };
}

// Populates `currentProps` as a side effect — it's the live source of truth
// the code disclosure, iframe messaging, and control callbacks all read/write.
function buildControlDescriptors(
  component,
  implementation,
  authoredProps,
  controlsMap,
  propRows,
  currentProps,
) {
  return authoredProps.reduce((acc, property) => {
    const descriptor = resolveControl(
      property,
      implementation,
      controlsMap,
      propRows,
      // eslint-disable-next-line no-console
      (message) => console.warn(`Playground (${component}): ${message}`),
    );
    if (!descriptor) { return acc; }
    // defaultOverride leads because it encodes a constraint between two properties
    // (ColorSlider's channel must suit colorSpace), which a per-prop catalog default
    // cannot express — see DEFAULT_OVERRIDES in playground-data.js.
    let rawDefault = descriptor.defaultOverride
      ?? parseDefault(findProp(property, propRows)?.default)
      ?? descriptor.options[0];
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

function wireIframeMessaging(iframe, currentProps, snippetMarkup) {
  function postPropUpdate(property, attribute, value, controlType) {
    // Don't clobber the preview's own default with "no value to contribute".
    if (value === undefined) { return; }
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

  // Answers the shell's markup-request with the fragment already fetched by
  // fetchPlaygroundInputs, instead of the shell fetching the same file again.
  window.addEventListener('message', (event) => {
    if (event.source !== iframe.contentWindow) { return; }
    if (event.data?.type !== 'markup-request') { return; }
    iframe.contentWindow?.postMessage({ type: 'markup-response', markup: snippetMarkup }, '*');
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
// Returns null when nothing rendered: a component can legitimately have no
// controls (swc's link is utility CSS classes, not a component API), and an
// empty panel would still hold its column and label a region with nothing in it.
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

  return controlsPanel.children.length ? controlsPanel : null;
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
  const sheetUrl = meta.spreadsheet ?? `${base}/playground-data.json`;
  const componentMeta = resolveComponentMeta(component, implementation, base);
  const { componentTitle, previewName, previewShellPath } = componentMeta;

  let componentsSheet;
  let controlsSheet;
  let propRows;
  let snippetMarkup;

  try {
    ({
      componentsSheet, controlsSheet, propRows, snippetMarkup,
    } = await fetchPlaygroundInputs(base, componentMeta, component, implementation, sheetUrl));
  } catch (err) {
    config.log('sandbox block: data fetch failed', err);
    el.remove();
    return;
  }

  // Whether THIS component's own RSP data documents a real "label" prop
  // (e.g. Meter, AvatarGroup) — see buildRspSnippet's hasRealLabelProp param
  // and apply-rsp-prop.js's matching resolveRspPropKey for the live-preview
  // side of this same decision.
  const hasRealLabelProp = implementation === 'rsp' && hasLabelProp(propRows);

  // The one thing that cannot live in the registry as data. Keyed by id rather than
  // branched on, and defaulting to the markup serializer an implementation with no
  // preview shell would use anyway.
  const SNIPPET_BUILDERS = {
    rsp: (name, props) => buildRspSnippet(name, props, snippetMarkup, hasRealLabelProp, component),
    swc: (name, props) => buildSwcSnippet(name, props, snippetMarkup),
  };
  const buildSnippet = SNIPPET_BUILDERS[implementation] ?? SNIPPET_BUILDERS.swc;

  const controlsMap = buildControlsMap(controlsSheet);
  const authoredProps = getComponentProperties(
    component,
    implementation,
    componentsSheet,
    // eslint-disable-next-line no-console
    (message) => console.warn(`Playground (${component}): ${message}`),
  );

  const currentProps = {};
  const descriptors = buildControlDescriptors(
    component,
    implementation,
    authoredProps,
    controlsMap,
    propRows,
    currentProps,
  );

  // Each implementation's shell (previewShellPath, resolved above) reads
  // ?component & ?implementation from the URL. For swc it fetches the matching
  // markup fragment (deps/swc/playground/snippets/<component>.html); for rsp it
  // loads from esm.sh; for ios/android it shows the image viewer.
  const iframeUrl = `${base}/${previewShellPath}?component=${encodeURIComponent(component)}&implementation=${encodeURIComponent(implementation)}`;
  const iframe = createPreviewIframe(iframeUrl, `${componentTitle} component preview`);
  const postPropUpdate = wireIframeMessaging(iframe, currentProps, snippetMarkup);

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
  // With no controls the preview is the only flex child and fills the row.
  layout.append(...[previewArea, controlsPanel].filter(Boolean));

  el.replaceChildren(layout, disclosure);
}
