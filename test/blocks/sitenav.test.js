import { expect } from '@esm-bundle/chai';
import sinon from 'sinon';

// sitenav.js runs a top-level IIFE that fetches nav content immediately on
// import. Stub fetch first so that hits a controlled 404 (short-circuiting
// the IIFE cleanly) instead of the network.
const bootstrapFetchStub = sinon.stub(window, 'fetch').resolves(new Response('', { status: 404 }));

const {
  decorateLevel, getSiteNav, getExpandButton, getTriggerButton, closeSitenav,
  isMobileViewport, setupOutsideClose, setupSitenavKeyboardHandling, setupSearchIntegration,
} = await import('../../blocks/sitenav/sitenav.js');

bootstrapFetchStub.restore();

function buildNavList(html) {
  const wrapper = document.createElement('div');
  wrapper.innerHTML = html;
  return wrapper.querySelector('ul');
}

// Chai serializes both operands into its diff when an equality assertion fails.
// For document.activeElement that operand is usually <body> — a payload large
// enough to hang the test runner (0 passed, 0 failed, silent timeout) instead of
// reporting the failure. Compare identity as a boolean so a miss prints a
// readable message rather than the whole DOM.
function expectFocus(el, description) {
  const active = document.activeElement;
  const actual = active ? `<${active.tagName.toLowerCase()} class="${active.className}">` : 'nothing';
  expect(active === el, `expected focus on ${description}, got ${actual}`).to.be.true;
}

function stubMatchMedia(sandbox, matches) {
  const mql = {
    matches,
    addEventListener: sandbox.stub(),
    removeEventListener: sandbox.stub(),
  };
  sandbox.stub(window, 'matchMedia').returns(mql);
  return mql;
}

function stubIconFetch(sandbox) {
  return sandbox.stub(window, 'fetch').resolves(new Response('<svg></svg>', {
    status: 200,
    headers: { 'Content-Type': 'image/svg+xml' },
  }));
}

