import {
  loadStyle, loadArea, toClassName, getConfig, getMetadata, checkIms,
} from '../../scripts/ak.js';
import { getSvgRef } from '../../scripts/utils/svg.js';
import { SEARCH_EXPAND_EVENT } from '../../scripts/utils/nav-events.js';
import rovingTabindex, { isFocusable, focusableIn } from '../../scripts/utils/roving-tabindex.js';
import '../../deps/components/swc-tooltip/dist/index.js';
import { IMPLEMENTATIONS } from '../../scripts/utils/implementations.js';
import {
  isValidIndexRows,
  readPublicNavCache,
  removePublicNavCache,
  sameNavSource,
  writePublicNavCache,
} from './sitenav-cache.js';

const { log } = getConfig();

loadStyle(import.meta.url.replace('js', 'css'));

const DEF_SITE_NAV_PATH = '/fragments/nav/site-nav.plain.html';
const QUERY_INDEX_PATH = '/query-index.json?compact=true';
const ANONYMOUS_FRESH_INIT = { credentials: 'omit', cache: 'no-store' };
const DEF_SITE_NAME = 'Spectrum Hub';
const INDEX_BASED_NAV = [
  ...IMPLEMENTATIONS.map((impl) => ({ prefix: `/web/${impl.id}` })),
  // ios/android aren't in the implementations registry yet — see implementations.js.
  { prefix: '/mobile/ios' },
  { prefix: '/mobile/android' },
];
const createIndexBasedNavState = () => INDEX_BASED_NAV
  .map((entry) => ({ ...entry, count: 0 }));

// Authored labels and URL segments both normalize through this, so "React Spectrum",
// "RSP", and "design-only" all resolve to the same implementation.
const navSlug = (text) => text.trim().toLowerCase().replace(/\s+/g, '-');

const findImplementationByLabel = (text) => {
  const slug = navSlug(text);
  return IMPLEMENTATIONS.find((impl) => [impl.label, impl.shortLabel, impl.id]
    .some((name) => navSlug(name) === slug));
};

const level2SwapCleanups = new WeakMap();

const startLevel2Swap = (list, outgoingButton, incomingButton) => {
  level2SwapCleanups.get(list)?.();

  const outgoingMenu = document.getElementById(outgoingButton.getAttribute('aria-controls'));
  const incomingMenu = document.getElementById(incomingButton.getAttribute('aria-controls'));
  if (incomingMenu) {
    incomingMenu.inert = false;
    incomingMenu.classList.remove('is-hidden-after-switch');
  }

  if (!outgoingMenu?.firstElementChild
    || window.matchMedia('(prefers-reduced-motion: reduce)').matches) { return; }

  const outgoingContent = outgoingMenu.firstElementChild;
  outgoingMenu.inert = true;
  list.classList.add('is-switching-level-2');
  outgoingMenu.classList.add('is-switching-out');

  const cleanup = (event) => {
    if (event?.type === 'transitionend' && event.propertyName !== 'opacity') { return; }

    outgoingContent.removeEventListener('transitionend', cleanup);
    outgoingContent.removeEventListener('transitioncancel', cleanup);
    outgoingMenu.classList.add('is-hidden-after-switch');
    outgoingMenu.classList.remove('is-switching-out');
    list.classList.remove('is-switching-level-2');
    level2SwapCleanups.delete(list);
  };
  outgoingContent.addEventListener('transitionend', cleanup);
  outgoingContent.addEventListener('transitioncancel', cleanup);
  level2SwapCleanups.set(list, cleanup);
};

