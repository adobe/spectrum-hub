import { expect } from '@esm-bundle/chai';
import sinon from 'sinon';
import globalInit from '../../blocks/hub-global-sidenav/hub-global-sidenav.js';
import sectionInit from '../../blocks/hub-section-sidenav/hub-section-sidenav.js';

const RAIL_HTML = '<main><ul><li><a href="/foundations">Foundations</a></li></ul></main>';
const PAGES = [{ path: '/foundations/color', title: 'Color' }];

function stubMatchMedia(sandbox, isMobile = true) {
  return sandbox.stub(window, 'matchMedia').returns({
    matches: isMobile,
    addEventListener: () => {},
    removeEventListener: () => {},
  });
}

function stubFetch(sandbox) {
  return sandbox.stub(window, 'fetch').callsFake((url) => {
    if (String(url).includes('query-index')) {
      return Promise.resolve({ ok: true, json: () => Promise.resolve({ data: PAGES }) });
    }
    return Promise.resolve({ ok: true, text: () => Promise.resolve(RAIL_HTML) });
  });
}

function stubAnimationFrame(sandbox) {
  sandbox.stub(window, 'requestAnimationFrame').callsFake((cb) => {
    cb(performance.now());
    return 1;
  });
}

async function flush(predicate) {
  for (let i = 0; i < 40; i += 1) {
    /* eslint-disable no-await-in-loop */
    if (predicate()) { return; }
    await new Promise((r) => { setTimeout(r, 0); });
    /* eslint-enable no-await-in-loop */
  }
  throw new Error('Timed out waiting for sidenavs to settle');
}

// hub-sidenav-item renders its link/button in its own nested shadow root, so
// document.activeElement only reports the outermost focused host — traverse
// all the way down to find what's really focused.
function deepActiveElement(root = document) {
  const active = root.activeElement;
  return active?.shadowRoot ? deepActiveElement(active.shadowRoot) : active;
}

// Mirrors the real DOM shape AND connection order templates create: the
// template's own init() creates and loads the section sidenav synchronously
// first; hub-global-sidenav connects later, via the lazy-loaded
// scripts/lazy.js. Connection order determines hub:sidenav-toggle listener
// registration order, which determines which component's updated() runs
// first when both react to the same event — order that must not matter for
// correctness, but only gets exercised if the test mounts in the real order.
async function mountBoth() {
  const navRail = document.createElement('aside');
  navRail.className = 'nav-rail';
  document.body.append(navRail);

  const sectionWrapper = document.createElement('div');
  sectionWrapper.className = 'hub-section-sidenav';
  navRail.append(sectionWrapper);
  await sectionInit(sectionWrapper);

  await flush(() => Boolean(sectionWrapper.querySelector('hub-section-sidenav')?._tree?.length));

  const globalWrapper = document.createElement('div');
  globalWrapper.className = 'hub-global-sidenav';
  navRail.prepend(globalWrapper);
  await globalInit(globalWrapper);

  await flush(() => Boolean(globalWrapper.querySelector('hub-global-sidenav')?._items?.length));

  return { globalWrapper, sectionWrapper };
}

