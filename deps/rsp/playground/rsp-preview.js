import { applyAttribute } from '../../shared/playground/apply-attribute.js';
import { isUnsetOption } from '../../shared/playground/unset-control-options.js';
import {
  buildCompositeElement,
} from './build-composite-element.js';
import { buildIconChild, composeChildren } from './compose-preview-children.js';
import {
  OVERLAY_TRIGGERS,
  overlayShape,
  splitTriggerProps,
} from './overlay-triggers.js';
import { mountAttributeName, resolveRspPropKey } from './apply-rsp-prop.js';
import { resolveColorScheme } from './resolve-color-scheme.js';

const VIRTUALIZED_COMPONENTS = new Set(['cards', 'table']);
const FULL_WIDTH_COMPONENTS = new Set(['divider', 'select-box']);
const VERTICAL_COMPONENTS = new Set(['divider', 'select-box']);

function phaseError(phase, error) {
  error.phase = phase;
  return error;
}

function parseFragment(markup, ownerDocument) {
  if (!markup) { return null; }
  const parser = new ownerDocument.defaultView.DOMParser();
  const parsed = parser.parseFromString(markup.trim(), 'application/xml');
  if (parsed.querySelector('parsererror')) {
    throw phaseError('fragment-parse', new Error('Invalid RSP preview fragment.'));
  }
  return parsed.documentElement;
}

function applyMountSizing(mount, component, orientation) {
  if (VIRTUALIZED_COMPONENTS.has(component)) {
    mount.style.display = 'block';
    mount.style.width = 'min(90vw, 400px)';
    mount.style.height = '20rem';
    return;
  }
  if (!FULL_WIDTH_COMPONENTS.has(component)) { return; }
  if (VERTICAL_COMPONENTS.has(component) && orientation === 'vertical') {
    mount.style.display = 'flex';
    mount.style.alignItems = 'stretch';
    mount.style.width = '';
    mount.style.height = '10rem';
    mount.setAttribute('data-vertical-divider', '');
  } else {
    mount.style.display = 'block';
    mount.style.alignItems = '';
    mount.style.width = 'min(90vw, 400px)';
    mount.style.height = '';
    mount.removeAttribute('data-vertical-divider');
  }
}

function appendStyles(styles, reportError, ownerDocument) {
  styles.forEach((href) => {
    const link = ownerDocument.createElement('link');
    link.rel = 'stylesheet';
    link.href = href;
    link.addEventListener('error', () => {
      reportError('stylesheet-load', new Error(`Failed to load stylesheet ${href}`));
    }, { once: true });
    ownerDocument.head.append(link);
  });
}

export async function init({
  model,
  runtime,
  mount,
  reportError,
  reportDiagnostic,
  loadModule = (url) => import(url),
  ownerDocument = document,
  media = matchMedia,
}) {
  const fragmentRoot = parseFragment(model.snippetMarkup, ownerDocument);
  let react;
  let reactDom;
  let loadedModules;
  try {
    [react, reactDom, loadedModules] = await Promise.all([
      loadModule(runtime.imports.react),
      loadModule(runtime.imports.reactDom),
      Promise.all(runtime.modules.map(async (descriptor) => {
        const module = await loadModule(descriptor.url);
        const exports = descriptor.exports ?? [descriptor];
        return exports.map((entry) => [entry.name, module[entry.exportName]]);
      })),
    ]);
  } catch (error) {
    throw phaseError('runtime-import', error);
  }
  appendStyles(runtime.styles, reportError, ownerDocument);
  if (runtime.diagnostic) {
    reportDiagnostic(runtime.diagnostic);
  }

  const { createElement, Fragment } = react;
  const RSP = Object.fromEntries(loadedModules.flat());
  const Component = RSP[model.componentTitle];
  if (!Component) {
    throw phaseError('runtime-import', new Error(`No RSP export named "${model.componentTitle}"`));
  }
  const root = reactDom.createRoot(mount);
  const currentProps = {
    ...(fragmentRoot
      ? Object.fromEntries(
        [...fragmentRoot.attributes]
          .map((attribute) => [attribute.name, attribute.value === '' ? true : attribute.value]),
      )
      : {}),
    ...model.values,
  };
  const compositeChildren = [...(fragmentRoot?.children ?? [])];
  if (!compositeChildren.length
    && fragmentRoot?.textContent
    && currentProps.children === undefined) {
    currentProps.children = fragmentRoot.textContent;
  }
  const childArgs = compositeChildren.map(
    (child) => buildCompositeElement(child, RSP, createElement),
  );
  const overlay = OVERLAY_TRIGGERS[model.component];
  const shape = overlayShape(model.component);
  const propsOnTrigger = model.propsTitle !== model.componentTitle;
  let scheme = null;
  let iconChild = null;
  let textChild = currentProps.children ?? null;

  const composeLabeledChildren = () => composeChildren(
    iconChild,
    iconChild && typeof textChild === 'string'
      ? createElement(RSP.Text, { key: 'text' }, textChild)
      : textChild,
  );

  function render() {
    const colorScheme = resolveColorScheme(
      scheme,
      media('(prefers-color-scheme: dark)').matches,
    );
    const { own, trigger } = propsOnTrigger
      ? splitTriggerProps(currentProps)
      : { own: currentProps, trigger: {} };
    const inner = childArgs.length
      ? createElement(Component, own, ...childArgs)
      : createElement(Component, own);
    let element = inner;
    if (shape === 'wrap') {
      element = createElement(
        RSP[overlay.trigger],
        trigger,
        createElement(RSP.Button, {}, overlay.triggerLabel),
        inner,
      );
    } else if (shape === 'sibling') {
      element = createElement(
        Fragment,
        {},
        createElement(RSP.Button, {
          onPress: () => RSP[overlay.queueExport].info(overlay.toastMessage),
          variant: 'accent',
        }, overlay.triggerLabel),
        inner,
      );
    }
    const key = `${colorScheme}-${currentProps.staticColor ?? 'none'}`
      + `-${currentProps.variant ?? 'none'}`;
    root.render(createElement(
      RSP.Provider,
      { key, colorScheme, background: 'base' },
      element,
    ));
  }

  applyMountSizing(mount, model.component, currentProps.orientation);
  render();

  return {
    update({ property, value }) {
      if (property === 'icon') {
        iconChild = buildIconChild(createElement, value);
        currentProps.children = composeLabeledChildren();
      } else {
        const key = resolveRspPropKey(property, model.hasRealLabelProp);
        if (key === 'children') {
          textChild = value;
          currentProps.children = composeLabeledChildren();
        } else {
          const unset = isUnsetOption(value);
          if (unset) {
            delete currentProps[key];
          } else {
            currentProps[key] = value;
          }
          applyAttribute(mount, mountAttributeName(key), unset ? null : value);
        }
      }
      if (property === 'orientation') {
        applyMountSizing(mount, model.component, value);
      }
      render();
    },
    updateTheme(nextScheme) {
      scheme = nextScheme;
      ownerDocument.body.style.colorScheme = scheme ?? '';
      render();
    },
    destroy() {
      root.unmount();
    },
  };
}
