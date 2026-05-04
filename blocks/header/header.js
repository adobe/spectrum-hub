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

function addMobileNavListeners(button, navElement) {
  let isOpen = false;
  button.setAttribute('aria-expanded', 'false');
  button.setAttribute('aria-controls', 'main-nav-list');
  button.setAttribute('aria-label', 'Mobile navigation');

  function closeNav() {
    isOpen = false;
    navElement.classList.remove('open');
    navElement.classList.add('closed');
    button.setAttribute('aria-expanded', 'false');
    button.setAttribute('aria-label', 'Open mobile navigation');
  }

  button.addEventListener('click', () => {
    if (isOpen) {
      closeNav();
    } else {
      isOpen = true;
      navElement.classList.add('open');
      navElement.classList.remove('closed');
      button.setAttribute('aria-expanded', 'true');
      button.setAttribute('aria-label', 'Close mobile navigation');
    }
  });

  window.matchMedia('(width >= 800px)').addEventListener('change', (e) => {
    if (e.matches && isOpen) closeNav();
  });
}

function createMobileNavButton(fragment) {
  const mainNav = fragment.querySelector('.main-nav-section');

  const mobileNavButton = document.createElement('button');
  mobileNavButton.classList.add('mobile-nav-button');
  mobileNavButton.setAttribute('aria-controls', 'main-nav-list');
  mobileNavButton.innerHTML = `${HAMBURGER_MENU_ICON}`;
  addMobileNavListeners(mobileNavButton, mainNav);

  mainNav.prepend(mobileNavButton);
}

function createMobileNavItems(nav, actions) {
  const mainNav = nav;
  const mainNavItems = mainNav.querySelectorAll('li');

  const actionsNav = actions;
  const actionsNavItems = actionsNav.querySelectorAll('li');
  const allNavItems = [...mainNavItems, ...actionsNavItems];

  const mobileNav = document.createElement('ul');
  mobileNav.classList.add('mobile-nav');
  mobileNav.setAttribute('id', 'main-nav-list');
  mobileNav.setAttribute('role', 'navigation');
  allNavItems.forEach((item) => {
    mobileNav.append(item.cloneNode(true));
  });
  mainNav.append(mobileNav);
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
  if (nav) {
    decorateNavSection(nav);
    createMobileNavButton(fragment);
  }
  if (actions) decorateActionSection(actions);

  if (nav && actions) createMobileNavItems(nav, actions);
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

  const skipLink = createSkipLink();
  el.prepend(skipLink);
}
