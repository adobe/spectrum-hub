/* On mobile the drawer follows Dialog (Modal) APG: https://www.w3.org/WAI/ARIA/apg/patterns/dialog-modal/ */

import { LitElement, html, nothing } from '../../deps/lit/dist/index.js';
import loadStyle from '../../scripts/utils/styles.js';
import { getConfig } from '../../scripts/ak.js';
import '../hub-sidenav-item/hub-sidenav-item.js';

const styles = await loadStyle(import.meta.url);
const { locale } = getConfig();
const SECTION_HEADER_CONFIG = {
  web: {
    roots: ['/web'],
  },
};
const MOBILE_DRAWER_LABEL = 'Section navigation';

export function getTopSection() {
  const { pathname } = window.location;
  const stripped = pathname.startsWith(locale.prefix)
    ? pathname.slice(locale.prefix.length) : pathname;
  const parts = stripped.split('/').filter(Boolean);
  const section = parts[0];
  return section || null;
}

export function formatLabel(key) {
  return key.charAt(0).toUpperCase() + key.slice(1).replace(/-/g, ' ');
}

// Traverses nested shadow roots to find the truly focused element.
function getDeepActiveElement(root = document) {
  const active = root.activeElement;
  if (active?.shadowRoot) { return getDeepActiveElement(active.shadowRoot); }
  return active;
}

export async function fetchSectionTree(topSection) {
  const resp = await fetch('/query-index.json');
  if (!resp.ok) { return null; }
  const { data } = await resp.json();

  const headerEnabled = Boolean(SECTION_HEADER_CONFIG[topSection]);
  const pages = data.filter(({ path }) => path.startsWith(`/${topSection}/`));
  const sectionPath = `/${topSection}`;
  if (!pages.length) { return null; }
  const sectionLabel = headerEnabled
    ? data.find(({ path }) => path === sectionPath)?.title || formatLabel(topSection)
    : null;

  const root = { children: new Map() };
  pages.forEach(({ path, title }) => {
    const parts = path.split('/').filter(Boolean);
    let node = root;
    for (let i = 1; i < parts.length; i += 1) {
      const key = parts[i];
      if (!node.children.has(key)) {
        node.children.set(key, {
          key,
          path: `/${parts.slice(0, i + 1).join('/')}`,
          title: null,
          children: new Map(),
        });
      }
      node = node.children.get(key);
    }
    node.title = title;
  });

  function flatten(node) {
    return {
      path: node.path,
      label: node.title || formatLabel(node.key),
      children: [...node.children.values()].map(flatten),
    };
  }

  const tree = [...root.children.values()].map(flatten);
  tree.sectionPath = sectionPath;
  tree.sectionLabel = sectionLabel;
  return tree;
}

class HubSectionSidenav extends LitElement {
  static properties = {
    _tree: { state: true },
    _sectionLabel: { state: true },
    _isOpen: { state: true },
    _isMobile: { state: true },
    _selectedSection: { state: true },
  };

  constructor() {
    super();
    this._tree = [];
    this._sectionLabel = null;
    this._isOpen = false;
    this._isMobile = false;
    this._selectedSection = null;
    this._openFocusTrigger = null;
    this._trapKeyHandler = null;
    this._backToMenuActivated = false;
    this._inertedSiblings = [];
    this._focusSettled = false;
  }