describe('hub-global-sidenav + hub-section-sidenav background-inert interaction', () => {
  let sandbox;

  beforeEach(() => {
    sandbox = sinon.createSandbox();
    stubAnimationFrame(sandbox);
    stubMatchMedia(sandbox, true);
    stubFetch(sandbox);
    window.history.pushState({}, '', '/foundations/color');
  });

  afterEach(() => {
    sandbox.restore();
    document.body.innerHTML = '';
    window.history.pushState({}, '', '/');
  });

  it('keeps the section sidenav wrapper interactive when both open together on mobile', async () => {
    const { sectionWrapper } = await mountBoth();

    document.dispatchEvent(new CustomEvent('hub:sidenav-toggle', { detail: { open: true } }));
    await flush(() => sectionWrapper.querySelector('hub-section-sidenav')?.hasAttribute('open'));

    expect(sectionWrapper.inert).to.be.false;
  });

  it('does not leave both sidenav wrapper divs inert at once', async () => {
    const { globalWrapper, sectionWrapper } = await mountBoth();

    document.dispatchEvent(new CustomEvent('hub:sidenav-toggle', { detail: { open: true } }));
    await flush(() => sectionWrapper.querySelector('hub-section-sidenav')?.hasAttribute('open'));

    expect(globalWrapper.inert && sectionWrapper.inert).to.be.false;
  });

  it('deterministically marks the global wrapper inert and the section wrapper interactive, regardless of connection order', async () => {
    const { globalWrapper, sectionWrapper } = await mountBoth();

    document.dispatchEvent(new CustomEvent('hub:sidenav-toggle', { detail: { open: true } }));
    await flush(() => sectionWrapper.querySelector('hub-section-sidenav')?.hasAttribute('open'));
    // Give the deferred (rAF-scheduled) side of the interaction a chance to settle too.
    await flush(() => globalWrapper.inert === true);

    expect(sectionWrapper.inert).to.be.false;
    expect(globalWrapper.inert).to.be.true;
  });

  it('clicking the global backdrop closes both sidenavs when open together', async () => {
    const { globalWrapper, sectionWrapper } = await mountBoth();
    const globalEl = globalWrapper.querySelector('hub-global-sidenav');
    const sectionEl = sectionWrapper.querySelector('hub-section-sidenav');

    document.dispatchEvent(new CustomEvent('hub:sidenav-toggle', { detail: { open: true } }));
    await flush(() => sectionEl.hasAttribute('open'));

    const backdrop = globalEl.shadowRoot.querySelector('.hub-global-sidenav-backdrop');
    backdrop.click();
    await flush(() => !globalEl.hasAttribute('open') && !sectionEl.hasAttribute('open'));

    expect(globalEl.hasAttribute('open')).to.be.false;
    expect(sectionEl.hasAttribute('open')).to.be.false;
    expect(globalWrapper.inert).to.be.false;
    expect(sectionWrapper.inert).to.be.false;
  });

  it('returns focus to the trigger button when dismissed via the backdrop, with both sidenavs open', async () => {
    // End-to-end UX guarantee: focus ends up back on the trigger somehow.
    // Both hub-global-sidenav and hub-section-sidenav independently capture
    // document.activeElement on open and restore it on close, and since both
    // react to the same open/close events here, either one alone would
    // satisfy this assertion — it does not isolate which one is responsible.
    // See the dedicated test below for that.
    const trigger = document.createElement('button');
    trigger.type = 'button';
    document.body.append(trigger);
    trigger.focus();

    const { globalWrapper, sectionWrapper } = await mountBoth();
    const globalEl = globalWrapper.querySelector('hub-global-sidenav');
    const sectionEl = sectionWrapper.querySelector('hub-section-sidenav');

    document.dispatchEvent(new CustomEvent('hub:sidenav-toggle', { detail: { open: true } }));
    await flush(() => sectionEl.hasAttribute('open'));

    const backdrop = globalEl.shadowRoot.querySelector('.hub-global-sidenav-backdrop');
    backdrop.click();
    await flush(() => !globalEl.hasAttribute('open') && !sectionEl.hasAttribute('open'));
    await flush(() => document.activeElement === trigger);

    expect(document.activeElement === trigger).to.be.true;
  });

  it('returns focus to the trigger button when the global sidenav is dismissed on its own (section already closed via Back to main menu)', async () => {
    // Isolates hub-global-sidenav's own _openFocusTrigger/_returnFocus
    // mechanism: section closes first via a different path (Back to main
    // menu, which hands focus to global's first item rather than restoring
    // the original trigger), so by the time global itself closes, only
    // global's own captured trigger can be responsible for where focus ends up.
    const trigger = document.createElement('button');
    trigger.type = 'button';
    document.body.append(trigger);
    trigger.focus();

    const { globalWrapper, sectionWrapper } = await mountBoth();
    const globalEl = globalWrapper.querySelector('hub-global-sidenav');
    const sectionEl = sectionWrapper.querySelector('hub-section-sidenav');

    document.dispatchEvent(new CustomEvent('hub:sidenav-toggle', { detail: { open: true } }));
    await flush(() => sectionEl.hasAttribute('open'));

    const backBtn = sectionEl.shadowRoot.querySelector('.hub-section-sidenav-back');
    backBtn.click();
    await flush(() => !sectionEl.hasAttribute('open'));
    await flush(() => globalEl.hasAttribute('open'));

    document.dispatchEvent(new CustomEvent('hub:sidenav-closed'));
    await flush(() => !globalEl.hasAttribute('open'));
    await flush(() => document.activeElement === trigger);

    expect(document.activeElement === trigger).to.be.true;
  });

  it('Tab stays within the section sidenav (topmost) instead of being redirected by the global trap', async () => {
    const { sectionWrapper } = await mountBoth();
    const sectionEl = sectionWrapper.querySelector('hub-section-sidenav');

    document.dispatchEvent(new CustomEvent('hub:sidenav-toggle', { detail: { open: true } }));
    await flush(() => sectionEl.hasAttribute('open'));
    await flush(() => Boolean(sectionEl._trapKeyHandler));

    const backBtn = sectionEl.shadowRoot.querySelector('.hub-section-sidenav-back');
    backBtn.focus();
    await flush(() => deepActiveElement() === backBtn);

    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Tab', bubbles: true }));

    const firstItemLink = sectionEl.shadowRoot.querySelector('hub-sidenav-item')
      ?.shadowRoot?.querySelector('a, button');
    expect(deepActiveElement() === firstItemLink).to.be.true;
  });

  it('keeps the background inert after "Back to main menu" closes section but leaves global open', async () => {
    const { globalWrapper, sectionWrapper } = await mountBoth();
    const globalEl = globalWrapper.querySelector('hub-global-sidenav');
    const sectionEl = sectionWrapper.querySelector('hub-section-sidenav');

    document.dispatchEvent(new CustomEvent('hub:sidenav-toggle', { detail: { open: true } }));
    await flush(() => sectionEl.hasAttribute('open'));
    await flush(() => globalWrapper.inert === true);

    const backBtn = sectionEl.shadowRoot.querySelector('.hub-section-sidenav-back');
    backBtn.click();
    await flush(() => !sectionEl.hasAttribute('open'));
    await flush(() => globalWrapper.inert === false);

    expect(globalEl.hasAttribute('open')).to.be.true;
    expect(globalWrapper.inert).to.be.false;
    expect(sectionWrapper.inert).to.be.true;
  });

  it('moves focus to the first global sidenav item when "Back to main menu" is used', async () => {
    const { globalWrapper, sectionWrapper } = await mountBoth();
    const globalEl = globalWrapper.querySelector('hub-global-sidenav');
    const sectionEl = sectionWrapper.querySelector('hub-section-sidenav');

    document.dispatchEvent(new CustomEvent('hub:sidenav-toggle', { detail: { open: true } }));
    await flush(() => sectionEl.hasAttribute('open'));

    const backBtn = sectionEl.shadowRoot.querySelector('.hub-section-sidenav-back');
    backBtn.click();
    await flush(() => !sectionEl.hasAttribute('open'));

    const firstGlobalItem = globalEl.shadowRoot.querySelector('.hub-global-sidenav-item-btn');
    await flush(() => deepActiveElement() === firstGlobalItem);

    expect(deepActiveElement() === firstGlobalItem).to.be.true;
  });
});
