import { loadArea, getMetadata, setConfig, setScheme, makePicture } from './ak.js';

const hostnames = ['spectrum.adobe.com'];

const linkBlocks = [
  { 'action-button': '/tools/widgets/action-button' },
  { search: '/tools/widgets/search-bar' },
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

export async function loadPage() {
  document.documentElement.classList.add('spectrum-edge');

  const scheme = setScheme(document.body);
  decorateBackground(scheme);

  setSiteNav();

  setConfig({ hostnames, linkBlocks, components, decorateArea });

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