  async connectedCallback() {
    super.connectedCallback();
    this.shadowRoot.adoptedStyleSheets = [styles];

    this._mq = window.matchMedia('(width < 900px)');
    this._isMobile = this._mq.matches;
    this._mqHandler = () => {
      this._isMobile = this._mq.matches;
      if (!this._isMobile) { this._isOpen = false; }
    };
    this._mq.addEventListener('change', this._mqHandler);

    this._toggleHandler = (e) => {
      if (!e.detail.open) {
        this._isOpen = false;
        return;
      }
      // The mobile drawer opens both navs at once: surface the current
      // section on top of the global rail without a second tap. Skip when
      // there is no section tree (e.g. landing pages) so the global nav shows.
      if (this._isMobile && this._tree.length) {
        this._openFocusTrigger = document.activeElement;
        this._isOpen = true;
      }
    };
    document.addEventListener('hub:sidenav-toggle', this._toggleHandler);

    this._closedHandler = () => { this._isOpen = false; };
    document.addEventListener('hub:sidenav-closed', this._closedHandler);

    this._escHandler = (e) => {
      if (e.key === 'Escape' && this._isOpen) { document.dispatchEvent(new CustomEvent('hub:sidenav-closed')); }
    };
    document.addEventListener('keydown', this._escHandler);

    this._sectionSelectedHandler = async (e) => {
      const { section } = e.detail;
      if (this._isMobile) {
        this._openFocusTrigger = document.activeElement;
        this._isOpen = true;
      }
      if (section === this._selectedSection) { return; }
      this._selectedSection = section;
      const tree = await fetchSectionTree(section);
      this._tree = tree || [];
      this._sectionLabel = tree?.sectionLabel || null;
    };
    document.addEventListener('hub:section-selected', this._sectionSelectedHandler);

    const topSection = getTopSection();
    if (!topSection) { return; }
    this._selectedSection = topSection;
    const tree = await fetchSectionTree(topSection);
    this._tree = tree || [];
    this._sectionLabel = tree?.sectionLabel || null;
  }

  disconnectedCallback() {
    super.disconnectedCallback();
    this._mq?.removeEventListener('change', this._mqHandler);
    document.removeEventListener('hub:sidenav-toggle', this._toggleHandler);
    document.removeEventListener('hub:sidenav-closed', this._closedHandler);
    document.removeEventListener('keydown', this._escHandler);
    document.removeEventListener('hub:section-selected', this._sectionSelectedHandler);
    this._teardownFocusTrap();
  }

  updated(changed) {
    if (changed.has('_isOpen') || changed.has('_isMobile')) {
      const modalOpen = this._isOpen && this._isMobile;
      this.toggleAttribute('open', modalOpen);
      this._setBackgroundInert(modalOpen);
      if (modalOpen) {
        this.setAttribute('role', 'dialog');
        this.setAttribute('aria-modal', 'true');
        this.setAttribute('aria-label', MOBILE_DRAWER_LABEL);
      } else {
        this.removeAttribute('role');
        this.removeAttribute('aria-modal');
        this.removeAttribute('aria-label');
      }
    }
    if (changed.has('_isOpen') && this._isMobile) {
      if (this._isOpen) {
        this._focusSettled = false;
        requestAnimationFrame(() => this._setupFocusTrap());
      } else if (changed.get('_isOpen')) {
        this._teardownFocusTrap();
        if (this._backToMenuActivated) {
          this._backToMenuActivated = false;
          // hub-global-sidenav owns moving focus onto its own first item once
          // it's the active layer again — see its hub:section-nav-back handler.
          requestAnimationFrame(() => {
            document.dispatchEvent(new CustomEvent('hub:section-nav-back'));
          });
        } else {
          this._returnFocus();
        }
      }
    }
    // The section tree may still be loading when the drawer opens; once it
    // arrives, move focus onto the first item unless it was already settled there.
    // Items are nested hub-sidenav-item custom elements that render their own
    // shadow DOM asynchronously — await the specific child's updateComplete
    // rather than guessing at rAF/microtask timing.
    if (changed.has('_tree') && this._isOpen && this._isMobile && !this._focusSettled) {
      const item = this.shadowRoot.querySelector('.hub-section-sidenav-nav hub-sidenav-item');
      (item?.updateComplete ?? Promise.resolve()).then(() => this._setupFocusTrap());
    }
  }

  _setupFocusTrap() {
    const nav = this.shadowRoot.querySelector('.hub-section-sidenav-nav');
    if (!nav) { return; }

    const firstFocusable = nav.querySelector('hub-sidenav-item')
      ?.shadowRoot?.querySelector('a, button');
    if (firstFocusable) {
      firstFocusable.focus();
      this._focusSettled = true;
    } else if (!this._focusSettled) {
      // No items loaded yet — fall back so focus isn't stranded outside the dialog.
      nav.querySelector('.hub-section-sidenav-back')?.focus();
    }

    if (this._trapKeyHandler) { return; } // Already installed.

    this._trapKeyHandler = (e) => {
      if (e.key !== 'Tab' || !this._isOpen || !this._isMobile) { return; }

      // Only act when focus is inside this component's nav.
      if (!nav.contains(this.shadowRoot.activeElement)) { return; }

      const backBtn = nav.querySelector('.hub-section-sidenav-back');
      const deepActive = getDeepActiveElement();
      const firstNow = nav.querySelector('hub-sidenav-item')
        ?.shadowRoot?.querySelector('a, button');

      if (!e.shiftKey && deepActive === backBtn) {
        // Tab from back button → wrap to first item.
        e.preventDefault();
        firstNow?.focus();
      } else if (e.shiftKey && deepActive === firstNow) {
        // Shift+Tab from first item → wrap to back button.
        e.preventDefault();
        backBtn?.focus();
      }
    };
    document.addEventListener('keydown', this._trapKeyHandler);
  }