export const decorateLevel = (ul, depth, seenMenuIds = new Set()) => {
  ul.classList.add(`level-${depth}-list`);

  const listItems = [...ul.querySelectorAll(':scope > li')];
  listItems.forEach((li) => {
    li.classList.add(`level-${depth}`);

    const [heading, childList] = li.querySelectorAll(':scope > *');

    // Only items with a nested list get a toggle button;
    // leaf items keep their link as-is.
    if (!childList) { return; }

    const btn = document.createElement('button');
    btn.classList.add(`level-${depth}-button`);

    // List item text
    const labelText = heading.textContent;

    // Pull out icon
    const icon = heading.querySelector('.icon');
    if (icon) { btn.append(icon); }

    // Create a label
    const label = document.createElement('span');
    label.classList.add('list-item-label');
    label.textContent = labelText;

    // See if there's a link in heading
    const a = heading.querySelector('a');
    if (a) {
      li.prepend(a);
      li.classList.add('linked-list');
      // The link carries the visible label here
      btn.setAttribute('aria-label', labelText);
    } else {
      if (labelText === 'Components') {
        // Authors title the parent however reads best; the prefix always comes from
        // the implementation id, which is the URL segment.
        // A "Components" item authored first in its list has no sibling to read a
        // prefix from; without the guard the whole nav dies on the null.
        const prevLiText = li.previousElementSibling?.textContent;
        const impl = prevLiText ? findImplementationByLabel(prevLiText) : null;
        if (impl) {
          label.setAttribute('index-based-nav-prefix', `/web/${impl.id}`);
        }
      }

      btn.append(label);
    }

    // Depths 2 and 3 get a chevron for expanding
    if (depth === 2 || depth === 3) {
      const chevron = getSvgRef('chevronleft', 'icon', 10, '0 0 10 10');
      btn.append(chevron);
    }

    btn.addEventListener('click', () => {
      if (depth === 1) {
        const openSibling = listItems
          .map((item) => item.querySelector(':scope > button[aria-expanded="true"]'))
          .find(Boolean);
        const isOpen = btn.getAttribute('aria-expanded') === 'true';

        if (openSibling && openSibling !== btn && !isOpen) {
          startLevel2Swap(ul, openSibling, btn);
        } else {
          level2SwapCleanups.get(ul)?.();
          const menu = document.getElementById(btn.getAttribute('aria-controls'));
          if (menu) {
            menu.inert = false;
            menu.classList.remove('is-hidden-after-switch');
          }
        }

        listItems.forEach((item) => {
          if (item !== li) {
            item.querySelector(':scope > button')?.setAttribute('aria-expanded', false);
          }
        });
      }

      const isOpen = btn.getAttribute('aria-expanded') === 'true';
      btn.setAttribute('aria-expanded', String(!isOpen));
    });

    // "increments" any repetitive labelText id's
    let menuId = toClassName(labelText);
    for (let n = 2; seenMenuIds.has(menuId); n += 1) {
      menuId = `${toClassName(labelText)}-${n}`;
    }
    seenMenuIds.add(menuId);
    // Prefixed so a category name (e.g. "Typography") can't collide with an
    // unrelated id elsewhere on the page (e.g. a heading slugified the same way).
    const menuDomId = `sitenav-menu-${menuId}`;
    btn.setAttribute('aria-expanded', 'false');
    btn.setAttribute('aria-controls', menuDomId);

    // Only the first level gets a labeled menu wrapper;
    // deeper lists stay inline and the button controls the list itself.
    const menuWrapper = document.createElement('div');
    menuWrapper.classList.add(`level-${depth + 1}-menu`, 'can-expand');
    if (depth < 2) {
      menuWrapper.append(label.cloneNode(true));
    }
    menuWrapper.append(childList);
    menuWrapper.id = menuDomId;
    li.append(menuWrapper);

    decorateLevel(childList, depth + 1, seenMenuIds);

    heading.replaceWith(btn);

    // Stable id for the tooltip's `for` attribute — see syncLevel1Tooltips,
    // which adds/removes the tooltip itself based on whether the rail is
    // currently showing labels. Not created unconditionally here.
    if (depth === 1) {
      btn.id = `sitenav-level-1-tooltip-${toClassName(labelText)}`;
    }

    // Name the sublist after the control that discloses it, so it isn't announced as a
    // bare list. Set after the id above so it can reuse it. Goes on the <ul>, which has
    // an implicit role of list — aria-labelledby on the role-less wrapper is ignored.
    btn.id ||= `${menuId}-button`;
    childList.setAttribute('aria-labelledby', btn.id);
  });

  return ul;
};

// Remove nav links to pages the current visitor can't see. The worker filters
// query-index by audience (private rows dropped for anonymous visitors, kept for
// authenticated ones), so "path not present in the index" means "hide it" for
// exactly the right audience without a separate auth check here. Only leaf items
// are removed so a parent with visible children is never dropped; the page gate
// already 404s these paths, so this is purely to avoid dead links. Fail-open:
// with no index (fetch failed) nothing is hidden.
export const filterNavByIndex = (ul, index, {
  hostnames = getConfig().hostnames ?? [],
} = {}) => {
  if (!index) { return; }
  const known = new Set(index.map((entry) => entry.path));
  ul.querySelectorAll('a[href]').forEach((a) => {
    const authoredHref = a.getAttribute('href');
    const url = new URL(authoredHref, window.location.href);
    const isRootRelative = authoredHref.startsWith('/') && !authoredHref.startsWith('//');
    const isAbsolute = /^(?:[a-z][a-z\d+.-]*:)?\/\//i.test(authoredHref);
    const isKnownHost = url.hostname === window.location.hostname
      || hostnames.includes(url.hostname);
    if ((!isRootRelative && !(isAbsolute && isKnownHost)) || known.has(url.pathname)) { return; }
    const li = a.closest('li');
    // Skip parents: a list item that contains a nested list may hold visible
    // children even when its own link is private/unindexed.
    if (!li || li.querySelector('ul')) { return; }
    li.remove();
  });
};

