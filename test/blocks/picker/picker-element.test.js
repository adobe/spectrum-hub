import { expect } from '@esm-bundle/chai';
import '../../../blocks/picker/picker-element.js';

describe('<hub-picker>', () => {
  let el;

  beforeEach(async () => {
    el = document.createElement('hub-picker');
    document.body.append(el);
    await el.updateComplete;
  });

  afterEach(() => {
    el.remove();
  });

  it('renders a trigger button in shadow DOM', () => {
    const trigger = el.shadowRoot.querySelector('button');
    expect(trigger).to.exist;
  });

  it('renders each option as a listbox item', async () => {
    el.options = [
      { id: 'a', label: 'A' },
      { id: 'b', label: 'B' },
    ];
    await el.updateComplete;
    const items = el.shadowRoot.querySelectorAll('[role="option"]');
    expect(items).to.have.lengthOf(2);
    expect(items[0].textContent.trim()).to.equal('A');
    expect(items[1].textContent.trim()).to.equal('B');
  });

  it('shows the selected option label in the trigger', async () => {
    el.options = [
      { id: 'rsp', label: 'React Spectrum' },
      { id: 'swc', label: 'Spectrum Web Components' },
    ];
    el.value = 'rsp';
    await el.updateComplete;
    const trigger = el.shadowRoot.querySelector('button');
    expect(trigger.textContent.trim()).to.equal('React Spectrum');
  });

  it('starts collapsed and toggles aria-expanded on trigger click', async () => {
    const trigger = el.shadowRoot.querySelector('button');
    expect(trigger.getAttribute('aria-expanded')).to.equal('false');
    trigger.click();
    await el.updateComplete;
    expect(trigger.getAttribute('aria-expanded')).to.equal('true');
    trigger.click();
    await el.updateComplete;
    expect(trigger.getAttribute('aria-expanded')).to.equal('false');
  });

  it('fires a change event carrying the option id when an option is clicked', async () => {
    el.options = [
      { id: 'rsp', label: 'React Spectrum' },
      { id: 'swc', label: 'Spectrum Web Components' },
    ];
    await el.updateComplete;
    const eventPromise = new Promise((resolve) => {
      el.addEventListener('change', resolve, { once: true });
    });
    el.shadowRoot.querySelectorAll('[role="option"]')[1].click();
    const event = await eventPromise;
    expect(event.detail.value).to.equal('swc');
  });

  it('closes the listbox after an option is selected', async () => {
    el.options = [
      { id: 'rsp', label: 'React Spectrum' },
      { id: 'swc', label: 'Spectrum Web Components' },
    ];
    await el.updateComplete;
    const trigger = el.shadowRoot.querySelector('button');
    trigger.click();
    await el.updateComplete;
    expect(trigger.getAttribute('aria-expanded')).to.equal('true');
    el.shadowRoot.querySelectorAll('[role="option"]')[0].click();
    await el.updateComplete;
    expect(trigger.getAttribute('aria-expanded')).to.equal('false');
  });

  it('updates the value when an option is selected', async () => {
    el.options = [
      { id: 'rsp', label: 'React Spectrum' },
      { id: 'swc', label: 'Spectrum Web Components' },
    ];
    el.value = 'rsp';
    await el.updateComplete;
    el.shadowRoot.querySelectorAll('[role="option"]')[1].click();
    await el.updateComplete;
    expect(el.value).to.equal('swc');
  });

  it('exposes the trigger as a combobox', () => {
    const trigger = el.shadowRoot.querySelector('button');
    expect(trigger.getAttribute('role')).to.equal('combobox');
  });

  it('links the trigger to the listbox via aria-controls', () => {
    const trigger = el.shadowRoot.querySelector('button');
    const listbox = el.shadowRoot.querySelector('[role="listbox"]');
    expect(listbox.id).to.have.length.greaterThan(0);
    expect(trigger.getAttribute('aria-controls')).to.equal(listbox.id);
  });

  it('uses the label property as the trigger accessible name', async () => {
    el.label = 'Implementation';
    await el.updateComplete;
    const trigger = el.shadowRoot.querySelector('button');
    expect(trigger.getAttribute('aria-label')).to.equal('Implementation');
  });

  it('omits aria-label when no label is provided', () => {
    const trigger = el.shadowRoot.querySelector('button');
    expect(trigger.hasAttribute('aria-label')).to.be.false;
  });

  it('marks the matching option with aria-selected', async () => {
    el.options = [
      { id: 'rsp', label: 'React Spectrum' },
      { id: 'swc', label: 'Spectrum Web Components' },
    ];
    el.value = 'swc';
    await el.updateComplete;
    const options = el.shadowRoot.querySelectorAll('[role="option"]');
    expect(options[0].getAttribute('aria-selected')).to.equal('false');
    expect(options[1].getAttribute('aria-selected')).to.equal('true');
  });
});
