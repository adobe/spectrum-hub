import { LitElement, html, nothing } from '../../deps/lit/dist/index.js';
import loadStyle from '../../scripts/utils/styles.js';

const styles = await loadStyle(import.meta.url);

class SpectrumHubPicker extends LitElement {
  static properties = {
    options: { attribute: false },
    value: { type: String },
    label: { type: String },
    _open: { state: true },
    _activeIndex: { state: true },
  };

  constructor() {
    super();
    this.options = [];
    this.value = '';
    this.label = '';
    this._open = false;
    this._activeIndex = 0;
    this._listboxId = `hub-picker-listbox-${crypto.randomUUID()}`;
    this._handleOutsideClick = (e) => {
      if (!e.composedPath().includes(this)) { this._open = false; }
    };
  }

  optionId(index) {
    return `${this._listboxId}-option-${index}`;
  }

  connectedCallback() {
    super.connectedCallback();
    this.shadowRoot.adoptedStyleSheets = [styles];
  }

  disconnectedCallback() {
    document.removeEventListener('click', this._handleOutsideClick);
    super.disconnectedCallback();
  }

  updated(changed) {
    if (changed.has('_open')) {
      if (this._open) {
        document.addEventListener('click', this._handleOutsideClick);
      } else {
        document.removeEventListener('click', this._handleOutsideClick);
      }
    }
  }

  get selectedLabel() {
    return this.options.find((o) => o.id === this.value)?.label ?? '';
  }

  openListbox() {
    const valueIndex = this.options.findIndex((o) => o.id === this.value);
    this._activeIndex = valueIndex >= 0 ? valueIndex : 0;
    this._open = true;
  }

  toggleOpen() {
    if (this._open) {
      this._open = false;
    } else {
      this.openListbox();
    }
  }

  handleKeydown(e) {
    if (e.key === 'Escape' && this._open) {
      e.preventDefault();
      this._open = false;
      this.updateComplete.then(() => this.shadowRoot.querySelector('button')?.focus());
      return;
    }
    if ((e.key === 'ArrowDown' || e.key === 'ArrowUp') && !this._open) {
      e.preventDefault();
      this.openListbox();
      return;
    }
    if (e.key === 'ArrowDown' && this._open) {
      e.preventDefault();
      this._activeIndex = Math.min(this._activeIndex + 1, this.options.length - 1);
      return;
    }
    if (e.key === 'ArrowUp' && this._open) {
      e.preventDefault();
      this._activeIndex = Math.max(this._activeIndex - 1, 0);
      return;
    }
    if (e.key === 'Home' && this._open) {
      e.preventDefault();
      this._activeIndex = 0;
      return;
    }
    if (e.key === 'End' && this._open) {
      e.preventDefault();
      this._activeIndex = this.options.length - 1;
      return;
    }
    if ((e.key === 'Enter' || e.key === ' ') && this._open) {
      e.preventDefault();
      const option = this.options[this._activeIndex];
      if (option) { this.selectOption(option); }
    }
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
        aria-activedescendant=${this._open ? this.optionId(this._activeIndex) : nothing}
        @click=${this.toggleOpen}
        @keydown=${this.handleKeydown}
      >${this.selectedLabel}</button>
      <ul id=${this._listboxId} role="listbox">
        ${this.options.map((option, index) => html`
          <li
            id=${this.optionId(index)}
            role="option"
            aria-selected=${option.id === this.value ? 'true' : 'false'}
            data-active=${this._open && index === this._activeIndex ? '' : nothing}
            @click=${() => this.selectOption(option)}
          >${option.label}</li>
        `)}
      </ul>
    `;
  }
}

customElements.define('hub-picker', SpectrumHubPicker);
