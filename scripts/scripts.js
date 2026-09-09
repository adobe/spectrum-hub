import {
  loadArea,
  getMetadata,
  setConfig,
  setScheme,
  checkIms,
  loadNav,
  loadStyle,
  isAnonymousSoft,
  makePicture,
} from './ak.js';
import { findCurrentPageInNav, restoreMenuScroll } from './utils/nav-current.js';
import { SITENAV_CACHE, HEADER_CACHE, readChromeCache } from './utils/chrome-cache.js';

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
const isStage = () => (host.includes('.aem.') && !host.endsWith('.live'));
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

const eagerLoad = (img) => {
  img?.setAttribute('loading', 'eager');
  img?.setAttribute('fetchpriority', 'high');
};

(async function loadLCPImage() {
  const firstDiv = document.querySelector('body > main > div:nth-child(1) > div');
  if (firstDiv?.classList.contains('marquee')) {
    firstDiv.querySelectorAll('img').forEach(eagerLoad);
  } else {
    eagerLoad(document.querySelector('img'));
  }
}());

// Cross-document view transitions are opted in via CSS (@view-transition). Skip
// the animation for readers who prefer reduced motion so they don't even pay the
// snapshot cost. Registered before any await so it exists by the first render.
window.addEventListener('pagereveal', (e) => {
  if (!e.viewTransition) { return; }
  if (matchMedia('(prefers-reduced-motion: reduce)').matches) {
    e.viewTransition.skipTransition();
  }
});

// Paint the persistent chrome (sitenav rail + header) synchronously from the
// sessionStorage cache, before first render, so it is present in the view-
// transition snapshot and morphs across the navigation instead of popping in a
// few hundred ms late. No-op on a cold visit (empty cache) — the authoritative
// async build (loadNav / header block) then reconciles in place. Runs in the
// module's synchronous top-level region, which — with blocking="render" on this
// script — executes before first paint.
const injectCachedChrome = () => {
  const audience = isAnonymousSoft() ? 'anon' : 'auth';

  // Header: its <header> element is already in the served HTML.
  const headerEl = document.querySelector('header');
  if (headerEl && getMetadata('header') !== 'off') {
    const headerHTML = readChromeCache(HEADER_CACHE, audience);
    if (headerHTML) {
      headerEl.innerHTML = headerHTML;
      headerEl.setAttribute('data-cached', '');
      // Render-blocking so the injected header paints styled, not as raw markup.
      loadStyle('/blocks/header/header.css');
    }
  }

  // Sitenav: not in the served HTML, so build it from cache and insert it.
  if (getMetadata('sitenav') === 'off') { return; }
  const navHTML = readChromeCache(SITENAV_CACHE, audience);
  const main = document.querySelector('main');
  if (!navHTML || !main) { return; }
  const tpl = document.createElement('template');
  tpl.innerHTML = navHTML;
  const sitenav = tpl.content.querySelector('#sitenav');
  if (!sitenav) { return; }
  sitenav.setAttribute('data-cached', '');
  main.before(sitenav);
  // Highlight needs no layout, so apply it now for a correct first paint.
  const currentLink = findCurrentPageInNav(sitenav);
  // Scroll restore needs layout, which needs the rail visible — defer it until
  // sitenav.css (which flips #sitenav off display:none) has loaded. Render-
  // blocking, so the styled rail is in the first paint.
  loadStyle('/blocks/sitenav/sitenav.css').then(() => {
    if (currentLink && !restoreMenuScroll(currentLink)) {
      currentLink.scrollIntoView({ block: 'nearest' });
    }
  });
};
injectCachedChrome();

// Build the author-specified page background (light/dark PNGs from metadata) as
// fixed, full-viewport <picture>s behind the page. Runs synchronously here —
// before first paint — rather than inside loadPage, so the current-scheme image
// is present in the new document's first-paint view-transition snapshot. The
// background is intentionally left in the default `root` group (see styles.css)
// so it cross-fades together with the content; being present at snapshot is what
// stops it flashing through a blank state. Returns a promise that resolves once
// that image has decoded, so loadPage can hold the render-block until it paints.
const decorateBackground = () => {
  const currColor = scheme.replace('-scheme', '');

  const getPic = (color) => {
    const path = getMetadata(`${color}-bg`);
    if (!path) { return null; }
    return makePicture(path, {
      sizes: [1000, 2000],
      class: `bg-img scheme-aware-pic ${color}-pic`,
      loading: currColor === color ? 'eager' : 'lazy',
    });
  };

  const pics = { light: getPic('light'), dark: getPic('dark') };
  const ordered = [pics.light, pics.dark].filter(Boolean);
  if (!ordered.length) { return Promise.resolve(); }
  document.body.prepend(...ordered);

  const decode = (pic) => {
    const img = pic.querySelector('img');
    return img.decode()
      .then(() => img.classList.add('decoded'))
      .catch(() => img.classList.add('decoded'));
  };
  const decodes = new Map(ordered.map((pic) => [pic, decode(pic)]));

  // Only the visible (current-scheme) image gates first paint.
  const current = pics[currColor];
  return current ? decodes.get(current) : Promise.resolve();
};
const backgroundReady = decorateBackground();

// Bounded release of the render-block: once the first section AND the page
// background are painted (or the budget elapses), first paint proceeds so a slow
// block/image/fetch can never hang it.
const FIRST_SECTION_BUDGET_MS = 120;
const wait = (ms) => new Promise((resolve) => { setTimeout(resolve, ms); });

export async function loadPage() {
  setConfig({
    hostnames,
    linkBlocks,
    components,
    decorateArea,
    cdnEnv,
    env,
    locales: { '': { lang: 'en' } },
  });

  // Preload IMS if returning visitor
  await checkIms();

  // Returning visitor: the cached rail is already painted, so rebuild the
  // authoritative rail without blocking first paint on its fetches.
  if (isReturning) {
    loadNav();
  }

  // Auto blocks
  const hero = buildAutoHero();
  buildBreadcrumbs(hero);

  // Kick the full area load (not awaited at top level — the rest of the sections,
  // lazy.js and the footer continue in the background). For a returning visitor,
  // hold first paint until the first section AND the page background are painted,
  // so the view-transition snapshot has real content and its background (the main
  // flash source); a cold visit has no inbound transition, so release immediately
  // and add zero first-paint latency. Bounded so a slow section/image can't hang.
  let resolveFirstSection;
  const firstSection = new Promise((resolve) => { resolveFirstSection = resolve; });
  loadArea({ onFirstSection: resolveFirstSection }).catch(() => {});

  if (isReturning) {
    const ready = Promise.all([firstSection, backgroundReady]);
    await Promise.race([ready, wait(FIRST_SECTION_BUDGET_MS)]);
  }
}
await loadPage();

(function da() {
  const hasPreview = searchParams.has('dapreview');
  if (hasPreview) { import('../tools/da/da.js').then((mod) => mod.default(loadPage)); }
  const hasQE = searchParams.has('quick-edit');
  if (hasQE) { import('../tools/quick-edit/quick-edit.js').then((mod) => mod.default()); }
}());