  _teardownFocusTrap() {
    if (!this._trapKeyHandler) { return; }
    document.removeEventListener('keydown', this._trapKeyHandler);
    this._trapKeyHandler = null;
  }

  // Makes everything outside this element's ancestor chain inert so the mobile
  // drawer's aria-modal="true" is actually true for keyboard and AT users.
  _setBackgroundInert(inert) {
    if (!inert) {
      this._inertedSiblings.forEach((sibling) => { sibling.inert = false; });
      this._inertedSiblings = [];
      return;
    }

    const siblings = [];
    let node = this;
    while (node && node !== document.body) {
      // hub-global-sidenav's own sweep may have already marked this element
      // — or an ancestor, e.g. the block wrapper div — inert when it opened
      // first. This branch is now the active (topmost) dialog, so clear it
      // as we walk up rather than just the custom element itself.
      node.inert = false;
      const { parentElement } = node;
      if (parentElement) {
        for (const sibling of parentElement.children) {
          if (sibling !== node && !sibling.inert) {
            sibling.inert = true;
            siblings.push(sibling);
          }
        }
      }
      node = parentElement;
    }
    this._inertedSiblings = siblings;
  }

  _returnFocus() {
    this._openFocusTrigger?.focus();
    this._openFocusTrigger = null;
  }

  _backToMenu() {
    this._backToMenuActivated = true;
    // Closing only this sidenav; focus transfer handled in updated().
    this._isOpen = false;
  }

  // depth is the nesting level: top-level items are 1, their children 2, etc.
  _renderItem(node, depth = 1) {
    if (depth === 1 && this._sectionLabel && node.children.length) {
      return html`
        <h3 class="hub-section-sidenav-group-header">${node.label}</h3>
        ${node.children.map((child) => this._renderItem(child, depth + 1))}
      `;
    }

    if (node.children.length) {
      const { pathname } = window.location;
      const isExpanded = pathname === node.path || pathname.startsWith(`${node.path}/`);
      return html`
        <hub-sidenav-item
          label=${node.label}
          href=${node.path}
          data-nested=${depth}
          expandable
          ?expanded=${isExpanded}
        >
          ${node.children.map((child) => this._renderItem(child, depth + 1))}
        </hub-sidenav-item>
      `;
    }
    return html`
      <hub-sidenav-item
        label=${node.label}
        href=${node.path}
        data-nested=${depth}
      ></hub-sidenav-item>
    `;
  }

  render() {
    // While the mobile drawer is open, still render the shell (so there's
    // always a way to dismiss it) even if the section tree hasn't loaded yet.
    if (!this._tree.length && !(this._isMobile && this._isOpen)) { return nothing; }

    const navSection = this._selectedSection || getTopSection();
    return html`
      <nav
        class="hub-section-sidenav-nav"
        aria-label=${`${formatLabel(navSection || '')} navigation`}
        ?inert=${this._isMobile && !this._isOpen}
      >
        ${this._sectionLabel ? html`
          <h2 class="hub-section-sidenav-section-header">${this._sectionLabel}</h2>
        ` : nothing}
        ${this._tree.map((node) => this._renderItem(node))}
        ${this._isMobile ? html`
          <button
            class="hub-section-sidenav-back"
            type="button"
            @click=${this._backToMenu}
          >
            <span class="hub-section-sidenav-back-icon" aria-hidden="true"></span>
            Back to main menu
          </button>
        ` : nothing}
      </nav>
    `;
  }
}

if (!customElements.get('hub-section-sidenav')) {
  customElements.define('hub-section-sidenav', HubSectionSidenav);
}

export default async function init(el) {
  el.append(document.createElement('hub-section-sidenav'));
}
