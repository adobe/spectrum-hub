import DA_SDK from 'https://da.live/nx/utils/sdk.js';
import { LitElement, html } from '../../deps/lit/dist/index.js';
import {
  loadComponents, loadComponentDescription, findComponentPages, savePageDescription,
} from './utils.js';

// Super Lite components
import 'https://da.live/nx/public/sl/components.js';

// Application styles
import loadStyle from '../../scripts/utils/styles.js';

const styles = await loadStyle(import.meta.url);

class ADLSeoDescription extends LitElement {
  static properties = {
    basePath: { attribute: false },
    token: { attribute: false },
    _components: { state: true },
    _selected: { state: true },
    _matches: { state: true },
    _updated: { state: true },
    _status: { state: true },
  };

  constructor() {
    super();
    this._selected = new Set();
  }

  connectedCallback() {
    super.connectedCallback();
    this.shadowRoot.adoptedStyleSheets = [styles];
    this.init();
  }

  async init() {
    this._status = 'Loading components...';
    this._components = await loadComponents(this.basePath, this.token);
    this._status = undefined;
  }

  toggleComponent(name, checked) {
    const selected = new Set(this._selected);
    if (checked) {
      selected.add(name);
    } else {
      selected.delete(name);
    }
    this._selected = selected;
  }

  toggleAll(checked) {
    this._selected = checked ? new Set(this._components.map((cmp) => cmp.name)) : new Set();
  }

  toggleOpen(match) {
    match.open = !match.open;
    this.requestUpdate();
  }

  async findPages() {
    this._status = 'Scanning site...';
    const setStatus = (message) => { this._status = message; };

    const names = [...this._selected];
    const components = names.map((name) => this._components.find((cmp) => cmp.name === name));
    const [matchesByName, descriptions] = await Promise.all([
      findComponentPages(this.basePath, names, setStatus),
      Promise.all(components.map((component) => loadComponentDescription(component, this.token))),
    ]);

    this._matches = names.map((name, i) => ({
      name,
      component: components[i],
      description: descriptions[i],
      pages: matchesByName.get(name),
      open: false,
    }));
    this._status = undefined;
  }

  async updatePages() {
    const jobs = this._matches.flatMap((match) => {
      const adminFragmentPath = `${match.component.path}/description`;
      // Site-relative path - the org/repo prefix on component.path is a DA admin
      // path detail and doesn't exist on the published site.
      const sitePath = `${match.component.path.slice(this.basePath.length)}/description`;
      return match.pages.map((page) => ({ page, adminFragmentPath, sitePath }));
    });

    for (let i = 0; i < jobs.length; i += 1) {
      const { page, adminFragmentPath, sitePath } = jobs[i];
      this._status = `Updating ${i + 1}/${jobs.length}: ${page.path}`;
      // Sequential on purpose - keeps per-page progress accurate.
      // eslint-disable-next-line no-await-in-loop
      await savePageDescription(page.path, this.token, adminFragmentPath, sitePath);
    }

    this._updated = this._matches;
    this._matches = undefined;
    this._selected = new Set();
    this._status = undefined;
  }

  renderPages(pages) {
    return html`
      <ul class="page-list">
        ${pages.map((page) => html`
          <li><a href="https://da.live/edit#${page.path}" target="_blank">${page.path}</a></li>
        `)}
      </ul>
    `;
  }

  renderMatch(match) {
    const noun = match.pages.length === 1 ? 'Page' : 'Pages';

    return html`
      <li class="match-item ${match.open ? 'is-open' : ''}">
        <div class="title-area">
          <span class="title">${match.name}</span>
          <div class="title-num-actions">
            <span class="count">${match.pages.length} ${noun}</span>
            <sl-button class="primary outline" @click=${() => this.toggleOpen(match)}>
              ${match.open ? 'Close' : 'View pages'}
            </sl-button>
          </div>
        </div>
        <p class="description">${match.description}</p>
        ${this.renderPages(match.pages)}
      </li>
    `;
  }

  renderComponentPicker() {
    if (!this._components?.length) {
      return html`<p class="empty">No components found in fragments/components.</p>`;
    }

    const allChecked = this._selected.size === this._components.length;

    return html`
      <p class="title">Pick components</p>
      <ul class="component-list">
        <li class="select-all">
          <sl-checkbox .checked=${allChecked} @change=${(e) => this.toggleAll(e.target.checked)}>
            Select all
          </sl-checkbox>
        </li>
        ${this._components.map((cmp) => html`
          <li>
            <sl-checkbox
              .checked=${this._selected.has(cmp.name)}
              @change=${(e) => this.toggleComponent(cmp.name, e.target.checked)}
            >${cmp.name}</sl-checkbox>
          </li>
        `)}
      </ul>
      <div class="action-area">
        <sl-button ?disabled=${this._selected.size === 0} @click=${this.findPages}>
          Find pages
        </sl-button>
      </div>
    `;
  }

  renderMatches() {
    const total = this._matches.reduce((sum, match) => sum + match.pages.length, 0);

    return html`
      <p class="title">Matched pages</p>
      <ul class="matches-list">
        ${this._matches.map((match) => this.renderMatch(match))}
      </ul>
      <div class="action-area">
        <sl-button class="secondary" @click=${() => { this._matches = undefined; }}>
          Back
        </sl-button>
        <sl-button ?disabled=${total === 0} @click=${this.updatePages}>
          Update ${total} ${total === 1 ? 'page' : 'pages'}
        </sl-button>
      </div>
    `;
  }

  renderUpdated() {
    const total = this._updated.reduce((sum, match) => sum + match.pages.length, 0);
    const componentNoun = this._updated.length === 1 ? 'component' : 'components';

    return html`
      <p class="title">Done</p>
      <p>Updated ${total} ${total === 1 ? 'page' : 'pages'} across
        ${this._updated.length} ${componentNoun}.</p>
      <div class="action-area">
        <sl-button @click=${() => { this._updated = undefined; }}>Start over</sl-button>
      </div>
    `;
  }

  renderStatus() {
    return html`<p class="status">${this._status}</p>`;
  }

  render() {
    if (this._status !== undefined) { return this.renderStatus(); }
    if (this._updated) { return this.renderUpdated(); }
    if (this._matches) { return this.renderMatches(); }
    return this.renderComponentPicker();
  }
}

customElements.define('adl-seo-description', ADLSeoDescription);

(async function init() {
  const { context, token } = await DA_SDK;
  const { org, repo } = context;

  const cmp = document.createElement('adl-seo-description');
  cmp.basePath = `/${org}/${repo}`;
  cmp.token = token;

  document.body.append(cmp);
}());