const getUsableRootList = (container) => {
  const rootLists = [...container.querySelectorAll('ul')]
    .filter((list) => !list.parentElement.closest('ul'));
  if (rootLists.length !== 1 || !rootLists[0].querySelector(':scope > li')) { return null; }
  return rootLists[0];
};

const normalizeIconPlaceholders = (root) => {
  root.querySelectorAll('.icon').forEach((icon) => {
    const placeholder = document.createElement('span');
    placeholder.className = icon.getAttribute('class');
    icon.replaceWith(placeholder);
  });
};

const upgradeIconPlaceholders = (root) => {
  root.querySelectorAll('span.icon').forEach((icon) => {
    const sizeClass = [...icon.classList].find((name) => name.startsWith('icon-size-'));
    if (sizeClass) {
      const prefix = icon.parentElement.nodeName.startsWith('H') ? 'heading' : 'text';
      icon.parentElement.classList.add(sizeClass.replace('icon', prefix));
      icon.remove();
      return;
    }

    const nameClass = [...icon.classList]
      .find((name) => name.startsWith('icon-') && !name.startsWith('icon-size-'));
    if (!nameClass) {
      icon.remove();
      return;
    }
    icon.replaceWith(getSvgRef(nameClass.substring(5), icon.className));
  });
};

export const parseNavSource = async (html, index, {
  anonymous = true,
  cdnEnv = getConfig().cdnEnv,
  hostnames = getConfig().hostnames ?? [],
} = {}) => {
  const dom = new DOMParser().parseFromString(html, 'text/html');
  let ul;

  if (cdnEnv) {
    const area = dom.querySelector('main') ?? dom.body;
    area.querySelectorAll(anonymous ? '.audience-private' : '.audience-public')
      .forEach((el) => el.remove());
    ul = getUsableRootList(area);
    if (!ul) { return null; }
  } else {
    const area = document.createElement('main');
    area.append(...dom.body.childNodes);
    await loadArea({ area });
    ul = getUsableRootList(area)?.cloneNode(true);
    if (!ul) { return null; }
  }
  normalizeIconPlaceholders(ul);
  if (Array.isArray(index)) { filterNavByIndex(ul, index, { hostnames }); }

  return {
    filteredListHtml: ul.outerHTML,
    indexRows: index,
  };
};

const fetchText = async (path, init, fetchImpl = fetch) => {
  const response = await fetchImpl(path, init);
  if (!response.ok) { return null; }
  return response.text();
};

const fetchIndex = async (path, init, fetchImpl = fetch) => {
  const response = await fetchImpl(path, init);
  if (!response.ok) { return null; }
  const json = await response.json();
  return isValidIndexRows(json.data) ? json.data : null;
};

export const fetchNavSource = async ({
  anonymous,
  indexCacheEligible = anonymous,
  config = getConfig(),
  fetchImpl = fetch,
  fragmentPromise,
  requestInit,
} = {}) => {
  const [html, index] = await Promise.all([
    (fragmentPromise ?? fetchText(DEF_SITE_NAV_PATH, requestInit, fetchImpl)).catch((error) => {
      config.log?.('Could not fetch sitenav fragment', error);
      return null;
    }),
    fetchIndex(
      QUERY_INDEX_PATH,
      requestInit ?? (indexCacheEligible ? undefined : { cache: 'no-store' }),
      fetchImpl,
    ).catch((error) => {
      config.log?.('Could not fetch sitenav query index', error);
      return null;
    }),
  ]);
  if (html === null) { return null; }
  return parseNavSource(html, index, {
    anonymous,
    cdnEnv: config.cdnEnv,
    hostnames: config.hostnames,
  });
};

