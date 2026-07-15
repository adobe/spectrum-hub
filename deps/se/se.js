import { LitElement, html, nothing } from 'lit';
import loadStyle from '../../scripts/utils/styles.js';

const style = await loadStyle(import.meta.url);

/**
 * Reliably know when an interaction was keyboard or pointer based.
 */
let lastInput = 'keyboard';
window.addEventListener('pointerdown', () => (lastInput = 'pointer'), true);
window.addEventListener('keydown', () => (lastInput = 'keyboard'), true);

const getHash = () => Math.random().toString(36).slice(2, 7);

class SEFormElement extends LitElement {
  static formAssociated = true;

  static properties = {
    id: { type: String },
    type: { type: String },
    name: { type: String },
    value: { type: String },
    class: { type: String },
    label: { type: String },
    error: { type: String },
    placeholder: { type: String },
    disabled: { type: Boolean },
    _idHash: { state: true },
  };

  constructor() {
    super();
    this._internals = this.attachInternals();
    this._idHash = this.id ? `${this.id}-${getHash()}` : getHash();
  }

  connectedCallback() {
    super.connectedCallback();
    this.shadowRoot.adoptedStyleSheets = [style];
    this._internals.setFormValue(this.value);
  }

  handleFocusIn() {
    if (lastInput === 'keyboard') this._internals.states.add('keyboard-focus');
  }

  handleFocusOut() {
    this._internals.states.delete('keyboard-focus');
  }

  get form() {
    return this._internals.form;
  }
}

class SEInput extends SEFormElement {
  focus() {
    this.shadowRoot.querySelector('input').focus();
  }

  handleEvent(event) {
    this.value = event.target.value;
    this._internals.setFormValue(this.value);
    const wcEvent = new event.constructor(event.type, event);
    this.dispatchEvent(wcEvent);
  }

  handleKeyDown(event) {
    if (event.key !== 'Enter') return;

    if (!this.form) return;

    const submitEvent = new SubmitEvent('submit', { bubbles: true, cancelable: true });

    this.form.dispatchEvent(submitEvent);

    // Do nothing if the event was prevented
    if (submitEvent.defaultPrevented) return;

    // Submit the form if not prevented
    this.form.submit();
  }

  renderSearchIcon() {
    return html`
      <svg viewBox="0 0 20 20">
        <use href="/img/icons/s2-icon-search-20-n.svg#icon"></use>
      </svg>`;
  }

  render() {
    return html`
      <div class="se-inputfield">
        ${this.label ? html`<label for="${this._idHash}">${this.label}</label>` : nothing}
        <div class="se-input-wrapper">
          <input
            type=${this.type}
            name=${this.name}
            id=${this._idHash}
            placeholder=${this.placeholder || nothing}
            .value="${this.value || ''}"
            @input=${this.handleEvent}
            @change=${this.handleEvent}
            @keydown=${this.handleKeyDown}
            @focusin=${this.handleFocusIn}
            @focusout=${this.handleFocusOut}
            class="${this.class} ${this.error ? 'has-error' : ''}" />
          ${this.type === 'search' ? this.renderSearchIcon() : nothing}
        </div>
        ${this.error ? html`<p class="se-inputfield-error-text">${this.error}</p>` : nothing}
      </div>
    `;
  }
}

class SETextarea extends SEFormElement {
  static properties = {
    rows: { type: String },
    cols: { type: String },
  }

  handleEvent(event) {
    this.value = event.target.value;
    this._internals.setFormValue(this.value);
    const wcEvent = new event.constructor(event.type, event);
    this.dispatchEvent(wcEvent);
  }

  render() {
    return html`
      <div class="se-inputfield se-inputarea">
        ${this.label ? html`<label for="${this.name}">${this.label}</label>` : nothing}
        <textarea
          name=${this.name}
          .value="${this.value || ''}"
          rows=${this.rows || nothing}
          cols=${this.cols || nothing}
          placeholder=${this.placeholder || nothing}
          @input=${this.handleEvent}
          @change=${this.handleEvent}
          @focusin=${this.handleFocusIn}
          @focusout=${this.handleFocusOut}
          class="${this.class} ${this.error ? 'has-error' : ''} ${this.label ? 'has-label' : ''}"></textarea>
        ${this.error ? html`<p class="se-inputfield-error-text">${this.error}</p>` : nothing}
      </div>
    `;
  }
}

