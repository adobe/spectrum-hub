import { crawl } from 'https://da.live/nx/public/utils/tree.js';

function getOpts(token, method = 'GET') {
  return {
    method,
    headers: {
      Authorization: `Bearer ${token}`,
    },
  };
}

async function fetchDoc(path, token) {
  const opts = getOpts(token);
  const resp = await fetch(`https://admin.da.live/source${path}.html`, opts);
  if (!resp.ok) { return undefined; }
  return resp.text();
}

function extractText(docHtml) {
  if (!docHtml) { return ''; }
  const doc = new DOMParser().parseFromString(docHtml, 'text/html');
  const root = doc.querySelector('main') || doc.body;
  return root.textContent.replace(/\s+/g, ' ').trim();
}

export async function loadComponents(basePath, token) {
  const opts = getOpts(token);
  const resp = await fetch(`https://admin.da.live/list${basePath}/fragments/components`, opts);
  if (!resp.ok) { return []; }
  const items = await resp.json();
  return items
    .filter((item) => item.name && !item.ext)
    .map((item) => ({ name: item.name, path: item.path }))
    .sort((a, b) => a.name.localeCompare(b.name));
}

export async function loadComponentDescription(component, token) {
  const docHtml = await fetchDoc(`${component.path}/description`, token);
  return extractText(docHtml);
}

/**
 * Finds every page under basePath with a "components/<name>" path segment matching
 * one of componentNames, at any depth or platform/impl prefix (web/swc/components/<name>,
 * web/rsp/components/<name>, ios/components/<name>, ...). Pages under /fragments/ are
 * excluded - that's where the description source lives, not a page that consumes it.
 */
export function findComponentPages(basePath, componentNames, setStatus) {
  const nameSet = new Set(componentNames);
  const matches = new Map(componentNames.map((name) => [name, []]));

  const callback = async (item) => {
    if (item.ext !== 'html') { return; }
    const uiPath = item.path.replace('.html', '');
    if (uiPath.startsWith(`${basePath}/fragments/`)) { return; }

    const segments = uiPath.split('/').filter(Boolean);
    const idx = segments.indexOf('components');
    const name = idx === -1 ? undefined : segments[idx + 1];
    if (!name || !nameSet.has(name)) { return; }

    setStatus(`Found ${uiPath}`);
    matches.get(name).push({ path: uiPath });
  };

  const { results } = crawl({ path: basePath, callback, throttle: 10 });
  return results.then(() => matches);
}

async function saveDoc(path, token, doc) {
  const body = new FormData();
  const html = doc.body.outerHTML;
  const data = new Blob([html], { type: 'text/html' });
  body.append('data', data);

  const opts = getOpts(token, 'POST');
  opts.body = body;

  const resp = await fetch(`https://admin.da.live/source${path}.html`, opts);
  if (!resp.ok) { return { message: 'Could not save.', status: resp.status, type: 'error' }; }
  return { message: 'Successfully saved.', status: resp.status, type: 'success' };
}

// Fragment docs reference sibling media as "./media_xxx.jpg", relative to the
// fragment's own location. Once copied into a different page doc, that base
// changes, so rewrite each reference against the fragment's site path first -
// mirrors blocks/fragment/fragment.js's replaceDotMedia for runtime transclusion.
function resolveFragmentMedia(sitePath, doc) {
  const resolveAttr = (selector, attr) => {
    doc.querySelectorAll(selector).forEach((el) => {
      const value = el.getAttribute(attr);
      if (!value?.startsWith('./')) { return; }
      const resolved = new URL(value, new URL(sitePath, 'https://placeholder')).pathname;
      el.setAttribute(attr, resolved);
    });
  };
  resolveAttr('img[src^="./"]', 'src');
  resolveAttr('source[srcset^="./"]', 'srcset');
}

