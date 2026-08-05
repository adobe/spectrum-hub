import { LitElement, html } from 'lit';
import { loadIms, handleSignIn, handleSignOut } from '../../scripts/utils/ims.js';
import loadStyle from '../../scripts/utils/styles.js';

import '../../deps/se/se.js';

const sheet = await loadStyle(import.meta.url);

class SEProfile extends LitElement {
  static properties = {
    displayName: { attribute: false },
    avatar: { attribute: false },
    id: { type: String },
  };

  connectedCallback() {
    super.connectedCallback();
    this.shadowRoot.adoptedStyleSheets = [sheet];
  }

  renderProfile() {
    return html`
      <button id="avatar-button" popovertarget="se-profile-popover"><img src=${this.avatar}/></button>
      <div id="se-profile-popover" popover>
        <div class="se-profile-details-wrapper">
          <button class="se-profile-btn se-profile-btn-details">
            <picture>
              <img src="${this.avatar}" alt="Profile photo" />
            </picture>
            <div class="se-profile-details-name">
              <p class="se-profile-display-name">${this.displayName}</p>
              <p class="se-profile-email">${this.email}</p>
            </div>
          </button>
        </div>
        <button class="se-profile-btn se-profile-btn-signout" @click=${handleSignOut}>Sign out</button>
      </div>
    `;
  }

  renderSignIn() {
    return html`<se-button class="primary size-m" @click=${handleSignIn}>Sign in</se-button>`;
  }

  render() {
    return this.displayName ? this.renderProfile() : this.renderSignIn();
  }
}

customElements.define('se-profile', SEProfile);

export default async (a) => {
  const cmp = document.createElement('se-profile');
  const details = await loadIms();
  if (!details.anonymous) {
    const io = await details.getIo();
    if (io.user.avatar) { cmp.avatar = io.user.avatar; }
    cmp.displayName = details.displayName;
    cmp.email = details.email;
  }

  a.replaceWith(cmp);
};