class SECheckbox extends LitElement {
  static formAssociated = true;

  static properties = {
    name: { type: String },
    checked: { type: Boolean },
    error: { type: String },
  };

  constructor() {
    super();
    this._internals = this.attachInternals();
  }

  connectedCallback() {
    super.connectedCallback();
    this.shadowRoot.adoptedStyleSheets = [style];
    this._updateFormValue();
  }

  get type() {
    return 'checkbox';
  }

  get value() {
    return this.checked ? 'true' : '';
  }

  _updateFormValue() {
    if (this.checked) {
      this._internals.setFormValue('true');
    } else {
      this._internals.setFormValue('');
    }
  }

  handleChange(event) {
    this.checked = event.target.checked;
    this._updateFormValue();
    const wcEvent = new event.constructor(event.type, { bubbles: true, composed: true });
    this.dispatchEvent(wcEvent);
  }

  render() {
    return html`
      <div class="se-checkbox">
        <input
          type="checkbox"
          id="${this.name}"
          name="${this.name}"
          ?checked=${this.checked}
          class="${this.error ? 'has-error' : ''}"
          @change=${this.handleChange}
        />
        <label for="${this.name}"><slot></slot></label>
        ${this.error ? html`<p class="se-inputfield-error-text">${this.error}</p>` : nothing}
      </div>
    `;
  }
}

class SESwitch extends SECheckbox {
  render() {
    return html`
      <div class="se-switch">
        <input
          type="checkbox"
          role="switch"
          id="${this.name}"
          name="${this.name}"
          ?checked=${this.checked}
          class="${this.error ? 'has-error' : ''}"
          @change=${this.handleChange}
        />
        <label for="${this.name}">
          <slot></slot>
          <span class="se-switch-track"><span class="se-switch-thumb"></span></span>
        </label>
        ${this.error ? html`<p class="se-inputfield-error-text">${this.error}</p>` : nothing}
      </div>
    `;
  }
}

class SESelect extends SEFormElement {
  update(props) {
    if (props.has('value')) {
      this._internals.setFormValue(this.value);
      if (this._select) this._select.value = this.value;
    }
    super.update();
  }

  handleChange(event) {
    this.value = event.target.value;
    this._internals.setFormValue(this.value);
    const wcEvent = new event.constructor(event.type, event);
    this.dispatchEvent(wcEvent);
  }

  firstUpdated() {
    // Adopt light DOM options into the shadow select
    this._select.append(...this.childNodes);

    // Set the initial value to the first option
    if (!this.value && this._select.options.length) {
      this.value = this._select.options[0].value;
    }

    // Always ensure the internal select has the current value
    this._select.value = this.value;
  }

  get _select() {
    return this.shadowRoot.querySelector('select');
  }

  render() {
    return html`
      <div class="se-inputfield">
        ${this.label ? html`<label for="${this._idHash}">${this.label}</label>` : nothing}
        <div class="se-inputfield-select-wrapper">
          <select
            id=${this._idHash}
            name=${this.name}
            value=${this.value}
            @focusin=${this.handleFocusIn}
            @focusout=${this.handleFocusOut}
            @change=${this.handleChange}
            ?disabled=${this.disabled}
            class="${this.error ? 'has-error' : ''}">
          </select>
          <svg viewBox="0 0 20 20"><use href="/img/icons/s2-icon-chevrondown-20-n.svg#icon"></use></svg>
        </div>
        ${this.error ? html`<p class="se-inputfield-error-text">${this.error}</p>` : nothing}
      </div>
    `;
  }
}

class SEButton extends LitElement {
  static formAssociated = true;

  static properties = {
    class: { type: String },
    disabled: { type: Boolean },
    type: { type: String },
  };

