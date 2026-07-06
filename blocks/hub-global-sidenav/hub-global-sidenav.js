/* On mobile the drawer follows Dialog (Modal) APG: https://www.w3.org/WAI/ARIA/apg/patterns/dialog-modal/ */

import { LitElement, html, nothing } from '../../deps/lit/dist/index.js';
import loadStyle from '../../scripts/utils/styles.js';
import { getConfig } from '../../scripts/ak.js';
import '../../deps/components/swc-tooltip/dist/index.js';

const styles = await loadStyle(import.meta.url);
const { locale } = getConfig();
const RAIL_FRAGMENT = '/fragments/nav/global-sidenav';
const LS_KEY = 'hub-sidenav-collapsed';
const HOST_ID = 'hub-global-sidenav';
const MOBILE_DRAWER_LABEL = 'Site navigation';

export function pathToId(path) {
  return path.replace(/\//g, '-').replace(/^-/, '');
}

// Traverses nested shadow roots to find the truly focused element.
function getDeepActiveElement(root = document) {
  const active = root.activeElement;
  if (active?.shadowRoot) { return getDeepActiveElement(active.shadowRoot); }
  return active;
}

export async function parseRailFragment(path) {
  const resp = await fetch(path);
  if (!resp.ok) { return null; }
  const text = await resp.text();
  const doc = new DOMParser().parseFromString(text, 'text/html');
  return [...doc.querySelectorAll('main li')].map((li) => {
    const link = li.querySelector('a');
    if (!link) { return null; }
    const iconSpan = li.querySelector('span.icon');
    const iconName = iconSpan?.classList[1]?.substring(5);
    return {
      path: link.getAttribute('href'),
      label: link.textContent.trim(),
      iconPath: iconName ? `/img/icons/s2-icon-${iconName}-20-n.svg` : null,
    };
  }).filter(Boolean);
}

const COLLAPSE_ICON = html`
  <svg
    class="hub-global-sidenav-toggle-icon"
    xmlns="http://www.w3.org/2000/svg"
    fill="currentColor"
    width="20"
    height="20"
    viewBox="0 0 20 20"
    aria-hidden="true"
  >
    <rect id="animate-panel-bar" x="5" y="5" height="10" rx=".75" ry=".75" />
    <path d="M15.75,18H4.25c-1.24023,0-2.25-1.00928-2.25-2.25V4.25c0-1.24072,1.00977-2.25,2.25-2.25h11.5c1.24023,0,2.25,1.00928,2.25,2.25v11.5c0,1.24072-1.00977,2.25-2.25,2.25ZM4.25,3.5c-.41309,0-.75.33643-.75.75v11.5c0,.41357.33691.75.75.75h11.5c.41309,0,.75-.33643.75-.75V4.25c0-.41357-.33691-.75-.75-.75H4.25Z" />
  </svg>
`;

class HubGlobalSidenav extends LitElement {
  static properties = {
    _items: { state: true },
    _isOpen: { state: true },
    _isMobile: { state: true },
    _isCollapsed: { state: true },
    _isHoverLocked: { state: true },
  };

  constructor() {
    super();
    this._items = [];
    this._isOpen = false;
    this._isMobile = false;
    this._isCollapsed = localStorage.getItem(LS_KEY) !== 'false';
    this._isHoverLocked = false;
    this._openFocusTrigger = null;
    this._trapKeyHandler = null;
    this._inertedSiblings = [];
    this._focusSettled = false;
  }

  async connectedCallback() {
    super.connectedCallback();
    this.shadowRoot.adoptedStyleSheets = [styles];
    if (!this.id) { this.id = HOST_ID; }

    this._mq = window.matchMedia('(width < 900px)');
    this._isMobile = this._mq.matches;
    this._mqHandler = () => {
      this._isMobile = this._mq.matches;
      if (!this._isMobile) { this._isOpen = false; }
    };
    this._mq.addEventListener('change', this._mqHandler);

    this._toggleHandler = (e) => {
      if (e.detail.open && this._isMobile) {
        this._openFocusTrigger = document.activeElement;
      }
      this._isOpen = e.detail.open;
    };
    document.addEventListener('hub:sidenav-toggle', this._toggleHandler);

    this._closedHandler = () => { this._isOpen = false; };
    document.addEventListener('hub:sidenav-closed', this._closedHandler);

    this._escHandler = (e) => {
      if (e.key === 'Escape' && this._isOpen) { this._selfClose(); }
    };
    document.addEventListener('keydown', this._escHandler);

    // When hub-section-sidenav closes via "Back to main menu", move focus onto our
    // first item (it was covering us, so focus needs to come back to this layer).
    // It also just released everything it had marked inert (including our background,
    // which we may have skipped sweeping ourselves while it was the topmost layer) —
    // re-assert it now that we're the active dialog again.
    this._sectionNavBackHandler = () => {
      if (this._isOpen && this._isMobile) {
        this._setBackgroundInert(true);
        this._setupFocusTrap();
      }
    };
    document.addEventListener('hub:section-nav-back', this._sectionNavBackHandler);

    const items = await parseRailFragment(`${locale.prefix}${RAIL_FRAGMENT}`);
    this._items = items || [];
  }

  disconnectedCallback() {
    super.disconnectedCallback();
    this._mq?.removeEventListener('change', this._mqHandler);
    document.removeEventListener('hub:sidenav-toggle', this._toggleHandler);
    document.removeEventListener('hub:sidenav-closed', this._closedHandler);
    document.removeEventListener('keydown', this._escHandler);
    document.removeEventListener('hub:section-nav-back', this._sectionNavBackHandler);
    this._teardownFocusTrap();
  }

  updated(changed) {
    if (changed.has('_isOpen') || changed.has('_isMobile')) {
      const modalOpen = this._isOpen && this._isMobile;
      this.toggleAttribute('open', modalOpen);
      if (modalOpen) {
        // Defer so hub-section-sidenav's own (synchronous) update has settled
        // first — same reasoning as the focus-trap deferral below. If section
        // is also open, it's the topmost layer and owns the background sweep;
        // skip ours so the two don't race over which wrapper div ends up inert.
        requestAnimationFrame(() => {
          const sectionNav = document.querySelector('hub-section-sidenav');
          if (!sectionNav?.hasAttribute('open')) { this._setBackgroundInert(true); }
        });
      } else {
        this._setBackgroundInert(false);
      }
      if (this._isMobile && this._isOpen) {
        this.setAttribute('role', 'dialog');
        this.setAttribute('aria-modal', 'true');
        this.setAttribute('aria-label', MOBILE_DRAWER_LABEL);
      } else {
        this.removeAttribute('role');
        this.removeAttribute('aria-modal');
        this.removeAttribute('aria-label');
      }
    }
    if (changed.has('_isCollapsed') || changed.has('_isMobile')) {
      this.toggleAttribute('collapsed', Boolean(this._isCollapsed && !this._isMobile));
    }
    if (changed.has('_isOpen') && this._isMobile) {
      if (this._isOpen) {
        this._focusSettled = false;
        requestAnimationFrame(() => this._setupFocusTrap());
      } else if (changed.get('_isOpen')) {
        this._teardownFocusTrap();
        this._returnFocus();
      }
    }
    // Items may still be loading when the drawer opens; once they arrive, move
    // focus onto the first one unless it was already settled there.
    if (changed.has('_items') && this._isOpen && this._isMobile && !this._focusSettled) {
      this._setupFocusTrap();
    }
  }

  _setupFocusTrap() {
    const nav = this.shadowRoot.querySelector('.hub-global-sidenav-nav');
    if (!nav) { return; }
    const getFirstFocusable = () => nav.querySelector('.hub-global-sidenav-item-btn');

    // Defer to hub-section-sidenav only when it is actually open on top.
    // (It pre-fetches its tree on load, so "has content" is always true and
    // can't tell us whether it is the visible layer.)
    const sectionNav = document.querySelector('hub-section-sidenav');
    if (sectionNav?.hasAttribute('open')) { return; }

    const firstItem = getFirstFocusable();
    if (firstItem) {
      firstItem.focus();
      this._focusSettled = true;
    } else if (!this._focusSettled) {
      // No items loaded yet — fall back so focus isn't stranded outside the dialog.
      nav.querySelector('.hub-global-sidenav-close')?.focus();
    }

    if (this._trapKeyHandler) { return; } // Already installed.

    this._trapKeyHandler = (e) => {
      if (e.key !== 'Tab' || !this._isOpen || !this._isMobile) { return; }

      // Only act when focus is inside this component's nav.
      if (!nav.contains(this.shadowRoot.activeElement)) { return; }

      const closeBtn = nav.querySelector('.hub-global-sidenav-close');
      const deepActive = getDeepActiveElement();
      const firstNow = getFirstFocusable();

      if (!e.shiftKey && deepActive === closeBtn) {
        // Tab from close button → wrap to first item.
        e.preventDefault();
        firstNow?.focus();
      } else if (e.shiftKey && deepActive === firstNow) {
        // Shift+Tab from first item → wrap to close button.
        e.preventDefault();
        closeBtn?.focus();
      }
    };
    document.addEventListener('keydown', this._trapKeyHandler);
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
      // hub-section-sidenav's own sweep may have already marked this element
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

  _teardownFocusTrap() {
    if (!this._trapKeyHandler) { return; }
    document.removeEventListener('keydown', this._trapKeyHandler);
    this._trapKeyHandler = null;
  }

  _returnFocus() {
    this._openFocusTrigger?.focus();
    this._openFocusTrigger = null;
  }

  _selfClose() {
    document.dispatchEvent(new CustomEvent('hub:sidenav-closed'));
  }

  _isSectionActive(path) {
    const { pathname } = window.location;
    return Boolean(path && (pathname === path || pathname.startsWith(`${path}/`)));
  }

  _selectSection(path) {
    const section = path.split('/').filter(Boolean)[0];
    console.log('NOICE! [hub-global-sidenav] section button clicked');
    document.dispatchEvent(new CustomEvent('hub:section-selected', {
      detail: { section },
    }));
  }

  _toggleCollapse() {
    this._isCollapsed = !this._isCollapsed;
    localStorage.setItem(LS_KEY, String(this._isCollapsed));
    this.setAttribute('data-anim-dir', this._isCollapsed ? 'collapse' : 'expand');
    // Lock hover so the icon does not immediately flip to the opposite preview
    // while the pointer is still on the button after a click.
    this._isHoverLocked = true;
  }

  // Clear the hover lock on pointer exit so the next hover can preview again.
  _unlockHover() {
    this._isHoverLocked = false;
  }

  render() {
    const collapseLabel = this._isCollapsed ? 'Expand navigation' : 'Collapse navigation';
    return html`
      ${this._isMobile && this._isOpen ? html`
        <div
          class="hub-global-sidenav-backdrop"
          aria-hidden="true"
          @click=${this._selfClose}
        ></div>
      ` : nothing}
      <nav
        class="hub-global-sidenav-nav"
        aria-label="Top-level site navigation"
        ?inert=${this._isMobile && !this._isOpen}
      >
        ${this._items.map(({ path, label, iconPath }) => html`
          <button
            id=${pathToId(path)}
            class="hub-global-sidenav-item-btn"
            type="button"
            aria-label="${label}, opens section navigation"
            aria-current=${this._isSectionActive(path) ? 'true' : nothing}
            @click=${() => this._selectSection(path)}
          >
            <span
              class="hub-global-sidenav-item-icon"
              aria-hidden="true"
              style="mask-image: url('${iconPath ?? '/img/icons/s2-icon-circle-20-n.svg'}')"
            ></span>
            <span class="hub-global-sidenav-item-label" aria-hidden="true">${label}</span>
          </button>
          ${!this._isMobile && this._isCollapsed ? html`
            <swc-tooltip variant="neutral" for=${pathToId(path)} placement="end" delay="200">
              ${label}
            </swc-tooltip>
          ` : nothing}
        `)}
        ${!this._isMobile ? html`
          <button
            id="hub-global-sidenav-toggle"
            class="hub-global-sidenav-toggle-btn${this._isHoverLocked ? ' is-hover-locked' : ''}"
            type="button"
            aria-label=${collapseLabel}
            @click=${this._toggleCollapse}
            @mouseleave=${this._unlockHover}
          >
            ${COLLAPSE_ICON}
          </button>
          <swc-tooltip
            for="hub-global-sidenav-toggle"
            placement="end"
            delay="200"
          >
            ${collapseLabel}
          </swc-tooltip>
        ` : nothing}
        ${this._isMobile ? html`
          <button
            class="hub-global-sidenav-close"
            type="button"
            aria-label="Close navigation"
            @click=${this._selfClose}
          >
            <span class="hub-global-sidenav-close-icon" aria-hidden="true"></span>
          </button>
        ` : nothing}
      </nav>
    `;
  }
}

customElements.define('hub-global-sidenav', HubGlobalSidenav);

export default async function init(el) {
  el.append(document.createElement('hub-global-sidenav'));
}
