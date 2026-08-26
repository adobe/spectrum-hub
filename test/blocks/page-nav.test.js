import { expect } from '@esm-bundle/chai';
import sinon from 'sinon';
import { isComponentPath, shouldRenderWidget } from '../../blocks/page-nav/page-nav.js';
import { resetComponentSliceCacheForTests } from '../../scripts/utils/component-slice.js';

function makeDOM({ h1Text = 'Page Title', h2Texts = ['Section One', 'Section Two'] } = {}) {
  const main = document.createElement('main');
  if (h1Text) {
    const h1 = document.createElement('h1');
    h1.textContent = h1Text;
    main.append(h1);
  }
  h2Texts.forEach((text) => {
    const h2 = document.createElement('h2');
    h2.textContent = text;
    main.append(h2);
  });
  document.body.append(main);
}

// page-nav.js has no init export: a top-level IIFE builds its own <nav> and
// appends it to the body on import. Importing the module *is* the decoration,
// so every test sets up the DOM and its stubs first, then imports. A unique
// query string defeats the module cache so the IIFE re-runs each time (only
// page-nav.js itself re-executes; its dependencies stay cached).
let runCount = 0;
async function loadPageNav() {
  runCount += 1;
  await import(`../../blocks/page-nav/page-nav.js?run=${runCount}`);
  // Null below the desktop breakpoint, where the IIFE detaches the nav.
  return document.querySelector('nav.page-nav');
}

// The IIFE kicks off widget rendering without awaiting it, so an import
// resolving only means the synchronous work (TOC, ids, breakpoint) is done.
// Widget tests wait for the group the async pass appends last.
function waitForEl(root, selector, timeout = 2000) {
  return new Promise((resolve, reject) => {
    const start = performance.now();
    const check = () => {
      const found = root.querySelector(selector);
      if (found) {
        resolve(found);
        return;
      }
      if (performance.now() - start > timeout) {
        reject(new Error(`timed out waiting for ${selector}`));
        return;
      }
      setTimeout(check, 10);
    };
    check();
  });
}

// matches=true simulates the >=900px desktop viewport where the nav renders;
// false simulates the small screens where it is removed. The captured change
// listener lets tests drive a viewport crossing.
function stubMatchMedia(sandbox, matches = false) {
  const listeners = [];
  const mql = {
    matches,
    addEventListener: (_event, cb) => listeners.push(cb),
    dispatch: (nextMatches) => {
      mql.matches = nextMatches;
      listeners.forEach((cb) => cb({ matches: nextMatches }));
    },
  };
  sandbox.stub(window, 'matchMedia').returns(mql);
  return mql;
}

// Replaces the real IntersectionObserver so the scroll spy can be driven
// deterministically: `trigger` invokes the captured callback with the entries
// the browser would report as headings cross the active band. The real
// observer never fires under a test's static layout, which is why the
// scroll-spy regression below went unnoticed until exercised this way.
function stubIntersectionObserver(sandbox) {
  const state = { cb: null, targets: [], count: 0 };
  class FakeIntersectionObserver {
    constructor(cb) { state.cb = cb; state.count += 1; }

    observe(target) { state.targets.push(target); }

    unobserve() {}

    disconnect() {}
  }
  sandbox.stub(window, 'IntersectionObserver').value(FakeIntersectionObserver);
  return {
    trigger: (entries) => state.cb(entries),
    get targets() { return state.targets; },
    get count() { return state.count; },
  };
}

