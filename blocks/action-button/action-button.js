import { getScheme, getConfig, setScheme } from '../../scripts/ak.js';
import { setColorScheme as setSectionScheme } from '../section-metadata/section-metadata.js';

const { log } = getConfig();
const LAZY_TIMEOUT = 3000;

const loadSearch = () => import('../search/search.js');
const loadCopyMd = () => import('../copy-md/copy-md.js');
const loadGoToImpl = () => import('../go-to-impl/go-to-impl.js');
const loadFigma = () => import('../figma/figma.js');

function handleColorScheme() {
  const scheme = getScheme() === 'dark-scheme' ? 'light-scheme' : 'dark-scheme';
  setScheme(document.body, scheme);
  // Re-calculate section schemes
  const sections = document.querySelectorAll('.section');
  for (const section of sections) {
    setSectionScheme(section);
  }
}

const handleSearch = async (e) => {
  await loadSearch();
  const shSearch = document.createElement('sh-search');
  const btn = e.target.closest('.action-button');
  btn.insertAdjacentElement('beforebegin', shSearch);
  shSearch.addEventListener('clear', () => {
    shSearch.remove();
  });
};

function handleAi() {
  log('You asked AI something');
}

function handleSettings() {
  log('You clicked settings');
}

const handleCopyMarkdown = async (e) => {
  // e.currentTarget is nulled out once the event finishes dispatching, so it
  // must be captured before the lazy import below yields to the event loop.
  const button = e.currentTarget;
  const { handleCopyMarkdown: doCopy } = await loadCopyMd();
  doCopy({ currentTarget: button });
};

const BUTTONS = {
  scheme: {
    click: handleColorScheme,
  },
  chat: {
    click: handleAi,
  },
  settings: {
    click: handleSettings,
  },
  'copy-markdown': {
    click: handleCopyMarkdown,
    lazy: loadCopyMd,
  },
  search: {
    click: handleSearch,
    lazy: loadSearch,
  },
  action: {},
};

// Link widgets keep their anchor (native navigation) instead of becoming a
// <button>; each entry decorates the anchor in place. Wrapped so the heavier
// per-widget logic is only ever fetched
// when that specific widget is actually on the page.
const LINKS = {
  '/tools/widgets/go-to-impl': async (a, span) => {
    const { decorateGoToImpl } = await loadGoToImpl();
    return decorateGoToImpl(a, span);
  },
  '/tools/widgets/see-in-figma': async (a, span) => {
    const { decorateSeeInFigma } = await loadFigma();
    return decorateSeeInFigma(a, span);
  },
};

function getLinkProps(a) {
  const { title } = a;
  a.removeAttribute('title');
  return title.split('|').reduce((acc, prop) => {
    // The first split will be key
    const [key, ...values] = prop.split(':');
    // The values may have colons in them, join them back.
    const value = values.length === 1 ? values[0] : values.join(':');
    acc[key.trim()] = value.trim();
    return acc;
  }, {});
}

export default async function actionButton(a) {
  const props = getLinkProps(a);
  if (props.style) { a.classList.add(`action-button-${props.style}`); }

  // Wrap the text in a span
  const span = document.createElement('span');
  span.textContent = a.lastChild.textContent;
  if (props.label === 'hide') { span.classList.add('visually-hidden'); }
  a.lastChild.replaceWith(span);

  // The widget name (last path segment) is stamped as data-widget so consumers
  // like page-nav can identify and filter widgets after decoration.
  const widget = a.pathname.split('/').filter(Boolean).pop();

  // Link widgets keep the anchor (native navigation); button widgets swap it
  // for a <button> with a click handler. Awaited so async link widgets (e.g.
  // see-in-figma, which fetches its target) are fully resolved — href set or
  // element removed — before callers like page-nav read the decorated DOM.
  const decorateLinkWidget = LINKS[a.pathname];
  if (decorateLinkWidget) {
    a.dataset.widget = widget;
    await decorateLinkWidget(a, span);
    return;
  }

  // Hash-based widgets (#action, #scheme, ...) key off the hash; path-based
  // widgets (e.g. copy-markdown) carry no hash and key off the widget name.
  const buttonProps = BUTTONS[a.hash.replace('#', '')] ?? BUTTONS[widget];
  if (buttonProps) {
    const button = document.createElement('button');
    button.className = a.className;
    button.dataset.widget = widget;
    if (buttonProps.click) {
      button.addEventListener('click', buttonProps.click);
    }
    if (buttonProps.lazy) {
      setTimeout(buttonProps.lazy, LAZY_TIMEOUT);
    }
    button.append(...a.childNodes);
    a.replaceWith(button);
  }
}
