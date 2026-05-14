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

  it('closes the listbox and keeps focus on the trigger when Escape is pressed', async () => {
    el.options = [{ id: 'rsp', label: 'React Spectrum' }];
    await el.updateComplete;
    const trigger = el.shadowRoot.querySelector('button');
    trigger.focus();
    trigger.click();
    await el.updateComplete;
    expect(trigger.getAttribute('aria-expanded')).to.equal('true');
    trigger.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    await el.updateComplete;
    expect(trigger.getAttribute('aria-expanded')).to.equal('false');
    expect(el.shadowRoot.activeElement).to.equal(trigger);
  });

  it('points aria-activedescendant at the first option when opened with no value', async () => {
    el.options = [
      { id: 'rsp', label: 'React Spectrum' },
      { id: 'swc', label: 'Spectrum Web Components' },
    ];
    await el.updateComplete;
    const trigger = el.shadowRoot.querySelector('button');
    trigger.click();
    await el.updateComplete;
    const firstOption = el.shadowRoot.querySelectorAll('[role="option"]')[0];
    expect(firstOption.id).to.have.length.greaterThan(0);
    expect(trigger.getAttribute('aria-activedescendant')).to.equal(firstOption.id);
  });

  it('moves the active option forward on ArrowDown when open', async () => {
    el.options = [
      { id: 'rsp', label: 'React Spectrum' },
      { id: 'swc', label: 'Spectrum Web Components' },
    ];
    await el.updateComplete;
    const trigger = el.shadowRoot.querySelector('button');
    trigger.click();
    await el.updateComplete;
    trigger.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true }));
    await el.updateComplete;
    const secondOption = el.shadowRoot.querySelectorAll('[role="option"]')[1];
    expect(trigger.getAttribute('aria-activedescendant')).to.equal(secondOption.id);
  });

  it('moves the active option backward on ArrowUp when open', async () => {
    el.options = [
      { id: 'rsp', label: 'React Spectrum' },
      { id: 'swc', label: 'Spectrum Web Components' },
    ];
    await el.updateComplete;
    const trigger = el.shadowRoot.querySelector('button');
    trigger.click();
    await el.updateComplete;
    trigger.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true }));
    trigger.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowUp', bubbles: true }));
    await el.updateComplete;
    const firstOption = el.shadowRoot.querySelectorAll('[role="option"]')[0];
    expect(trigger.getAttribute('aria-activedescendant')).to.equal(firstOption.id);
  });

  it('jumps to the first option on Home when open', async () => {
    el.options = [
      { id: 'a', label: 'A' },
      { id: 'b', label: 'B' },
      { id: 'c', label: 'C' },
    ];
    await el.updateComplete;
    const trigger = el.shadowRoot.querySelector('button');
    trigger.click();
    trigger.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true }));
    trigger.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true }));
    trigger.dispatchEvent(new KeyboardEvent('keydown', { key: 'Home', bubbles: true }));
    await el.updateComplete;
    const firstOption = el.shadowRoot.querySelectorAll('[role="option"]')[0];
    expect(trigger.getAttribute('aria-activedescendant')).to.equal(firstOption.id);
  });

  it('jumps to the last option on End when open', async () => {
    el.options = [
      { id: 'a', label: 'A' },
      { id: 'b', label: 'B' },
      { id: 'c', label: 'C' },
    ];
    await el.updateComplete;
    const trigger = el.shadowRoot.querySelector('button');
    trigger.click();
    trigger.dispatchEvent(new KeyboardEvent('keydown', { key: 'End', bubbles: true }));
    await el.updateComplete;
    const lastOption = el.shadowRoot.querySelectorAll('[role="option"]')[2];
    expect(trigger.getAttribute('aria-activedescendant')).to.equal(lastOption.id);
  });

  it('selects the active option on Enter and closes the listbox', async () => {
    el.options = [
      { id: 'rsp', label: 'React Spectrum' },
      { id: 'swc', label: 'Spectrum Web Components' },
    ];
    await el.updateComplete;
    const trigger = el.shadowRoot.querySelector('button');
    trigger.click();
    trigger.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true }));
    const eventPromise = new Promise((resolve) => {
      el.addEventListener('change', resolve, { once: true });
    });
    trigger.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
    const event = await eventPromise;
    expect(event.detail.value).to.equal('swc');
    await el.updateComplete;
    expect(trigger.getAttribute('aria-expanded')).to.equal('false');
    expect(el.value).to.equal('swc');
  });

  it('selects the active option on Space and closes the listbox', async () => {
    el.options = [
      { id: 'rsp', label: 'React Spectrum' },
      { id: 'swc', label: 'Spectrum Web Components' },
    ];
    await el.updateComplete;
    const trigger = el.shadowRoot.querySelector('button');
    trigger.click();
    trigger.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true }));
    const eventPromise = new Promise((resolve) => {
      el.addEventListener('change', resolve, { once: true });
    });
    trigger.dispatchEvent(new KeyboardEvent('keydown', { key: ' ', bubbles: true }));
    const event = await eventPromise;
    expect(event.detail.value).to.equal('swc');
    await el.updateComplete;
    expect(trigger.getAttribute('aria-expanded')).to.equal('false');
  });

  it('closes the listbox when clicking outside the picker', async () => {
    el.options = [{ id: 'rsp', label: 'React Spectrum' }];
    await el.updateComplete;
    const trigger = el.shadowRoot.querySelector('button');
    trigger.click();
    await el.updateComplete;
    expect(trigger.getAttribute('aria-expanded')).to.equal('true');
    const outside = document.createElement('div');
    document.body.append(outside);
    outside.click();
    await el.updateComplete;
    expect(trigger.getAttribute('aria-expanded')).to.equal('false');
    outside.remove();
  });
});
