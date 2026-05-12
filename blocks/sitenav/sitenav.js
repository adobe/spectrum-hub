/* Follows Disclosure Navigation Menu APG: https://www.w3.org/WAI/ARIA/apg/patterns/disclosure/examples/disclosure-navigation/ */

import { getConfig } from '../../scripts/ak.js';
import { loadFragment } from '../fragment/fragment.js';

const { locale } = getConfig();

// sitenav data sources, in priority order:
//   1. Happy path — an author-maintained nav fragment at `/fragments/nav/{topSection}`
//      (e.g. `/fragments/nav/foundations`). Authors control labels, order, and
//      structure by editing a nested bulleted list in AEM. Matches the convention
//      used by the site header (`/fragments/nav/header`) and footer
//      (`/fragments/nav/footer`). This is the canonical source of truth.
//   2. Fallback — `/query-index.json` + the SEGMENT_ORDER map below. Used only when
//      the nav fragment is missing or empty so the sitenav never disappears during
//      the migration period before nav docs are published. Once every section has a
//      nav doc, the fallback (and SEGMENT_ORDER) can be deleted.

const SEGMENT_ORDER = {
  foundations: [
    'getting-started',
    'visual-language',
    'behavior',
    'system',
    'composition',
    'content-design',
    'inclusivity',
    'support',
  ],
  components: [
    'core-systems',
    'availability',
    'patterns',
  ],
};

function getTopSection() {
  // Strip the locale prefix (e.g. `/jp`) before reading the section so a URL
  // like `/jp/foundations/...` returns `foundations`, not `jp`. `locale.prefix`
  // is empty string for the default locale, in which case nothing is stripped.
  const { pathname } = window.location;
  const stripped = pathname.startsWith(locale.prefix)
    ? pathname.slice(locale.prefix.length) : pathname;
  const [, section] = stripped.split('/');
  return section || null;
}

function isAncestorOf(ancestorPath, currentPath) {
  if (!ancestorPath) {
    return false;
  }
  return currentPath === ancestorPath || currentPath.startsWith(`${ancestorPath}/`);
}

function formatLabel(key) {
  return key.charAt(0).toUpperCase() + key.slice(1).replace(/-/g, ' ');
}

// --- Happy path: tree from the AEM-authored nav fragment ---

function getDirectContent(li) {
  const clone = li.cloneNode(true);
  clone.querySelectorAll('ul, ol').forEach((n) => n.remove());
  const anchor = clone.querySelector('a');
  return {
    path: anchor ? anchor.getAttribute('href') : null,
    label: (anchor ? anchor.textContent : clone.textContent).trim(),
  };
}

function nodeFromLi(li) {
  const { path, label } = getDirectContent(li);
  const nestedList = [...li.children].find((c) => c.tagName === 'UL' || c.tagName === 'OL');
  const children = [];
  if (nestedList) {
    [...nestedList.children].forEach((childLi) => {
      if (childLi.tagName === 'LI') {
        children.push(nodeFromLi(childLi));
      }
    });
  }
  return { path, label, children };
}

async function treeFromFragment(topSection) {
  const { fragment } = await loadFragment(`${locale.prefix}/fragments/nav/${topSection}`);
  if (!fragment) {
    return null;
  }
  const sourceList = fragment.querySelector('ul, ol');
  if (!sourceList) {
    return null;
  }
  const nodes = [];
  [...sourceList.children].forEach((li) => {
    if (li.tagName === 'LI') {
      nodes.push(nodeFromLi(li));
    }
  });
  return nodes.length ? nodes : null;
}

// --- Fallback: tree derived from query-index.json + SEGMENT_ORDER ---

function buildPathTree(pages, topSection) {
  const root = { children: new Map() };
  pages.forEach(({ path, title }) => {
    const parts = path.split('/').filter(Boolean);
    if (parts[0] !== topSection) {
      return;
    }
    let node = root;
    for (let i = 1; i < parts.length; i += 1) {
      const key = parts[i];
      if (!node.children.has(key)) {
        node.children.set(key, {
          key,
          path: `/${parts.slice(0, i + 1).join('/')}`,
          title: null,
          children: new Map(),
        });
      }
      node = node.children.get(key);
    }
    node.title = title;
  });
  return root;
}

function sortMap(children, order) {
  if (!order || !order.length) {
    return children;
  }
  const rank = (key) => {
    const i = order.indexOf(key);
    return i === -1 ? Number.MAX_SAFE_INTEGER : i;
  };
  return new Map([...children.entries()].sort(([a], [b]) => rank(a) - rank(b)));
}

function flattenPathNode(node) {
  return {
    path: node.path,
    label: node.title || formatLabel(node.key),
    children: [...node.children.values()].map(flattenPathNode),
  };
}

async function treeFromIndex(topSection) {
  const resp = await fetch('/query-index.json');
  if (!resp.ok) {
    return null;
  }
  const { data } = await resp.json();
  const sectionPages = data.filter(({ path }) => path.startsWith(`/${topSection}/`));
  if (!sectionPages.length) {
    return null;
  }
  const root = buildPathTree(sectionPages, topSection);
  const ordered = sortMap(root.children, SEGMENT_ORDER[topSection]);
  return [...ordered.values()].map(flattenPathNode);
}

