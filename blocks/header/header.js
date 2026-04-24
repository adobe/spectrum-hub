import { getConfig, getMetadata } from '../../scripts/ak.js';
import { picture2svg } from '../../scripts/utils/svg.js';
import { loadFragment } from '../fragment/fragment.js';

const { locale } = getConfig();

const HEADER_PATH = '/fragments/nav/header';

async function decorateBrandSection(section) {
  section.classList.add('brand-section');
  const link = section.querySelector('a');
  const pic = section.querySelector('picture');
  if (pic) {
    if (link) link.prepend(pic);
    await picture2svg(pic);
  }
}

function decorateNavSection(section) {
  section.classList.add('main-nav-section');
  section.setAttribute('role', 'navigation');
  section.setAttribute('aria-label', 'Main navigation');
}

async function decorateActionSection(section) {
  section.classList.add('actions-section');
}

async function decorateHeader(fragment) {
  const sections = [...fragment.querySelectorAll(':scope > .section')];
  // Brand will always be first
  const brand = sections.shift();
  // Actions will always be last
  const actions = sections.pop();
  // Nav is anything left over
  const nav = sections[0];

  if (brand) await decorateBrandSection(brand);
  if (nav) decorateNavSection(nav);
  if (actions) decorateActionSection(actions);
}

/**
 * loads and decorates the header
 * @param {Element} el The header element
 */
export default async function init(el) {
  const headerMeta = getMetadata('header');
  const path = headerMeta || HEADER_PATH;
  const { fragment } = await loadFragment(`${locale.prefix}${path}`);
  if (!fragment) return;
  fragment.classList.add('header-content');
  await decorateHeader(fragment);
  el.append(fragment);
}
