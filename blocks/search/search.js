import { LitElement, html, nothing } from 'lit';
import { getConfig } from '../../scripts/ak.js';
import loadStyle from '../../scripts/utils/styles.js';
import { fetchNavAreas } from './nav-areas.js';
import {
  SEARCH_ANNOUNCE_EVENT,
  SEARCH_EXPAND_EVENT,
} from '../../scripts/utils/nav-events.js';
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
const SEARCH_INSTRUCTIONS = 'Type to search, or use the Up and Down Arrow keys to navigate. '
  + 'Press Enter to select.';

function needsSafariAnnouncements() {
  return navigator.vendor === 'Apple Computer, Inc.'
    && navigator.userAgent.includes('Safari');
}

/**
 * Follows the WAI-ARIA APG editable combobox with list autocomplete pattern
 * (https://www.w3.org/WAI/ARIA/apg/patterns/combobox/examples/combobox-autocomplete-list/)
 */
class SHSearch extends LitElement {
  static properties = {
    query: { type: String, state: true },
    results: { type: Array, state: true },
    navAreas: { type: Array, state: true },
    navAreasLoaded: { state: true },
    activeIndex: { state: true },
  };

  constructor() {
    super();
    this.query = '';
    this.results = [];
    this.navAreas = [];
    this.navAreasLoaded = false;
    this.activeIndex = -1;
    this._debounceTimeout = null;
    this._inputFocused = false;
    this._openingAnnounced = false;
    this._handleOutsideClick = this._handleOutsideClick.bind(this);
  }

  connectedCallback() {
    super.connectedCallback();
    this.shadowRoot.adoptedStyleSheets = styles;
    fetchNavAreas().then((areas) => {
      this.navAreas = areas;
      this.navAreasLoaded = true;
    });
    // Deferred: the same click that inserted this element (the action-button
    // icon click) is still bubbling to `document` right now. Registering
    // immediately would have this fire on that same click and self-close.
    setTimeout(() => document.addEventListener('click', this._handleOutsideClick), 0);
  }

  disconnectedCallback() {
    super.disconnectedCallback();
    document.removeEventListener('click', this._handleOutsideClick);
    if (this._debounceTimeout) {
      clearTimeout(this._debounceTimeout);
    }
  }

  firstUpdated() {
    // Set once; the listbox element never changes.
    this._input.controlsElement = this.shadowRoot.querySelector('#listbox');
    this._input.descriptionElement = this.shadowRoot.querySelector('#search-instructions');
    this._popover.showPopover();
    // This element was just inserted; focusing immediately outruns the
    // browser posting its a11y tree, so screen readers don't follow. Wait
    // a full paint (double rAF) before moving focus.
    requestAnimationFrame(() => requestAnimationFrame(async () => {
      await this._input.focus();
      this._inputFocused = true;
      this._announceOpening();
    }));
  }

  willUpdate(changed) {
    if (changed.has('query') || changed.has('results') || changed.has('navAreas')) {
      this.activeIndex = this._currentItems.length > 0 ? 0 : -1;
    }
  }

  get _isNavView() {
    return !this.query.trim();
  }

  get _currentItems() {
    return this._isNavView ? this.navAreas : this.results;
  }

  get _navAreasUnavailable() {
    return this._isNavView && this.navAreasLoaded && this.navAreas.length === 0;
  }

  updated(changed) {
    if (changed.has('activeIndex')
      || changed.has('query')
      || changed.has('results')
      || changed.has('navAreas')) {
      const active = this.activeIndex > -1
        ? this.shadowRoot.querySelector(`#result-${this.activeIndex}`)
        : null;
      active?.scrollIntoView({ block: 'nearest' });
      // Element ref, not an id — see SEInput in deps/se/se.js.
      this._input.setActiveDescendantElement(active);
    }

    if (changed.has('navAreas') && this._inputFocused) {
      this._announceOpening();
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
      // Empty query returns to nav-area view; the popover stays open.
      this.results = [];
      return;
    }
    const results = await this._search(query);
    if (query === this.query.trim()) {
      this.results = results;
    }
  }

  _handleInput(e) {
    this.query = e.target.value;
    this.results = [];
    this.activeIndex = -1;
    this._input.setActiveDescendantElement(null);
    clearTimeout(this._debounceTimeout);
    this._debounceTimeout = setTimeout(() => this._runSearch(), DEBOUNCE_MS);
  }

  _handleSubmit(e) {
    e.preventDefault();
    clearTimeout(this._debounceTimeout);
    this._runSearch();
  }

  _handleKey(e) {
    const items = this._currentItems;

    switch (e.key) {
      case 'ArrowDown':
        if (!items.length) { return; }
        e.preventDefault();
        this._setActive((this.activeIndex + 1) % items.length, items);
        break;
      case 'ArrowUp':
        if (!items.length) { return; }
        e.preventDefault();
        this._setActive((this.activeIndex - 1 + items.length) % items.length, items);
        break;
      case 'Enter': {
        const item = items[this.activeIndex];
        if (item) {
          e.preventDefault();
          this._select(item, e);
        }
        break;
      }
      case 'Escape':
        e.preventDefault();
        this._close();
        break;
      default:
        break;
    }
  }

  _setActive(index, items = this._currentItems) {
    this.activeIndex = index;
    this._announce(this._itemLabel(items[index]));
  }

  _itemLabel(item) {
    if (!item) { return ''; }
    return this._isNavView ? item.label : item.title || item.objectID;
  }

