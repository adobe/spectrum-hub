import {
  loadArea,
  getMetadata,
  setConfig,
  setScheme,
  makePicture,
  checkIms,
  loadNav,
} from './ak.js';

const hostnames = ['spectrum.adobe.com'];

const linkBlocks = [
  { 'action-button': '/tools/widgets/action-button' },
  { search: '/tools/widgets/search-bar' },
  { profile: '/tools/widgets/profile' },
  { fragment: '/fragments/' },
  { schedule: '/schedules/' },
  { youtube: 'https://www.youtube' },
];

// Blocks that do not need their own styles
const components = ['fragment', 'profile'];

// Setup state of the environment
const { host, port, search } = window.location;
const searchParams = new URLSearchParams(search);
const isStage = () => ((host.includes('.aem.') && !host.endsWith('.live')));
const cdnEnv = port === '8787'
  || host.endsWith('adobe.com')
  || searchParams.get('cdn') === 'mock'
  || host.endsWith('workers.dev')
  || host.endsWith('6.cloudfront.net');
const env = (() => {
  if (host.includes('local')) { return 'dev'; }
  if (isStage()) { return 'stage'; }
  return 'prod';
})();

// Setup basic state of the doc
document.documentElement.classList.add('spectrum-edge');
const isReturning = sessionStorage.getItem('session');
if (isReturning) { document.body.classList.add('is-returning'); }
const scheme = setScheme(document.body);
const template = getMetadata('template');
if (template !== 'marketing') {
  document.documentElement.toggleAttribute('expand-sitenav', true);
}
const breadcrumbMeta = getMetadata('breadcrumbs');
const heroMeta = getMetadata('hero');

// Optionally build a page hero
const buildAutoHero = () => {
  if (heroMeta === 'auto' || template === 'component') {
    const h1 = document.body.querySelector('h1');
    const section = h1.closest('main > div');

    const hero = document.createElement('div');
    hero.className = 'page-hero';
    hero.append(h1);

    section.prepend(hero);
    return hero;
  }
  return null;
};

// Optionally build breadcrumbs
const buildBreadcrumbs = (hero) => {
  // A hero does not guarantee breadcrumbs are wanted
  if (breadcrumbMeta || template === 'component') {
    // Breadcrumbs can be explicitly turned off
    if (breadcrumbMeta === 'off') { return; }
    // Initial scan for blocks requires a div
    const breadcrumbs = document.createElement('div');
    breadcrumbs.className = 'breadcrumbs';
    // Prepand to either hero or the first section
    const parent = hero || document.querySelector('main > div');
    parent.prepend(breadcrumbs);
  }
};

// How to decorate an area before loading it
const decorateArea = ({ area = document }) => {
  const eagerLoad = (parent, selector) => {
    const img = parent.querySelector(selector);
    if (!img) { return; }
    img.removeAttribute('loading');
    img.fetchPriority = 'high';
  };

  // If doc, do not allow decorating background
  const select = area === document
    ? 'main img:not([src*=".svg"])'
    : 'img:not([src*=".svg"])';
  eagerLoad(area, select);
};

const decorateBackground = async () => {
  const currColor = scheme.replace('-scheme', '');

  const getPic = (color) => {
    const path = getMetadata(`${color}-bg`);
    const opts = {
      sizes: [1000, 2000],
      class: `bg-img scheme-aware-pic ${color}-pic`,
      loading: currColor === color ? 'eager' : 'lazy',
    };
    if (!path) { return null; }
    return makePicture(path, opts);
  };

  const pics = [getPic('light'), getPic('dark')];
  document.body.prepend(...pics);
  pics.forEach((pic) => {
    if (!pic) { return; }
    const img = pic.querySelector('img');
    img.decode()
      .then(() => img.classList.add('decoded'))
      .catch(() => img.classList.add('decoded'));
  });
};

export async function loadPage() {
  setConfig({
    hostnames,
    linkBlocks,
    components,
    decorateArea,
    cdnEnv,
    env,
  });

  // Preload IMS if returning visitor
  await checkIms();

  if (isReturning) {
    await loadNav();
  }

  decorateBackground();

  // Auto blocks
  const hero = buildAutoHero();
  buildBreadcrumbs(hero);

  await loadArea();
}
await loadPage();

(function da() {
  const hasPreview = searchParams.has('dapreview');
  if (hasPreview) { import('../tools/da/da.js').then((mod) => mod.default(loadPage)); }
  const hasQE = searchParams.has('quick-edit');
  if (hasQE) { import('../tools/quick-edit/quick-edit.js').then((mod) => mod.default()); }
}());
