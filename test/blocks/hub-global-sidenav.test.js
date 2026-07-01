import { expect } from '@esm-bundle/chai';
import sinon from 'sinon';
// The named import also evaluates the module, which registers the custom element.
import { pathToId, parseRailFragment } from '../../blocks/hub-global-sidenav/hub-global-sidenav.js';

const RAIL_HTML = `
  <main><div><ul>
    <li><a href="/foundations"><span class="icon icon-color"></span>Foundations</a></li>
    <li><a href="/web/overview"><span class="icon icon-cpu"></span>Web</a></li>
    <li><a href="/support">Support</a></li>
  </ul></div></main>`;

function stubMatchMedia(sandbox, isMobile = false) {
  return sandbox.stub(window, 'matchMedia').returns({
    matches: isMobile,
    addEventListener: () => {},
    removeEventListener: () => {},
  });
}

function stubRailFetch(sandbox, html = RAIL_HTML, ok = true) {
  return sandbox.stub(window, 'fetch').resolves({
    ok,
    text: () => Promise.resolve(html),
  });
}

function stubAnimationFrame(sandbox) {
  sandbox.stub(window, 'requestAnimationFrame').callsFake((cb) => {
    cb(performance.now());
    return 1;
  });
}

async function flush(el, predicate, message = 'Timed out waiting for hub-global-sidenav to settle') {
  for (let i = 0; i < 20; i += 1) {
    /* eslint-disable no-await-in-loop */
    await el.updateComplete;
    if (predicate()) { return; }
    await new Promise((r) => { setTimeout(r, 0); });
    /* eslint-enable no-await-in-loop */
  }
  throw new Error(message);
}

// connectedCallback fetches the rail fragment asynchronously, then re-renders.
// Wait until the items have rendered (or give up after a few ticks).
async function mountAndWait(isMobile, sandbox) {
  stubAnimationFrame(sandbox);
  stubMatchMedia(sandbox, isMobile);
  stubRailFetch(sandbox);
  const el = document.createElement('hub-global-sidenav');
  document.body.append(el);
  await flush(el, () => Boolean(el.shadowRoot.querySelector('.hub-global-sidenav-item-btn')));
  return el;
}