  _announce(message) {
    if (!message || !needsSafariAnnouncements()) { return false; }
    this.dispatchEvent(new CustomEvent(SEARCH_ANNOUNCE_EVENT, {
      detail: { message },
    }));
    return true;
  }

  _announceOpening() {
    if (this._openingAnnounced || !this.navAreasLoaded) { return; }
    const firstItem = this._currentItems[0];
    const firstItemLabel = this._itemLabel(firstItem);
    const message = firstItemLabel
      ? `${SEARCH_INSTRUCTIONS} ${firstItemLabel}.`
      : SEARCH_INSTRUCTIONS;
    this._openingAnnounced = this._announce(message);
  }

  _select(item, sourceEvent) {
    if (this._isNavView) {
      this._selectNavArea(item, sourceEvent);
    } else {
      this._selectHit(item);
    }
  }

  _selectHit(hit) {
    if (hit.url) {
      window.open(hit.url, '_blank');
    }
    this._close();
  }

  _selectNavArea(area, sourceEvent) {
    document.dispatchEvent(new CustomEvent(SEARCH_EXPAND_EVENT, {
      detail: { label: area.label, sourceEvent },
    }));
    this._close();
  }

  _close() {
    this._popover.hidePopover();
    this.dispatchEvent(new CustomEvent('clear'));
  }

  get _popover() {
    return this.shadowRoot.querySelector('.results-popover');
  }

  get _input() {
    return this.shadowRoot.querySelector('se-input');
  }

  _handleOutsideClick(e) {
    // Click events crossing a shadow boundary retarget `e.target` to the
    // host, so this correctly excludes every click inside this component.
    if (this.contains(e.target)) { return; }
    this._close();
  }

  get _resultsCountText() {
    const { length } = this.results;
    if (length === 1) { return `${length} result`; }
    return `${length} results`;
  }

  get _listboxLabel() {
    return this._isNavView ? 'Navigation areas' : 'Search results';
  }

  _pillsFor(hit) {
    return [hit.implementation, hit.platform, ...(hit.tags || [])]
      .filter(Boolean)
      .slice(0, 2);
  }

  _renderNavArea(area, index) {
    const isActive = index === this.activeIndex;
    return html`
      <li role="presentation">
        <button
          id="result-${index}"
          type="button"
          class="result-row"
          role="option"
          aria-selected=${isActive}
          tabindex="-1"
          @click=${(e) => this._selectNavArea(area, e)}>
          <div class="result-text">
            <p class="hit-title">${area.label}</p>
            ${area.description ? html`<p class="hit-description">${area.description}</p>` : nothing}
          </div>
          <svg class="icon" viewBox="0 0 20 20" aria-hidden="true">
            <use href="/img/icons/s2-icon-chevronright-20-n.svg#icon"></use>
          </svg>
        </button>
      </li>
    `;
  }

  _renderHit(hit, index) {
    const isActive = index === this.activeIndex;
    const pills = this._pillsFor(hit);
    return html`
      <li role="presentation">
        <a
          id="result-${index}"
          class="result-row"
          role="option"
          aria-selected=${isActive}
          href=${hit.url}
          target=${hit.external ? '_blank' : nothing}
          rel=${hit.external ? 'noopener' : nothing}
          tabindex="-1"
          @click=${() => this._close()}>
          <p class="hit-title">${hit.title || hit.objectID}</p>
          ${pills.length ? html`
            <div class="hit-tags">
              ${pills.map((pill) => html`<span class="tag-pill">${pill}</span>`)}
            </div>` : nothing}
        </a>
      </li>
    `;
  }

  render() {
    return html`
      <form class="search-form" @submit=${this._handleSubmit}>
        <p id="search-instructions" class="search-instructions">
          ${SEARCH_INSTRUCTIONS}
        </p>
        <se-input
          type="search"
          id="search-input"
          name="query"
          role="combobox"
          placeholder="Search everything..."
          aria-label="Search"
          aria-expanded="true"
          aria-autocomplete="list"
          autocomplete="off"
          .value=${this.query}
          @input=${this._handleInput}
          @keydown=${this._handleKey}>
        </se-input>
      </form>
      <div class="results-popover" popover="manual">
        ${this._isNavView ? nothing : html`
          <p class="results-heading" role="status" aria-live="polite" aria-atomic="true">
            ${this._resultsCountText}
          </p>`}
        ${this._navAreasUnavailable
    ? html`<p class="results-empty">Navigation is unavailable right now.</p>`
    : nothing}
        <ul id="listbox" class="results-list" role="listbox" aria-label=${this._listboxLabel}>
          ${this._isNavView
    ? this.navAreas.map((area, index) => this._renderNavArea(area, index))
    : this.results.map((hit, index) => this._renderHit(hit, index))}
        </ul>
        ${this._navAreasUnavailable ? nothing : html`
        <div class="results-popover-footer">
          <div class="instruction">
            <div class="key">
              <svg class="icon" viewBox="0 0 12 12" aria-hidden="true">
                <use href="/img/icons/s2-icon-return-12-n.svg#icon"></use>
              </svg>
            </div>
            <span class="text">to select</span>
          </div>
          <div class="instruction">
            <div class="key">
              <svg class="icon" viewBox="0 0 12 12" aria-hidden="true">
                <use href="/img/icons/s2-icon-up-12-n.svg#icon"></use>
              </svg>
            </div>
            <div class="key">
              <svg class="icon" viewBox="0 0 12 12" aria-hidden="true">
                <use href="/img/icons/s2-icon-down-12-n.svg#icon"></use>
              </svg>
            </div>
            <span class="text">to navigate</span>
          </div>
        </div>
        `}
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
