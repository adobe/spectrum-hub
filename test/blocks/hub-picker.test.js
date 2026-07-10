import { expect } from '@esm-bundle/chai';
import '../../blocks/hub-picker/hub-picker.js';

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
    expect(el.shadowRoot.querySelector('button')).to.exist;
  });

  it('renders each option as a listbox item', async () => {
    el.options = [{ id: 'a', label: 'A' }, { id: 'b', label: 'B' }];
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
    expect(el.shadowRoot.querySelector('button').textContent.trim()).to.equal('React Spectrum');
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
    expect(el.shadowRoot.querySelector('button').getAttribute('role')).to.equal('combobox');
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
    expect(el.shadowRoot.querySelector('button').getAttribute('aria-label')).to.equal('Implementation');
  });

  it('omits aria-label when no label is provided', () => {
    expect(el.shadowRoot.querySelector('button').hasAttribute('aria-label')).to.be.false;
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
    el.options = [{ id: 'a', label: 'A' }, { id: 'b', label: 'B' }, { id: 'c', label: 'C' }];
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
    el.options = [{ id: 'a', label: 'A' }, { id: 'b', label: 'B' }, { id: 'c', label: 'C' }];
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

  it('marks only the keyboard-active option with data-active when open', async () => {
    el.options = [
      { id: 'rsp', label: 'React Spectrum' },
      { id: 'swc', label: 'Spectrum Web Components' },
    ];
    await el.updateComplete;
    const trigger = el.shadowRoot.querySelector('button');
    trigger.click();
    trigger.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true }));
    await el.updateComplete;
    const options = el.shadowRoot.querySelectorAll('[role="option"]');
    expect(options[0].hasAttribute('data-active')).to.be.false;
    expect(options[1].hasAttribute('data-active')).to.be.true;
  });

  it('opens the listbox on ArrowDown when closed', async () => {
    el.options = [
      { id: 'rsp', label: 'React Spectrum' },
      { id: 'swc', label: 'Spectrum Web Components' },
    ];
    await el.updateComplete;
    const trigger = el.shadowRoot.querySelector('button');
    trigger.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true }));
    await el.updateComplete;
    expect(trigger.getAttribute('aria-expanded')).to.equal('true');
  });

  it('opens the listbox on ArrowUp when closed', async () => {
    el.options = [
      { id: 'rsp', label: 'React Spectrum' },
      { id: 'swc', label: 'Spectrum Web Components' },
    ];
    await el.updateComplete;
    const trigger = el.shadowRoot.querySelector('button');
    trigger.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowUp', bubbles: true }));
    await el.updateComplete;
    expect(trigger.getAttribute('aria-expanded')).to.equal('true');
  });

  it('positions the active option at the saved value when opening', async () => {
    el.options = [
      { id: 'rsp', label: 'React Spectrum' },
      { id: 'swc', label: 'Spectrum Web Components' },
    ];
    el.value = 'swc';
    await el.updateComplete;
    const trigger = el.shadowRoot.querySelector('button');
    trigger.click();
    await el.updateComplete;
    const swcOption = el.shadowRoot.querySelectorAll('[role="option"]')[1];
    expect(trigger.getAttribute('aria-activedescendant')).to.equal(swcOption.id);
    expect(swcOption.hasAttribute('data-active')).to.be.true;
  });

  it('does not set aria-activedescendant before the listbox has been opened', () => {
    const trigger = el.shadowRoot.querySelector('button');
    expect(trigger.hasAttribute('aria-activedescendant')).to.be.false;
  });

  it('clears aria-activedescendant when the listbox closes after an option click', async () => {
    el.options = [
      { id: 'rsp', label: 'React Spectrum' },
      { id: 'swc', label: 'Spectrum Web Components' },
    ];
    await el.updateComplete;
    const trigger = el.shadowRoot.querySelector('button');
    trigger.click();
    await el.updateComplete;
    el.shadowRoot.querySelectorAll('[role="option"]')[0].click();
    await el.updateComplete;
    expect(trigger.hasAttribute('aria-activedescendant')).to.be.false;
  });

  it('clears aria-activedescendant when Escape closes the listbox', async () => {
    el.options = [{ id: 'rsp', label: 'React Spectrum' }];
    await el.updateComplete;
    const trigger = el.shadowRoot.querySelector('button');
    trigger.click();
    await el.updateComplete;
    trigger.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    await el.updateComplete;
    expect(trigger.hasAttribute('aria-activedescendant')).to.be.false;
  });

  it('ArrowDown at the last option does not move past it', async () => {
    el.options = [
      { id: 'rsp', label: 'React Spectrum' },
      { id: 'swc', label: 'Spectrum Web Components' },
    ];
    await el.updateComplete;
    const trigger = el.shadowRoot.querySelector('button');
    trigger.click();
    await el.updateComplete;
    trigger.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true }));
    trigger.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true }));
    trigger.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true }));
    await el.updateComplete;
    const lastOption = el.shadowRoot.querySelectorAll('[role="option"]')[1];
    expect(trigger.getAttribute('aria-activedescendant')).to.equal(lastOption.id);
  });

  it('ArrowUp at the first option does not move past it', async () => {
    el.options = [
      { id: 'rsp', label: 'React Spectrum' },
      { id: 'swc', label: 'Spectrum Web Components' },
    ];
    await el.updateComplete;
    const trigger = el.shadowRoot.querySelector('button');
    trigger.click();
    await el.updateComplete;
    trigger.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowUp', bubbles: true }));
    trigger.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowUp', bubbles: true }));
    await el.updateComplete;
    const firstOption = el.shadowRoot.querySelectorAll('[role="option"]')[0];
    expect(trigger.getAttribute('aria-activedescendant')).to.equal(firstOption.id);
  });

  it('ArrowDown with a single option keeps the active index at 0', async () => {
    el.options = [{ id: 'rsp', label: 'React Spectrum' }];
    await el.updateComplete;
    const trigger = el.shadowRoot.querySelector('button');
    trigger.click();
    await el.updateComplete;
    trigger.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true }));
    await el.updateComplete;
    const onlyOption = el.shadowRoot.querySelector('[role="option"]');
    expect(trigger.getAttribute('aria-activedescendant')).to.equal(onlyOption.id);
  });

  it('ArrowUp with a single option keeps the active index at 0', async () => {
    el.options = [{ id: 'rsp', label: 'React Spectrum' }];
    await el.updateComplete;
    const trigger = el.shadowRoot.querySelector('button');
    trigger.click();
    await el.updateComplete;
    trigger.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowUp', bubbles: true }));
    await el.updateComplete;
    const onlyOption = el.shadowRoot.querySelector('[role="option"]');
    expect(trigger.getAttribute('aria-activedescendant')).to.equal(onlyOption.id);
  });

  it('sets data-active on the first option when opening with no saved value', async () => {
    el.options = [
      { id: 'rsp', label: 'React Spectrum' },
      { id: 'swc', label: 'Spectrum Web Components' },
    ];
    await el.updateComplete;
    el.shadowRoot.querySelector('button').click();
    await el.updateComplete;
    const options = el.shadowRoot.querySelectorAll('[role="option"]');
    expect(options[0].hasAttribute('data-active')).to.be.true;
    expect(options[1].hasAttribute('data-active')).to.be.false;
  });

  it('removes data-active from all options after click selection closes the listbox', async () => {
    el.options = [
      { id: 'rsp', label: 'React Spectrum' },
      { id: 'swc', label: 'Spectrum Web Components' },
    ];
    await el.updateComplete;
    el.shadowRoot.querySelector('button').click();
    await el.updateComplete;
    el.shadowRoot.querySelectorAll('[role="option"]')[1].click();
    await el.updateComplete;
    const options = el.shadowRoot.querySelectorAll('[role="option"]');
    expect(options[0].hasAttribute('data-active')).to.be.false;
    expect(options[1].hasAttribute('data-active')).to.be.false;
  });

  it('removes data-active from all options after Escape closes the listbox', async () => {
    el.options = [
      { id: 'rsp', label: 'React Spectrum' },
      { id: 'swc', label: 'Spectrum Web Components' },
    ];
    await el.updateComplete;
    const trigger = el.shadowRoot.querySelector('button');
    trigger.click();
    trigger.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true }));
    await el.updateComplete;
    trigger.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    await el.updateComplete;
    const options = el.shadowRoot.querySelectorAll('[role="option"]');
    expect(options[0].hasAttribute('data-active')).to.be.false;
    expect(options[1].hasAttribute('data-active')).to.be.false;
  });

  it('shows an empty string in the trigger when value matches no option', async () => {
    el.options = [{ id: 'rsp', label: 'React Spectrum' }];
    el.value = 'unknown';
    await el.updateComplete;
    expect(el.shadowRoot.querySelector('button').textContent.trim()).to.equal('');
  });

  it('marks no option as aria-selected when value matches no option', async () => {
    el.options = [
      { id: 'rsp', label: 'React Spectrum' },
      { id: 'swc', label: 'Spectrum Web Components' },
    ];
    el.value = 'unknown';
    await el.updateComplete;
    const options = el.shadowRoot.querySelectorAll('[role="option"]');
    expect([...options].every((o) => o.getAttribute('aria-selected') === 'false')).to.be.true;
  });

  it('updates the trigger label reactively when the value property changes', async () => {
    el.options = [
      { id: 'rsp', label: 'React Spectrum' },
      { id: 'swc', label: 'Spectrum Web Components' },
    ];
    el.value = 'rsp';
    await el.updateComplete;
    expect(el.shadowRoot.querySelector('button').textContent.trim()).to.equal('React Spectrum');
    el.value = 'swc';
    await el.updateComplete;
    expect(el.shadowRoot.querySelector('button').textContent.trim()).to.equal('Spectrum Web Components');
  });

  it('updates the trigger label reactively when the options property changes', async () => {
    el.value = 'extra';
    el.options = [{ id: 'rsp', label: 'React Spectrum' }];
    await el.updateComplete;
    expect(el.shadowRoot.querySelector('button').textContent.trim()).to.equal('');
    el.options = [{ id: 'rsp', label: 'React Spectrum' }, { id: 'extra', label: 'Extra Impl' }];
    await el.updateComplete;
    expect(el.shadowRoot.querySelector('button').textContent.trim()).to.equal('Extra Impl');
  });

  it('Home when the listbox is closed does not open it', async () => {
    el.options = [{ id: 'rsp', label: 'React Spectrum' }];
    await el.updateComplete;
    const trigger = el.shadowRoot.querySelector('button');
    trigger.dispatchEvent(new KeyboardEvent('keydown', { key: 'Home', bubbles: true }));
    await el.updateComplete;
    expect(trigger.getAttribute('aria-expanded')).to.equal('false');
  });

  it('End when the listbox is closed does not open it', async () => {
    el.options = [{ id: 'rsp', label: 'React Spectrum' }];
    await el.updateComplete;
    const trigger = el.shadowRoot.querySelector('button');
    trigger.dispatchEvent(new KeyboardEvent('keydown', { key: 'End', bubbles: true }));
    await el.updateComplete;
    expect(trigger.getAttribute('aria-expanded')).to.equal('false');
  });

  it('Escape when the listbox is already closed does not change state', async () => {
    el.options = [{ id: 'rsp', label: 'React Spectrum' }];
    await el.updateComplete;
    const trigger = el.shadowRoot.querySelector('button');
    trigger.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    await el.updateComplete;
    expect(trigger.getAttribute('aria-expanded')).to.equal('false');
  });

  it('all rendered options have unique ids', async () => {
    el.options = [
      { id: 'rsp', label: 'React Spectrum' },
      { id: 'swc', label: 'Spectrum Web Components' },
      { id: 'all', label: 'All' },
    ];
    await el.updateComplete;
    const ids = [...el.shadowRoot.querySelectorAll('[role="option"]')].map((o) => o.id);
    expect(new Set(ids).size).to.equal(ids.length);
    expect(ids.every((id) => id.length > 0)).to.be.true;
  });

  it('the listbox id matches the value of aria-controls on the trigger', async () => {
    const trigger = el.shadowRoot.querySelector('button');
    const listbox = el.shadowRoot.querySelector('[role="listbox"]');
    expect(trigger.getAttribute('aria-controls')).to.equal(listbox.id);
  });

  it('renders an empty listbox when options is an empty array', async () => {
    el.options = [];
    await el.updateComplete;
    const listbox = el.shadowRoot.querySelector('[role="listbox"]');
    expect(listbox).to.exist;
    expect(listbox.querySelectorAll('[role="option"]')).to.have.lengthOf(0);
  });

  it('change event is a CustomEvent with detail.value equal to the selected option id', async () => {
    el.options = [{ id: 'rsp', label: 'React Spectrum' }];
    await el.updateComplete;
    el.shadowRoot.querySelector('button').click();
    await el.updateComplete;
    const eventPromise = new Promise((resolve) => {
      el.addEventListener('change', resolve, { once: true });
    });
    el.shadowRoot.querySelector('[role="option"]').click();
    const event = await eventPromise;
    expect(event).to.be.instanceOf(CustomEvent);
    expect(event.detail).to.deep.equal({ value: 'rsp' });
  });

  it('trigger has aria-haspopup="listbox"', () => {
    expect(el.shadowRoot.querySelector('button').getAttribute('aria-haspopup')).to.equal('listbox');
  });

  it('Tab when the listbox is open closes it', async () => {
    el.options = [{ id: 'rsp', label: 'React Spectrum' }];
    await el.updateComplete;
    const trigger = el.shadowRoot.querySelector('button');
    trigger.click();
    await el.updateComplete;
    trigger.dispatchEvent(new KeyboardEvent('keydown', { key: 'Tab', bubbles: true }));
    await el.updateComplete;
    expect(trigger.getAttribute('aria-expanded')).to.equal('false');
  });

  it('Shift+Tab when the listbox is open closes it', async () => {
    el.options = [{ id: 'rsp', label: 'React Spectrum' }];
    await el.updateComplete;
    const trigger = el.shadowRoot.querySelector('button');
    trigger.click();
    await el.updateComplete;
    trigger.dispatchEvent(new KeyboardEvent('keydown', { key: 'Tab', shiftKey: true, bubbles: true }));
    await el.updateComplete;
    expect(trigger.getAttribute('aria-expanded')).to.equal('false');
  });

  it('ArrowUp when the listbox is closed opens it at the last option', async () => {
    el.options = [
      { id: 'rsp', label: 'React Spectrum' },
      { id: 'swc', label: 'Spectrum Web Components' },
    ];
    await el.updateComplete;
    const trigger = el.shadowRoot.querySelector('button');
    trigger.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowUp', bubbles: true }));
    await el.updateComplete;
    const lastOption = el.shadowRoot.querySelectorAll('[role="option"]')[1];
    expect(trigger.getAttribute('aria-activedescendant')).to.equal(lastOption.id);
  });

  it('listbox is labelled by the trigger button', () => {
    const trigger = el.shadowRoot.querySelector('button');
    const listbox = el.shadowRoot.querySelector('[role="listbox"]');
    expect(trigger.id.length).to.be.greaterThan(0);
    expect(listbox.getAttribute('aria-labelledby')).to.equal(trigger.id);
  });
});