  constructor() {
    super();
    this._internals = this.attachInternals();
    this.type = 'button';
  }

  connectedCallback() {
    super.connectedCallback();
    this.shadowRoot.adoptedStyleSheets = [style];
  }

  get _attrs() {
    return this.getAttributeNames().reduce((acc, name) => {
      if ((name === 'class' || name === 'label' || name === 'disabled' || name === 'type')) return acc;
      acc[name] = this.getAttribute(name);
      return acc;
    }, {});
  }

  handleClick() {
    if (this.disabled) return;
    const { form } = this._internals;
    if (!form) return;
    if (this.type === 'submit') form.requestSubmit();
    else if (this.type === 'reset') form.reset();
  }

  render() {
    return html`
      <span class="se-button" part="wrap">
        <button
          part="base"
          type="button"
          class="${this.class}"
          ?disabled=${this.disabled}
          @click=${this.handleClick}>
          <slot></slot>
        </button>
      </span>`;
  }
}

class SESegmentedControl extends LitElement {
  connectedCallback() {
    super.connectedCallback();
    this.shadowRoot.adoptedStyleSheets = [style];
  }

  handleChange() {
    this._segmentWrapper.querySelectorAll('input[type="radio"]').forEach((radio) => {
      radio.toggleAttribute('checked', radio.checked);
    });
  }

  firstUpdated() {
    // Adopt light DOM options into the shadow
    this._segmentWrapper.prepend(...this.childNodes);
    this._segmentWrapper.addEventListener('change', () => this.handleChange());
  }

  get _segmentWrapper() {
    return this.shadowRoot.querySelector('.se-segmentedcontrol');
  }

  render() {
    return html`
      <div class="se-segmentedcontrol">
        <div class="indicator"></div>
      </div>
      <slot></slot>
    `;
  }
}

class SEDialog extends LitElement {
  static properties = {
    open: { type: Boolean },
    overflow: { type: String },
    heading: { type: String },
    closedby: { type: String },
    _showLazyModal: { state: true },
  };

  connectedCallback() {
    super.connectedCallback();
    this.shadowRoot.adoptedStyleSheets = [style];
    // Automatically show if added to the dom
    setTimeout(() => { this.showModal(); }, 20);
  }

  updated() {
    if (this._showLazyModal && this._dialog) {
      this._showLazyModal = undefined;
      this.showModal();
    }
  }

  showModal() {
    // If the shadowDom has not been fully rendered,
    // mark it as lazy for updated to handle.
    if (!this._dialog) {
      this._showLazyModal = true;
      return;
    }
    this._dialog.showModal();
    this.findCloseButtons();
  }

  findCloseButtons() {
    const closeBtns = this.querySelectorAll('[commandfor]');
    if (!closeBtns.length) return;

    const closeHandler = this.close.bind(this);
    closeBtns.forEach((btn) => {
      btn.addEventListener('click', closeHandler);
    });
  }

  show() {
    this._dialog.show();
  }

  close() {
    this._dialog.close();
  }

  onClose(e) {
    this.dispatchEvent(new Event('close', e));
  }

  get _dialog() {
    return this.shadowRoot.querySelector('dialog');
  }

  render() {
    return html`
      <dialog
        closedby=${this.closedby || nothing}
        class="se-dialog ${this.overflow ? `overflow-${this.overflow}` : ''}"
        @close=${this.onClose}>
        <div class="se-dialog-inner">
          ${this.heading ? html`<p class="heading-size-m">${this.heading}</p>` : nothing}
          <slot></slot>
        </div>
      </dialog>`;
  }
}

customElements.define('se-input', SEInput);
customElements.define('se-textarea', SETextarea);
customElements.define('se-checkbox', SECheckbox);
customElements.define('se-switch', SESwitch);
customElements.define('se-select', SESelect);
customElements.define('se-button', SEButton);
customElements.define('se-segmentedcontrol', SESegmentedControl);
customElements.define('se-dialog', SEDialog);

document.body.classList.add('se-loaded');
