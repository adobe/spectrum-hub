import { applySwcProp } from './apply-swc-prop.js';
import { defineSwc, VERSION } from './define-swc.js';

function phaseError(phase, error) {
  error.phase = phase;
  return error;
}

function loadStyles(reportError, ownerDocument) {
  const link = ownerDocument.createElement('link');
  link.rel = 'stylesheet';
  link.href = `https://unpkg.com/@adobe/spectrum-wc@${VERSION}/dist/swc.css`;
  link.addEventListener('error', () => {
    reportError('stylesheet-load', new Error(`Failed to load stylesheet ${link.href}`));
  }, { once: true });
  ownerDocument.head.append(link);
}

export async function init({
  model,
  mount,
  reportError,
  define = defineSwc,
  ownerDocument = document,
}) {
  ownerDocument.body.classList.add('swc-theme', 'swc-theme--sizeM');
  loadStyles(reportError, ownerDocument);
  if (!model.snippetMarkup) {
    throw phaseError(
      'fragment-parse',
      new Error(`No preview markup available for ${model.component}`),
    );
  }
  mount.innerHTML = model.snippetMarkup;

  const rootTag = `swc-${model.component}`;
  const root = mount.querySelector(rootTag) ?? mount.firstElementChild;
  if (!root) {
    throw phaseError('fragment-parse', new Error('Empty preview fragment.'));
  }
  const tags = [...new Set(
    [...mount.querySelectorAll('*')]
      .map((node) => node.localName)
      .filter((name) => name.startsWith('swc-')),
  )];
  await Promise.all(tags.map(async (tag) => {
    try {
      await define(tag.slice(4));
    } catch (error) {
      if (tag === rootTag) { throw phaseError('runtime-import', error); }
    }
  }));

  mount.querySelectorAll('[open]').forEach((element) => {
    if (typeof element.showPopover === 'function') {
      try { element.showPopover(); } catch { /* already open or unsupported */ }
    }
  });
  mount.querySelectorAll('[for]').forEach((element) => {
    const target = element.getAttribute('for');
    element.removeAttribute('for');
    element.setAttribute('for', target);
  });

  return {
    update(update) {
      try {
        applySwcProp(root, update);
      } catch (error) {
        throw phaseError('update', error);
      }
    },
    updateTheme(scheme) {
      ownerDocument.body.style.colorScheme = scheme ?? '';
      const dark = scheme === 'dark';
      ownerDocument.body.classList.toggle('swc-theme--dark', dark);
      ownerDocument.body.classList.toggle('swc-theme--light', !dark);
    },
    destroy() {
      mount.replaceChildren();
    },
  };
}
