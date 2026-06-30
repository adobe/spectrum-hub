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
      this.toggleAttribute('open', this._isOpen && this._isMobile);
    }
    if (changed.has('_isOpen') && this._isMobile) {
      if (this._isOpen) {
        requestAnimationFrame(() => this._setupFocusTrap());
      } else if (changed.get('_isOpen')) {
        this._teardownFocusTrap();
        if (this._backToMenuActivated) {
          this._backToMenuActivated = false;
          // Transfer focus to hub-global-sidenav's first item, then signal it to install its trap.
          const globalNav = document.querySelector('hub-global-sidenav');
          const navEl = globalNav?.shadowRoot?.querySelector('.hub-global-sidenav__nav');
          const firstFocusable = navEl?.querySelector('hub-sidenav-item')
            ?.shadowRoot?.querySelector('a, button');
          requestAnimationFrame(() => {
            firstFocusable?.focus();
            document.dispatchEvent(new CustomEvent('hub:section-nav-back'));
          });
        } else {
          this._returnFocus();
        }
      }
    }
  }

  _setupFocusTrap() {
    const nav = this.shadowRoot.querySelector('.hub-section-sidenav__nav');
    if (!nav) { return; }

    const firstFocusable = nav.querySelector('hub-sidenav-item')
      ?.shadowRoot?.querySelector('a, button');
    firstFocusable?.focus();

    if (this._trapKeyHandler) { return; } // Already installed.

    this._trapKeyHandler = (e) => {
      if (e.key !== 'Tab' || !this._isOpen || !this._isMobile) { return; }

      // Only act when focus is inside this component's nav.
      if (!nav.contains(this.shadowRoot.activeElement)) { return; }

      const backBtn = nav.querySelector('.hub-section-sidenav__back');
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
        <div class="hub-section-sidenav__group-header">${node.label}</div>
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
    if (!this._tree.length) { return nothing; }

    const navSection = this._selectedSection || getTopSection();
    return html`
      <nav
        class="hub-section-sidenav__nav"
        aria-label=${`${formatLabel(navSection || '')} navigation`}
        ?inert=${this._isMobile && !this._isOpen}
      >
        ${this._sectionLabel ? html`
          <div class="hub-section-sidenav__section-header">${this._sectionLabel}</div>
        ` : nothing}
        ${this._tree.map((node) => this._renderItem(node))}
        ${this._isMobile ? html`
          <button
            class="hub-section-sidenav__back"
            @click=${this._backToMenu}
          >
            <span class="hub-section-sidenav__back-icon" aria-hidden="true"></span>
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
