import { getConfig, getMetadata } from '../../scripts/ak.js';
import { picture2svg } from '../../scripts/utils/svg.js';
import { loadFragment } from '../fragment/fragment.js';

const { locale } = getConfig();

const HEADER_PATH = '/fragments/nav/header';
const HAMBURGER_MENU_ICON = `
  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 20 20" aria-hidden="true" fill="currentColor">
    <path d="m16.25,14H3.75c-.41406,0-.75.33594-.75.75s.33594.75.75.75h12.5c.41406,0,.75-.33594.75-.75s-.33594-.75-.75-.75Z"/>
    <path d="m3.75,5.5h12.5c.41406,0,.75-.33594.75-.75s-.33594-.75-.75-.75H3.75c-.41406,0-.75.33594-.75.75s.33594.75.75.75Z"/>
    <path d="m16.25,9H3.75c-.41406,0-.75.33594-.75.75s.33594.75.75.75h12.5c.41406,0,.75-.33594.75-.75s-.33594-.75-.75-.75Z"/>
  </svg>`;

function createSkipLink() {
  const skipLink = document.createElement('a');
  skipLink.classList.add('skip-link');
  skipLink.classList.add('visually-hidden');
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
  button.setAttribute('aria-expanded', 'false');
  button.setAttribute('aria-controls', 'main-nav-list'); // can i add this id to the nav element in ue-sidenav
  button.setAttribute('aria-label', 'Open mobile navigation');

  button.addEventListener('click', () => {
    const globalNav = document.querySelector('.global-sidenav ue-sidenav');
    if (!globalNav) { return; }
    globalNav.handleToggle();
    const { isOpen } = globalNav;

    const sectionNav = document.querySelector('.section-sidenav ue-sidenav');
    if (sectionNav) { sectionNav.handleToggle(); }

    button.setAttribute('aria-expanded', String(isOpen));
    button.setAttribute('aria-label', isOpen ? 'Close navigation' : 'Open navigation');
  });
}

function createMobileNavButton(fragment) {
  let target = fragment.querySelector('.main-nav-section');
  if (!target) {
    target = document.createElement('div');
    target.classList.add('main-nav-section');
    const lastSection = [...fragment.querySelectorAll(':scope > .section')].at(-1);
    if (lastSection) {
      fragment.insertBefore(target, lastSection);
    } else {
      fragment.append(target);
    }
  }

  const mobileNavButton = document.createElement('button');
  mobileNavButton.classList.add('mobile-nav-button');
  mobileNavButton.innerHTML = `${HAMBURGER_MENU_ICON}`;
  addMobileNavListeners(mobileNavButton);
  target.prepend(mobileNavButton);
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

  let navElement;
  if (nav) {
    navElement = decorateNavSection(nav);
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