// filterNavByIndex only drops leaf links, never parents, so a parent whose
// children are all audience-filtered is left with an empty child list. After
// decorateLevel has wrapped that list, the parent renders an expand button whose
// flyout is empty (e.g. "Support" when its links aren't visible to this visitor).
// Remove any empty list along with the item that opened it (which takes its menu
// wrapper and toggle button too), so no dead expander is shown. Emptying an item
// can in turn empty its own parent's list, so we repeat until the tree is stable
// — pruning cascades up to any depth.
export const removeEmptyMenus = (navList) => {
  // navList itself (the root <ul>) is never matched by this descendant query,
  // so the top level is safe from removal.
  const pruneOnce = () => {
    let removed = 0;
    navList.querySelectorAll('ul').forEach((ul) => {
      if (ul.querySelector(':scope > li')) { return; }
      const li = ul.closest('li');
      if (li) {
        li.remove();
        removed += 1;
      }
    });
    return removed;
  };
  while (pruneOnce() > 0) { /* repeat until no more empty lists remain */ }
};

export const decorateIndexBasedNav = (navList, index, state = createIndexBasedNavState()) => {
  // Sorting the whole index up front
  // A titleless row would become <a href="..."></a> — a link with no accessible name.
  // The nav is index-driven, so bad data must not be able to produce one.
  const sortedIndex = index
    .filter((entry) => entry.title?.trim())
    .sort((a, b) => a.title.localeCompare(b.title));
  sortedIndex.forEach((entry) => {
    const parentPrefix = state.find((top) => entry.path.startsWith(`${top.prefix}/`));
    if (!parentPrefix) { return; }
    const parentLabel = navList.querySelector(`[index-based-nav-prefix^="${parentPrefix.prefix}"]`);
    if (!parentLabel) {
      return;
    }
    const parentLi = parentLabel.closest('li');
    if (!parentLi) {
      log(`Could not find a parent nav item for ${entry.path}`);
      return;
    }
    parentPrefix.label ??= parentLabel;
    parentPrefix.count += 1;

    const lvl3Ul = parentLi.querySelector('.level-3-list');
    if (!lvl3Ul) { return; }

    const firstLi = lvl3Ul.querySelector('li');
    if (firstLi.textContent === '[auto-generated]') {
      firstLi.remove();
    }

    const li = document.createElement('li');
    const a = document.createElement('a');
    a.href = entry.path;
    a.textContent = entry.title;
    li.append(a);

    lvl3Ul.append(li);
  });
  return state;
};

export const decorateBadges = (state) => {
  state.forEach((parentPrefix) => {
    if (!parentPrefix.count) { return; }
    const badge = document.createElement('span');
    badge.classList.add('count-badge');
    badge.textContent = parentPrefix.count;
    parentPrefix.label.after(badge);
  });
};

export const getSiteNav = () => {
  const template = getMetadata('template');

  const sitenav = document.createElement('div');
  sitenav.id = 'sitenav';

  if (template === 'marketing') {
    sitenav.toggleAttribute('is-expanded', true);
  }

  const nav = document.createElement('nav');
  nav.setAttribute('aria-label', DEF_SITE_NAME);

  sitenav.append(nav);

  return { sitenav, nav };
};

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
export const setupScrollMemory = (sitenav, { signal } = {}) => {
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
  }, { capture: true, signal });

  // Scrolling and clicking a link inside the debounce window would otherwise lose the
  // last move. pagehide rather than beforeunload, which would cost the bfcache.
  window.addEventListener('pagehide', flush, { signal });
  signal?.addEventListener('abort', () => {
    clearTimeout(timer);
    pending = null;
  }, { once: true });

  return { flush };
};

export const isMobileViewport = () => window.matchMedia('(width < 900px)').matches;

// Escape and clicking outside behave the same way
// regardless of how deep the sitenav is currently open.
export const closeSitenav = (sitenav) => {
  const level1List = sitenav.querySelector('.level-1-list');
  level2SwapCleanups.get(level1List)?.();
  sitenav.querySelector('.level-1-button[aria-expanded="true"]')
    ?.setAttribute('aria-expanded', 'false');
  sitenav.removeAttribute('is-open');
  sitenav.querySelector('.sitenav-trigger-btn')?.setAttribute('aria-expanded', 'false');
};

const getFocusableEls = (container) => [...container.querySelectorAll(
  'a[href], button:not([disabled]), [tabindex]',
)].filter((el) => !el.closest('[inert]') && isFocusable(el) && el.tabIndex > -1);

const isToggle = (el) => el.tagName === 'BUTTON' && el.hasAttribute('aria-expanded');
const isOpen = (btn) => btn.getAttribute('aria-expanded') === 'true';
const menuOf = (btn) => document.getElementById(btn.getAttribute('aria-controls'));
// decorateLevel appends each flyout to the <li> whose button opens it, so the parent
// control is that <li>'s own direct-child button.
const parentToggleOf = (el) => el
  .closest('.level-2-menu, .level-3-menu, .level-4-menu')
  ?.parentElement.querySelector(':scope > button');

