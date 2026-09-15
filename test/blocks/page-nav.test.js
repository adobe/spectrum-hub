import { expect } from '@esm-bundle/chai';
import sinon from 'sinon';
import { isComponentPath, shouldRenderWidget, isPrivatePage } from '../../blocks/page-nav/page-nav.js';
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

// matches=true simulates the >=1200px desktop viewport where the nav renders;
// false simulates the small screens where it is removed. The captured change
// listener lets tests drive a viewport crossing.
function stubMatchMedia(sandbox, matches = false) {
  const listeners = [];
  const mql = {
    matches,
    addEventListener: (_event, cb) => listeners.push(cb),
    removeEventListener: (_event, cb) => {
      const index = listeners.indexOf(cb);
      if (index >= 0) {
        listeners.splice(index, 1);
      }
    },
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
  const state = {
    cb: null, targets: [], count: 0, disconnectCount: 0,
  };
  class FakeIntersectionObserver {
    constructor(cb) { state.cb = cb; state.count += 1; }

    observe(target) { state.targets.push(target); }

    unobserve() {}

    disconnect() { state.disconnectCount += 1; }
  }
  sandbox.stub(window, 'IntersectionObserver').value(FakeIntersectionObserver);
  return {
    trigger: (entries) => state.cb(entries),
    get targets() { return state.targets; },
    get count() { return state.count; },
    get disconnectCount() { return state.disconnectCount; },
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

  describe('the nav is omitted when no h2 headings are present', () => {
    it('does not append a landmark when main has no h2 headings', async () => {
      stubMatchMedia(sandbox, true);
      makeDOM({ h2Texts: [] });
      const el = await loadPageNav();
      expect(el).to.be.null;
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

    it('link text matches the corresponding h2 heading text', () => {
      const texts = [...el.querySelectorAll('ul a')].map((a) => a.textContent);
      expect(texts).to.include('Section One');
      expect(texts).to.include('Section Two');
    });

    it('each link href points to the id of its h2 heading', () => {
      const link = [...el.querySelectorAll('ul a')].find((a) => a.textContent === 'Section One');
      expect(link.getAttribute('href')).to.equal('#section-one');
    });

    it('no links have aria-current set before scrolling', () => {
      expect(el.querySelector('[aria-current]')).to.be.null;
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

    it('starts and stops scroll spy as the nav crosses the desktop breakpoint', async () => {
      const mql = stubMatchMedia(sandbox, false);
      const io = stubIntersectionObserver(sandbox);
      makeDOM();
      await loadPageNav();

      expect(io.count).to.equal(0);
      mql.dispatch(true);
      expect(io.count).to.equal(1);
      mql.dispatch(false);
      expect(io.disconnectCount).to.equal(1);
      mql.dispatch(true);
      expect(io.count).to.equal(2);
    });

    it('reuses its nav and widgets across viewport changes', async () => {
      const mql = stubMatchMedia(sandbox, false);
      stubIntersectionObserver(sandbox);
      makeDOM();
      await loadPageNav();

      mql.dispatch(true);
      const firstNav = document.querySelector('nav.page-nav');
      const firstWidgets = await waitForEl(firstNav, '.page-nav-widgets');
      mql.dispatch(false);
      mql.dispatch(true);

      expect(document.querySelector('nav.page-nav')).to.equal(firstNav);
      expect(document.querySelector('.page-nav-widgets')).to.equal(firstWidgets);
      expect(document.querySelectorAll('.page-nav-widgets').length).to.equal(1);
    });

    it('restores initial-hash current state when first shown on desktop', async () => {
      const originalUrl = window.location.pathname + window.location.search + window.location.hash;
      const mql = stubMatchMedia(sandbox, false);
      stubIntersectionObserver(sandbox);
      sandbox.stub(Element.prototype, 'scrollIntoView');
      makeDOM();
      window.history.pushState({}, '', `${window.location.pathname}#section-two`);
      try {
        await loadPageNav();
        mql.dispatch(true);
        expect(document.querySelector('a[href="#section-two"]').getAttribute('aria-current'))
          .to.equal('location');
      } finally {
        window.history.replaceState({}, '', originalUrl);
      }
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

  describe('clicking a link marks it current immediately', () => {
    // A clicked heading's own scroll can undershoot (see the .is-current
    // describe below), so the link can't wait on the observer to confirm it.
    it('sets aria-current synchronously, before any observer signal', async () => {
      stubMatchMedia(sandbox, true);
      stubIntersectionObserver(sandbox);
      makeDOM();
      const el = await loadPageNav();

      const firstLink = el.querySelector('ul li:first-child a');
      firstLink.click();

      expect(firstLink.getAttribute('aria-current')).to.equal('location');
    });

    it('moves aria-current to the newly clicked link and clears the previous one', async () => {
      stubMatchMedia(sandbox, true);
      stubIntersectionObserver(sandbox);
      makeDOM();
      const el = await loadPageNav();

      const [firstLink, secondLink] = [...el.querySelectorAll('ul a')];
      firstLink.click();
      secondLink.click();

      expect(secondLink.getAttribute('aria-current')).to.equal('location');
      expect(firstLink.getAttribute('aria-current')).to.be.null;
    });
  });

  describe('the last link gets a visual-only .is-current stand-in when clicked', () => {
    // The last heading can sit too close to the document's end to ever cross
    // into the observer's (bottom -50%) active band on its own, so it doesn't
    // earn aria-current the way the others do — .is-current stands in for it.
    it('adds is-current alongside aria-current when the last section link is clicked', async () => {
      stubMatchMedia(sandbox, true);
      stubIntersectionObserver(sandbox);
      makeDOM();
      const el = await loadPageNav();

      const links = [...el.querySelectorAll('ul a')];
      const lastLink = links[links.length - 1];
      lastLink.click();

      expect(lastLink.classList.contains('is-current')).to.be.true;
      expect(lastLink.getAttribute('aria-current')).to.equal('location');
    });

    it('does not add is-current to a non-last link when clicked', async () => {
      stubMatchMedia(sandbox, true);
      stubIntersectionObserver(sandbox);
      makeDOM();
      const el = await loadPageNav();

      const firstLink = el.querySelector('ul li:first-child a');
      firstLink.click();

      expect(firstLink.classList.contains('is-current')).to.be.false;
    });

    it('clears is-current from the last link once a different link becomes active', async () => {
      stubMatchMedia(sandbox, true);
      stubIntersectionObserver(sandbox);
      makeDOM();
      const el = await loadPageNav();

      const links = [...el.querySelectorAll('ul a')];
      const lastLink = links[links.length - 1];
      lastLink.click();
      expect(lastLink.classList.contains('is-current')).to.be.true;

      links[0].click();
      expect(lastLink.classList.contains('is-current')).to.be.false;
      expect(lastLink.getAttribute('aria-current')).to.be.null;
    });
  });

  describe('a click suppresses the scroll spy until the visitor scrolls themselves', () => {
    // Regression: clicking a link that undershoots can leave an earlier heading
    // sitting in the observer's band. The observer's own async reaction to that
    // click-triggered scroll used to fire right after and steal the highlight
    // back — this is what the suppression exists to prevent.
    it('ignores an observer signal for a different heading right after a click', async () => {
      stubMatchMedia(sandbox, true);
      const io = stubIntersectionObserver(sandbox);
      makeDOM();
      const el = await loadPageNav();

      const [sectionOne] = document.querySelectorAll('main h2');
      const [firstLink, secondLink] = [...el.querySelectorAll('ul a')];

      secondLink.click();
      io.trigger([{ target: sectionOne, isIntersecting: true }]);

      expect(secondLink.getAttribute('aria-current')).to.equal('location');
      expect(firstLink.getAttribute('aria-current')).to.be.null;
    });

    it('resumes once the visitor scrolls (a wheel event) themselves', async () => {
      stubMatchMedia(sandbox, true);
      const io = stubIntersectionObserver(sandbox);
      makeDOM();
      const el = await loadPageNav();

      const [sectionOne] = document.querySelectorAll('main h2');
      const [firstLink, secondLink] = [...el.querySelectorAll('ul a')];

      secondLink.click();
      window.dispatchEvent(new Event('wheel'));
      io.trigger([{ target: sectionOne, isIntersecting: true }]);

      expect(firstLink.getAttribute('aria-current')).to.equal('location');
      expect(secondLink.getAttribute('aria-current')).to.be.null;
    });

    it('does not resume for non-scroll keys or scroll keys from editable controls', async () => {
      stubMatchMedia(sandbox, true);
      const io = stubIntersectionObserver(sandbox);
      makeDOM();
      const input = document.createElement('input');
      document.body.append(input);
      const el = await loadPageNav();
      const [sectionOne] = document.querySelectorAll('main h2');
      const [firstLink, secondLink] = [...el.querySelectorAll('ul a')];

      secondLink.click();
      window.dispatchEvent(new KeyboardEvent('keydown', { key: 'a' }));
      input.dispatchEvent(new KeyboardEvent('keydown', { key: 'PageDown', bubbles: true }));
      io.trigger([{ target: sectionOne, isIntersecting: true }]);

      expect(secondLink.getAttribute('aria-current')).to.equal('location');
      expect(firstLink.getAttribute('aria-current')).to.be.null;
    });

    it('resumes for a scroll key outside editable controls', async () => {
      stubMatchMedia(sandbox, true);
      const io = stubIntersectionObserver(sandbox);
      makeDOM();
      const el = await loadPageNav();
      const [sectionOne] = document.querySelectorAll('main h2');
      const [firstLink] = [...el.querySelectorAll('ul a')];

      el.querySelector('a[href="#section-two"]').click();
      window.dispatchEvent(new KeyboardEvent('keydown', { key: 'PageDown' }));
      io.trigger([{ target: sectionOne, isIntersecting: true }]);

      expect(firstLink.getAttribute('aria-current')).to.equal('location');
    });

    it('clears stale active state when popstate has no matching heading', async () => {
      stubMatchMedia(sandbox, true);
      const io = stubIntersectionObserver(sandbox);
      makeDOM();
      const el = await loadPageNav();
      const [sectionOne] = document.querySelectorAll('main h2');
      const [firstLink, secondLink] = [...el.querySelectorAll('ul a')];

      secondLink.click();
      window.history.pushState({}, '', window.location.pathname);
      window.dispatchEvent(new PopStateEvent('popstate'));
      expect(el.querySelector('[aria-current]')).to.be.null;

      io.trigger([{ target: sectionOne, isIntersecting: true }]);
      expect(firstLink.getAttribute('aria-current')).to.equal('location');
    });
  });

  describe('resolving a #hash present at import time (a direct deep link)', () => {
    let originalUrl;

    beforeEach(() => {
      originalUrl = window.location.pathname + window.location.search + window.location.hash;
    });

    afterEach(() => {
      window.history.pushState({}, '', originalUrl);
      window.localStorage.removeItem('lazyhash');
    });

    it('scrolls to the resolved heading itself and marks its link current', async () => {
      stubMatchMedia(sandbox, true);
      stubIntersectionObserver(sandbox);
      const scrollIntoView = sandbox.stub(Element.prototype, 'scrollIntoView');
      makeDOM();
      window.history.pushState({}, '', `${window.location.pathname}#section-two`);

      const el = await loadPageNav();
      const link = [...el.querySelectorAll('ul a')].find((a) => a.textContent === 'Section Two');

      expect(scrollIntoView.calledOnceWithExactly({
        block: 'start',
        behavior: 'instant',
      })).to.be.true;
      expect(window.localStorage.getItem('lazyhash')).to.be.null;
      expect(link.getAttribute('aria-current')).to.equal('location');
    });

    it('suppresses the scroll spy so a later observer signal cannot override the initial target', async () => {
      stubMatchMedia(sandbox, true);
      const io = stubIntersectionObserver(sandbox);
      sandbox.stub(Element.prototype, 'scrollIntoView');
      makeDOM();
      window.history.pushState({}, '', `${window.location.pathname}#section-two`);

      const el = await loadPageNav();
      const [sectionOne] = document.querySelectorAll('main h2');
      const [firstLink, secondLink] = [...el.querySelectorAll('ul a')];

      io.trigger([{ target: sectionOne, isIntersecting: true }]);

      expect(secondLink.getAttribute('aria-current')).to.equal('location');
      expect(firstLink.getAttribute('aria-current')).to.be.null;
    });

    // Regression: an unrelated element elsewhere in the document (e.g. the
    // sitenav, which slugifies its own category names into ids the same way)
    // can happen to share an id with what a heading would slugify to. A plain
    // document.getElementById(hash) would resolve to whichever comes first in
    // the document — this must resolve against the collected headings instead.
    it('does not scroll to or activate an element that shares the hash id but is not a collected heading', async () => {
      stubMatchMedia(sandbox, true);
      stubIntersectionObserver(sandbox);
      const scrollIntoView = sandbox.stub(Element.prototype, 'scrollIntoView');

      const decoy = document.createElement('div');
      decoy.id = 'section-two';
      document.body.append(decoy);

      makeDOM({ h2Texts: ['Section One'] });
      window.history.pushState({}, '', `${window.location.pathname}#section-two`);

      await loadPageNav();

      expect(scrollIntoView.called).to.be.false;
      expect(document.querySelector('[aria-current]')).to.be.null;
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

    it('deduplicates authored ids in DOM order', async () => {
      makeDOM();
      const [first, second] = document.querySelectorAll('main h2');
      first.id = 'overview';
      second.id = 'overview';
      await loadPageNav();
      expect(first.id).to.equal('overview');
      expect(second.id).to.equal('overview-2');
    });

    it('deduplicates an authored id that belongs to a non-heading element', async () => {
      const reserved = document.createElement('div');
      reserved.id = 'overview';
      document.body.prepend(reserved);
      makeDOM({ h2Texts: ['Overview'] });
      document.querySelector('main h2').id = 'overview';
      await loadPageNav();
      expect(document.querySelector('main h2').id).to.equal('overview-2');
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

  describe('shouldRenderWidget — which widgets survive the URL/audience filter', () => {
    const copyMarkdown = { name: 'copy-markdown' };
    const goToImpl = { name: 'go-to-impl' };
    const seeInFigma = { name: 'see-in-figma', private: true };

    it('renders a global widget (copy-markdown) on a non-component page', () => {
      expect(shouldRenderWidget(copyMarkdown, false, false)).to.be.true;
    });

    it('renders a global widget on a component page too', () => {
      expect(shouldRenderWidget(copyMarkdown, true, false)).to.be.true;
    });

    it('hides a non-global widget on a non-component page', () => {
      expect(shouldRenderWidget(goToImpl, false, false)).to.be.false;
    });

    it('renders a non-global widget on a component page', () => {
      expect(shouldRenderWidget(goToImpl, true, false)).to.be.true;
    });

    it('hides a private widget on a public component page', () => {
      expect(shouldRenderWidget(seeInFigma, true, false)).to.be.false;
    });

    it('renders a private widget on a private component page', () => {
      expect(shouldRenderWidget(seeInFigma, true, true)).to.be.true;
    });

    it('still requires the URL gate for a private widget on a private page', () => {
      expect(shouldRenderWidget(seeInFigma, false, true)).to.be.false;
    });
  });

  describe('isPrivatePage — reads the audience meta', () => {
    afterEach(() => {
      document.head.querySelectorAll('meta[name="audience"]').forEach((m) => m.remove());
    });

    it('is true when the page declares audience=private', () => {
      const meta = document.createElement('meta');
      meta.name = 'audience';
      meta.content = 'private';
      document.head.append(meta);
      expect(isPrivatePage()).to.be.true;
    });

    it('is false with no audience meta', () => {
      expect(isPrivatePage()).to.be.false;
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
      document.head.querySelectorAll('meta[name="audience"]').forEach((m) => m.remove());
    });

    // see-in-figma is a private widget, so it only renders on a private page.
    const markPrivate = () => {
      const meta = document.createElement('meta');
      meta.name = 'audience';
      meta.content = 'private';
      document.head.append(meta);
    };

    it('renders all three decorated widgets, above the TOC, on a private component page', async () => {
      markPrivate();
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
      markPrivate();
      fetchStub.resolves({ ok: true, json: async () => ({ web: {} }) });
      window.history.pushState({}, '', '/web/swc/components/action-button');
      const el = await loadPageNav();
      const group = await waitForEl(el, '.page-nav-widgets');

      const rendered = [...group.querySelectorAll('[data-widget]')].map((w) => w.dataset.widget);
      expect(rendered).to.deep.equal(['copy-markdown', 'go-to-impl']);
    });

    it('hides the private see-in-figma widget on a public component page', async () => {
      window.history.pushState({}, '', '/web/swc/components/action-button');
      const el = await loadPageNav();
      const group = await waitForEl(el, '.page-nav-widgets');

      const rendered = [...group.querySelectorAll('[data-widget]')].map((w) => w.dataset.widget);
      expect(rendered).to.deep.equal(['copy-markdown', 'go-to-impl']);
      // see-in-figma is never a candidate on a public page, so its Figma lookup
      // never fires.
      expect(fetchStub.called).to.be.false;
    });
  });
});