// --- Renderer ---

function createNavLink(path, label, currentPath) {
  const a = document.createElement('a');
  a.href = path;
  a.textContent = label;
  if (currentPath === path) {
    a.setAttribute('aria-current', 'page');
  }
  return a;
}

function renderNode(node, currentPath) {
  const li = document.createElement('li');

  if (!node.children.length) {
    if (node.path) {
      li.append(createNavLink(node.path, node.label, currentPath));
    } else {
      // Non-link leaf: render as a section label rather than an unannotated
      // list item. role="presentation" removes the <li> from the screen
      // reader's list of items (it's not a link/segment alongside its
      // siblings); the .sitenav-group-label class is the visual hook.
      li.setAttribute('role', 'presentation');
      const heading = document.createElement('span');
      heading.classList.add('sitenav-group-label');
      heading.textContent = node.label;
      li.append(heading);
    }
    return { el: li, hasActive: currentPath === node.path };
  }

  li.classList.add('sitenav-segment');
  const details = document.createElement('details');
  const summary = document.createElement('summary');
  summary.classList.add('sitenav-segment-label');
  // TODO: VoiceOver announces a <summary> twice on navigation: once via
  // its computed accessible name (e.g. "Core systems, summary, collapsed")
  // and once via the descendant text node. Could be silenced with
  // aria-label + aria-hidden. Tradeoff is to duplicate the label string across an
  // attribute and the DOM.
  summary.textContent = node.label;
  details.append(summary);

  const ul = document.createElement('ul');
  let hasActive = currentPath === node.path;
  node.children.forEach((child) => {
    const { el: childEl, hasActive: childHasActive } = renderNode(child, currentPath);
    ul.append(childEl);
    if (childHasActive) {
      hasActive = true;
    }
  });
  details.append(ul);
  li.append(details);

  // Auto-expand if the current page is anywhere within this segment's subtree
  // — `hasActive` covers descendants we rendered, `isAncestorOf` covers cases
  // where the current page is deeper than our nav happens to include.
  if (hasActive || isAncestorOf(node.path, currentPath)) {
    details.open = true;
  }
  return { el: li, hasActive };
}

// Builds the rendered <ul> for the current section without attaching it to the
// page. Kept separate from `init` so the upcoming unified mobile-drawer work
// can call this directly and lift the list into a shared drawer instead of
// rebuilding the tree logic there.
async function buildsitenavList() {
  const topSection = getTopSection();
  if (!topSection) {
    return null;
  }

  // Prefer the authored nav doc; fall back to the query-index only if it's missing.
  const tree = (await treeFromFragment(topSection)) || (await treeFromIndex(topSection));
  if (!tree || !tree.length) {
    return null;
  }

  const rootList = document.createElement('ul');
  rootList.classList.add('sitenav-list');
  const here = window.location.pathname;
  tree.forEach((node) => rootList.append(renderNode(node, here).el));
  return rootList;
}

export default async function init(el) {
  // Render the disclosure skeleton synchronously so the surrounding template
  // grid can paint immediately. The section nav tree is fetched and swapped
  // in below without blocking first paint — keeps both the FCP/LCP win and
  // the CLS=0 footprint, since the disclosure summary occupies its final
  // size from the start.
  const disclosure = document.createElement('details');
  const summary = document.createElement('summary');
  summary.classList.add('sitenav-segment-label', 'sitenav-disclosure');
  const sectionName = window.location.pathname.split('/')[1];
  summary.textContent = `${sectionName.charAt(0).toUpperCase() + sectionName.slice(1)} navigation`;
  const placeholder = document.createElement('ul');
  placeholder.classList.add('sitenav-list');
  disclosure.append(summary, placeholder);
  el.append(disclosure);

  // Default to closed on narrow widths so the section nav stays out of the
  // way until the visitor opens it; force open above 900px where the summary
  // is hidden and the rail renders inline. Setting `open` on every viewport
  // change (rather than only on the desktop branch) also resets the state if
  // someone resizes from desktop down to mobile.
  const desktopMql = window.matchMedia('(width >= 900px)');
  const syncDisclosure = () => {
    disclosure.open = desktopMql.matches;
  };
  syncDisclosure();
  desktopMql.addEventListener('change', syncDisclosure);

  // Fetch the tree in the background and swap the placeholder once ready. If
  // the fetch fails or returns nothing, drop the disclosure so the page
  // doesn't show an empty "Section navigation" button.
  buildsitenavList()
    .then((rootList) => {
      if (!rootList) {
        disclosure.remove();
        return;
      }
      placeholder.replaceWith(rootList);
      // Scroll the active link into view inside the nav rail so users landing
      // on a deep page don't have to hunt for their position. Only meaningful
      // when the disclosure is open (desktop); on mobile the visitor expands
      // it themselves.
      if (disclosure.open) {
        el.querySelector('a[aria-current="page"]')?.scrollIntoView({ block: 'nearest' });
      }
    })
    .catch(() => {
      disclosure.remove();
    });
}
