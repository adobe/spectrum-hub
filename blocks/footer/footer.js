import { getConfig, getMetadata } from '../../scripts/ak.js';
import { loadFragment } from '../fragment/fragment.js';

const FOOTER_PATH = '/fragments/nav/footer';

/**
 * loads and decorates the footer
 * @param {Element} el The footer element
 */
export default async function init(el) {
  const { locale } = getConfig();
  const footerMeta = getMetadata('footer');
  const path = footerMeta || FOOTER_PATH;

  const nav = document.createElement('nav');

  const { fragment } = await loadFragment(`${locale.prefix}${path}`);
  if (!fragment) return;
  fragment.classList.add('footer-content');

  const sections = [...fragment.querySelectorAll('.section')];

  const copyright = sections.pop();
  copyright.classList.add('section-copyright');

  const legal = sections.pop();
  legal.classList.add('section-legal');

  nav.append(fragment);

  el.append(nav);
}
