import { getConfig, getMetadata } from '../../scripts/ak.js';
import { picture2svg } from '../../scripts/utils/svg.js';
import { loadFragment } from '../fragment/fragment.js';

const { locale } = getConfig();

const HEADER_PATH = '/fragments/nav/header';

function createSkipLink() {
  const skipLink = document.createElement('a');
  skipLink.classList.add('skip-link', 'visually-hidden');
  const main = document.querySelector('main');
  const id = main?.id || 'main-content';
  if (main) { main.id = id; }
  skipLink.href = `#${id}`;
  skipLink.innerText = 'Skip to main content';
  return skipLink;
}

async function decorateBrandSection(section) {
  section.classList.add('brand-section');
  const link = section.querySelector('a');
  const pic = section.querySelector('picture');
  if (pic) {
    if (link) { link.prepend(pic); }
    await picture2svg(pic);
  }
}

async function decorateActionSection(section) {
  section.classList.add('actions-section');
  section.setAttribute('role', 'region');
  section.setAttribute('aria-label', 'Additional site actions');
  const list = section.querySelector('ul');
  if (list) { list.classList.add('action-list'); }
}

async function decorateHeader(fragment) {
  const sections = [...fragment.querySelectorAll(':scope > .section')];
  // Brand will always be first
  const brand = sections.shift();
  // Actions will always be last
  const actions = sections.pop();

  if (brand) { await decorateBrandSection(brand); }
  if (actions) { decorateActionSection(actions); }
}

/**
 * loads and decorates the header
 * @param {Element} el The header element
 */
export default async function init(el) {
  const path = getMetadata('header-path') || HEADER_PATH;
  const { fragment } = await loadFragment(`${locale.prefix}${path}`);
  if (!fragment) { return; }
  fragment.classList.add('header-content');
  await decorateHeader(fragment);
  el.append(fragment);

  const skipLink = createSkipLink();
  el.prepend(skipLink);
}