// Level-1 buttons stay ordinary tab stops — there are only a handful and they are the
// primary nav. The flyouts are the long part (up to ~90 links), so each becomes a single
// tab stop walked with arrows: Up/Down over what's on screen, Right to open a nested menu
// then step in, Left to close it or go back out to the level-1 button.
// Scoped to the rail, not the list: below 900px the list is display:none until the
// trigger opens it, so the group starts empty and has to re-sync on that click.
export const setupRovingTabindex = (sitenav, navList, { signal } = {}) => rovingTabindex(sitenav, {
  // Only what's inside the open flyout. focusableIn already drops the hidden ones, and
  // level-1 buttons are siblings of .level-2-menu rather than descendants, so they are
  // never members and keep their natural tabindex.
  items: () => focusableIn(navList).filter((el) => {
    const menu = el.closest('.level-2-menu');
    return menu && !menu.inert;
  }),
  // Landing on "you are here" beats landing on the top of the tree.
  initial: (list) => list.find((el) => el.classList.contains('is-current-page')) ?? list[0],
  keys: {
    ArrowRight: (el, list) => {
      if (!isToggle(el)) { return false; }
      if (!isOpen(el)) {
        // Reuses the button's own handler, which also collapses its siblings.
        el.click();
        return true;
      }
      const menu = menuOf(el);
      return list.find((item) => menu?.contains(item)) ?? true;
    },
    ArrowLeft: (el) => {
      if (isToggle(el) && isOpen(el)) {
        el.click();
        return true;
      }
      return parentToggleOf(el) ?? false;
    },
  },
  signal,
});

// Level-1 buttons only need a tooltip while the rail is collapsed
export const syncLevel1Tooltips = (sitenav) => {
  const isExpanded = sitenav.hasAttribute('is-expanded');

  sitenav.querySelectorAll('.level-1-button').forEach((btn) => {
    const li = btn.closest('li');
    const existingTooltip = li.querySelector('swc-tooltip');

    if (isExpanded) {
      existingTooltip?.remove();
      return;
    }

    if (existingTooltip) { return; }

    const labelText = btn.querySelector('.list-item-label')?.textContent
      ?? btn.getAttribute('aria-label')
      ?? '';
    const tooltip = document.createElement('swc-tooltip');
    tooltip.setAttribute('for', btn.id);
    tooltip.setAttribute('placement', 'end');
    tooltip.setAttribute('delay', '200');
    tooltip.textContent = labelText;
    // swc-tooltip doesn't need DOM adjacency to its trigger — it positions via the Popover API
    // using the for/id link
    li.append(tooltip);
  });
};

// The tooltip text is the single source of truth for this button's accessible
// name too — aria-label is kept in sync rather than duplicating the copy.
const EXPAND_BTN_LABELS = { expanded: 'Collapse navigation', collapsed: 'Expand navigation' };

export const getExpandButton = (sitenav) => {
  const btn = document.createElement('button');
  btn.id = 'sitenav-expand-btn';
  btn.classList.add('sitenav-expand-btn');
  btn.setAttribute('aria-expanded', String(sitenav.hasAttribute('is-expanded')));
  btn.setAttribute('aria-controls', sitenav.id);

  btn.append(getSvgRef('expandright', 'icon', 20));

  const tooltip = document.createElement('swc-tooltip');
  tooltip.setAttribute('for', btn.id);
  tooltip.setAttribute('placement', 'end');
  tooltip.setAttribute('delay', '200');
  sitenav.append(tooltip);

  const syncLabel = () => {
    const label = sitenav.hasAttribute('is-expanded')
      ? EXPAND_BTN_LABELS.expanded
      : EXPAND_BTN_LABELS.collapsed;
    btn.setAttribute('aria-label', label);
    tooltip.textContent = label;
  };
  syncLabel();

  btn.addEventListener('click', () => {
    const isExpanded = sitenav.toggleAttribute('is-expanded');
    btn.setAttribute('aria-expanded', String(isExpanded));
    syncLabel();
    syncLevel1Tooltips(sitenav);
  });

  return btn;
};

