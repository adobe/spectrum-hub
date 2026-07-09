import { loadArea, setConfig, loadBlock } from './ak.js';

const hostnames = ['authorkit.dev'];

const locales = {
  '': { lang: 'en' },
  '/de': { lang: 'de' },
  '/es': { lang: 'es' },
  '/fr': { lang: 'fr' },
  '/hi': { lang: 'hi' },
  '/ja': { lang: 'ja' },
  '/zh': { lang: 'zh' },
};

const linkBlocks = [
  { 'action-button': '/tools/widgets/scheme' },
  { 'action-button': '/tools/widgets/ask-ai' },
  { 'action-button': '/tools/widgets/settings' },
  { 'action-button': '/tools/widgets/action' },
  { fragment: '/fragments/' },
  { schedule: '/schedules/' },
  { youtube: 'https://www.youtube' },
];

// Blocks with self-managed styles
const components = ['fragment', 'schedule'];

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
};

// Builds the common page chrome present on every page: the template wrapper,
// the nav-rail, and the two sidenavs (global rail + section nav). Both sidenavs
// are blocks, so both are loaded here; the section nav then renders the current
// section (from the URL) and updates in response to `hub:section-selected`.
// Template-specific extras (e.g. the detail template's page-nav) are added by
// the individual template init functions.
export function decoratePage() {
  const main = document.querySelector('main');
  if (!main) { return; }

  const wrapper = document.createElement('div');
  wrapper.className = 'template-wrapper';

  const navRail = document.createElement('div');
  navRail.className = 'nav-rail';

  const globalSidenav = document.createElement('div');
  globalSidenav.className = 'hub-global-sidenav';

  const sectionSidenav = document.createElement('div');
  sectionSidenav.className = 'hub-section-sidenav';
  sectionSidenav.setAttribute('aria-label', 'Second-level site navigation');

  navRail.append(globalSidenav, sectionSidenav);
  main.replaceWith(wrapper);
  wrapper.append(navRail, main);

  loadBlock(globalSidenav);
  loadBlock(sectionSidenav);
}

export async function loadPage() {
  document.documentElement.classList.add('spectrum-edge');
  setConfig({
    hostnames, locales, linkBlocks, components, decorateArea, decoratePage,
  });
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
