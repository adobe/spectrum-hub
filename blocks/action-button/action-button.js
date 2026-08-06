import { getScheme, getConfig, setScheme } from '../../scripts/ak.js';
import { setColorScheme as setSectionScheme } from '../section-metadata/section-metadata.js';

const { log } = getConfig();
const LAZY_TIMEOUT = 3000;

const loadSearch = () => import('../search/search.js');

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
    btn.focus();
  });
};

function handleAi() {
  log('You asked AI something');
}

function handleSettings() {
  log('You clicked settings');
}

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
  search: {
    click: handleSearch,
    lazy: loadSearch,
  },
  action: {},
};

export default async function actionButton(a) {
  if (a.dataset.style) { a.classList.add(`action-button-${a.dataset.style}`); }

  // Wrap the text in a span
  const span = document.createElement('span');
  span.textContent = a.lastChild.textContent;
  if (a.dataset.label === 'hide') { span.classList.add('visually-hidden'); }
  a.lastChild.replaceWith(span);

  // The widget name (last path segment) is stamped as data-widget.
  const widget = a.pathname.split('/').filter(Boolean).pop();

  // Hash-based widgets (#action, #scheme, ...) key off the hash; path-based
  // widgets (e.g. search) carry no hash and key off the widget name.
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
