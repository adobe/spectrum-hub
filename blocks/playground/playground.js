import { getConfig } from '../../scripts/ak.js';
import {
  fetchPlaygroundSheets,
  getComponentProperties,
  buildControlsMap,
  resolveControl,
  findProp,
  FREEFORM_CONTROLS,
  TEXT_KEYS,
} from './playground-data.js';
import { playgroundCoordinator } from './playground-coordinator.js';
import { hasLabelProp } from '../../deps/rsp/playground/apply-rsp-prop.js';
import { resolveRspComponentName } from '../../deps/rsp/playground/pascal-case.js';
import {
  getPlaygroundConfig,
  PLAYGROUND_RUNTIME_SOURCES,
} from '../../scripts/utils/implementations.js';
import { isUnsetOption, optionLabel } from '../../deps/shared/playground/unset-control-options.js';
import { OVERLAY_TRIGGERS, overlayShape, propsOwner } from '../../deps/rsp/playground/overlay-triggers.js';
import {
  collectFragmentTagNames,
  parseRspAttributeValue,
  resolveExternalComponent,
} from '../../deps/rsp/playground/build-composite-element.js';
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
  if (raw === true || raw === 'true') { return 'yes'; }
  if (raw === false || raw === 'false') { return 'no'; }
  return raw;
}

export function yesNoToBoolean(value) {
  if (value === 'yes') { return true; }
  if (value === 'no') { return false; }
  return value;
}

function optionValue(value, options) {
  return options.find((option) => String(option) === String(value)) ?? value;
}