// Mobile-only: sitenav-expand-btn is hidden below 900px (see CSS), and this
// fixed, viewport-pinned trigger takes its place.
export const getTriggerButton = (sitenav) => {
  const btn = document.createElement('button');
  btn.classList.add('sitenav-trigger-btn');
  btn.setAttribute('aria-label', 'Toggle site navigation');
  btn.setAttribute('aria-expanded', 'false');
  btn.setAttribute('aria-controls', sitenav.id);

  btn.append(getSvgRef('appsall', 'icon', 20));

  btn.addEventListener('click', () => {
    if (sitenav.hasAttribute('is-open')) {
      closeSitenav(sitenav);
    } else {
      sitenav.setAttribute('is-open', '');
      btn.setAttribute('aria-expanded', 'true');
    }
  });

  return btn;
};

export const buildSitenav = (source) => {
  const dom = new DOMParser().parseFromString(source.filteredListHtml, 'text/html');
  const ul = getUsableRootList(dom.body);
  if (!ul) { return null; }

  upgradeIconPlaceholders(ul);
  const { sitenav, nav } = getSiteNav();
  const navList = decorateLevel(ul, 1);
  removeEmptyMenus(navList);

  const indexNavState = createIndexBasedNavState();
  if (Array.isArray(source.indexRows)) {
    decorateIndexBasedNav(navList, source.indexRows, indexNavState);
  }
  decorateBadges(indexNavState);
  const currentLink = findCurrentPageInNav(navList);

  const expandBtn = getExpandButton(sitenav);
  const triggerBtn = getTriggerButton(sitenav);
  nav.append(navList, expandBtn);
  sitenav.append(triggerBtn);
  return {
    sitenav,
    navList,
    currentLink,
    buttons: [expandBtn, triggerBtn],
  };
};

// On small screens, tapping/clicking anywhere outside the fixed overlay
// closes it — the desktop rail has no such dismiss affordance since it's
// in-flow rather than floating over the rest of the page.
export const setupOutsideClose = (sitenav, { signal } = {}) => {
  document.addEventListener('click', (e) => {
    if (!sitenav.hasAttribute('is-open')) { return; }
    if (!isMobileViewport()) { return; }
    if (sitenav.contains(e.target)) { return; }

    closeSitenav(sitenav);
  }, { signal });
};

// Reuses the level-1 button's own click handler (built in decorateLevel)
// rather than duplicating its sibling-collapsing logic here.
export const setupSearchIntegration = (navList, { signal } = {}) => {
  document.addEventListener(SEARCH_EXPAND_EVENT, (e) => {
    const menuId = toClassName(e.detail.label);
    navList.querySelector(`.level-1-button[aria-controls="sitenav-menu-${menuId}"]`)?.click();
  }, { signal });
};

// Escape and clicking outside behave the same way regardless of which button
// (expand or trigger) opened the sitenav.
export const setupSitenavKeyboardHandling = (sitenav, buttons, { signal } = {}) => {
  document.addEventListener('keydown', (e) => {
    if (!sitenav.hasAttribute('is-open')) { return; }

    // Escape always closes, regardless of viewport — matches the disclosure
    // pattern used throughout the rest of the sitenav (level-1/2/3 buttons).
    if (e.key === 'Escape') {
      closeSitenav(sitenav);
      buttons.find((btn) => btn.checkVisibility())?.focus();
      return;
    }

    // Loop focus within the fixed mobile overlay so Tab/Shift+Tab never
    // escapes to the rest of the page while it's open.
    if (e.key === 'Tab' && isMobileViewport()) {
      const focusable = getFocusableEls(sitenav);
      if (!focusable.length) { return; }
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    }
  }, { signal });
};

const controlledMenu = (sitenav, button) => {
  const id = button?.getAttribute('aria-controls');
  if (!id) { return null; }
  return [...sitenav.querySelectorAll('[id]')].find((el) => el.id === id) ?? null;
};

const isUsableDisclosure = (sitenav, button) => {
  const menu = controlledMenu(sitenav, button);
  return menu && menu.querySelector('a[href], button');
};

const focusIdentity = (el) => {
  if (!el) { return null; }
  if (el.classList.contains('sitenav-trigger-btn')) { return { type: 'trigger' }; }
  if (el.classList.contains('sitenav-expand-btn')) { return { type: 'expand' }; }
  if (el.id) { return { type: 'id', value: el.id }; }
  if (el.matches('a[href]')) { return { type: 'href', value: el.getAttribute('href') }; }
  const controls = el.getAttribute('aria-controls');
  if (controls) { return { type: 'controls', value: controls }; }
  return null;
};

