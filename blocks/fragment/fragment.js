import { loadArea, getConfig } from '../../scripts/ak.js';

const cdnEnv = getConfig();

function replaceDotMedia(path, doc) {
  const resetAttributeBase = (tag, attr) => {
    doc.querySelectorAll(`${tag}[${attr}^="./media_"]`).forEach((el) => {
      el[attr] = new URL(el.getAttribute(attr), new URL(path, window.location)).href;
    });
  };
  resetAttributeBase('img', 'src');
  resetAttributeBase('source', 'srcset');
}

/**
 * Inject a fragment into the dom to for calculating styles
 * @param {HTMLElement} fragment the fragment
 */
function applyPageStyles(fragment) {
  const container = document.createElement('div');
  container.classList.add('hidden-container');
  container.style = 'display: none';
  document.body.append(container);
  container.append(fragment);
  return container;
}

/**
 * Loads a fragment.
 * @param {string} path The path to the fragment
 * @returns {HTMLElement} The root element of the fragment
 */
export async function loadFragment(path) {
  const resp = await fetch(`${path}`);
  if (!resp.ok) { return { error: `Could not fetch fragment - ${resp.status}` }; }

  const html = await resp.text();
  const doc = new DOMParser().parseFromString(html, 'text/html');

  const sections = doc.body.querySelectorAll('main > div');
  const fragment = document.createElement('div');
  fragment.classList.add('fragment-content');
  fragment.append(...sections);

  // replaceDotMedia(path, doc) is called after fragment.append(...sections), which moves
  // all nodes out of doc, so doc.querySelectorAll(...) finds nothing to rewrite. Pass
  // fragment as the search root so the rewrites actually reach the moved nodes.
  replaceDotMedia(path, fragment);

  const container = applyPageStyles(fragment);

  await loadArea({ area: fragment });

  fragment.remove();
  container.remove();

  return { fragment };
}

/**
 *
 * @param {Element}} a the fragment link
 * @returns the element that can be replaced
 */
function getReplaceEl(a) {
  let current = a;
  const ancestor = a.closest('.section');

  // Walk up the DOM from child to ancestor
  // Break when there is more than one child
  while (current && current !== ancestor) {
    const childCount = current.parentElement.children.length;
    if (childCount <= 1) {
      current = current.parentElement;
    } else {
      break;
    }
  }

  return current;
}

function getRequestPath(a) {
  const { hostname, pathname } = a;
  const href = a.getAttribute('href');
  // If its already relative, return the pathname
  if (href.startsWith('/')) { return pathname; }
  // If the hostname matches, return the pathname
  if (hostname === window.location.hostname) { return pathname; }
  // If the aem project matches, make it relative (useful across delivery tiers)
  const isAem = ['.da.', '.aem.', 'local'].some((host) => hostname.includes(host));
  if (isAem) {
    // If org and site matches, return the pathname
    const [aemOrg, aemSite] = hostname.split('.')[0].split('--').reverse();
    const [winOrg, winSite] = window.location.hostname.split('.')[0].split('--').reverse();
    if ((aemOrg === winOrg) && (aemSite === winSite)) { return pathname; }
  }
  // Give up and return the full href
  return a.href;
}

export default async function init(a) {
  let path = getRequestPath(a);
  const isPrivate = path.includes('/private/') && cdnEnv;
  if (isPrivate) {
    const { loadIms } = await import('../../scripts/utils/ims.js');
    const ims = await loadIms();
    if (ims.anonymous) {
      path = path.replace('/private/', '/public/');
    }
  }

  const { fragment } = await loadFragment(path);
  if (fragment) {
    const elToReplace = getReplaceEl(a);
    const sections = fragment.querySelectorAll(':scope > .section');
    const children = sections.length === 1
      ? fragment.querySelectorAll(':scope > *')
      : [fragment];
    for (const [idx, child] of children.entries()) {
      // If relative, create a unique ID to help fragments be identified after being inserted into
      // the page
      if (path.startsWith('/')) { child.id = btoa(encodeURIComponent(`${path}/${idx + 1}`)); }
      elToReplace.insertAdjacentElement('afterend', child);
    }
    elToReplace.remove();
    return;
  }
  // Remove the link completely if private and /public/ 404s
  if (isPrivate) { a.remove(); }
}