function numericValue(value, valueKind) {
  if (valueKind !== 'number' || value === '') { return value; }
  const number = Number(value);
  return Number.isNaN(number) ? value : number;
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

// The snippet fragment is dev-authored for one exact component, so its own value is a
// better starting point for a control than the generic 'Label' placeholder — and without
// it the control's placeholder overwrote the very text the fragment authored.
function snippetDefault(property, attribute, fragmentRoot, parseValue = (value) => value) {
  if (!fragmentRoot) { return undefined; }
  // `attribute` is the SWC name for this prop; RSP has none and uses the prop as-authored.
  const authored = fragmentRoot.getAttribute(attribute ?? property);
  if (authored !== null) { return parseValue(authored); }
  // Flat text only: a fragment with element children is a composite whose text belongs to
  // its subcomponents, the same distinction applySnippetChildren makes above.
  if (!TEXT_KEYS.has(property) || fragmentRoot.children.length) { return undefined; }
  return fragmentRoot.textContent.trim() || undefined;
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
  formatAttributeValue = (value) => value,
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
    attributeTarget.setAttribute(
      attribute,
      value === 'yes' ? '' : formatAttributeValue(value),
    );
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
    (value) => (typeof value === 'number' ? `{${value}}` : value),
  );

  const withImports = (snippet) => {
    if (!fragmentRoot) { return snippet; }
    const imports = collectFragmentTagNames(fragmentRoot)
      .map((tagName) => [tagName, resolveExternalComponent(tagName)])
      .filter(([, external]) => external)
      .map(([tagName, external]) => `import ${tagName} from '${external.specifier}';`);
    return imports.length ? `${imports.join('\n')}\n\n${snippet}` : snippet;
  };

  if (shape === 'none') { return withImports(serializeElement(el, 0, true)); }

  const triggerButton = xmlDoc.createElement('Button');
  triggerButton.textContent = overlayTrigger.triggerLabel;

  if (shape === 'sibling') {
    triggerButton.setAttribute('onPress', `{() => ${overlayTrigger.queueExport}.info('${overlayTrigger.toastMessage}')}`);
    triggerButton.setAttribute('variant', 'accent');
    return withImports([serializeElement(triggerButton), serializeElement(el, 0, true)].join('\n'));
  }

  trigger.append(triggerButton, el);
  return withImports(serializeElement(trigger, 0, true));
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
function fetchJson(url) {
  return playgroundCoordinator.json(url);
}

function fetchText(url) {
  return playgroundCoordinator.text(url);
}

// --- Block wiring helpers (each a distinct job init() delegates to) --------

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
  if (!config) { return null; }
  return {
    componentTitle,
    propsTitle,
    adapter: implementation === 'rsp' || implementation === 'swc' ? implementation : 'image',
    adapterUrl: config.adapter,
    runtimeSource: config.runtimeSource ?? null,
    previewName: config.tagPattern
      .replace('{Pascal}', componentTitle)
      .replace('{slug}', component),
    markupUrl: config.snippetDir
      ? `${base}/${config.snippetDir}/${component}.${config.snippetExt}`
      : null,
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
    fetchPlaygroundSheets(spreadsheetUrl, playgroundCoordinator),
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
  fragmentRoot,
) {
  return authoredProps.reduce((acc, property) => {
    const descriptor = resolveControl(
      property,
      implementation,
      controlsMap,
      propRows,
      // eslint-disable-next-line no-console
      (message) => console.warn(`Playground (${component}): ${message}`),
      component,
    );
    if (!descriptor) { return acc; }
    // defaultOverride leads because it encodes a constraint between two properties
    // (ColorSlider's channel must suit colorSpace), which a per-prop catalog default
    // cannot express — see DEFAULT_OVERRIDES in playground-data.js.
    let rawDefault = descriptor.defaultOverride
      ?? snippetDefault(
        property,
        descriptor.attribute,
        fragmentRoot,
        implementation === 'rsp' ? parseRspAttributeValue : undefined,
      )
      ?? parseDefault(findProp(property, propRows)?.default)
      ?? descriptor.options[0];
    // A textfield with no authored default would otherwise start empty —
    // populate it with a placeholder label instead.
    if (descriptor.controlType === 'textfield' && rawDefault === undefined) {
      rawDefault = 'Label';
    }
    // Freeform controls (textfield, slider) hold real values, not the yes/no
    // convention used for boolean-ish picker/segmentedControl options.
    const typedDefault = numericValue(rawDefault, descriptor.valueKind);
    const defaultValue = FREEFORM_CONTROLS.has(descriptor.controlType)
      ? typedDefault
      : booleanStringToYesNo(optionValue(typedDefault, descriptor.options));
    currentProps[property] = {
      value: defaultValue, attribute: descriptor.attribute, controlType: descriptor.controlType,
    };
    acc.push({ property, ...descriptor, defaultValue });
    return acc;
  }, []);
}

function descriptorTarget(property, implementation, descriptor, componentMeta, hasRealLabelProp) {
  if (property === 'icon') { return 'icon'; }
  if (TEXT_KEYS.has(property)) {
    return property === 'label' && hasRealLabelProp ? 'label' : 'content';
  }
  if (componentMeta.propsTitle !== componentMeta.componentTitle) { return 'owner-prop'; }
  if (implementation === 'swc' && descriptor.attribute) { return 'attribute'; }
  return 'route-prop';
}

export function buildPlaygroundModel({
  component,
  implementation,
  componentMeta,
  componentsSheet,
  controlsSheet,
  propRows,
  snippetMarkup,
}) {
  const hasRealLabelProp = implementation === 'rsp' && hasLabelProp(propRows);
  const fragmentRoot = implementation === 'rsp'
    ? parseXmlFragmentRoot(snippetMarkup)
    : parseHtmlFragmentRoot(snippetMarkup, componentMeta.previewName).fragmentRoot;
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
    fragmentRoot,
  ).map((descriptor) => ({
    ...descriptor,
    target: descriptorTarget(
      descriptor.property,
      implementation,
      descriptor,
      componentMeta,
      hasRealLabelProp,
    ),
  }));
  return {
    component,
    implementation,
    adapter: componentMeta.adapter ?? (
      implementation === 'rsp' || implementation === 'swc' ? implementation : 'image'
    ),
    adapterUrl: componentMeta.adapterUrl ?? null,
    runtimeSource: componentMeta.runtimeSource
      ?? getPlaygroundConfig(implementation)?.runtimeSource
      ?? null,
    componentTitle: componentMeta.componentTitle,
    propsTitle: componentMeta.propsTitle,
    previewName: componentMeta.previewName,
    previewShellPath: componentMeta.previewShellPath,
    snippetMarkup,
    hasRealLabelProp,
    descriptors,
    currentProps,
    values: Object.fromEntries(
      Object.entries(currentProps)
        .map(([property, value]) => [property, yesNoToBoolean(value.value)]),
    ),
  };
}