async function fetchFragmentSections(adminFragmentPath, sitePath, token) {
  const docHtml = await fetchDoc(adminFragmentPath, token);
  if (!docHtml) { return []; }
  const fragmentDoc = new DOMParser().parseFromString(docHtml, 'text/html');
  resolveFragmentMedia(sitePath, fragmentDoc);
  return [...fragmentDoc.body.querySelectorAll('main > div')];
}

// Mirrors blocks/fragment/fragment.js's getReplaceEl: walk up from the link while
// its parent has no other children, so we remove the smallest wrapper that held
// only the link (a bare paragraph, typically) rather than leaving an empty shell.
// Source docs are undecorated (no ".section" class yet), so the boundary here is
// the raw "main > div" section instead.
function getReplaceTarget(a) {
  const sectionEl = a.closest('main > div');
  let current = a;
  while (current.parentElement && current.parentElement !== sectionEl) {
    if (current.parentElement.children.length <= 1) {
      current = current.parentElement;
    } else {
      break;
    }
  }
  return { elToReplace: current, sectionEl };
}

// Authors paste these as full URLs (whatever domain they're previewing on -
// .aem.page, .aem.live, a custom domain, ...), not the bare site-relative path,
// so match by pathname rather than a literal href string.
function findFragmentLink(doc, sitePath) {
  const anchors = [...doc.querySelectorAll('main a[href]')];
  return anchors.find((a) => {
    try {
      const { pathname } = new URL(a.getAttribute('href'), 'https://placeholder');
      return pathname.replace(/\.html$/, '') === sitePath;
    } catch {
      return false;
    }
  });
}

// An author may have already dropped in a plain link to the fragment (the old
// authoring convention, or a manual link). Replace it in place with the real
// content instead of leaving both the link and a duplicated copy on the page.
function replaceFragmentLink(doc, sitePath, importedSections) {
  const link = findFragmentLink(doc, sitePath);
  if (!link) { return false; }

  const { elToReplace, sectionEl } = getReplaceTarget(link);
  const [firstSection, ...extraSections] = importedSections;

  [...firstSection.children].forEach((child) => elToReplace.insertAdjacentElement('beforebegin', child));
  elToReplace.remove();
  sectionEl.dataset.seoFragment = sitePath;

  // A single-section fragment (the common case) is now fully inlined. A
  // multi-section fragment can't nest further sections inside this one, so its
  // remaining sections get spliced in as new top-level sections right after.
  let anchor = sectionEl;
  extraSections.forEach((section) => {
    anchor.insertAdjacentElement('afterend', section);
    anchor = section;
  });

  return true;
}

// adminFragmentPath (DA admin, org/repo-prefixed) fetches the fragment; sitePath
// (site-relative, no org/repo prefix) resolves its media and tags the inlined
// content so re-runs don't duplicate it.
export async function savePageDescription(path, token, adminFragmentPath, sitePath) {
  const [docHtml, sections] = await Promise.all([
    fetchDoc(path, token),
    fetchFragmentSections(adminFragmentPath, sitePath, token),
  ]);
  if (!sections.length) {
    return { message: 'Could not load fragment content.', status: 404, type: 'error' };
  }

  const doc = new DOMParser().parseFromString(docHtml, 'text/html');

  if (doc.querySelector(`main > div[data-seo-fragment="${sitePath}"]`)) {
    return { message: 'Already up to date.', status: 200, type: 'success' };
  }

  const importedSections = sections.map((section) => doc.importNode(section, true));

  if (!replaceFragmentLink(doc, sitePath, importedSections)) {
    importedSections[0].dataset.seoFragment = sitePath;
    // Keep an existing metadata block (title, robots, etc.) last on the page.
    const metadataSection = doc.querySelector('.metadata')?.closest('main > div');
    if (metadataSection) {
      importedSections.forEach((section) => metadataSection.insertAdjacentElement('beforebegin', section));
    } else {
      doc.body.querySelector('main').append(...importedSections);
    }
  }

  return saveDoc(path, token, doc);
}
