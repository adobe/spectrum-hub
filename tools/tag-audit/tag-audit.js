import DA_SDK from 'https://da.live/nx/utils/sdk.js';
import { LitElement, html, nothing } from '../../deps/lit/dist/index.js';
import loadTags from './utils.js';

// Super Lite components
import 'https://da.live/nx/public/sl/components.js';

// Application styles
import loadStyle from '../../scripts/utils/styles.js';

const styles = await loadStyle(import.meta.url);

class ADLTagAudit extends LitElement {
  static properties = {
    path: { attribute: false },
    token: { attribute: false },
    _status: { state: true },
    _tags: { state: true },
  };

  connectedCallback() {
    super.connectedCallback();
    this.shadowRoot.adoptedStyleSheets = [styles];
    this.getTags();
  }

  async getTags() {
    const setStatus = (message) => {
      this._status = message;
    };

    this._tags = await loadTags(this.path, this.token, setStatus);
    this._status = undefined;
  }

  toggleOpen(tag) {
    tag.open = !tag.open;
    this.requestUpdate();
  }

  renderPages(pages) {
    return html`
      <ul class="page-list">
        ${pages.map((page) => html`
          <li>
            <a href="https://da.live/edit#${page.uiPath}" target="_blank">${page.uiPath}</a>
          </li>`)}
      </ul>`;
  }

  renderTag(tag) {
    const noun = tag.pages.length === 1 ? 'Page' : 'Pages';

    return html`
      <li class="tag-item ${tag.open ? 'is-open' : ''}">
          <div class="title-area">
          <span class="title">${tag.name}</span>
          <div class="title-num-actions">
              <span class="count">${tag.pages.length} ${noun}</span>
              <sl-button
              class="primary outline"
              @click=${() => this.toggleOpen(tag)}>${tag.open ? 'Close' : 'View pages'}</sl-button>
          </div>
          </div>
          ${this.renderPages(tag.pages)}
      </li>`;
  }

  renderTags() {
    if (!this._tags) { return nothing; }
    return html`
      <ul class="tags-list">
        ${this._tags.map((tag) => this.renderTag(tag))}
      </ul>
    `;
  }

  renderStatus() {
    return html`<p class="status">${this._status}</p>`;
  }

  render() {
    return html`
      <h1>Tag Audit</h1>
      ${this._status ? this.renderStatus() : this.renderTags()}
    `;
  }
}

customElements.define('adl-tag-audit', ADLTagAudit);

(async function init() {
  const { context, token } = await DA_SDK;
  const { org, repo } = context;

  const cmp = document.createElement('adl-tag-audit');
  cmp.path = `/${org}/${repo}`;
  cmp.token = token;

  document.body.append(cmp);
}());