const findByIdentity = (sitenav, identity) => {
  if (!identity) { return null; }
  if (identity.type === 'trigger') {
    return sitenav.querySelector('.sitenav-trigger-btn');
  }
  if (identity.type === 'expand') {
    return sitenav.querySelector('.sitenav-expand-btn');
  }
  if (identity.type === 'id') {
    return [...sitenav.querySelectorAll('[id]')]
      .find((el) => el.id === identity.value) ?? null;
  }
  if (identity.type === 'href') {
    return [...sitenav.querySelectorAll('a[href]')]
      .find((el) => el.getAttribute('href') === identity.value) ?? null;
  }
  if (identity.type === 'controls') {
    return [...sitenav.querySelectorAll('[aria-controls]')]
      .find((el) => el.getAttribute('aria-controls') === identity.value) ?? null;
  }
  return null;
};

const captureUiState = (built) => {
  const focused = built.sitenav.contains(document.activeElement) ? document.activeElement : null;
  const parentDisclosures = [];
  let item = focused?.closest('li');
  while (item && built.sitenav.contains(item)) {
    const button = item.querySelector(':scope > button[aria-controls]');
    if (button) { parentDisclosures.push(focusIdentity(button)); }
    item = item.parentElement?.closest('li');
  }

  return {
    expanded: built.sitenav.hasAttribute('is-expanded'),
    open: built.sitenav.hasAttribute('is-open'),
    disclosures: [...built.navList.querySelectorAll('button[aria-controls]')]
      .map((button) => ({
        identity: focusIdentity(button),
        expanded: button.getAttribute('aria-expanded'),
      })),
    focus: focusIdentity(focused),
    parentDisclosures,
  };
};

const restoreExpandedState = (built, expanded) => {
  built.sitenav.toggleAttribute('is-expanded', expanded);
  const expandButton = built.sitenav.querySelector('.sitenav-expand-btn');
  if (!expandButton) { return; }
  const label = expanded ? EXPAND_BTN_LABELS.expanded : EXPAND_BTN_LABELS.collapsed;
  expandButton.setAttribute('aria-expanded', String(expanded));
  expandButton.setAttribute('aria-label', label);
  built.sitenav.querySelector(`swc-tooltip[for="${expandButton.id}"]`)?.replaceChildren(label);
  syncLevel1Tooltips(built.sitenav);
};

const openAncestorDisclosures = (sitenav, el) => {
  const ancestors = [];
  let item = el.closest('li');
  while (item && sitenav.contains(item)) {
    const button = item.querySelector(':scope > button[aria-controls]');
    if (button && button !== el) { ancestors.push(button); }
    item = item.parentElement?.closest('li');
  }
  ancestors.reverse().forEach((button) => {
    if (!isOpen(button) && isUsableDisclosure(sitenav, button)) { button.click(); }
  });
};

const restoreUiState = (built, state) => {
  restoreExpandedState(built, state.expanded);

  state.disclosures.forEach(({ identity, expanded }) => {
    const button = findByIdentity(built.sitenav, identity);
    if (isUsableDisclosure(built.sitenav, button)) {
      button.setAttribute('aria-expanded', expanded);
    }
  });

  built.sitenav.toggleAttribute('is-open', state.open);
  built.sitenav.querySelector('.sitenav-trigger-btn')
    ?.setAttribute('aria-expanded', String(state.open));

  if (!state.focus) { return; }
  const exact = findByIdentity(built.sitenav, state.focus);
  if (exact) {
    openAncestorDisclosures(built.sitenav, exact);
    exact.focus();
    if (document.activeElement === exact) { return; }
  }
  const parent = state.parentDisclosures
    .map((identity) => findByIdentity(built.sitenav, identity))
    .find((button) => isUsableDisclosure(built.sitenav, button));
  if (parent) {
    parent.focus();
    if (document.activeElement === parent) { return; }
  }
  const fallback = built.buttons.find((button) => button.checkVisibility({
    visibilityProperty: true,
  })) ?? built.buttons[0] ?? built.buttons[1];
  fallback?.focus();
};

const restoreActiveScroll = (built) => {
  if (!restoreMenuScroll(built.currentLink)) {
    built.currentLink?.scrollIntoView({ block: 'nearest' });
  }
};