function uniqueBy(values, key) {
  return [...new Map(values.map((value) => [key(value), value])).values()];
}

function runtimeModule(source, exportName) {
  const deps = `react@${source.reactVersion},react-dom@${source.reactVersion}`;
  return {
    exportName,
    url: `https://esm.sh/${source.packageName}@${source.packageVersion}`
      + `?bundle&exports=${exportName}&deps=${deps}`,
  };
}

function runtimeBundleModule(source, exportNames) {
  const deps = `react@${source.reactVersion},react-dom@${source.reactVersion}`;
  const names = [...new Set(exportNames)].sort((a, b) => a.localeCompare(b));
  return {
    exports: names.map((exportName) => ({ exportName, name: exportName })),
    url: `https://esm.sh/${source.packageName}@${source.packageVersion}`
      + `?bundle&exports=${names.join(',')}&deps=${deps}`,
  };
}

function rspRuntimeRequirements(model, externalModules = {}) {
  const fragmentRoot = parseXmlFragmentRoot(model.snippetMarkup);
  const fragmentTags = fragmentRoot ? collectFragmentTagNames(fragmentRoot) : [];
  const externalTags = fragmentTags.filter((tagName) => externalModules[tagName]);
  const componentExports = fragmentTags.filter((tagName) => !externalModules[tagName]);
  const overlay = OVERLAY_TRIGGERS[model.component];
  if (overlayShape(model.component) !== 'none') {
    componentExports.push(overlay.trigger ?? overlay.queueExport, 'Button');
  }
  componentExports.push(model.componentTitle);
  return {
    componentExports: [...new Set(componentExports.filter(Boolean))],
    externalTags: [...new Set(externalTags)],
  };
}

export function buildRspRuntime(model, manifest) {
  if (manifest?.schemaVersion !== 1) {
    throw new Error('Unsupported playground runtime manifest schema.');
  }
  const source = manifest.sources?.[model.runtimeSource];
  if (!source?.packageName || !source.packageVersion || !source.imports || !source.exports) {
    throw new Error(`Invalid playground runtime source "${model.runtimeSource}".`);
  }
  const { componentExports, externalTags } = rspRuntimeRequirements(
    model,
    source.externalModules,
  );

  let missingExport = false;
  const exportEntries = componentExports.map((exportName) => {
    const entry = source.exports[exportName];
    if (!entry) {
      missingExport = true;
      return { modules: [runtimeModule(source, exportName)], styles: [] };
    }
    return entry;
  });
  const externalEntries = externalTags.map((tagName) => source.externalModules[tagName]);
  const externalModuleEntries = externalEntries.flatMap(
    (entry, index) => entry.modules.map((module) => ({
      ...module,
      name: externalTags[index],
    })),
  );
  const rootModule = runtimeBundleModule(source, [
    ...componentExports,
    'Provider',
    'Text',
  ]);
  const modules = uniqueBy(
    [rootModule, ...externalModuleEntries],
    ({ url }) => url,
  ).sort((a, b) => a.url.localeCompare(b.url));
  const stylePaths = missingExport
    ? source.allStyles
    : uniqueBy(
      [...exportEntries, ...externalEntries].flatMap((entry) => entry.styles),
      (path) => path,
    ).sort((a, b) => a.localeCompare(b));
  const styleBase = `https://esm.sh/${source.packageName}@${source.packageVersion}`;

  return {
    imports: source.imports,
    modules,
    styles: stylePaths.map((path) => `${styleBase}${path}`),
  };
}

