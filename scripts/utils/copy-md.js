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

const DECORATION_TIMEOUT = 8000;

// watch for data-status="decorated" attribute to
// change and only re-check once it is removed.
function whenPageDecorated() {
  return new Promise((resolve, reject) => {
    if (!document.querySelector('[data-status]')) {
      resolve();
      return;
    }
    let timer;
    const observer = new MutationObserver(() => {
      if (!document.querySelector('[data-status]')) {
        observer.disconnect();
        clearTimeout(timer);
        resolve();
      }
    });
    timer = setTimeout(() => {
      observer.disconnect();
      reject(new Error('Timed out waiting for the page to finish decorating'));
    }, DECORATION_TIMEOUT);
    observer.observe(document.body, {
      attributes: true,
      attributeFilter: ['data-status'],
      subtree: true,
    });
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
export async function handleCopyMarkdown(e) {
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