describe('hub-global-sidenav block', () => {
  let sandbox;

  beforeEach(() => {
    sandbox = sinon.createSandbox();
    localStorage.setItem('hub-sidenav-collapsed', 'true');
  });

  afterEach(() => {
    sandbox.restore();
    document.body.innerHTML = '';
    localStorage.removeItem('hub-sidenav-collapsed');
    window.history.pushState({}, '', '/');
  });

  describe('pathToId', () => {
    it('strips the leading slash from a single-segment path', () => {
      expect(pathToId('/foundations')).to.equal('foundations');
    });

    it('replaces inner slashes with hyphens', () => {
      expect(pathToId('/web/overview')).to.equal('web-overview');
    });
  });

  describe('parseRailFragment', () => {
    it('returns one item per list link with path, label, and icon', async () => {
      stubRailFetch(sandbox);
      const items = await parseRailFragment('/fragments/nav/global-sidenav');
      expect(items).to.have.lengthOf(3);
      expect(items[0]).to.deep.equal({
        path: '/foundations',
        label: 'Foundations',
        iconPath: '/img/icons/s2-icon-color-20-n.svg',
      });
    });

    it('returns a null iconPath when a link has no icon', async () => {
      stubRailFetch(sandbox);
      const items = await parseRailFragment('/fragments/nav/global-sidenav');
      expect(items[2].iconPath).to.be.null;
    });

    it('returns null when the fragment request fails', async () => {
      stubRailFetch(sandbox, '', false);
      expect(await parseRailFragment('/missing')).to.be.null;
    });

    it('ignores list items that contain no anchor', async () => {
      stubRailFetch(sandbox, '<main><ul><li>no link</li><li><a href="/x">X</a></li></ul></main>');
      const items = await parseRailFragment('/x');
      expect(items).to.have.lengthOf(1);
      expect(items[0].path).to.equal('/x');
    });
  });

  describe('rendering the rail', () => {
    it('renders one nav button per fragment link', async () => {
      const el = await mountAndWait(false, sandbox);
      expect(el.shadowRoot.querySelectorAll('.hub-global-sidenav-item-btn')).to.have.lengthOf(3);
    });

    it('renders each item as a <button> with its label and icon', async () => {
      const el = await mountAndWait(false, sandbox);
      const buttons = el.shadowRoot.querySelectorAll('.hub-global-sidenav-item-btn');
      expect(buttons).to.have.lengthOf(3);
      expect(buttons[0].textContent).to.contain('Foundations');
    });

    it('each button has an aria-label that includes the action hint', async () => {
      const el = await mountAndWait(false, sandbox);
      const btn = el.shadowRoot.querySelector('.hub-global-sidenav-item-btn');
      expect(btn.getAttribute('aria-label')).to.contain('opens section navigation');
    });

    it('renders the collapse toggle on desktop', async () => {
      const el = await mountAndWait(false, sandbox);
      expect(el.shadowRoot.querySelector('#hub-global-sidenav-toggle')).to.not.be.null;
    });

    it('does not render the collapse toggle on mobile', async () => {
      const el = await mountAndWait(true, sandbox);
      expect(el.shadowRoot.querySelector('#hub-global-sidenav-toggle')).to.be.null;
    });
  });

  describe('selecting a section', () => {
    it('dispatches hub:section-selected with the top-level section key when an item is clicked', async () => {
      const el = await mountAndWait(false, sandbox);
      const spy = sandbox.spy();
      document.addEventListener('hub:section-selected', spy);
      const buttons = el.shadowRoot.querySelectorAll('.hub-global-sidenav-item-btn');
      buttons[1].click();
      document.removeEventListener('hub:section-selected', spy);
      expect(spy.calledOnce).to.be.true;
      expect(spy.firstCall.args[0].detail).to.deep.equal({ section: 'web' });
    });

    it('fires a hub:section-selected CustomEvent when a section button is clicked', async () => {
      const el = await mountAndWait(false, sandbox);
      const spy = sandbox.spy();
      const buttons = el.shadowRoot.querySelectorAll('.hub-global-sidenav-item-btn');
      document.addEventListener('hub:section-selected', spy);

      buttons[1].click();
      document.removeEventListener('hub:section-selected', spy);

      expect(spy.calledOnce).to.be.true;
      expect(spy.firstCall.args[0]).to.be.instanceOf(CustomEvent);
      expect(spy.firstCall.args[0].type).to.equal('hub:section-selected');
      expect(spy.firstCall.args[0].detail).to.deep.equal({ section: 'web' });
    });
  });

  describe('collapse state', () => {
    it('reflects the persisted collapsed state as an attribute on mount', async () => {
      const el = await mountAndWait(false, sandbox);
      expect(el.hasAttribute('collapsed')).to.be.true;
    });

    it('toggling persists the new state to localStorage and updates the attribute', async () => {
      const el = await mountAndWait(false, sandbox);
      el.shadowRoot.querySelector('#hub-global-sidenav-toggle').click();
      await el.updateComplete;
      expect(localStorage.getItem('hub-sidenav-collapsed')).to.equal('false');
      expect(el.hasAttribute('collapsed')).to.be.false;
      expect(el.getAttribute('data-anim-dir')).to.equal('expand');
    });
  });

  describe('mobile drawer', () => {
    it('does not reflect the persisted desktop collapsed state on mobile', async () => {
      const el = await mountAndWait(true, sandbox);
      expect(el.hasAttribute('collapsed')).to.be.false;
    });

    it('exposes modal dialog semantics on the host when open on mobile', async () => {
      const el = await mountAndWait(true, sandbox);
      document.dispatchEvent(new CustomEvent('hub:sidenav-toggle', { detail: { open: true } }));
      await el.updateComplete;
      expect(el.getAttribute('role')).to.equal('dialog');
      expect(el.getAttribute('aria-modal')).to.equal('true');
      expect(el.getAttribute('aria-label')).to.equal('Site navigation');
    });

    it('backdrop has aria-hidden="true"', async () => {
      const el = await mountAndWait(true, sandbox);
      document.dispatchEvent(new CustomEvent('hub:sidenav-toggle', { detail: { open: true } }));
      await el.updateComplete;
      const backdrop = el.shadowRoot.querySelector('.hub-global-sidenav-backdrop');
      expect(backdrop.getAttribute('aria-hidden')).to.equal('true');
    });

    it('Escape key closes the drawer', async () => {
      const el = await mountAndWait(true, sandbox);
      document.dispatchEvent(new CustomEvent('hub:sidenav-toggle', { detail: { open: true } }));
      await el.updateComplete;
      document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
      await el.updateComplete;
      expect(el.hasAttribute('open')).to.be.false;
    });

    it('nav is inert when closed on mobile', async () => {
      const el = await mountAndWait(true, sandbox);
      const nav = el.shadowRoot.querySelector('.hub-global-sidenav-nav');
      expect(nav.inert).to.be.true;
    });

    it('nav is not inert when open on mobile', async () => {
      const el = await mountAndWait(true, sandbox);
      document.dispatchEvent(new CustomEvent('hub:sidenav-toggle', { detail: { open: true } }));
      await el.updateComplete;
      const nav = el.shadowRoot.querySelector('.hub-global-sidenav-nav');
      expect(nav.inert).to.be.false;
    });
    it('opens when it receives hub:sidenav-toggle { open: true }', async () => {
      const el = await mountAndWait(true, sandbox);
      document.dispatchEvent(new CustomEvent('hub:sidenav-toggle', { detail: { open: true } }));
      await el.updateComplete;
      expect(el.hasAttribute('open')).to.be.true;
      expect(el.shadowRoot.querySelector('.hub-global-sidenav-backdrop')).to.not.be.null;
    });

    it('closes when it receives hub:sidenav-closed', async () => {
      const el = await mountAndWait(true, sandbox);
      document.dispatchEvent(new CustomEvent('hub:sidenav-toggle', { detail: { open: true } }));
      await el.updateComplete;
      document.dispatchEvent(new CustomEvent('hub:sidenav-closed'));
      await el.updateComplete;
      expect(el.hasAttribute('open')).to.be.false;
    });

    it('the backdrop closes the drawer when clicked', async () => {
      const el = await mountAndWait(true, sandbox);
      document.dispatchEvent(new CustomEvent('hub:sidenav-toggle', { detail: { open: true } }));
      await el.updateComplete;
      el.shadowRoot.querySelector('.hub-global-sidenav-backdrop').click();
      await el.updateComplete;
      expect(el.hasAttribute('open')).to.be.false;
    });

    it('returns focus to the trigger when the drawer closes', async () => {
      const trigger = document.createElement('button');
      document.body.append(trigger);
      trigger.focus();

      const el = await mountAndWait(true, sandbox);
      document.dispatchEvent(new CustomEvent('hub:sidenav-toggle', { detail: { open: true } }));
      await el.updateComplete;

      document.dispatchEvent(new CustomEvent('hub:sidenav-closed'));
      await el.updateComplete;

      expect(document.activeElement).to.equal(trigger);
    });

    it('moves focus to the first global sidenav item when the mobile drawer opens', async () => {
      const el = await mountAndWait(true, sandbox);

      document.dispatchEvent(new CustomEvent('hub:sidenav-toggle', { detail: { open: true } }));
      await flush(el, () => el.shadowRoot.activeElement === el.shadowRoot.querySelector('.hub-global-sidenav-item-btn'));

      expect(el.shadowRoot.activeElement).to.equal(
        el.shadowRoot.querySelector('.hub-global-sidenav-item-btn'),
      );
    });

    it('wraps Tab from the close button back to the first global sidenav item on mobile', async () => {
      const el = await mountAndWait(true, sandbox);

      document.dispatchEvent(new CustomEvent('hub:sidenav-toggle', { detail: { open: true } }));
      await flush(
        el,
        () => Boolean(el._trapKeyHandler)
          && el.shadowRoot.activeElement === el.shadowRoot.querySelector('.hub-global-sidenav-item-btn'),
      );

      const firstItem = el.shadowRoot.querySelector('.hub-global-sidenav-item-btn');
      const closeButton = el.shadowRoot.querySelector('.hub-global-sidenav-close');
      closeButton.focus();
      await flush(el, () => el.shadowRoot.activeElement === closeButton);

      document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Tab', bubbles: true }));

      expect(el.shadowRoot.activeElement).to.equal(firstItem);
    });
  });
});
