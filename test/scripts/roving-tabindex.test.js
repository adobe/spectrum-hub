import { expect } from '@esm-bundle/chai';
import rovingTabindex from '../../scripts/utils/roving-tabindex.js';

const press = (el, key) => el.dispatchEvent(
  new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true }),
);

const tabIndexes = (root) => [...root.querySelectorAll('a, button')].map((el) => el.tabIndex);

describe('rovingTabindex', () => {
  let container;

  beforeEach(() => {
    document.body.innerHTML = '';
    container = document.createElement('div');
    container.innerHTML = `
      <a href="/one">One</a>
      <a href="/two">Two</a>
      <a href="/three">Three</a>
    `;
    document.body.append(container);
  });

  describe('the single tab stop', () => {
    it('leaves exactly one member tabbable', () => {
      rovingTabindex(container);
      expect(tabIndexes(container)).to.deep.equal([0, -1, -1]);
    });

    it('honours the caller\'s choice of which member starts tabbable', () => {
      rovingTabindex(container, { initial: (list) => list[2] });
      expect(tabIndexes(container)).to.deep.equal([-1, -1, 0]);
    });

    it('does nothing when the group is empty', () => {
      container.innerHTML = '';
      expect(() => rovingTabindex(container)).to.not.throw();
    });

    // A bare checkVisibility() would let every collapsed flyout into the group.
    it('skips members hidden by visibility, leaving their tabindex untouched', () => {
      const [, two] = container.querySelectorAll('a');
      two.style.visibility = 'hidden';
      rovingTabindex(container);
      expect(two.hasAttribute('tabindex')).to.be.false;
      expect(tabIndexes(container)).to.deep.equal([0, 0, -1]);
    });
  });

  describe('arrow keys', () => {
    it('moves the tab stop forward with ArrowDown', () => {
      rovingTabindex(container);
      const [one, two] = container.querySelectorAll('a');
      press(one, 'ArrowDown');
      expect(document.activeElement === two).to.be.true;
      expect(tabIndexes(container)).to.deep.equal([-1, 0, -1]);
    });

    it('moves backward with ArrowUp', () => {
      rovingTabindex(container, { initial: (list) => list[1] });
      const [one, two] = container.querySelectorAll('a');
      press(two, 'ArrowUp');
      expect(document.activeElement === one).to.be.true;
    });

    it('stops at the ends rather than wrapping', () => {
      rovingTabindex(container);
      const [one] = container.querySelectorAll('a');
      one.focus();
      press(one, 'ArrowUp');
      expect(document.activeElement === one).to.be.true;
    });

    it('jumps to the first member with Home and the last with End', () => {
      rovingTabindex(container);
      const links = [...container.querySelectorAll('a')];
      press(links[0], 'End');
      expect(document.activeElement === links[2]).to.be.true;
      press(links[2], 'Home');
      expect(document.activeElement === links[0]).to.be.true;
    });

    it('leaves modified arrow presses to the browser', () => {
      rovingTabindex(container);
      const [one] = container.querySelectorAll('a');
      const event = new KeyboardEvent('keydown', {
        key: 'ArrowDown', metaKey: true, bubbles: true, cancelable: true,
      });
      one.dispatchEvent(event);
      expect(event.defaultPrevented).to.be.false;
    });
  });

  describe('focus tracking', () => {
    it('follows focus that arrives by click or programmatically', () => {
      rovingTabindex(container);
      const [, two] = container.querySelectorAll('a');
      two.dispatchEvent(new FocusEvent('focusin', { bubbles: true }));
      expect(tabIndexes(container)).to.deep.equal([-1, 0, -1]);
    });
  });

  describe('caller-supplied keys', () => {
    it('moves to the element the handler returns', () => {
      const links = [...container.querySelectorAll('a')];
      rovingTabindex(container, { keys: { ArrowRight: () => links[2] } });
      press(links[0], 'ArrowRight');
      expect(document.activeElement === links[2]).to.be.true;
    });

    it('swallows the key without moving when the handler returns true', () => {
      const links = [...container.querySelectorAll('a')];
      rovingTabindex(container, { keys: { ArrowRight: () => true } });
      links[0].focus();
      press(links[0], 'ArrowRight');
      expect(document.activeElement === links[0]).to.be.true;
    });

    it('leaves the key to the browser when the handler declines it', () => {
      rovingTabindex(container, { keys: { ArrowRight: () => false } });
      const [one] = container.querySelectorAll('a');
      const event = new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true, cancelable: true });
      one.dispatchEvent(event);
      expect(event.defaultPrevented).to.be.false;
    });
  });

  describe('re-syncing', () => {
    // The tab stop must survive members appearing and disappearing, or Tab lands
    // on nothing once the anchor is hidden.
    it('re-picks the tab stop when the anchor stops being focusable', () => {
      const { sync } = rovingTabindex(container);
      const links = [...container.querySelectorAll('a')];
      links[0].style.visibility = 'hidden';
      sync();
      expect(links[1].tabIndex).to.equal(0);
    });

    it('re-syncs on click, so expanding a menu re-picks the tab stop', () => {
      rovingTabindex(container);
      const links = [...container.querySelectorAll('a')];
      links[0].style.visibility = 'hidden';
      links[1].dispatchEvent(new MouseEvent('click', { bubbles: true }));
      expect(links[1].tabIndex).to.equal(0);
    });
  });

  describe('teardown', () => {
    it('stops handling keys once its signal aborts', () => {
      const controller = new AbortController();
      rovingTabindex(container, { signal: controller.signal });
      controller.abort();
      const [one] = container.querySelectorAll('a');
      const event = new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true, cancelable: true });
      one.dispatchEvent(event);
      expect(event.defaultPrevented).to.be.false;
    });
  });
});
