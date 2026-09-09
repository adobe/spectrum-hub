/*
 * Current-page + scroll-memory helpers for the sitenav rail.
 *
 * These are pure of the rail's DOM-construction code (they only read
 * window.location / sessionStorage and operate on an already-built nav tree), so
 * they can be imported synchronously by scripts.js to hydrate a cached rail at
 * first paint WITHOUT triggering the sitenav.js build IIFE. sitenav.js re-exports
 * them so existing importers (and tests) keep their import path.
 */

export const findCurrentPageInNav = (navList) => {
  const { pathname } = window.location;
  const currentLink = [...navList.querySelectorAll('a')]
    .find((a) => a.pathname === pathname);
  if (!currentLink) { return null; }
  currentLink.classList.add('is-current-page');
  // Weight and the colour bar convey this visually; aria-current carries it to AT.
  currentLink.setAttribute('aria-current', 'page');

  [1, 2, 3].forEach((level) => {
    const li = currentLink.closest(`.level-${level}`);
    if (!li) { return; }
    const button = li.querySelector(`.level-${level}-button`);
    if (!button) { return; }
    button.setAttribute('aria-expanded', true);
  });

  return currentLink;
};

const SCROLL_KEY = 'sitenav-scroll';
const SCROLL_SAVE_DELAY = 150;

// sessionStorage throws outright in Safari's private mode, so neither side may assume it.
const readScroll = () => {
  try {
    return JSON.parse(sessionStorage.getItem(SCROLL_KEY) ?? 'null');
  } catch {
    return null;
  }
};

const writeScroll = (id, top) => {
  try {
    sessionStorage.setItem(SCROLL_KEY, JSON.stringify({ id, top }));
  } catch {
    // No memory this session; the scrollIntoView fallback still shows the current page.
  }
};

// Puts the flyout back where the reader left it instead of snapping to the top. Only for
// the same flyout, and only if the current page is still on screen at that offset —
// otherwise a jump to a distant section would restore a position that hides it, which is
// worse than starting from the top. Returns whether it took, so the caller can fall back.
export const restoreMenuScroll = (currentLink) => {
  const menu = currentLink?.closest('.level-2-menu');
  const saved = readScroll();
  if (!menu || !saved || saved.id !== menu.id) { return false; }

  menu.scrollTop = saved.top;
  const menuBox = menu.getBoundingClientRect();
  const linkBox = currentLink.getBoundingClientRect();
  // Deliberately not undone on a miss: the caller's scrollIntoView corrects from here,
  // and resetting to 0 would echo back through the scroll listener and clobber the save.
  return linkBox.top >= menuBox.top && linkBox.bottom <= menuBox.bottom;
};

// scroll doesn't bubble, so this listens in the capture phase rather than per flyout.
// Trailing-edge only: a scroll fires dozens of events and each save is a synchronous
// serialise plus write.
export const setupScrollMemory = (sitenav) => {
  let timer;
  let pending;

  const flush = () => {
    if (!pending) { return; }
    clearTimeout(timer);
    writeScroll(pending.id, pending.top);
    pending = null;
  };

  sitenav.addEventListener('scroll', ({ target }) => {
    if (!target?.classList?.contains('level-2-menu') || !target.id) { return; }
    pending = { id: target.id, top: target.scrollTop };
    clearTimeout(timer);
    timer = setTimeout(flush, SCROLL_SAVE_DELAY);
  }, true);

  // Scrolling and clicking a link inside the debounce window would otherwise lose the
  // last move. pagehide rather than beforeunload, which would cost the bfcache.
  window.addEventListener('pagehide', flush);
};