describe('page-nav block', () => {
  let sandbox;

  beforeEach(() => {
    sandbox = sinon.createSandbox();
  });

  afterEach(() => {
    sandbox.restore();
    document.body.innerHTML = '';
  });

  describe('the module builds its own nav landmark on import', () => {
    it('appends a labelled nav.page-nav to the body', async () => {
      stubMatchMedia(sandbox, true);
      makeDOM();
      const el = await loadPageNav();
      expect(el.parentElement).to.equal(document.body);
      expect(el.tagName).to.equal('NAV');
      expect(el.getAttribute('aria-label')).to.equal('On this page');
    });
  });

  describe('the nav stays empty when no h2 headings are present', () => {
    it('does not append content when main has no h2 headings', async () => {
      stubMatchMedia(sandbox, true);
      makeDOM({ h2Texts: [] });
      const el = await loadPageNav();
      expect(el.children.length).to.equal(0);
    });

    it('does not mark the nav ready when main has no h2 headings', async () => {
      stubMatchMedia(sandbox, true);
      makeDOM({ h2Texts: [] });
      const el = await loadPageNav();
      expect(el.dataset.pageNav).to.be.undefined;
    });
  });

  describe('the navigation links at the desktop viewport', () => {
    let el;

    beforeEach(async () => {
      stubMatchMedia(sandbox, true);
      makeDOM();
      el = await loadPageNav();
    });

    it('marks the nav ready once it has headings to list', () => {
      expect(el.dataset.pageNav).to.equal('ready');
    });

    it('appends a list directly to the nav without a details wrapper', () => {
      expect(el.querySelector('details')).to.be.null;
      expect(el.querySelector(':scope > ul')).to.not.be.null;
    });

    // Skipped: see TODO in page-nav.js.
    it.skip('creates one list item per h2 heading plus a back-to-top entry', () => {
      expect(el.querySelectorAll('ul li').length).to.equal(3);
    });

    it('link text matches the corresponding h2 heading text', () => {
      const texts = [...el.querySelectorAll('ul a')].map((a) => a.textContent);
      expect(texts).to.include('Section One');
      expect(texts).to.include('Section Two');
    });

    it('each link href points to the id of its h2 heading', () => {
      const link = [...el.querySelectorAll('ul a')].find((a) => a.textContent === 'Section One');
      expect(link.getAttribute('href')).to.equal('#section-one');
    });

    // Skipped: see TODO in page-nav.js.
    it.skip('appends a back-to-top link as the last list item', () => {
      expect(el.querySelector('ul li:last-child a').textContent).to.equal('Back to top');
    });

    // Skipped: see TODO in page-nav.js.
    it.skip('back-to-top href points to the h1 id', () => {
      const topLink = el.querySelector('ul li:last-child a');
      const h1 = document.querySelector('main h1');
      expect(topLink.getAttribute('href')).to.equal(`#${h1.id}`);
    });

    it('no links have aria-current set before scrolling', () => {
      expect(el.querySelector('[aria-current]')).to.be.null;
    });

    // Skipped: see TODO in page-nav.js.
    it.skip('does not list an h2 that lives inside the nav itself', () => {
      const texts = [...el.querySelectorAll('ul a')].map((a) => a.textContent);
      expect(texts).to.deep.equal(['Section One', 'Section Two', 'Back to top']);
    });
  });

  describe('the nav is removed from the DOM below the desktop breakpoint', () => {
    it('detaches the nav element at a small-screen viewport', async () => {
      stubMatchMedia(sandbox, false);
      makeDOM();
      await loadPageNav();
      expect(document.querySelector('nav.page-nav')).to.be.null;
    });

    it('detaches the nav element when the viewport shrinks below the breakpoint', async () => {
      const mql = stubMatchMedia(sandbox, true);
      makeDOM();
      const el = await loadPageNav();
      expect(el.querySelector('ul')).to.not.be.null;
      mql.dispatch(false);
      expect(el.isConnected).to.be.false;
      expect(document.querySelector('nav.page-nav')).to.be.null;
    });

    it('restores the nav in place when the viewport grows past the breakpoint', async () => {
      const mql = stubMatchMedia(sandbox, false);
      makeDOM();
      expect(await loadPageNav()).to.be.null;
      mql.dispatch(true);
      const el = document.querySelector('nav.page-nav');
      expect(el).to.not.be.null;
      expect(el.querySelectorAll('ul li').length).to.equal(2);
    });
  });

  describe('scroll spy keeps the active link in sync with the visible heading', () => {
    // Regression: the observer only reports headings whose intersection
    // *changed*. When the page is at the top, both the h1 and the first section
    // sit inside the active band, so clicking the first link scrolls the h1 out
    // and reports ONLY the h1's exit — no entry for the first section, which was
    // already (and stays) intersecting. The callback must still re-select the
    // first section as the topmost visible heading rather than bailing on the
    // exit-only batch and leaving the previous heading active.
    it('activates the first link on the first click when its heading is already in the band', async () => {
      stubMatchMedia(sandbox, true);
      const io = stubIntersectionObserver(sandbox);
      makeDOM();
      const el = await loadPageNav();

      const h1 = document.querySelector('main h1');
      const headings = [...document.querySelectorAll('main h1, main h2')];
      const firstLink = el.querySelector('ul li:first-child a');

      // At the top of the page the h1 and every section are in the band; the
      // topmost (h1) is active, so no section link is marked yet.
      io.trigger(headings.map((target) => ({ target, isIntersecting: true })));
      expect(firstLink.getAttribute('aria-current')).to.be.null;

      // Clicking the first link scrolls the h1 out of the band. The observer
      // reports only that exit; the first section is now the topmost visible.
      io.trigger([{ target: h1, isIntersecting: false }]);
      expect(firstLink.getAttribute('aria-current')).to.equal('location');
    });

    it('moves aria-current to the next section and clears the previous one', async () => {
      stubMatchMedia(sandbox, true);
      const io = stubIntersectionObserver(sandbox);
      makeDOM();
      const el = await loadPageNav();

      const [sectionOne, sectionTwo] = [...document.querySelectorAll('main h2')];
      const [firstLink, secondLink] = [...el.querySelectorAll('ul li a')];

      io.trigger([{ target: sectionOne, isIntersecting: true }]);
      expect(firstLink.getAttribute('aria-current')).to.equal('location');

      // Section two scrolls in and section one scrolls out.
      io.trigger([
        { target: sectionTwo, isIntersecting: true },
        { target: sectionOne, isIntersecting: false },
      ]);
      expect(secondLink.getAttribute('aria-current')).to.equal('location');
      expect(firstLink.getAttribute('aria-current')).to.be.null;
    });

    it('observes every h2 plus the h1 back-to-top target', async () => {
      stubMatchMedia(sandbox, true);
      const io = stubIntersectionObserver(sandbox);
      makeDOM();
      await loadPageNav();

      expect(io.count).to.equal(1);
      // The h1 is observed last, after the section headings it backs up to.
      expect(io.targets).to.deep.equal([
        ...document.querySelectorAll('main h2'),
        document.querySelector('main h1'),
      ]);
    });
  });

  describe('when h1 is absent', () => {
    it('does not include a back-to-top link', async () => {
      stubMatchMedia(sandbox, true);
      makeDOM({ h1Text: null });
      const el = await loadPageNav();
      const links = [...el.querySelectorAll('ul a')];
      expect(links.every((a) => a.textContent !== 'Back to top')).to.be.true;
    });
  });

  describe('ids and accessibility attributes are assigned regardless of viewport', () => {
    beforeEach(() => {
      stubMatchMedia(sandbox, false);
    });

    it('assigns a slugified id to an h2 that has none', async () => {
      makeDOM({ h2Texts: ['Getting Started'] });
      await loadPageNav();
      expect(document.querySelector('main h2').id).to.equal('getting-started');
    });

    it('assigns a slugified id to the h1', async () => {
      makeDOM();
      await loadPageNav();
      expect(document.querySelector('main h1').id).to.equal('page-title');
    });

    it('preserves an existing id on an h2', async () => {
      const main = document.createElement('main');
      const h1 = document.createElement('h1');
      h1.textContent = 'Page';
      const h2 = document.createElement('h2');
      h2.id = 'my-custom-id';
      h2.textContent = 'Custom';
      main.append(h1, h2);
      document.body.append(main);
      await loadPageNav();
      expect(document.querySelector('main h2').id).to.equal('my-custom-id');
    });

    it('strips a single-letter size modifier prefix (e.g. "size-m-") from an existing id', async () => {
      const main = document.createElement('main');
      const h1 = document.createElement('h1');
      h1.textContent = 'Page';
      const h2 = document.createElement('h2');
      h2.id = 'size-m-anatomy';
      h2.textContent = 'Anatomy';
      main.append(h1, h2);
      document.body.append(main);
      await loadPageNav();
      expect(document.querySelector('main h2').id).to.equal('anatomy');
    });

    it('strips a multi-character size modifier prefix (e.g. "size-xl-") from an existing id', async () => {
      const main = document.createElement('main');
      const h1 = document.createElement('h1');
      h1.textContent = 'Page';
      const h2 = document.createElement('h2');
      h2.id = 'size-xl-component-options';
      h2.textContent = 'Component options';
      main.append(h1, h2);
      document.body.append(main);
      await loadPageNav();
      expect(document.querySelector('main h2').id).to.equal('component-options');
    });

    it('strips only the leading size modifier, keeping a hyphenated id intact', async () => {
      const main = document.createElement('main');
      const h1 = document.createElement('h1');
      h1.textContent = 'Page';
      const h2 = document.createElement('h2');
      h2.id = 'size-2xl-multi-word-heading';
      h2.textContent = 'Multi word heading';
      main.append(h1, h2);
      document.body.append(main);
      await loadPageNav();
      expect(document.querySelector('main h2').id).to.equal('multi-word-heading');
    });

    it('does not touch an id that merely starts with "size" but has no modifier prefix', async () => {
      const main = document.createElement('main');
      const h1 = document.createElement('h1');
      h1.textContent = 'Page';
      const h2 = document.createElement('h2');
      h2.id = 'sizeable-content';
      h2.textContent = 'Sizeable content';
      main.append(h1, h2);
      document.body.append(main);
      await loadPageNav();
      expect(document.querySelector('main h2').id).to.equal('sizeable-content');
    });

    it('deduplicates ids by appending a numeric suffix when two h2s share text', async () => {
      makeDOM({ h2Texts: ['Overview', 'Overview'] });
      await loadPageNav();
      const [first, second] = document.querySelectorAll('main h2');
      expect(first.id).to.equal('overview');
      expect(second.id).to.equal('overview-2');
    });

    it('sets tabindex="-1" on each h2 heading', async () => {
      makeDOM();
      await loadPageNav();
      document.querySelectorAll('main h2').forEach((h) => {
        expect(h.getAttribute('tabindex')).to.equal('-1');
      });
    });

    it('adds page-nav-target class to each h2 heading', async () => {
      makeDOM();
      await loadPageNav();
      document.querySelectorAll('main h2').forEach((h) => {
        expect(h.classList.contains('page-nav-target')).to.be.true;
      });
    });

    it('sets tabindex="-1" on the h1', async () => {
      makeDOM();
      await loadPageNav();
      expect(document.querySelector('main h1').getAttribute('tabindex')).to.equal('-1');
    });

    it('adds page-nav-target class to the h1', async () => {
      makeDOM();
      await loadPageNav();
      expect(document.querySelector('main h1').classList.contains('page-nav-target')).to.be.true;
    });
  });

  describe('isComponentPath — widget URL gate', () => {
    it('is true when "components" is a path segment', () => {
      expect(isComponentPath('/web/swc/components/button')).to.be.true;
    });

    it('is false for a non-component interior page', () => {
      expect(isComponentPath('/web/swc/get-started')).to.be.false;
    });

    it('is false for the home page', () => {
      expect(isComponentPath('/')).to.be.false;
    });

    it('does not match a partial segment such as "componentsx"', () => {
      expect(isComponentPath('/web/swc/componentsx/button')).to.be.false;
    });
  });

  describe('shouldRenderWidget — which widgets survive the URL filter', () => {
    it('renders a global widget (copy-markdown) on a non-component page', () => {
      expect(shouldRenderWidget('copy-markdown', false)).to.be.true;
    });

    it('renders a global widget on a component page too', () => {
      expect(shouldRenderWidget('copy-markdown', true)).to.be.true;
    });

    it('hides a non-global widget on a non-component page', () => {
      expect(shouldRenderWidget('see-in-figma', false)).to.be.false;
    });

    it('renders a non-global widget on a component page', () => {
      expect(shouldRenderWidget('see-in-figma', true)).to.be.true;
    });
  });

  // page-nav builds and decorates its widgets directly (no fragment, no
  // action-button dispatch) — each widget's own decoration is lazily loaded
  // from its code-split block module (copy-md.js / go-to-impl.js / figma.js).
  describe('renderWidgets', () => {
    let originalUrl;
    let fetchStub;

    beforeEach(() => {
      originalUrl = window.location.pathname + window.location.search + window.location.hash;
      stubMatchMedia(sandbox, true);
      fetchStub = sandbox.stub(window, 'fetch').resolves({
        ok: true,
        json: async () => ({ web: {}, figmaPageId: '9230:3620' }),
      });
      resetComponentSliceCacheForTests();
      makeDOM();
    });

    afterEach(() => {
      window.history.pushState({}, '', originalUrl);
    });

    it('renders all three decorated widgets, above the TOC, on a component page', async () => {
      window.history.pushState({}, '', '/web/swc/components/action-button');
      const el = await loadPageNav();
      const group = await waitForEl(el, '.page-nav-widgets');

      // widgets group sits below the heading TOC list
      expect(group.previousElementSibling).to.equal(el.querySelector('ul'));

      const rendered = [...group.querySelectorAll('[data-widget]')].map((w) => w.dataset.widget);
      expect(rendered).to.deep.equal(['copy-markdown', 'go-to-impl', 'see-in-figma']);

      // copy-markdown becomes a button; the two link widgets stay anchors with
      // their URL-derived hrefs.
      expect(group.querySelector('[data-widget="copy-markdown"]').tagName).to.equal('BUTTON');
      expect(group.querySelector('a[data-widget="go-to-impl"]').getAttribute('href')).to.equal(
        'https://spectrum-web-components.adobe.com/?path=/docs/components-action-button--docs',
      );
      expect(group.querySelector('a[data-widget="see-in-figma"]').getAttribute('href')).to.equal(
        'https://www.figma.com/design/xHBWBBIe2eo5vwoCeNrC4Q/S2---Web?node-id=9230-3620&m=dev',
      );
    });

    it('renders only copy-markdown on a non-component interior page', async () => {
      window.history.pushState({}, '', '/web/swc/get-started');
      const el = await loadPageNav();
      const group = await waitForEl(el, '.page-nav-widgets');

      const rendered = [...group.querySelectorAll('[data-widget]')].map((w) => w.dataset.widget);
      expect(rendered).to.deep.equal(['copy-markdown']);
      expect(fetchStub.called).to.be.false;
    });

    it('drops a component-only widget that decorates itself away (no Figma entry)', async () => {
      fetchStub.resolves({ ok: true, json: async () => ({ web: {} }) });
      window.history.pushState({}, '', '/web/swc/components/action-button');
      const el = await loadPageNav();
      const group = await waitForEl(el, '.page-nav-widgets');

      const rendered = [...group.querySelectorAll('[data-widget]')].map((w) => w.dataset.widget);
      expect(rendered).to.deep.equal(['copy-markdown', 'go-to-impl']);
    });
  });
});
