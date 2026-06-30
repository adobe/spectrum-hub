import { LitElement, html, nothing, ifDefined } from '../../deps/lit/dist/index.js';
import '../../deps/components/swc-tooltip/dist/index.js';
import loadStyle from '../../scripts/utils/styles.js';

const styles = await loadStyle(import.meta.url);

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
      return html`
        <button
          class="hub-sidenav-item-toggle"
          aria-expanded=${this.expanded ? 'true' : 'false'}
          @click=${this._toggle}
        >
          <span class="hub-sidenav-item-label">${this.label}</span>
          <span class="hub-sidenav-item-chevron" aria-hidden="true"></span>
        </button>
        <div class="hub-sidenav-item-children" .inert=${!this.expanded}>
          <slot></slot>
        </div>
      `;
    }

    return html`
      <a
        id="hub-sidenav-item-link"
        class="hub-sidenav-item-link"
        href=${this.href || nothing}
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

if (!customElements.get('hub-sidenav-item')) {
  customElements.define('hub-sidenav-item', HubSidenavItem);
}

export default async function init() {
  // hub-sidenav-item is a shared dependency block — no standalone rendering.
}
