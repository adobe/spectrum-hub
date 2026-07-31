import { LitElement, html, nothing } from 'lit';
import { getConfig } from '../../scripts/ak.js';
import loadStyle from '../../scripts/utils/styles.js';
import '../../deps/se/se.js';

const { codeBase } = getConfig();

const styles = await Promise.all([
  loadStyle(import.meta.url),
  loadStyle(`${codeBase}/blocks/action-button/action-button.css`),
]);

const APP_ID = '464UXSQJQC';
const SEARCH_KEY = '271461afa0e340546d112204c7520c1e';
const INDEX_NAME = 'spectrum-docs-public';
const DEBOUNCE_MS = 250;

class SHSearch extends LitElement {
  static properties = {
    query: { type: String, state: true },
    results: { type: Array, state: true },
    activeIndex: { state: true },
  };

  constructor() {
    super();
    this.query = '';
    this.results = [];
    this.activeIndex = -1;
    this._debounceTimeout = null;
  }

  connectedCallback() {
    super.connectedCallback();
    this.shadowRoot.adoptedStyleSheets = styles;
  }

  disconnectedCallback() {
    super.disconnectedCallback();
    if (this._debounceTimeout) {
      clearTimeout(this._debounceTimeout);
    }
  }

  firstUpdated() {
    this.shadowRoot.querySelector('se-input').focus();
  }

  willUpdate(changed) {
    if (changed.has('results')) {
      this.activeIndex = this.results.length > 0 ? 0 : -1;
    }
  }

  updated(changed) {
    if (changed.has('activeIndex') && this.activeIndex > -1) {
      const el = this.shadowRoot.querySelector(`#result-${this.activeIndex}`);
      el?.scrollIntoView({ block: 'nearest' });
    }
  }

  async _search(query) {
    const resp = await fetch(
      `https://${APP_ID}-dsn.algolia.net/1/indexes/${encodeURIComponent(INDEX_NAME)}/query`,
      {
        method: 'POST',
        headers: {
          'X-Algolia-Application-Id': APP_ID,
          'X-Algolia-API-Key': SEARCH_KEY,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ query }),
      },
    );
    if (!resp.ok) {
      return [];
    }
    const { hits } = await resp.json();
    return hits;
  }

  async _runSearch() {
    const query = this.query.trim();
    if (!query) {
      this.results = [];
      this._popover.hidePopover();
      return;
    }
    const hits = await this._search(query);
    this.results = hits;
    // Show popover *after* results are set
    this._popover.showPopover();
  }

  _handleInput(e) {
    this.query = e.target.value;
    clearTimeout(this._debounceTimeout);
    this._debounceTimeout = setTimeout(() => this._runSearch(), DEBOUNCE_MS);
  }

  _handleSubmit(e) {
    e.preventDefault();
    clearTimeout(this._debounceTimeout);
    this._runSearch();
  }

  _handleKey(e) {
    if (!this.results.length) { return; }

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        this._setActive((this.activeIndex + 1) % this.results.length);
        break;
      case 'ArrowUp':
        e.preventDefault();
        this._setActive((this.activeIndex - 1 + this.results.length) % this.results.length);
        break;
      case 'Enter':
        if (this.activeIndex > -1) {
          e.preventDefault();
          this._select(this.results[this.activeIndex]);
        }
        break;
      case 'Escape':
        e.preventDefault();
        this._popover.hidePopover();
        this.results = [];
        break;
      default:
        break;
    }
  }

  _setActive(index) {
    this.activeIndex = index;
  }

  _select(hit) {
    if (hit.url) {
      window.open(hit.url, '_blank');
    }
  }

  get _popover() {
    return this.shadowRoot.querySelector('.results-popover');
  }

  get _resultsCountText() {
    const { length } = this.results;
    if (length === 1) { return `${length} result`; }
    return `${length} results`;
  }

  _renderResult(hit, index) {
    const isActive = index === this.activeIndex;
    return html`
      <li
        id="result-${index}"
        role="option"
        aria-selected=${isActive}>
        <a
          href=${hit.url}
          target=${hit.external ? '_blank' : nothing}
          rel=${hit.external ? 'noopener' : nothing}
          tabindex="-1">
          <div class="result-text">
            <p class="hit-title">${hit.title || hit.objectID}</p>
            ${hit.description ? html`<p class="hit-description">${hit.description}</p>` : nothing}
          </div>
          <svg class="icon" viewBox="0 0 20 20">
            <use href="/img/icons/s2-icon-chevronright-20-n.svg#icon"></use>
          </svg>
        </a>
      </li>
    `;
  }

  render() {
    const activeId = this.activeIndex > -1 ? `result-${this.activeIndex}` : '';

    return html`
      <form class="search-form" @submit=${this._handleSubmit}>
        <se-input
          type="search"
          id="search-input"
          name="query"
          role="combobox"
          placeholder="Search everything..."
          aria-label="Search"
          aria-expanded=${this.results.length > 0}
          aria-controls="listbox"
          aria-activedescendant=${activeId}
          autocomplete="off"
          .value=${this.query}
          @input=${this._handleInput}
          @keydown=${this._handleKey}>
        </se-input>
      </form>
      <div class="results-popover" popover="manual">
        <p class="results-heading">${this._resultsCountText}</p>
        <ul id="listbox" class="results-list" aria-live="polite" role="listbox">
          ${this.results.map((hit, index) => this._renderResult(hit, index))}
        </ul>
        <div class="results-popover-footer">
          <div class="instruction">
            <div class="key">
              <svg class="icon" viewBox="0 0 12 12">
                <use href="/img/icons/s2-icon-return-12-n.svg#icon"></use>
              </svg>
            </div>
            <span class="text">to select</span>
          </div>
          <div class="instruction">
            <div class="key">
              <svg class="icon" viewBox="0 0 12 12">
                <use href="/img/icons/s2-icon-up-12-n.svg#icon"></use>
              </svg>
            </div>
            <div class="key">
              <svg class="icon" viewBox="0 0 12 12">
                <use href="/img/icons/s2-icon-down-12-n.svg#icon"></use>
              </svg>
            </div>
            <span class="text">to navigate</span>
          </div>
        </div>
      </div>
    `;
  }
}

customElements.define('sh-search', SHSearch);

export default function init(el) {
  const cmp = document.createElement('sh-search');
  if (el) { el.replaceWith(cmp); }
  return cmp;
}
