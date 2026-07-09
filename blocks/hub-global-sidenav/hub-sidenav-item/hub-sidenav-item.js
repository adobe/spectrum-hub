/* Expandable items follow Disclosure Navigation Menu APG: https://www.w3.org/WAI/ARIA/apg/patterns/disclosure/examples/disclosure-navigation/ */

import { LitElement, html, nothing, ifDefined } from '../../../deps/lit/dist/index.js';
import '../../../deps/components/swc-tooltip/dist/index.js';
import loadStyle from '../../../scripts/utils/styles.js';

const styles = await loadStyle(import.meta.url);

function pathToId(path) {
  return path ? path.replace(/\//g, '-').replace(/^-/, '') : '';
}

class HubSidenavItem extends LitElement {
  static properties = {
    label: {},
    href: {},
    iconPath: { attribute: 'icon-path' },
    expandable: { type: Boolean },
    expanded: { type: Boolean, reflect: true },
    collapsed: { type: Boolean, reflect: true },
  };

  connectedCallback() {
    super.connectedCallback();
    this.shadowRoot.adoptedStyleSheets = [styles];
  }

  get _isActive() {
    return Boolean(this.href && window.location.pathname === this.href);
  }

  _toggle() {
    this.expanded = !this.expanded;
  }

  render() {
    if (this.expandable) {
      const childrenId = `hub-sidenav-item-children-${pathToId(this.href)}`;
      return html`
        <button
          id="hub-sidenav-item-toggle"
          class="hub-sidenav-item-toggle"
          type="button"
          aria-expanded=${this.expanded ? 'true' : 'false'}
          aria-controls=${childrenId}
          @click=${this._toggle}
        >
          <span class="hub-sidenav-item-label">${this.label}</span>
          <span class="hub-sidenav-item-chevron" aria-hidden="true"></span>
        </button>
        <div id=${childrenId} class="hub-sidenav-item-children" .inert=${!this.expanded}>
          <slot></slot>
        </div>
        ${this.collapsed ? html`
          <swc-tooltip variant="neutral" for="hub-sidenav-item-toggle" placement="end" delay="500">
            ${this.label}
          </swc-tooltip>
        ` : nothing}
      `;
    }

    return html`
      <a
        id="hub-sidenav-item-link"
        class="hub-sidenav-item-link"
        href=${this.href || ''}
        aria-current=${ifDefined(this._isActive ? 'page' : undefined)}
      >
        ${this.iconPath ? html`
          <span
            class="hub-sidenav-item-icon"
            aria-hidden="true"
            style="mask-image: url('${this.iconPath}')"
          ></span>
        ` : nothing}
        <span class="hub-sidenav-item-label">${this.label}</span>
      </a>
      ${this.collapsed ? html`
        <swc-tooltip variant="neutral" for="hub-sidenav-item-link" placement="end" delay="500">
          ${this.label}
        </swc-tooltip>
      ` : nothing}
    `;
  }
}

// hub-sidenav-item is a shared subcomponent of hub-global-sidenav (and
// eventually hub-section-sidenav) — it is not an author-facing block and has
// no standalone rendering, so it registers its tag on import with no default
// export.
customElements.define('hub-sidenav-item', HubSidenavItem);
