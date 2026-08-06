import { loadStyle, loadArea, toClassName, getConfig } from '../../scripts/ak.js';
import { loadIms } from '../../scripts/utils/ims.js';
import { getSvgRef, fetchSvgEl } from '../../scripts/utils/svg.js';
import { SEARCH_EXPAND_EVENT } from '../../scripts/utils/nav-events.js';

const { codeBase, log, cdnEnv } = getConfig();

loadStyle(import.meta.url.replace('js', 'css'));

const DEF_SITE_NAV_PATH = '/fragments/nav/site-nav';
const DEF_SITE_NAME = 'Spectrum Hub';
const INDEX_BASED_PARENT_NAMES = ['rsp', 'swc'];
const INDEX_BASED_NAV = [
  { prefix: '/web/rsp', count: 0 },
  { prefix: '/web/swc', count: 0 },
  { prefix: '/mobile/ios', count: 0 },
  { prefix: '/mobile/android', count: 0 },
];

export const decorateLevel = (ul, depth) => {
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
        const prevLiLabel = li.previousElementSibling.textContent.trim().toLowerCase();
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

    const menuId = toClassName(labelText);
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

    decorateLevel(childList, depth + 1);

    heading.replaceWith(btn);
  });

  return ul;
};

const decorateIndexBasedNav = (navList, index) => {
  index.forEach((entry) => {
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

const decorateBadges = () => {
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

export const getExpandButton = async (sitenav) => {
  const btn = document.createElement('button');
  btn.classList.add('sitenav-expand-btn');
  btn.setAttribute('aria-label', 'Toggle site navigation');
  btn.setAttribute('aria-expanded', 'false');
  btn.setAttribute('aria-controls', sitenav.id);

  const svg = await fetchSvgEl('/img/icons/s2-icon-expandright-20-n.svg');
  btn.append(svg);

  btn.addEventListener('click', () => {
    const isExpanded = sitenav.toggleAttribute('is-expanded');
    btn.setAttribute('aria-expanded', String(isExpanded));
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
  // Only check IMS on CDN.
  if (cdnEnv) {
    const ims = await loadIms();
    if (ims.anonymous) { return; }
  }

  // Build the nav element
  const { sitenav, nav } = getSiteNav();

  // Fetch and decorate the currated nav list
  const ul = await fetchRes(DEF_SITE_NAV_PATH);
  if (!ul) { return; }
  const navList = decorateLevel(ul, 1);

  // Build the desktop expand button and its mobile trigger-button counterpart
  const expandBtn = await getExpandButton(sitenav);
  const triggerBtn = await getTriggerButton(sitenav);
  setupSitenavKeyboardHandling(sitenav, [expandBtn, triggerBtn]);
  setupOutsideClose(sitenav);
  setupSearchIntegration(navList);

  // Stitch index-based nav post DOM injection
  const index = await fetchRes(`${codeBase}/query-index.json`);
  if (index) { decorateIndexBasedNav(navList, index); }

  // decorate the badge counts
  decorateBadges();

  // Find current page
  const currentLink = findCurrentPageInNav(navList);

  // Append it all. triggerBtn is a sibling of nav (not nested inside it) so
  // that hiding nav below 900px doesn't take the mobile trigger down with it.
  nav.append(navList, expandBtn);
  sitenav.append(triggerBtn);
  const main = document.querySelector('main');
  if (!main) { return; }
  main.before(sitenav);

  // Scroll the level-2 flyout (the only scrollable nav container) so the
  // current page is visible, rather than always starting at the top.
  currentLink?.scrollIntoView({ block: 'nearest' });
})();
