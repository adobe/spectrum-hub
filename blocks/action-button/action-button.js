import { getScheme, getConfig, setScheme } from '../../scripts/ak.js';
import { setColorScheme as setSectionScheme } from '../section-metadata/section-metadata.js';
import { pascalCase } from '../../deps/rsp/playground/pascal-case.js';

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
  });
};

function handleAi() {
  log('You asked AI something');
}

function handleSettings() {
  log('You clicked settings');
}

// Per-button revert timers so a repeated click restarts the "Copied" flash
// rather than leaving a stale timeout from a previous copy.
const copyResetTimers = new WeakMap();

// Every interior page is available as Markdown by appending `.md` to its path.
function markdownPathForCurrentPage() {
  const { pathname } = window.location;
  return `${pathname.replace(/\/$/, '')}.md`;
}

// The icon shown while the "Copied" confirmation is up.
const COPIED_ICON = 'checkmarkcircle';

// Swaps the button's authored icon (an <svg class="icon"><use href=".../
// s2-icon-<name>-20-n.svg#icon"> from scripts/utils/svg.js) to the checkmark on
// success and back on revert.
function setCopiedIcon(button, copied) {
  const use = button.querySelector('svg.icon use');
  if (!use) { return; }
  if (!('defaultHref' in use.dataset)) {
    use.dataset.defaultHref = use.getAttribute('href');
  }
  use.setAttribute('href', copied
    ? use.dataset.defaultHref.replace(/s2-icon-[^/]+?-20-n\.svg/, `s2-icon-${COPIED_ICON}-20-n.svg`)
    : use.dataset.defaultHref);
}

function whenPageDecorated() {
  return new Promise((resolve) => {
    const check = () => (document.querySelector('[data-status]')
      ? requestAnimationFrame(check)
      : resolve());
    check();
  });
}

// Wrapped in an object (rather than exported directly) so tests can stub
export const turndownLoader = {
  load: () => import('../../deps/turndown/dist/index.js'),
};

// Converts the live, fully-decorated <main> to MD
async function pageMarkdown() {
  await whenPageDecorated();
  const main = document.querySelector('main');
  if (!main) { throw new Error('No main content found'); }
  const clone = main.cloneNode(true);
  clone.querySelectorAll('[data-widget]').forEach((el) => el.remove());

  const { TurndownService, gfm } = await turndownLoader.load();
  const turndownService = new TurndownService({ headingStyle: 'atx', codeBlockStyle: 'fenced' });
  turndownService.use(gfm);
  return turndownService.turndown(clone.innerHTML);
}

// Copies the current page's Markdown to the clipboard.
async function handleCopyMarkdown(e) {
  const button = e.currentTarget;
  const label = button.querySelector('span') ?? button;
  if (!('defaultLabel' in label.dataset)) {
    label.dataset.defaultLabel = label.textContent;
    // Announce the Copied/Copy failed status to screen readers without
    // moving focus (WCAG 4.1.3 Status Messages) — works for icon-only
    // buttons too, since the visually-hidden label is what's made live.
    label.setAttribute('aria-live', 'polite');
    label.setAttribute('aria-atomic', 'true');
  }

  const successfulCopy = (message, copied) => {
    label.textContent = message;
    button.classList.toggle('is-copied', copied);
    setCopiedIcon(button, copied);
    clearTimeout(copyResetTimers.get(button));
    copyResetTimers.set(button, setTimeout(() => {
      label.textContent = label.dataset.defaultLabel;
      button.classList.remove('is-copied');
      setCopiedIcon(button, false);
    }, 3000));
  };

  try {
    const markdown = await pageMarkdown();
    await navigator.clipboard.writeText(markdown);
    successfulCopy('Copied', true);
    return;
  } catch { /* fall through to the .md fetch fallback */ }

  try {
    const resp = await fetch(markdownPathForCurrentPage());
    if (!resp.ok) { throw new Error(`Failed to fetch markdown: ${resp.status}`); }
    const markdown = await resp.text();
    await navigator.clipboard.writeText(markdown);
    successfulCopy('Copied', true);
  } catch {
    successfulCopy('Copy failed', false);
  }
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
  'copy-markdown': {
    click: handleCopyMarkdown,
  },
  search: {
    click: handleSearch,
    lazy: loadSearch,
  },
  action: {},
};

// Each web implementation's docs site, keyed by the URL slug used in
// /web/<implementation>/components/<component>. `href` deep-links to the
// current component's page.
const IMPLEMENTATIONS = {
  swc: {
    label: 'SWC',
    href: (component) => `https://spectrum-web-components.adobe.com/?path=/docs/components-${component}--docs`,
  },
  rsp: {
    label: 'RSP',
    href: (component) => `https://react-spectrum.adobe.com/${pascalCase(component)}.html`,
  },
};

export function resolveImplementation(pathname) {
  const parts = pathname.split('/').filter(Boolean);
  const idx = parts.indexOf('components');
  if (idx < 1) { return null; }
  const impl = IMPLEMENTATIONS[parts[idx - 1]];
  const component = parts[idx + 1];
  if (!impl || !component) { return null; }
  return { label: impl.label, href: impl.href(component) };
}

//  if the page has no resolvable implementation the widget removes itself.
function decorateGoToImpl(a, span) {
  const target = resolveImplementation(window.location.pathname);
  if (!target) {
    a.remove();
    return;
  }
  a.href = target.href;
  a.target = '_blank';
  a.rel = 'noopener noreferrer';
  span.textContent = `Go to ${target.label}`;
}

// TODO: ensure this actually works once the status-table block has merged
// The S2 Figma file; each component's frame is addressed by node id.
const FIGMA_FILE_URL = 'https://www.figma.com/design/xHBWBBIe2eo5vwoCeNrC4Q/S2---Web';
const FIGMA_STATUS_PATH = '/deps/figma/component-status.json';

function slugifyName(name) {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

function componentSlugFromPath(pathname) {
  const parts = pathname.split('/').filter(Boolean);
  const idx = parts.indexOf('components');
  return idx >= 1 ? parts[idx + 1] ?? null : null;
}

// The stored id uses a colon (e.g. "9230:3620"); Figma node ids in URLs are hyphenated
// ("9230-3620").
export function resolveFigmaUrl(componentSlug, data) {
  if (!componentSlug) { return null; }
  const entry = data.find((row) => slugifyName(row.name) === componentSlug);
  if (!entry?.figmaPageId) { return null; }
  const nodeId = entry.figmaPageId.replace(':', '-');
  return `${FIGMA_FILE_URL}?node-id=${nodeId}&m=dev`;
}

async function fetchFigmaData() {
  const { codeBase = '' } = getConfig();
  try {
    const resp = await fetch(`${codeBase}${FIGMA_STATUS_PATH}`);
    return resp.ok ? resp.json() : [];
  } catch {
    return [];
  }
}

// the widget removes itself when the component has no entry (or the data is unavailable).
async function decorateSeeInFigma(a, span) {
  const componentSlug = componentSlugFromPath(window.location.pathname);
  const data = componentSlug ? await fetchFigmaData() : [];
  const href = resolveFigmaUrl(componentSlug, data);
  if (!href) {
    a.remove();
    return;
  }
  a.href = href;
  a.target = '_blank';
  a.rel = 'noopener noreferrer';
  span.textContent = 'See in Figma';
}

// Link widgets keep their anchor (native navigation) instead of becoming a
// <button>; each entry decorates the anchor in place.
const LINKS = {
  '/tools/widgets/go-to-impl': decorateGoToImpl,
  '/tools/widgets/see-in-figma': decorateSeeInFigma,
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
