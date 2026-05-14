import { LitElement, html, nothing } from '../../deps/lit/dist/index.js';
import loadStyle from '../../scripts/utils/styles.js';

const styles = await loadStyle(import.meta.url);

class SpectrumHubPicker extends LitElement {
  static properties = {
    options: { attribute: false },
    value: { type: String },
    label: { type: String },
    _open: { state: true },
  };

  constructor() {
    super();
    this.options = [];
    this.value = '';
    this.label = '';
    this._open = false;
    this._listboxId = `hub-picker-listbox-${crypto.randomUUID()}`;
  }

  connectedCallback() {
    super.connectedCallback();
    this.shadowRoot.adoptedStyleSheets = [styles];
  }

  get selectedLabel() {
    return this.options.find((option) => option.id === this.value)?.label ?? '';
  }

  toggleOpen() {
    this._open = !this._open;
  }

  selectOption(option) {
    this.value = option.id;
    this._open = false;
    this.dispatchEvent(new CustomEvent('change', { detail: { value: option.id } }));
  }

  render() {
    return html`
      <button
        role="combobox"
        aria-label=${this.label || nothing}
        aria-expanded=${this._open ? 'true' : 'false'}
        aria-controls=${this._listboxId}
        @click=${this.toggleOpen}
      >${this.selectedLabel}</button>
      <ul id=${this._listboxId} role="listbox">
        ${this.options.map((option) => html`
          <li
            role="option"
            aria-selected=${option.id === this.value ? 'true' : 'false'}
            @click=${() => this.selectOption(option)}
          >${option.label}</li>
        `)}
      </ul>
    `;
  }
}

customElements.define('hub-picker', SpectrumHubPicker);
