import DA_SDK from 'https://da.live/nx/utils/sdk.js';
import { LitElement, html, nothing } from '../../deps/lit/dist/index.js';
import {
  loadComponents, loadPageDescription, loadComponentDescription, savePageDescription,
} from './utils.js';

// Super Lite components
import 'https://da.live/nx/public/sl/components.js';

// Application styles
import loadStyle from '../../scripts/utils/styles.js';

const styles = await loadStyle(import.meta.url);

class ADLSeoDescription extends LitElement {
  static properties = {
    basePath: { attribute: false },
    path: { attribute: false },
    token: { attribute: false },
    _components: { state: true },
    _selected: { state: true },
    _currentDescription: { state: true },
    _description: { state: true },
    _status: { state: true },
  };

  constructor() {
    super();
    this._selected = undefined;
  }

  connectedCallback() {
    super.connectedCallback();
    this.shadowRoot.adoptedStyleSheets = [styles];
    this.init();
  }

  async init() {
    this._status = 'Loading components...';
    const [components, currentDescription] = await Promise.all([
      loadComponents(this.basePath, this.token),
      loadPageDescription(this.path, this.token),
    ]);
    this._components = components;
    this._currentDescription = currentDescription;
    this._status = undefined;
  }

  selectComponent(name) {
    this._selected = name;
  }

  async generateDescription() {
    this._status = 'Building description...';
    const component = this._components.find((cmp) => cmp.name === this._selected);
    this._description = await loadComponentDescription(component, this.token);
    this._status = undefined;
  }

  async updateDescription() {
    this._status = 'Saving description...';
    const { message, type } = await savePageDescription(
      this.path,
      this.token,
      this._description,
    );
    if (type === 'success') {
      this._currentDescription = this._description;
      this._description = undefined;
      this._selected = undefined;
      this._status = undefined;
    } else {
      this._status = message;
    }
  }

  renderCurrent() {
    if (!this._currentDescription) { return nothing; }
    return html`
      <div class="current-description">
        <p class="title">Current description</p>
        <p>${this._currentDescription}</p>
      </div>
    `;
  }

  renderComponentPicker() {
    if (!this._components?.length) {
      return html`<p class="empty">No components found in fragments/components.</p>`;
    }

    return html`
      <p class="title">Pick a component</p>
      <ul class="component-list">
        ${this._components.map((cmp) => html`
          <li>
            <label>
              <input
                type="radio"
                name="component"
                value=${cmp.name}
                .checked=${this._selected === cmp.name}
                @change=${() => this.selectComponent(cmp.name)}
              />
              ${cmp.name}
            </label>
          </li>
        `)}
      </ul>
      <div class="action-area">
        <sl-button
          ?disabled=${!this._selected}
          @click=${this.generateDescription}
        >Build description</sl-button>
      </div>
    `;
  }

  renderPreview() {
    return html`
      <p class="title generated">Generated description</p>
      <p class="preview">${this._description}</p>
      <div class="action-area">
        <sl-button class="secondary" @click=${() => { this._description = undefined; }}>
          Back
        </sl-button>
        <sl-button @click=${this.updateDescription}>Save description</sl-button>
      </div>
    `;
  }

  renderStatus() {
    return html`<p class="status">${this._status}</p>`;
  }

  render() {
    if (this._status !== undefined) { return this.renderStatus(); }
    return html`
      <h1>SEO Description</h1>
      ${this.renderCurrent()}
      ${this._description ? this.renderPreview() : this.renderComponentPicker()}
    `;
  }
}

customElements.define('adl-seo-description', ADLSeoDescription);

(async function init() {
  const { context, token } = await DA_SDK;
  const { org, repo, path } = context;

  const cmp = document.createElement('adl-seo-description');
  cmp.basePath = `/${org}/${repo}`;
  cmp.path = `/${org}/${repo}${path}`;
  cmp.token = token;

  document.body.append(cmp);
}());