describe('sitenav block', () => {
  let sandbox;

  beforeEach(() => {
    sandbox = sinon.createSandbox();
    document.body.innerHTML = '';
  });

  afterEach(() => {
    sandbox.restore();
  });

  describe('getSiteNav', () => {
    it('builds the #sitenav wrapper around a labelled nav landmark', () => {
      const { sitenav, nav } = getSiteNav();
      expect(sitenav.id).to.equal('sitenav');
      expect(nav.tagName).to.equal('NAV');
      expect(nav.getAttribute('aria-label')).to.equal('Spectrum Hub');
      expect(nav.parentElement).to.equal(sitenav);
    });
  });

  describe('decorateLevel — accessible name for icon-only toggle buttons', () => {
    it('sets aria-label on the toggle button when the heading has a link (no visible label text)', () => {
      const ul = buildNavList(`
        <ul>
          <li>
            <p><a href="/web/rsp/components">Components</a></p>
            <ul><li><a href="/web/rsp/components/action-bar">Action bar</a></li></ul>
          </li>
        </ul>
      `);
      decorateLevel(ul, 2);
      const btn = ul.querySelector('button.level-2-button');
      expect(btn.getAttribute('aria-label')).to.equal('Components');
      expect(btn.textContent.trim()).to.equal('');
    });

    it('does not set aria-label when the heading has no link (visible label already present)', () => {
      const ul = buildNavList(`
        <ul>
          <li>
            <p>Foundations</p>
            <ul><li><a href="/foundations/overview">Overview</a></li></ul>
          </li>
        </ul>
      `);
      decorateLevel(ul, 1);
      const btn = ul.querySelector('button.level-1-button');
      expect(btn.hasAttribute('aria-label')).to.be.false;
      expect(btn.querySelector('.list-item-label').textContent).to.equal('Foundations');
    });
  });

  describe('decorateLevel — disclosure wiring', () => {
    it('points aria-controls at the menu wrapper it expands', () => {
      const ul = buildNavList(`
        <ul>
          <li>
            <p>Foundations</p>
            <ul><li><a href="/foundations/overview">Overview</a></li></ul>
          </li>
        </ul>
      `);
      decorateLevel(ul, 1);
      const btn = ul.querySelector('button.level-1-button');
      const menu = ul.querySelector('.level-2-menu');
      expect(menu.classList.contains('can-expand')).to.be.true;
      expect(btn.getAttribute('aria-controls')).to.equal(menu.id);
      expect(menu.id).to.equal('foundations');
    });

    it('starts collapsed and toggles aria-expanded on click', () => {
      const ul = buildNavList(`
        <ul>
          <li>
            <p>Foundations</p>
            <ul><li><a href="/foundations/overview">Overview</a></li></ul>
          </li>
        </ul>
      `);
      decorateLevel(ul, 1);
      const btn = ul.querySelector('button.level-1-button');
      expect(btn.getAttribute('aria-expanded')).to.equal('false');
      btn.click();
      expect(btn.getAttribute('aria-expanded')).to.equal('true');
      btn.click();
      expect(btn.getAttribute('aria-expanded')).to.equal('false');
    });

    it('leaves a leaf item (no nested list) as a plain link', () => {
      const ul = buildNavList('<ul><li><a href="/x">Overview</a></li></ul>');
      decorateLevel(ul, 1);
      expect(ul.querySelector('button')).to.be.null;
      expect(ul.querySelector('a').getAttribute('href')).to.equal('/x');
    });
  });

  // decorateIndexBasedNav stitches query-index pages under the "Components"
  // item of a known implementation. It finds that item by the marker
  // decorateLevel stamps here, so the marker is the contract between them.
  describe('decorateLevel — index-based nav marker', () => {
    function buildImplList(parentLabel) {
      return buildNavList(`
        <ul>
          <li><p>${parentLabel}</p></li>
          <li>
            <p>Components</p>
            <ul><li>[auto-generated]</li></ul>
          </li>
        </ul>
      `);
    }

    it('marks a Components item that follows a known implementation with its prefix', () => {
      const ul = buildImplList('SWC');
      decorateLevel(ul, 2);
      const label = ul.querySelector('.list-item-label[index-based-nav-prefix]');
      expect(label.getAttribute('index-based-nav-prefix')).to.equal('/web/swc');
    });

    it('leaves a Components item unmarked when the preceding item is not a known implementation', () => {
      const ul = buildImplList('Foundations');
      decorateLevel(ul, 2);
      expect(ul.querySelector('[index-based-nav-prefix]')).to.be.null;
    });
  });

  describe('decorateLevel — level-1 mutual exclusivity', () => {
    it('collapses the previously-expanded level-1-button when a sibling is expanded', () => {
      const ul = buildNavList(`
        <ul>
          <li><p>Foundations</p><ul><li><a href="/x">Overview</a></li></ul></li>
          <li><p>Web</p><ul><li><a href="/y">Overview</a></li></ul></li>
        </ul>
      `);
      decorateLevel(ul, 1);
      const [first, second] = ul.querySelectorAll('button.level-1-button');

      first.click();
      expect(first.getAttribute('aria-expanded')).to.equal('true');

      second.click();
      expect(second.getAttribute('aria-expanded')).to.equal('true');
      expect(first.getAttribute('aria-expanded')).to.equal('false');
    });
  });

  describe('getExpandButton — accessible name and state', () => {
    it('has an accessible label, aria-controls, and starts collapsed', async () => {
      stubMatchMedia(sandbox, false);
      stubIconFetch(sandbox);
      const sitenav = document.createElement('div');
      sitenav.id = 'sitenav';
      document.body.append(sitenav);

      const btn = await getExpandButton(sitenav);

      expect(btn.getAttribute('aria-label')).to.equal('Toggle site navigation');
      expect(btn.getAttribute('aria-expanded')).to.equal('false');
      expect(btn.getAttribute('aria-controls')).to.equal('sitenav');
    });
  });

  // The expand button widens/narrows the rail (is-expanded). Opening the
  // mobile tray (is-open) is getTriggerButton's job — see below.
  describe('getExpandButton — rail widen/narrow', () => {
    let sitenav;
    let btn;
    let main;

    beforeEach(async () => {
      stubMatchMedia(sandbox, false);
      stubIconFetch(sandbox);
      sitenav = document.createElement('div');
      sitenav.id = 'sitenav';
      main = document.createElement('main');
      document.body.append(main, sitenav);
      btn = await getExpandButton(sitenav);
      sitenav.append(btn);
    });

    it('toggles is-expanded and aria-expanded together on click', () => {
      btn.click();
      expect(sitenav.hasAttribute('is-expanded')).to.be.true;
      expect(btn.getAttribute('aria-expanded')).to.equal('true');

      btn.click();
      expect(sitenav.hasAttribute('is-expanded')).to.be.false;
      expect(btn.getAttribute('aria-expanded')).to.equal('false');
    });

    it('does not open the mobile tray — the rail width is a separate state', () => {
      btn.click();
      expect(sitenav.hasAttribute('is-open')).to.be.false;
    });
  });

  describe('getTriggerButton — mobile tray', () => {
    let sitenav;
    let trigger;

    beforeEach(async () => {
      stubMatchMedia(sandbox, true);
      stubIconFetch(sandbox);
      sitenav = document.createElement('div');
      sitenav.id = 'sitenav';
      document.body.append(sitenav);
      trigger = await getTriggerButton(sitenav);
      sitenav.append(trigger);
    });

    it('has an accessible label, aria-controls, and starts collapsed', () => {
      expect(trigger.classList.contains('sitenav-trigger-btn')).to.be.true;
      expect(trigger.getAttribute('aria-label')).to.equal('Toggle site navigation');
      expect(trigger.getAttribute('aria-expanded')).to.equal('false');
      expect(trigger.getAttribute('aria-controls')).to.equal('sitenav');
    });

    it('opens the tray on the first tap', () => {
      trigger.click();
      expect(sitenav.hasAttribute('is-open')).to.be.true;
      expect(trigger.getAttribute('aria-expanded')).to.equal('true');
    });

    it('closes the tray on the second tap', () => {
      trigger.click();
      trigger.click();
      expect(sitenav.hasAttribute('is-open')).to.be.false;
      expect(trigger.getAttribute('aria-expanded')).to.equal('false');
    });

    it('collapses a drilled-in level-1-button as it closes', () => {
      const level1Btn = document.createElement('button');
      level1Btn.className = 'level-1-button';
      level1Btn.setAttribute('aria-expanded', 'true');
      sitenav.append(level1Btn);

      trigger.click();
      trigger.click();

      expect(level1Btn.getAttribute('aria-expanded')).to.equal('false');
      expect(sitenav.hasAttribute('is-open')).to.be.false;
    });
  });

  describe('closeSitenav', () => {
    it('removes is-open and collapses any expanded level-1-button', () => {
      stubMatchMedia(sandbox, true);
      const sitenav = document.createElement('div');
      sitenav.setAttribute('is-open', '');
      const level1Btn = document.createElement('button');
      level1Btn.className = 'level-1-button';
      level1Btn.setAttribute('aria-expanded', 'true');
      sitenav.append(level1Btn);
      document.body.append(sitenav);

      closeSitenav(sitenav);

      expect(sitenav.hasAttribute('is-open')).to.be.false;
      expect(level1Btn.getAttribute('aria-expanded')).to.equal('false');
    });

    it('resets the trigger button back to collapsed', () => {
      const sitenav = document.createElement('div');
      sitenav.setAttribute('is-open', '');
      const trigger = document.createElement('button');
      trigger.className = 'sitenav-trigger-btn';
      trigger.setAttribute('aria-expanded', 'true');
      sitenav.append(trigger);
      document.body.append(sitenav);

      closeSitenav(sitenav);

      expect(trigger.getAttribute('aria-expanded')).to.equal('false');
    });

    it('is a no-op when nothing is expanded', () => {
      const sitenav = document.createElement('div');
      document.body.append(sitenav);

      expect(() => closeSitenav(sitenav)).to.not.throw();
      expect(sitenav.hasAttribute('is-open')).to.be.false;
    });
  });

  // Migrated from header.test.js's old "header mobile navigation" suite, which
  // tested a button.mobile-nav-button + #main-nav-list that no longer exist —
  // that responsibility moved here when the sitenav took over primary site
  // navigation. The handlers live on document and only act while the tray is
  // open, so they are wired up explicitly rather than by the toggle buttons.
  describe('setupSitenavKeyboardHandling — Escape key', () => {
    let sitenav;
    let btn;

    beforeEach(async () => {
      stubIconFetch(sandbox);
      sitenav = document.createElement('div');
      sitenav.id = 'sitenav';
      document.body.append(sitenav);
      btn = await getExpandButton(sitenav);
      sitenav.append(btn);
      setupSitenavKeyboardHandling(sitenav, [btn]);
    });

    function pressEscape() {
      document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    }

    it('closes the open sitenav', () => {
      stubMatchMedia(sandbox, true);
      sitenav.setAttribute('is-open', '');

      pressEscape();

      expect(sitenav.hasAttribute('is-open')).to.be.false;
    });

    it('also collapses a drilled-in level-2 list, not just the sitenav itself', () => {
      stubMatchMedia(sandbox, true);
      const level1Btn = document.createElement('button');
      level1Btn.className = 'level-1-button';
      level1Btn.setAttribute('aria-expanded', 'true');
      sitenav.append(level1Btn);
      sitenav.setAttribute('is-open', '');

      pressEscape();

      expect(level1Btn.getAttribute('aria-expanded')).to.equal('false');
      expect(sitenav.hasAttribute('is-open')).to.be.false;
    });

    it('returns focus to the toggle button', () => {
      stubMatchMedia(sandbox, true);
      sitenav.setAttribute('is-open', '');

      pressEscape();

      expectFocus(btn, 'the sitenav toggle button');
    });

    it('closes on desktop too — Escape is not viewport-gated', () => {
      stubMatchMedia(sandbox, false);
      sitenav.setAttribute('is-open', '');

      pressEscape();

      expect(sitenav.hasAttribute('is-open')).to.be.false;
    });

    it('does nothing when the sitenav is already closed', () => {
      stubMatchMedia(sandbox, true);

      expect(() => pressEscape()).to.not.throw();
      expect(sitenav.hasAttribute('is-open')).to.be.false;
    });

    it('ignores other keys', () => {
      stubMatchMedia(sandbox, true);
      sitenav.setAttribute('is-open', '');

      document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));

      expect(sitenav.hasAttribute('is-open')).to.be.true;
    });
  });

  describe('setupSitenavKeyboardHandling — focus trap', () => {
    let sitenav;
    let btn;
    let navLink;

    beforeEach(async () => {
      stubIconFetch(sandbox);
      sitenav = document.createElement('div');
      sitenav.id = 'sitenav';
      document.body.append(sitenav);
      btn = await getExpandButton(sitenav);
      sitenav.append(btn);
      navLink = document.createElement('a');
      navLink.href = '/foo';
      navLink.textContent = 'Foo';
      sitenav.append(navLink);
      setupSitenavKeyboardHandling(sitenav, [btn]);
    });

    function pressTab({ shiftKey = false } = {}) {
      const event = new KeyboardEvent('keydown', {
        key: 'Tab', shiftKey, bubbles: true, cancelable: true,
      });
      document.dispatchEvent(event);
      return event;
    }

    it('wraps Tab from the last focusable element back to the first', () => {
      stubMatchMedia(sandbox, true);
      sitenav.setAttribute('is-open', '');
      navLink.focus();

      const event = pressTab();

      expect(event.defaultPrevented).to.be.true;
      expectFocus(btn, 'the first focusable element in the tray');
    });

    it('wraps Shift+Tab from the first focusable element to the last', () => {
      stubMatchMedia(sandbox, true);
      sitenav.setAttribute('is-open', '');
      btn.focus();

      const event = pressTab({ shiftKey: true });

      expect(event.defaultPrevented).to.be.true;
      expectFocus(navLink, 'the last focusable element in the tray');
    });

    it('leaves Tab alone in the middle of the tray', () => {
      stubMatchMedia(sandbox, true);
      sitenav.setAttribute('is-open', '');
      btn.focus();

      expect(pressTab().defaultPrevented).to.be.false;
    });

    it('does not trap Tab while the tray is closed', () => {
      stubMatchMedia(sandbox, true);
      navLink.focus();

      expect(pressTab().defaultPrevented).to.be.false;
    });

    // The desktop rail sits beside the content rather than over it, so focus
    // must be free to leave it.
    it('does not trap Tab on desktop', () => {
      stubMatchMedia(sandbox, false);
      sitenav.setAttribute('is-open', '');
      navLink.focus();

      expect(pressTab().defaultPrevented).to.be.false;
    });
  });

  describe('setupOutsideClose', () => {
    let sitenav;
    let outside;

    beforeEach(() => {
      sitenav = document.createElement('div');
      sitenav.id = 'sitenav';
      const inside = document.createElement('button');
      inside.className = 'inside';
      sitenav.append(inside);
      outside = document.createElement('button');
      document.body.append(sitenav, outside);
      setupOutsideClose(sitenav);
    });

    it('closes the open tray when the click lands outside it on mobile', () => {
      stubMatchMedia(sandbox, true);
      sitenav.setAttribute('is-open', '');

      outside.click();

      expect(sitenav.hasAttribute('is-open')).to.be.false;
    });

    it('ignores clicks inside the tray', () => {
      stubMatchMedia(sandbox, true);
      sitenav.setAttribute('is-open', '');

      sitenav.querySelector('.inside').click();

      expect(sitenav.hasAttribute('is-open')).to.be.true;
    });

    // The desktop rail is in-flow, so clicking the page beside it is not a
    // dismiss gesture the way tapping outside a floating overlay is.
    it('ignores outside clicks on desktop', () => {
      stubMatchMedia(sandbox, false);
      sitenav.setAttribute('is-open', '');

      outside.click();

      expect(sitenav.hasAttribute('is-open')).to.be.true;
    });

    it('does nothing when the tray is already closed', () => {
      stubMatchMedia(sandbox, true);

      expect(() => outside.click()).to.not.throw();
      expect(sitenav.hasAttribute('is-open')).to.be.false;
    });
  });

  describe('isMobileViewport', () => {
    it('is true below the 900px breakpoint', () => {
      const mql = stubMatchMedia(sandbox, true);
      expect(isMobileViewport()).to.be.true;
      expect(window.matchMedia.calledWith('(width < 900px)')).to.be.true;
      expect(mql.matches).to.be.true;
    });

    it('is false at or above the breakpoint', () => {
      stubMatchMedia(sandbox, false);
      expect(isMobileViewport()).to.be.false;
    });
  });

  describe('setupSearchIntegration', () => {
    let navList;

    beforeEach(() => {
      navList = buildNavList(`
        <ul>
          <li><p>Getting started</p><ul><li><a href="/a">a</a></li></ul></li>
          <li><p>Foundations</p><ul><li><a href="/b">b</a></li></ul></li>
        </ul>
      `);
      decorateLevel(navList, 1);
      document.body.append(navList);
      setupSearchIntegration(navList);
    });

    afterEach(() => navList.remove());

    it('expands the level-1 button matching the dispatched label', () => {
      document.dispatchEvent(new CustomEvent('sitenav:expand-level1', { detail: { label: 'Foundations' } }));

      const btn = navList.querySelector('.level-1-button[aria-controls="foundations"]');
      expect(btn.getAttribute('aria-expanded')).to.equal('true');
    });

    it('does nothing when no level-1 button matches the label', () => {
      document.dispatchEvent(new CustomEvent('sitenav:expand-level1', { detail: { label: 'Nonexistent' } }));

      const anyExpanded = [...navList.querySelectorAll('.level-1-button')]
        .some((btn) => btn.getAttribute('aria-expanded') === 'true');
      expect(anyExpanded).to.be.false;
    });
  });
});
