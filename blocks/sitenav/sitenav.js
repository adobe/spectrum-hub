import { loadStyle, loadArea, toClassName, getConfig } from '../../scripts/ak.js';
import { getSvgRef, fetchSvgEl } from '../../scripts/utils/svg.js';
import { SEARCH_EXPAND_EVENT } from '../../scripts/utils/nav-events.js';
import '../../deps/components/swc-tooltip/dist/index.js';

const { log } = getConfig();

loadStyle(import.meta.url.replace('js', 'css'));

const DEF_SITE_NAV_PATH = '/fragments/nav/site-nav';
const DEF_SITE_NAME = 'Spectrum Hub';
const INDEX_BASED_PARENT_NAMES = ['rsp', 'swc', 'design-only'];
const INDEX_BASED_NAV = [
  { prefix: '/web/rsp', count: 0 },
  { prefix: '/web/swc', count: 0 },
  { prefix: '/web/design-only', count: 0 },
  { prefix: '/mobile/ios', count: 0 },
  { prefix: '/mobile/android', count: 0 },
];

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
        // Normalized to match a URL segment (e.g. "Design only" -> "design-only") so nav
        // content can use natural spacing rather than being authored pre-hyphenated.
        const prevLiLabel = li.previousElementSibling.textContent.trim().toLowerCase().replace(/\s+/g, '-');
        if (INDEX_BASED_PARENT_NAMES.some((name) => name === prevLiLabel)) {
          label.setAttribute('index-based-nav-prefix', `/web/${prevLiLabel}`);
        }
      }

      btn.append(label);
    }

    // Depth 2 gets a chevron for expanding
    if (depth === 2) {
      const chevron = getSvgRef('chevronleft', 'icon', 10, '0 0 10 10');
      btn.append(chevron);
    }

    btn.addEventListener('click', () => {
      if (depth === 1) {
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
    btn.setAttribute('aria-expanded', 'false');
    btn.setAttribute('aria-controls', menuId);

    // Only the first level gets a labeled menu wrapper;
    // deeper lists stay inline and the button controls the list itself.
    const menuWrapper = document.createElement('div');
    menuWrapper.classList.add(`level-${depth + 1}-menu`, 'can-expand');
    if (depth < 2) {
      menuWrapper.append(label.cloneNode(true));
    }
    menuWrapper.append(childList);
    menuWrapper.id = menuId;
    li.append(menuWrapper);

    decorateLevel(childList, depth + 1, seenMenuIds);

    heading.replaceWith(btn);

    // Stable id for the tooltip's `for` attribute — see syncLevel1Tooltips,
    // which adds/removes the tooltip itself based on whether the rail is
    // currently showing labels. Not created unconditionally here.
    if (depth === 1) {
      btn.id = `sitenav-level-1-tooltip-${toClassName(labelText)}`;
    }
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
export const filterNavByIndex = (ul, index) => {
  if (!index) { return; }
  const known = new Set(index.map((entry) => entry.path));
  ul.querySelectorAll('a[href^="/"]').forEach((a) => {
    if (known.has(a.pathname)) { return; }
    const li = a.closest('li');
    // Skip parents: a list item that contains a nested list may hold visible
    // children even when its own link is private/unindexed.
    if (!li || li.querySelector('ul')) { return; }
    log(`sitenav: hiding ${a.pathname} (not in query-index for this audience)`);
    li.remove();
  });
};

export const decorateIndexBasedNav = (navList, index) => {
  // Sorting the whole index up front
  const sortedIndex = [...index].sort((a, b) => a.title.localeCompare(b.title));
  sortedIndex.forEach((entry) => {
    const parentPrefix = INDEX_BASED_NAV.find((top) => entry.path.startsWith(`${top.prefix}/`));
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
};

export const decorateBadges = () => {
  INDEX_BASED_NAV.forEach((parentPrefix) => {
    if (!parentPrefix.count) { return; }
    const badge = document.createElement('span');
    badge.classList.add('count-badge');
    badge.textContent = parentPrefix.count;
    parentPrefix.label.after(badge);
  });
};

const fetchRes = async (path) => {
  const resp = await fetch(path);
  if (!resp.ok) { return null; }
  if (path.includes('.json')) {
    const json = await resp.json();
    return json.data;
  }
  const html = await resp.text();
  const dom = new DOMParser().parseFromString(html, 'text/html');
  const main = dom.querySelector('main');
  await loadArea({ area: main });
  return dom.querySelector('ul') ?? document.createElement('ul');
};

export const getSiteNav = () => {
  const sitenav = document.createElement('div');
  sitenav.id = 'sitenav';
  sitenav.setAttribute('is-expanded', '');

  const nav = document.createElement('nav');
  nav.setAttribute('aria-label', DEF_SITE_NAME);

  sitenav.append(nav);

  return { sitenav, nav };
};

const findCurrentPageInNav = (navList) => {
  const { pathname } = window.location;
  const currentLink = [...navList.querySelectorAll('a')]
    .find((a) => a.pathname === pathname);
  if (!currentLink) { return null; }
  currentLink.classList.add('is-current-page');

  [1, 2].forEach((level) => {
    const li = currentLink.closest(`.level-${level}`);
    if (!li) { return; }
    const button = li.querySelector(`.level-${level}-button`);
    if (!button) { return; }
    button.setAttribute('aria-expanded', true);
  });

  return currentLink;
};

export const isMobileViewport = () => window.matchMedia('(width < 900px)').matches;

// Escape and clicking outside behave the same way
// regardless of how deep the sitenav is currently open.
export const closeSitenav = (sitenav) => {
  sitenav.querySelector('.level-1-button[aria-expanded="true"]')
    ?.setAttribute('aria-expanded', 'false');
  sitenav.removeAttribute('is-open');
  sitenav.querySelector('.sitenav-trigger-btn')?.setAttribute('aria-expanded', 'false');
};

const getFocusableEls = (container) => [...container.querySelectorAll(
  'a[href], button:not([disabled]), [tabindex]:not([tabindex="-1"])',
)].filter((el) => el.checkVisibility());

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

export const getExpandButton = async (sitenav) => {
  const btn = document.createElement('button');
  btn.id = 'sitenav-expand-btn';
  btn.classList.add('sitenav-expand-btn');
  btn.setAttribute('aria-expanded', String(sitenav.hasAttribute('is-expanded')));
  btn.setAttribute('aria-controls', sitenav.id);

  const svg = await fetchSvgEl('/img/icons/s2-icon-expandright-20-n.svg');
  btn.append(svg);

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
export const getTriggerButton = async (sitenav) => {
  const btn = document.createElement('button');
  btn.classList.add('sitenav-trigger-btn');
  btn.setAttribute('aria-label', 'Toggle site navigation');
  btn.setAttribute('aria-expanded', 'false');
  btn.setAttribute('aria-controls', sitenav.id);

  const svg = await fetchSvgEl('/img/icons/s2-icon-appsall-20-n.svg');
  btn.append(svg);

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

// On small screens, tapping/clicking anywhere outside the fixed overlay
// closes it — the desktop rail has no such dismiss affordance since it's
// in-flow rather than floating over the rest of the page.
export const setupOutsideClose = (sitenav) => {
  document.addEventListener('click', (e) => {
    if (!sitenav.hasAttribute('is-open')) { return; }
    if (!isMobileViewport()) { return; }
    if (sitenav.contains(e.target)) { return; }

    closeSitenav(sitenav);
  });
};

// Reuses the level-1 button's own click handler (built in decorateLevel)
// rather than duplicating its sibling-collapsing logic here.
export const setupSearchIntegration = (navList) => {
  document.addEventListener(SEARCH_EXPAND_EVENT, (e) => {
    const menuId = toClassName(e.detail.label);
    navList.querySelector(`.level-1-button[aria-controls="${menuId}"]`)?.click();
  });
};

// Escape and clicking outside behave the same way regardless of which button
// (expand or trigger) opened the sitenav.
export const setupSitenavKeyboardHandling = (sitenav, buttons) => {
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
  });
};

(async () => {
  // Build the nav element
  const { sitenav, nav } = getSiteNav();

  // Fetch the curated nav fragment and the query index in parallel. Both are
  // root-relative so they hit this origin's worker, which audience-filters the
  // index and honours ?compact=true (projecting to the path/title columns the
  // nav needs, ~90% smaller).
  const [ul, index] = await Promise.all([
    fetchRes(DEF_SITE_NAV_PATH),
    fetchRes('/query-index.json?compact=true'),
  ]);
  if (!ul) { return; }

  // Drop links to pages this visitor can't see before decorating the tree.
  filterNavByIndex(ul, index);

  const navList = decorateLevel(ul, 1);

  // Build the desktop expand button and its mobile trigger-button counterpart
  const expandBtn = await getExpandButton(sitenav);
  const triggerBtn = await getTriggerButton(sitenav);
  setupSitenavKeyboardHandling(sitenav, [expandBtn, triggerBtn]);
  setupOutsideClose(sitenav);
  setupSearchIntegration(navList);

  // Stitch index-based nav post DOM injection (reuses the index fetched above)
  if (index) { decorateIndexBasedNav(navList, index); }

  // decorate the badge counts
  decorateBadges();

  // Find current page
  const currentLink = findCurrentPageInNav(navList);

  // Append it all. triggerBtn is a sibling of nav (not nested inside it) so
  // that hiding nav below 900px doesn't take the mobile trigger down with it.
  nav.append(navList, expandBtn);
  sitenav.append(triggerBtn);

  // Seed level-1 tooltips for the rail's default (collapsed) state
  syncLevel1Tooltips(sitenav);

  const main = document.querySelector('main');
  if (!main) { return; }
  main.before(sitenav);

  // Scroll the level-2 flyout (the only scrollable nav container) so the
  // current page is visible, rather than always starting at the top.
  currentLink?.scrollIntoView({ block: 'nearest' });
})();
