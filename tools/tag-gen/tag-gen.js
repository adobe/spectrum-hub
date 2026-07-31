import DA_SDK from 'https://da.live/nx/utils/sdk.js';
import { LitElement, html, nothing } from '../../deps/lit/dist/index.js';
import { loadPageTags, loadGenTags, savePageTags } from './utils.js';

// Super Lite components
import 'https://da.live/nx/public/sl/components.js';

// Application styles
import loadStyle from '../../scripts/utils/styles.js';

const styles = await loadStyle(import.meta.url);

class ADLTagGen extends LitElement {
  static properties = {
    path: { attribute: false },
    token: { attribute: false },
    _pageTags: { state: true },
    _genTags: { state: true },
    _status: { state: true },
  };

  connectedCallback() {
    super.connectedCallback();
    this.shadowRoot.adoptedStyleSheets = [styles];
    this.getPageTags();
  }

  async getPageTags() {
    this._pageTags = await loadPageTags(this.path, this.token);
    this._status = undefined;
  }

  async generateTags() {
    this._status = 'Generating tags...';
    this._genTags = await loadGenTags(this.path, this.token);
    this._status = undefined;
  }

  async updateTags() {
    this._status = 'Updating page...';
    const { message, type } = await savePageTags(this.path, this.token, this._genTags);
    if (type === 'success') {
      this._pageTags = [...this._genTags];
      this._genTags = undefined;
      this._status = undefined;
    } else {
      this._status = message;
    }
  }

  get title() {
    return this._genTags ? 'Generated tags' : 'Current tags';
  }

  get tags() {
    return this._genTags || this._pageTags;
  }

  renderTags() {
    if (!this.tags) { return nothing; }

    return html`
      <p class="title ${this._genTags ? 'generated' : ''}">${this.title}</p>
      <ul>${this.tags.map((tag) => html`<li>${tag}</li>`)}</ul>
      <div class="action-area">
      ${this.title === 'Current tags'
    ? html`<button class="btn-gradient" @click=${this.generateTags}>
                <svg><use href="/tools/tag-gen/tag-gen.svg#tag-gen" /></svg> Generate tags</button>`
    : html`<sl-button @click=${this.updateTags}>Save tags</sl-button>`}
      </div>
    `;
  }

  renderStatus() {
    return html`
      <div class="status-container">
        <svg><use href="/tools/tag-gen/tag-gen.svg#tag-gen" /></svg>
        <p class="status">${this._status}</p>
      </div>
    `;
  }

  render() {
    if (!(this._genTags || this._pageTags || this._status)) { return nothing; }

    return html`
      ${this._status !== undefined ? this.renderStatus() : this.renderTags()}
    `;
  }
}

customElements.define('adl-tag-gen', ADLTagGen);

(async function init() {
  const { context, token } = await DA_SDK;
  const { org, repo, path } = context;

  const cmp = document.createElement('adl-tag-gen');
  cmp.path = `/${org}/${repo}${path}`;
  cmp.token = token;

  document.body.append(cmp);
}());
