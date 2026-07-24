import { loadStyle, loadArea, toClassName, getConfig } from '../../scripts/ak.js';
import { getSvgRef, fetchSvgEl } from '../../scripts/utils/svg.js';

const { codeBase, log } = getConfig();

loadStyle(import.meta.url.replace('js', 'css'));

const DEF_SITE_NAV_PATH = '/fragments/nav/site-nav';
const DEF_SITE_NAME = 'Spectrum Hub';
const INDEX_BASED_NAV = [
  { prefix: '/web/rsp', count: 0 },
  { prefix: '/web/swc', count: 0 },
  { prefix: '/mobile/ios', count: 0 },
  { prefix: '/mobile/android', count: 0 },
];

const decorateLevel = (ul, depth) => {
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
    } else {
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
    const parentAnchor = navList.querySelector(`[href^="${parentPrefix.prefix}"]`);
    const parentLi = parentAnchor.closest('li');
    if (!parentLi) {
      log(`Could not find a parent nav item for ${entry.path}`);
      return;
    }
    parentPrefix.anchor ??= parentAnchor;
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
    parentPrefix.anchor.after(badge);
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

const getSiteNav = () => {
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
  if (!currentLink) { return; }
  currentLink.classList.add('is-current-page');

  [1, 2].forEach((level) => {
    const li = currentLink.closest(`.level-${level}`);
    if (!li) { return; }
    const button = li.querySelector(`.level-${level}-button`);
    if (!button) { return; }
    button.setAttribute('aria-expanded', true);
  });
};

const getExpandButton = async (sitenav) => {
  const btn = document.createElement('button');
  btn.classList.add('sitenav-expand-btn');

  const svg = await fetchSvgEl('/img/icons/s2-icon-expandright-20-n.svg');
  btn.append(svg);

  btn.addEventListener('click', () => {
    sitenav.toggleAttribute('is-open');
  });

  return btn;
};

(async () => {
  // Build the nav element
  const { sitenav, nav } = getSiteNav();

  // Fetch and decorate the currated nav list
  const ul = await fetchRes(DEF_SITE_NAV_PATH);
  if (!ul) { return; }
  const navList = decorateLevel(ul, 1);

  // Build the expand button
  const expandBtn = await getExpandButton(sitenav);

  // Append it all
  nav.append(navList, expandBtn);
  const main = document.querySelector('main');
  if (!main) { return; }
  main.before(sitenav);

  // Stitch index-based nav post DOM injection
  const index = await fetchRes(`${codeBase}/query-index.json`);
  if (index) { decorateIndexBasedNav(navList, index); }

  // decorate the badge counts
  decorateBadges();

  // Find current page
  findCurrentPageInNav(navList);
})();
