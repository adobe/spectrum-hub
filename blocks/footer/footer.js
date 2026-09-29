import { getConfig, getMetadata } from '../../scripts/ak.js';
import { loadFragment } from '../fragment/fragment.js';

const FOOTER_PATH = '/fragments/nav/footer';
const ADOBE_PRIVACY_FALLBACK_URL = 'https://www.adobe.com/privacy/cookies.html';

function decoratePrivacyFallbackLink(fragment) {
  const privacyLink = fragment.querySelector(`a[href="${ADOBE_PRIVACY_FALLBACK_URL}"]`);
  if (privacyLink) {
    privacyLink.dataset.fedsAction = 'open-adchoices-modal';
  }
}

/**
 * loads and decorates the footer
 * @param {Element} el The footer element
 */
export default async function init(el) {
  const { locale } = getConfig();
  const footerMeta = getMetadata('footer');
  const path = footerMeta || FOOTER_PATH;

  const { fragment } = await loadFragment(`${locale.prefix}${path}`);
  if (!fragment) { return; }
  fragment.classList.add('footer-content');
  decoratePrivacyFallbackLink(fragment);

  const sections = [...fragment.querySelectorAll('.section')];

  const copyright = sections.pop();
  copyright.classList.add('section-copyright');

  el.append(fragment);
}
