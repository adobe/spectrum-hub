/* Follows Disclosure Navigation Menu APG: https://www.w3.org/WAI/ARIA/apg/patterns/disclosure/examples/disclosure-navigation/ */

import { getConfig } from '../../scripts/ak.js';
import { getImplementationById } from '../../scripts/utils/implementations.js';
import {
  getImplementationFromPath,
  getSectionPrefix,
} from '../../scripts/utils/platform-url.js';

const { locale } = getConfig();

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
};

// Strip the locale prefix (e.g. `/jp`) so URLs like `/jp/foundations/...` are
// treated as `/foundations/...`. `locale.prefix` is empty string for the
// default locale, in which case nothing is stripped.
function strippedPath() {
  const { pathname } = window.location;
  return pathname.startsWith(locale.prefix)
    ? pathname.slice(locale.prefix.length) || '/' : pathname;
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

// tree derived from query-index.json + SEGMENT_ORDER. `sectionPrefix` is the
// URL prefix that anchors the tree root (e.g. `/foundations/` or
// `/platforms/rsp/`); pages outside that prefix are filtered upstream.
function buildPathTree(pages, sectionPrefix) {
  const sectionDepth = sectionPrefix.split('/').filter(Boolean).length;
  const root = { children: new Map() };
  pages.forEach(({ path, title }) => {
    const parts = path.split('/').filter(Boolean);
    if (parts.length <= sectionDepth) {
      return;
    }
    let node = root;
    for (let i = sectionDepth; i < parts.length; i += 1) {
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

async function treeFromIndex(sectionPrefix) {
  const resp = await fetch('/query-index.json');
  if (!resp.ok) {
    return null;
  }
  const { data } = await resp.json();
  const sectionPages = data.filter(({ path }) => path.startsWith(sectionPrefix));
  if (!sectionPages.length) {
    return null;
  }
  const root = buildPathTree(sectionPages, sectionPrefix);
  // SEGMENT_ORDER is keyed by the last segment of the prefix (e.g. `foundations`,
  // `components`). Platform-scoped prefixes (`/platforms/rsp/`) fall through to
  // default ordering until per-impl orderings are introduced.
  const sectionKey = sectionPrefix.split('/').filter(Boolean).slice(-1)[0];
  const ordered = sortMap(root.children, SEGMENT_ORDER[sectionKey]);
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

// TODO: Builds the rendered <ul> for the current section without attaching it to the
// page. Kept separate from `init` so the upcoming unified mobile-drawer work
// can call this directly and lift the list into a shared drawer instead of
// rebuilding the tree logic there.
async function buildSitenavList() {
  const sectionPrefix = getSectionPrefix(strippedPath());
  if (!sectionPrefix) {
    return null;
  }

  const tree = await treeFromIndex(sectionPrefix);
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
  // in below without blocking first paint.
  const disclosure = document.createElement('details');
  const summary = document.createElement('summary');
  summary.classList.add('sitenav-segment-label', 'sitenav-disclosure');
  // For /platforms/[impl]/... the implementation drives the label so the
  // `Platforms/` wrapper is hidden from visitors (per platform-picker plan).
  // For other sections the first segment is the section name itself.
  const here = strippedPath();
  const implId = getImplementationFromPath(here);
  const labelText = implId
    ? getImplementationById(implId)?.label ?? formatLabel(implId)
    : formatLabel(here.split('/')[1] || '');
  summary.textContent = `${labelText} navigation`;
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

  // The summary's rendered height as a CSS custom property so the
  // page-nav block can stack below it at mobile widths.
  const updateSummaryHeight = () => {
    const height = desktopMql.matches ? 0 : summary.offsetHeight;
    document.documentElement.style.setProperty('--sitenav-summary-height', `${height}px`);
  };

  const syncDisclosure = () => {
    disclosure.open = desktopMql.matches;
    updateSummaryHeight();
  };
  syncDisclosure();
  desktopMql.addEventListener('change', syncDisclosure);

  // Keep --sitenav-summary-height accurate across font scaling, orientation
  // changes, or any other layout shift that affects the summary's height.
  new ResizeObserver(updateSummaryHeight).observe(summary);

  // Fetch the tree in the background and swap the placeholder once ready. If
  // the fetch fails or returns nothing, drop the disclosure so the page
  // doesn't show an empty "Section navigation" button.
  buildSitenavList()
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
