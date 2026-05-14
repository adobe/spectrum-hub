import { LitElement, html } from '../../deps/lit/dist/index.js';
import loadStyle from '../../scripts/utils/styles.js';

const styles = await loadStyle(import.meta.url);

class SpectrumHubPicker extends LitElement {
  static properties = {
    options: { attribute: false },
    value: { type: String },
    _open: { state: true },
  };

  constructor() {
    super();
    this.options = [];
    this.value = '';
    this._open = false;
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
    this.dispatchEvent(new CustomEvent('change', { detail: { value: option.id } }));
  }

  render() {
    return html`
      <button
        type="button"
        aria-expanded=${this._open ? 'true' : 'false'}
        @click=${this.toggleOpen}
      >${this.selectedLabel}</button>
      <ul role="listbox">
        ${this.options.map((option) => html`
          <li role="option" @click=${() => this.selectOption(option)}>${option.label}</li>
        `)}
      </ul>
    `;
  }
}

customElements.define('hub-picker', SpectrumHubPicker);