export const createSitenavController = (main) => {
  let activeEntry = null;

  const activate = (built, { syncTooltips = true } = {}) => {
    const abortController = new AbortController();
    const { signal } = abortController;
    setupSitenavKeyboardHandling(built.sitenav, built.buttons, { signal });
    setupOutsideClose(built.sitenav, { signal });
    setupSearchIntegration(built.navList, { signal });
    if (syncTooltips) { syncLevel1Tooltips(built.sitenav); }
    const roving = setupRovingTabindex(built.sitenav, built.navList, { signal });
    const scrollMemory = setupScrollMemory(built.sitenav, { signal });
    return {
      built, abortController, roving, scrollMemory,
    };
  };

  const controller = {
    mount(built) {
      if (activeEntry) { return controller.replace(built); }
      main.before(built.sitenav);
      activeEntry = activate(built);
      restoreActiveScroll(built);
      return built;
    },
    replace(built) {
      if (!activeEntry) { return controller.mount(built); }
      const state = captureUiState(activeEntry.built);
      activeEntry.scrollMemory.flush();
      activeEntry.abortController.abort();
      activeEntry.built.sitenav.replaceWith(built.sitenav);
      activeEntry = activate(built, { syncTooltips: false });
      restoreUiState(built, state);
      activeEntry.roving.sync();
      restoreActiveScroll(built);
      return built;
    },
    get active() {
      return activeEntry?.built ?? null;
    },
  };

  return controller;
};

export const initSitenav = async ({
  config = getConfig(),
  storage,
  fetchImpl = fetch,
  checkSession = checkIms,
  now = Date.now(),
  build = buildSitenav,
} = {}) => {
  const main = document.querySelector('main');
  if (!main) { return null; }
  const controller = createSitenavController(main);
  let activeSource = null;
  let activePriority = 0;
  let resolvedStorage = null;

  const mountBuilt = (built, source, priority) => {
    if (!built || priority < activePriority) { return false; }
    if (activeSource && sameNavSource(activeSource, source)) {
      activePriority = priority;
      activeSource = source;
      return true;
    }
    if (controller.active) {
      controller.replace(built);
    } else {
      controller.mount(built);
    }
    activePriority = priority;
    activeSource = source;
    return true;
  };

  const sessionPromise = Promise.resolve().then(() => checkSession());
  const fragmentPromise = fetchText(DEF_SITE_NAV_PATH, undefined, fetchImpl).catch((error) => {
    config.log?.('Could not fetch sitenav fragment', error);
    return null;
  });
  const cachedTask = (async () => {
    if (!config.cdnEnv) { return false; }
    resolvedStorage = storage;
    if (resolvedStorage === undefined) {
      try {
        resolvedStorage = globalThis.localStorage;
      } catch {
        resolvedStorage = null;
      }
    }
    const cachedSource = readPublicNavCache({ storage: resolvedStorage, now });
    if (!cachedSource) { return false; }
    const cachedBuilt = await build(cachedSource);
    if (!cachedBuilt) {
      removePublicNavCache(resolvedStorage);
      config.log?.('Could not build cached sitenav');
      return false;
    }
    return mountBuilt(cachedBuilt, cachedSource, 1);
  })();

  // The curated nav fragment is public and starts independently of IMS. The
  // query index waits for IMS because its browser-cache policy is audience
  // dependent. Both are root-relative so they hit this origin's worker, which
  // audience-filters the index and honours ?compact=true (projecting to the
  // path/title columns the nav needs, ~90% smaller).
  //
  // The anonymous index is cacheable (public, max-age) and the browser HTTP
  // cache is cookie-blind, so a signed-in viewer must bypass it - otherwise it
  // reuses the cached anonymous index and shows no private items until the TTL
  // lapses. Anonymous viewers keep the cache (nothing private to miss).
  let audienceAnonymous = true;
  let indexCacheEligible = false;
  let persistenceEligible = false;
  let sessionFailed = false;
  try {
    const session = await sessionPromise;
    audienceAnonymous = session.anonymous;
    indexCacheEligible = session.anonymous;
    persistenceEligible = true;
  } catch (error) {
    sessionFailed = true;
    config.log?.('Could not check IMS session', error);
  }
  const source = await fetchNavSource({
    anonymous: audienceAnonymous,
    indexCacheEligible,
    config,
    fetchImpl,
    fragmentPromise: sessionFailed ? undefined : fragmentPromise,
    requestInit: sessionFailed ? ANONYMOUS_FRESH_INIT : undefined,
  });
  if (!source || source.indexRows === null) {
    await cachedTask;
    if (!source || controller.active || sessionFailed) { return controller.active; }
  }

  const built = await build(source);
  if (!built) {
    await cachedTask;
    return controller.active;
  }
  mountBuilt(built, source, 2);

  if (config.cdnEnv) {
    writePublicNavCache(source, {
      storage: resolvedStorage,
      now,
      enabled: persistenceEligible,
      anonymous: audienceAnonymous,
    });
  }
  await cachedTask;
  return controller.active;
};

initSitenav().catch((error) => {
  getConfig().log?.('Could not initialize sitenav', error);
});