export async function resolveRspRuntime(model, {
  json = (url) => playgroundCoordinator.json(url),
  manifestUrl = '/deps/rsp/playground/runtime-manifest.json',
} = {}) {
  try {
    const manifest = await json(manifestUrl);
    return buildRspRuntime(model, manifest);
  } catch (manifestError) {
    const config = PLAYGROUND_RUNTIME_SOURCES[model.runtimeSource];
    if (!config) {
      throw new Error(
        `No fallback configuration for runtime source "${model.runtimeSource}".`,
        { cause: manifestError },
      );
    }
    const metadata = await json(config.metadataUrl);
    if (!metadata?.version) { throw new Error('Runtime package metadata has no version.'); }
    const listingUrl = config.listingUrl.replace('{version}', metadata.version);
    const listing = await json(listingUrl);
    const packageFiles = listing.files?.map(({ name }) => name) ?? [];
    const { resolveStylesheetHrefs } = await import(
      '../../deps/rsp/playground/resolve-stylesheet-hrefs.js'
    );
    const source = {
      packageName: config.packageName,
      packageVersion: metadata.version,
      reactVersion: String(metadata.peerDependencies?.react ?? '19').replace(/^[^0-9]*/, ''),
    };
    const externalModules = config.externalModules ?? {};
    const { componentExports, externalTags } = rspRuntimeRequirements(model, externalModules);
    const modules = [runtimeBundleModule(source, [
      ...componentExports,
      'Provider',
      'Text',
    ])];
    externalTags.forEach((tagName) => {
      const external = externalModules[tagName];
      const versioned = external.specifier.replace(
        config.packageName,
        `${config.packageName}@${metadata.version}`,
      );
      modules.push({
        exportName: external.exportName,
        name: tagName,
        url: `https://esm.sh/${versioned}?deps=react@${source.reactVersion},`
          + `react-dom@${source.reactVersion}`,
      });
    });
    return {
      imports: {
        react: `https://esm.sh/react@${source.reactVersion}`,
        reactDom: `https://esm.sh/react-dom@${source.reactVersion}/client`,
      },
      modules: uniqueBy(
        modules,
        ({ url }) => url,
      ).sort((a, b) => a.url.localeCompare(b.url)),
      styles: resolveStylesheetHrefs(
        config.packageName,
        metadata.version,
        model.componentTitle,
        packageFiles,
      ),
      diagnostic: {
        recovered: true,
        message: `Runtime manifest unavailable: ${manifestError.message}`,
      },
    };
  }
}

function createPreviewIframe(title) {
  const iframe = document.createElement('iframe');
  iframe.title = title;
  iframe.setAttribute('loading', 'lazy');
  return iframe;
}

