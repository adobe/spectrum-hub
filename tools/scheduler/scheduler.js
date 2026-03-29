import { LitElement, html } from '../../deps/lit/dist/index.js';
import ENV from '../../scripts/utils/env.js';
import loadStyle from '../../scripts/utils/styles.js';
import { formatDate } from './utils.js';

const styles = await loadStyle(import.meta.url);

const EL_NAME = 'aem-scheduler';

class AemScheduler extends LitElement {
  static properties = {
    current: { attribute: false },
    _format: { state: true },
    _isChanging: { state: true },
  };

  connectedCallback() {
    super.connectedCallback();
    this.shadowRoot.adoptedStyleSheets = [styles];
    this._format = 'local';
  }

  handleSet(timestamp) {
    const { origin, pathname, searchParams, hash } = new URL(window.location.href);
    if (!timestamp) {
      searchParams.delete('schedule');
      localStorage.removeItem('aem-schedule');
    } else {
      searchParams.set('schedule', timestamp);
      localStorage.setItem('aem-schedule', timestamp);
    }
    let search = searchParams.toString();
    search = search ? `?${search}` : '';
    window.location = `${origin}${pathname}${search}${hash}`;
  }

  handleTabClick(e) {
    this._format = e.target.textContent.toLowerCase();
  }

  handleChange(e) {
    if (e.target.textContent === 'Change') {
      this._isChanging = !this._isChanging;
      return;
    }
    this.handleSet(this.timestamp);
  }

  get timestamp() {
    const curr = new Date().toISOString();
    const date = this.shadowRoot.querySelector('[type="datetime-local"]').value || curr[0];
    const dateTime = new Date(date);
    return Math.floor(dateTime.getTime() / 1000);
  }

  renderInput() {
    return html`
      <p class="date-label">Local</p>
      <input type="datetime-local" />
    `;
  }

  renderDate() {
    const { date, time } = formatDate(Number(this.current * 1000));
    const { date: utcDate, time: utcTime } = formatDate(Number(this.current * 1000), 'UTC');

    return html`
      <div class="date-group">
        <div class="date-tabs">
          <button @click=${this.handleTabClick} class="date-tab ${this._format === 'local' ? 'is-selected' : ''}">Local</button>
          <button @click=${this.handleTabClick} class="date-tab ${this._format === 'utc' ? 'is-selected' : ''}">UTC</button>
        </div>
        <div class="date-values">
          <p class="date-value ${this._format === 'local' ? 'is-selected' : ''}">${date} ${time}</p>
          <p class="date-value ${this._format === 'utc' ? 'is-selected' : ''}">${utcDate} ${utcTime}</p>
        </div>
      </div>
    `;
  }

  render() {
    return html`
      <div class="main-content">
        <p class="heading">Date Simulator</p>
        <div class="details">
          ${this._isChanging ? this.renderInput() : this.renderDate()}
        </div>
      </div>
      <div class="actions">
        <button @click=${() => this.handleSet()}>Close</button>
        <button @click=${this.handleChange}>${this._isChanging ? 'Accept' : 'Change'}</button>
      </div>
    `;
  }
}

customElements.define(EL_NAME, AemScheduler);

/**
 * This will toggle the scheduler.
 */
export default function toggleScheduler() {
  const { origin, pathname, searchParams, hash } = new URL(window.location.href);

  const querySim = searchParams.get('schedule');
  const localSim = localStorage.getItem('aem-schedule');
  if (querySim || localSim) {
    searchParams.delete('schedule');
    localStorage.removeItem('aem-schedule');
  } else {
    searchParams.set('schedule', 'now');
  }

  let search = searchParams.toString();
  search = search ? `?${search}` : '';
  window.location = `${origin}${pathname}${search}${hash}`;
}

/**
 * This will automatically detect if scheduler should be shown.
 */
(async function autoLoadScheduler() {
  if (ENV === 'prod') return;

  // Query param takes most precedence
  let sim = new URL(window.location.href).searchParams.get('schedule');

  if (sim) {
    // If reset, remove anything from localStorage
    if (sim === 'reset') {
      localStorage.removeItem('aem-schedule');
      return;
    }
    if (sim === 'now') sim = Math.floor(Date.now() / 1000);
    localStorage.setItem('aem-schedule', sim);
  }

  // If no query param, try existing local storage
  if (!sim) sim = localStorage.getItem('aem-schedule');

  // If still empty, use the current time
  if (!sim) return;

  let scheduler = document.querySelector('aem-scheduler');
  if (!scheduler) {
    scheduler = document.createElement(EL_NAME);
    document.body.append(scheduler);
  }

  scheduler.current = sim;
}());
