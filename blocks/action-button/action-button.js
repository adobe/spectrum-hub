import { getConfig } from '../../scripts/ak.js';
import { setColorScheme } from '../section-metadata/section-metadata.js';

const { log } = getConfig();

function handleColorScheme() {
  const { body } = document;

  let currPref = localStorage.getItem('color-scheme');
  if (!currPref) {
    currPref = matchMedia('(prefers-color-scheme: dark)')
      .matches ? 'dark-scheme' : 'light-scheme';
  }

  const theme = currPref === 'dark-scheme'
    ? { add: 'light-scheme', remove: 'dark-scheme' }
    : { add: 'dark-scheme', remove: 'light-scheme' };

  body.classList.remove(theme.remove);
  body.classList.add(theme.add);
  localStorage.setItem('color-scheme', theme.add);
  // Re-calculatie section schemes
  const sections = document.querySelectorAll('.section');
  for (const section of sections) {
    setColorScheme(section);
  }
}

function handleAi() {
  log('You asked AI something');
}

function handleSettings() {
  log('You clicked settings');
}

const BUTTONS = {
  '/tools/widgets/scheme': {
    click: handleColorScheme,
  },
  '/tools/widgets/ask-ai': {
    click: handleAi,
  },
  '/tools/widgets/settings': {
    click: handleSettings,
  },
};

function getLinkProps(a) {
  return a.title.split('|').reduce((acc, prop) => {
    // The first split will be key
    const [key, ...values] = prop.split(':');
    // The values may have colons in them, join them back.
    const value = values.length === 1 ? values[0] : values.join(':');
    acc[key.trim()] = value.trim();
    return acc;
  }, {});
}

export default function actionButton(a) {
  const props = getLinkProps(a);
  if (props.style) a.classList.add(`action-button-${props.style}`);

  // Wrap the text in a span
  const span = document.createElement('span');
  span.textContent = a.lastChild.textContent;
  if (props.label === 'hide') span.classList.add('visually-hidden');
  a.lastChild.replaceWith(span);

  const buttonProps = BUTTONS[a.pathname];
  if (buttonProps) {
    const button = document.createElement('button');
    button.className = a.className;
    button.addEventListener('click', buttonProps.click);
    button.append(...a.childNodes);
    a.replaceWith(button);
  }
}