// onControlChange fires after currentProps is already updated — the caller
// only has to react (post the update, refresh the code disclosure, ...).
// Returns null when nothing rendered: a component can legitimately have no
// controls (swc's link is utility CSS classes, not a component API), and an
// empty panel would still hold its column and label a region with nothing in it.
function buildControlsPanel(descriptors, currentProps, onControlChange, label) {
  const controlsPanel = document.createElement('div');
  controlsPanel.classList.add('playground-controls');
  controlsPanel.setAttribute('aria-label', `${label} component controls`);

  descriptors.forEach(({
    property, controlType, options, defaultValue, attribute, valueKind,
  }) => {
    if (!options.length && !FREEFORM_CONTROLS.has(controlType)) { return; }
    const control = buildControl(controlType, property, options, defaultValue, (value) => {
      const typedValue = numericValue(
        FREEFORM_CONTROLS.has(controlType) ? value : optionValue(value, options),
        valueKind,
      );
      currentProps[property].value = typedValue;
      onControlChange(property, attribute, typedValue, controlType);
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

  /* TODO: do we even need the expand button any longer? */
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

  disclosure.append(codeWrapper);
  return disclosure;
}

// --- Default export (DOM wiring, not unit-tested) ---------------------------

// How long a control's changes must pause before the code disclosure rebuilds.
const DISCLOSURE_DEBOUNCE_MS = 200;
let nextFrameId = 0;

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
  if (!componentMeta) {
    config.log(`sandbox block: unsupported implementation "${implementation}"`, el);
    el.remove();
    return;
  }
  const {
    componentTitle, previewName, previewShellPath, adapterUrl,
  } = componentMeta;
  nextFrameId += 1;
  const frameId = `playground-${nextFrameId}`;
  const iframeUrl = `${base}/${previewShellPath}?frame=${encodeURIComponent(frameId)}`;
  const iframe = createPreviewIframe(`${componentTitle} component preview`);
  const inputsPromise = fetchPlaygroundInputs(
    base,
    componentMeta,
    component,
    implementation,
    sheetUrl,
  );
  const modelPromise = inputsPromise.then((inputs) => buildPlaygroundModel({
    component,
    implementation,
    componentMeta,
    ...inputs,
  }));
  const runtimePromise = modelPromise.then((resolved) => (
    implementation === 'rsp'
      ? resolveRspRuntime(resolved, {
        manifestUrl: `${base}/deps/rsp/playground/runtime-manifest.json`,
      })
      : null
  ));
  const previewInitPromise = Promise.all([modelPromise, runtimePromise])
    .then(([resolved, runtime]) => ({
      model: resolved,
      runtime,
      adapterUrl: `${base}/${adapterUrl}`,
    }));
  previewInitPromise.catch(() => {});
  const previewState = {
    frameId,
    initPromise: previewInitPromise,
  };
  const unregister = playgroundCoordinator.register(iframe, previewState);
  iframe.src = iframeUrl;
  const postPropUpdate = (property, attribute, value, controlType) => {
    playgroundCoordinator.update(iframe, {
      property, attribute, value, controlType,
    });
  };
  const previewArea = document.createElement('div');
  previewArea.classList.add('playground-preview');
  const previewStatus = document.createElement('div');
  previewStatus.className = 'visually-hidden';
  previewStatus.setAttribute('role', 'status');
  previewState.onError = (error) => {
    config.log('sandbox block: preview initialization failed', error);
    previewStatus.textContent = `Preview unavailable: ${error.message}`;
  };
  previewArea.appendChild(iframe);
  previewArea.appendChild(previewStatus);
  const layout = document.createElement('div');
  layout.classList.add('playground-layout');
  layout.append(previewArea);
  el.replaceChildren(layout);

  let model;
  try {
    model = await modelPromise;
  } catch (err) {
    config.log('sandbox block: data fetch failed', err);
    unregister();
    el.remove();
    return;
  }

  const {
    snippetMarkup, hasRealLabelProp, currentProps, descriptors,
  } = model;

  // The one thing that cannot live in the registry as data. Keyed by id rather than
  // branched on, and defaulting to the markup serializer an implementation with no
  // preview shell would use anyway.
  const SNIPPET_BUILDERS = {
    rsp: (name, props) => buildRspSnippet(name, props, snippetMarkup, hasRealLabelProp, component),
    swc: (name, props) => buildSwcSnippet(name, props, snippetMarkup),
  };
  const buildSnippet = SNIPPET_BUILDERS[implementation] ?? SNIPPET_BUILDERS.swc;

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
    componentTitle,
  );

  const disclosure = buildCodeDisclosure(pre);

  // With no controls the preview is the only flex child and fills the row.
  if (controlsPanel) { layout.append(controlsPanel); }

  el.append(disclosure);
}
