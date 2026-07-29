import { expect } from '@esm-bundle/chai';
import sinon from 'sinon';

// sitenav.js runs a top-level IIFE that fetches nav content immediately on
// import. Stub fetch first so that hits a controlled 404 (short-circuiting
// the IIFE cleanly) instead of the network.
const bootstrapFetchStub = sinon.stub(window, 'fetch').resolves(new Response('', { status: 404 }));

const {
  decorateLevel, getExpandButton, syncBackgroundInert, closeSitenav,
} = await import('../../blocks/sitenav/sitenav.js');

bootstrapFetchStub.restore();

function buildNavList(html) {
  const wrapper = document.createElement('div');
  wrapper.innerHTML = html;
  return wrapper.querySelector('ul');
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

  describe('decorateLevel — mobile back button', () => {
    let btn;
    let backBtn;

    beforeEach(() => {
      const ul = buildNavList(`
        <ul>
          <li>
            <p>Foundations</p>
            <ul><li><a href="/foundations/overview">Overview</a></li></ul>
          </li>
        </ul>
      `);
      decorateLevel(ul, 1);
      btn = ul.querySelector('button.level-1-button');
      backBtn = ul.querySelector('.sitenav-back-btn');
    });

    it('creates a back button inside the level-2-menu with visible "Back" text', () => {
      expect(backBtn).to.not.be.null;
      expect(backBtn.closest('.level-2-menu')).to.not.be.null;
      expect(backBtn.textContent.trim()).to.equal('Back');
    });

    it('collapses the level-1-button (without closing the whole sitenav) when clicked', () => {
      btn.setAttribute('aria-expanded', 'true');
      backBtn.click();
      expect(btn.getAttribute('aria-expanded')).to.equal('false');
    });

    it('does not create a back button for depth 2 and deeper', () => {
      const nested = buildNavList(`
        <ul>
          <li>
            <p>Layout and structure</p>
            <ul><li><a href="/x">Spacing</a></li></ul>
          </li>
        </ul>
      `);
      decorateLevel(nested, 2);
      expect(nested.querySelector('.sitenav-back-btn')).to.be.null;
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

  describe('getExpandButton — desktop (rail widen/narrow)', () => {
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

    it('toggles is-open and aria-expanded together on click', () => {
      btn.click();
      expect(sitenav.hasAttribute('is-open')).to.be.true;
      expect(btn.getAttribute('aria-expanded')).to.equal('true');

      btn.click();
      expect(sitenav.hasAttribute('is-open')).to.be.false;
      expect(btn.getAttribute('aria-expanded')).to.equal('false');
    });

    it('never marks main/header/footer inert — the desktop rail sits beside content, not over it', () => {
      btn.click();
      expect(main.hasAttribute('inert')).to.be.false;
    });
  });

  describe('getExpandButton — mobile (full-screen tray)', () => {
    let sitenav;
    let btn;
    let main;
    let header;
    let footer;

    beforeEach(async () => {
      stubMatchMedia(sandbox, true);
      stubIconFetch(sandbox);
      sitenav = document.createElement('div');
      sitenav.id = 'sitenav';
      header = document.createElement('header');
      main = document.createElement('main');
      footer = document.createElement('footer');
      document.body.append(header, main, sitenav, footer);
      btn = await getExpandButton(sitenav);
      sitenav.append(btn);
    });

    it('marks main, header, and footer inert once opened', () => {
      btn.click();
      expect(main.hasAttribute('inert')).to.be.true;
      expect(header.hasAttribute('inert')).to.be.true;
      expect(footer.hasAttribute('inert')).to.be.true;
    });

    it('clears inert again once closed', () => {
      btn.click();
      btn.click();
      expect(main.hasAttribute('inert')).to.be.false;
      expect(header.hasAttribute('inert')).to.be.false;
      expect(footer.hasAttribute('inert')).to.be.false;
    });

    it('collapses a drilled-in level-1-button and closes the sitenav in one click, rather than opening further', () => {
      const level1Btn = document.createElement('button');
      level1Btn.className = 'level-1-button';
      level1Btn.setAttribute('aria-expanded', 'true');
      sitenav.append(level1Btn);
      sitenav.setAttribute('is-open', '');

      btn.click();

      expect(level1Btn.getAttribute('aria-expanded')).to.equal('false');
      expect(sitenav.hasAttribute('is-open')).to.be.false;
      expect(btn.getAttribute('aria-expanded')).to.equal('false');
    });

    it('still opens on the first tap when the current page pre-expanded a level-1-button', () => {
      const level1Btn = document.createElement('button');
      level1Btn.className = 'level-1-button';
      level1Btn.setAttribute('aria-expanded', 'true');
      sitenav.append(level1Btn);

      btn.click();

      expect(sitenav.hasAttribute('is-open')).to.be.true;
      expect(btn.getAttribute('aria-expanded')).to.equal('true');
    });
  });

  // Migrated from header.test.js's old "header mobile navigation" suite,
  // which tested a button.mobile-nav-button + #main-nav-list that no longer
  // exist — that responsibility (and its Escape-to-close behavior) moved
  // here when the sitenav took over primary site navigation.
  describe('getExpandButton — Escape key', () => {
    let sitenav;
    let btn;

    beforeEach(async () => {
      stubIconFetch(sandbox);
      sitenav = document.createElement('div');
      sitenav.id = 'sitenav';
      document.body.append(sitenav);
      btn = await getExpandButton(sitenav);
      sitenav.append(btn);
    });

    it('closes the open sitenav and sets aria-expanded="false"', () => {
      stubMatchMedia(sandbox, true);
      btn.click();
      expect(sitenav.hasAttribute('is-open')).to.be.true;

      document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));

      expect(sitenav.hasAttribute('is-open')).to.be.false;
      expect(btn.getAttribute('aria-expanded')).to.equal('false');
    });

    it('also collapses a drilled-in level-2 list, not just the sitenav itself', () => {
      stubMatchMedia(sandbox, true);
      const level1Btn = document.createElement('button');
      level1Btn.className = 'level-1-button';
      level1Btn.setAttribute('aria-expanded', 'true');
      sitenav.append(level1Btn);
      sitenav.setAttribute('is-open', '');

      document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));

      expect(level1Btn.getAttribute('aria-expanded')).to.equal('false');
      expect(sitenav.hasAttribute('is-open')).to.be.false;
    });

    it('returns focus to the toggle button', () => {
      stubMatchMedia(sandbox, true);
      btn.click();

      document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));

      expect(document.activeElement).to.equal(btn);
    });

    it('closes the expanded rail on desktop too', () => {
      stubMatchMedia(sandbox, false);
      btn.click();
      expect(sitenav.hasAttribute('is-open')).to.be.true;

      document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));

      expect(sitenav.hasAttribute('is-open')).to.be.false;
    });

    it('does nothing when the sitenav is already closed', () => {
      stubMatchMedia(sandbox, true);
      expect(sitenav.hasAttribute('is-open')).to.be.false;

      expect(() => document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true })))
        .to.not.throw();
      expect(sitenav.hasAttribute('is-open')).to.be.false;
    });

    it('ignores other keys', () => {
      stubMatchMedia(sandbox, true);
      btn.click();

      document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));

      expect(sitenav.hasAttribute('is-open')).to.be.true;
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

    it('is a no-op when nothing is expanded', () => {
      const sitenav = document.createElement('div');
      document.body.append(sitenav);

      expect(() => closeSitenav(sitenav)).to.not.throw();
      expect(sitenav.hasAttribute('is-open')).to.be.false;
    });
  });

  describe('syncBackgroundInert', () => {
    it('leaves main interactive when the sitenav is closed, even on mobile', () => {
      stubMatchMedia(sandbox, true);
      const sitenav = document.createElement('div');
      const main = document.createElement('main');
      document.body.append(main, sitenav);

      syncBackgroundInert(sitenav);

      expect(main.hasAttribute('inert')).to.be.false;
    });

    it('leaves main interactive when open on desktop', () => {
      stubMatchMedia(sandbox, false);
      const sitenav = document.createElement('div');
      sitenav.setAttribute('is-open', '');
      const main = document.createElement('main');
      document.body.append(main, sitenav);

      syncBackgroundInert(sitenav);

      expect(main.hasAttribute('inert')).to.be.false;
    });

    it('marks main inert only when open on mobile', () => {
      stubMatchMedia(sandbox, true);
      const sitenav = document.createElement('div');
      sitenav.setAttribute('is-open', '');
      const main = document.createElement('main');
      document.body.append(main, sitenav);

      syncBackgroundInert(sitenav);

      expect(main.hasAttribute('inert')).to.be.true;
    });
  });
});
