import {
  loadArea,
  loadBlock,
  getMetadata,
  setConfig,
  setScheme,
  makePicture,
} from './ak.js';

const hostnames = ['spectrum.adobe.com'];

const linkBlocks = [
  { 'action-button': '/tools/widgets/action-button' },
  { search: '/tools/widgets/search-bar' },
  { fragment: '/fragments/' },
  { schedule: '/schedules/' },
  { youtube: 'https://www.youtube' },
];

// Blocks with self-managed styles
// page-hero/breadcrumbs styles are folded into the eager styles/styles.css
const components = ['fragment', 'schedule', 'page-hero', 'breadcrumbs'];

const isComponentPage = (pathname) => {
  const parts = pathname.split('/').filter(Boolean);
  const idx = parts.indexOf('components');
  return idx > 0 && Boolean(parts[idx + 1]);
};

// Wraps whatever's already around the page's <h1> — an optional .breadcrumbs block, the
// <h1>, an optional following description paragraph, and an optional .component-status
// block — into a single <div class="page-hero">. Runs before decorateSections, so the
// wrapper is decorated as a normal block once section decoration reaches it. Scoped to
// component pages only
const buildPageHeader = (main) => {
  if (getMetadata('template') === 'marketing') { return; }
  if (!isComponentPage(window.location.pathname)) { return; }
  const h1 = main.querySelector('h1');
  if (!h1 || h1.closest('.page-hero')) { return; }

  const description = h1.nextElementSibling?.tagName === 'P' ? h1.nextElementSibling : null;
  const breadcrumbs = main.querySelector('.breadcrumbs');
  const status = main.querySelector('.component-status');

  const pageHeader = document.createElement('div');
  pageHeader.className = 'page-hero';
  h1.before(pageHeader);
  pageHeader.append(...[breadcrumbs, h1, description, status].filter(Boolean));
};

// How to decorate an area before loading it
const decorateArea = ({ area = document }) => {
  const eagerLoad = (parent, selector) => {
    const img = parent.querySelector(selector);
    if (!img) { return; }
    img.removeAttribute('loading');
    img.fetchPriority = 'high';
  };

  eagerLoad(area, 'img:not([src*=".svg"])');

  // adds the id to `main` for the skip link
  const main = area.querySelector('main');
  if (main && !main.id) {
    main.id = 'main-content';
  }

  if (area === document && main) { buildPageHeader(main); }
};

const decorateBackground = async (scheme) => {
  const currColor = scheme.replace('-scheme', '');

  const getPic = (color) => {
    const path = getMetadata(`${color}-bg`);
    const opts = {
      sizes: [1000, 2000],
      class: `bg-img scheme-aware-pic ${color}-pic`,
      loading: currColor === color ? 'eager' : 'lazy',
    };
    return makePicture(path, opts);
  };

  const pics = [getPic('light'), getPic('dark')];
  document.body.prepend(...pics);
  pics.forEach((pic) => {
    const img = pic.querySelector('img');
    img.decode()
      .then(() => img.classList.add('decoded'))
      .catch(() => img.classList.add('decoded'));
  });
};

const setSiteNav = () => {
  const template = getMetadata('template');
  if (template === 'marketing') { return; }
  const { pathname } = window.location;
  if (pathname !== '/') {
    document.documentElement.toggleAttribute('expand-sitenav');
  }
};

const buildPageNav = async () => {
  const template = getMetadata('template');
  if (template === 'marketing') { return; }
  const body = document.querySelector('body');
  if (!body) { return; }
  const pageNav = document.createElement('nav');
  pageNav.className = 'page-nav';
  pageNav.setAttribute('aria-label', 'On this page');
  body.append(pageNav);
  await loadBlock(pageNav);
};

// Injects the per-component status pills into the page intro. The placeholder is
// added as the last child of the <h1>'s section *before* loadArea runs, so
// loadArea's own section decoration discovers and loads it as a block — a single
// decoration, in the natural load flow, before first paint (no layout shift).
// The block itself removes the element on non-component pages (render nothing).
const buildComponentStatus = () => {
  const template = getMetadata('template');
  if (template === 'marketing') { return; }
  if (!window.location.pathname.split('/').includes('components')) { return; }
  const h1 = document.querySelector('main h1');
  const section = h1?.closest('main > div');
  if (!section || section.querySelector('.component-status')) { return; }
  const el = document.createElement('div');
  el.className = 'component-status';
  section.append(el);
};

const getSession = () => {
  const isSession = sessionStorage.getItem('session');
  if (isSession) { document.body.classList.add('is-returning'); }
};

export async function loadPage() {
  getSession();

  document.documentElement.classList.add('spectrum-edge');

  const scheme = setScheme(document.body);
  decorateBackground(scheme);

  setConfig({ hostnames, linkBlocks, components, decorateArea });

  setSiteNav();
  buildPageNav();
  buildComponentStatus();

  await loadArea();
}
await loadPage();

(function da() {
  const { searchParams } = new URL(window.location.href);
  const hasPreview = searchParams.has('dapreview');
  if (hasPreview) { import('../tools/da/da.js').then((mod) => mod.default(loadPage)); }
  const hasQE = searchParams.has('quick-edit');
  if (hasQE) { import('../tools/quick-edit/quick-edit.js').then((mod) => mod.default()); }
}());
