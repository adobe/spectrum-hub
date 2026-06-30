import { getConfig, getMetadata } from '../../scripts/ak.js';
import { picture2svg } from '../../scripts/utils/svg.js';
import { loadFragment } from '../fragment/fragment.js';

const { locale } = getConfig();

const HEADER_PATH = '/fragments/nav/header';
const GLOBAL_SIDENAV_ID = 'hub-global-sidenav';
const HAMBURGER_MENU_ICON = `
  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 20 20" aria-hidden="true" fill="currentColor">
    <path d="m16.25,14H3.75c-.41406,0-.75.33594-.75.75s.33594.75.75.75h12.5c.41406,0,.75-.33594.75-.75s-.33594-.75-.75-.75Z"/>
    <path d="m3.75,5.5h12.5c.41406,0,.75-.33594.75-.75s-.33594-.75-.75-.75H3.75c-.41406,0-.75.33594-.75.75s.33594.75.75.75Z"/>
    <path d="m16.25,9H3.75c-.41406,0-.75.33594-.75.75s.33594.75.75.75h12.5c.41406,0,.75-.33594.75-.75s-.33594-.75-.75-.75Z"/>
  </svg>`;

function createSkipLink() {
  const skipLink = document.createElement('a');
  skipLink.classList.add('skip-link', 'visually-hidden');
  skipLink.href = '#main-content';
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

function decorateNavSection(section) {
  const navElement = document.createElement('nav');
  navElement.setAttribute('aria-label', 'Main navigation');
  navElement.classList.add('main-nav-section');

  const sectionLinks = section.querySelectorAll('a');
  sectionLinks.forEach((link) => {
    if (window.location.pathname === link.pathname) {
      link.setAttribute('aria-current', 'page');
    }
  });
  navElement.append(...Array.from(section.childNodes));
  section.replaceWith(navElement);
  return navElement;
}

async function decorateActionSection(section) {
  section.classList.add('actions-section');
  section.setAttribute('role', 'region');
  section.setAttribute('aria-label', 'Additional site actions');
}

function addMobileNavListeners(button) {
  button.type = 'button';
  button.setAttribute('aria-haspopup', 'dialog');
  button.setAttribute('aria-controls', GLOBAL_SIDENAV_ID);
  button.setAttribute('aria-expanded', 'false');
  button.setAttribute('aria-label', 'Open navigation menu');

  let navOpen = false;

  const setNavState = (open) => {
    navOpen = open;
    button.setAttribute('aria-expanded', String(navOpen));
    button.setAttribute('aria-label', navOpen ? 'Close navigation menu' : 'Open navigation menu');
  };

  button.addEventListener('click', () => {
    setNavState(!navOpen);
    document.dispatchEvent(new CustomEvent('hub:sidenav-toggle', { detail: { open: navOpen } }));
  });

  document.addEventListener('hub:sidenav-closed', () => setNavState(false));
}

function ensureGlobalSidenavId() {
  const sidenav = document.querySelector('hub-global-sidenav');
  if (sidenav && !sidenav.id) {
    sidenav.id = GLOBAL_SIDENAV_ID;
  }
}

function createMobileNavButton(fragment) {
  ensureGlobalSidenavId();
  const brand = fragment.querySelector('.brand-section');
  if (!brand) { return; }

  const target = document.createElement('div');
  target.classList.add('mobile-nav');

  const mobileNavButton = document.createElement('button');
  mobileNavButton.classList.add('mobile-nav-button');
  mobileNavButton.innerHTML = `${HAMBURGER_MENU_ICON}`;
  addMobileNavListeners(mobileNavButton);
  target.append(mobileNavButton);
  brand.insertAdjacentElement('afterend', target);
}

async function decorateHeader(fragment) {
  const sections = [...fragment.querySelectorAll(':scope > .section')];
  // Brand will always be first
  const brand = sections.shift();
  // Actions will always be last
  const actions = sections.pop();
  // Nav is anything left over
  const nav = sections[0];

  if (brand) { await decorateBrandSection(brand); }

  if (nav) {
    decorateNavSection(nav);
  }
  createMobileNavButton(fragment);
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
