import { expect } from '@esm-bundle/chai';
import sinon from 'sinon';
import init from '../../blocks/page-nav/page-nav.js';

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

describe('page-nav block', () => {
  let sandbox;
  let el;

  beforeEach(() => {
    sandbox = sinon.createSandbox();
    el = document.createElement('nav');
    el.className = 'page-nav';
    el.setAttribute('aria-label', 'On this page');
    document.body.append(el);
  });

  afterEach(() => {
    sandbox.restore();
    document.body.innerHTML = '';
  });

  describe('init leaves the nav empty when no h2 headings are present', () => {
    it('does not append content when main has no h2 headings', async () => {
      stubMatchMedia(sandbox, true);
      makeDOM({ h2Texts: [] });
      await init(el);
      expect(el.children.length).to.equal(0);
    });

    it('does not throw when main has no h2 headings', async () => {
      stubMatchMedia(sandbox, true);
      makeDOM({ h2Texts: [] });
      await init(el);
    });
  });

  describe('init builds the navigation links at the desktop viewport', () => {
    beforeEach(async () => {
      stubMatchMedia(sandbox, true);
      makeDOM();
      await init(el);
    });

    it('appends a list directly to the nav without a details wrapper', () => {
      expect(el.querySelector('details')).to.be.null;
      expect(el.querySelector(':scope > ul')).to.not.be.null;
    });

    it('creates one list item per h2 heading plus a back-to-top entry', () => {
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

    it('appends a back-to-top link as the last list item', () => {
      expect(el.querySelector('ul li:last-child a').textContent).to.equal('Back to top');
    });

    it('back-to-top href points to the h1 id', () => {
      const topLink = el.querySelector('ul li:last-child a');
      const h1 = document.querySelector('main h1');
      expect(topLink.getAttribute('href')).to.equal(`#${h1.id}`);
    });

    it('no links have aria-current set before scrolling', () => {
      expect(el.querySelector('[aria-current]')).to.be.null;
    });
  });

  describe('init removes the nav from the DOM below the desktop breakpoint', () => {
    it('detaches the nav element from the document at a small-screen viewport', async () => {
      stubMatchMedia(sandbox, false);
      makeDOM();
      await init(el);
      expect(el.isConnected).to.be.false;
      expect(document.querySelector('nav.page-nav')).to.be.null;
    });

    it('detaches the nav element when the viewport shrinks below the breakpoint', async () => {
      const mql = stubMatchMedia(sandbox, true);
      makeDOM();
      await init(el);
      expect(document.querySelector('nav.page-nav ul')).to.not.be.null;
      mql.dispatch(false);
      expect(el.isConnected).to.be.false;
      expect(document.querySelector('nav.page-nav')).to.be.null;
    });

    it('restores the nav in place when the viewport grows past the breakpoint', async () => {
      const mql = stubMatchMedia(sandbox, false);
      makeDOM();
      await init(el);
      expect(el.isConnected).to.be.false;
      mql.dispatch(true);
      expect(el.isConnected).to.be.true;
      expect(el.querySelector('ul')).to.not.be.null;
      expect(el.querySelectorAll('ul li').length).to.equal(3);
    });
  });

  describe('init when h1 is absent', () => {
    it('does not include a back-to-top link', async () => {
      stubMatchMedia(sandbox, true);
      makeDOM({ h1Text: null });
      await init(el);
      const links = [...el.querySelectorAll('ul a')];
      expect(links.every((a) => a.textContent !== 'Back to top')).to.be.true;
    });
  });

  describe('init assigns ids and accessibility attributes to headings regardless of viewport', () => {
    beforeEach(() => {
      stubMatchMedia(sandbox, false);
    });

    it('assigns a slugified id to an h2 that has none', async () => {
      makeDOM({ h2Texts: ['Getting Started'] });
      await init(el);
      expect(document.querySelector('main h2').id).to.equal('getting-started');
    });

    it('assigns a slugified id to the h1', async () => {
      makeDOM();
      await init(el);
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
      await init(el);
      expect(document.querySelector('main h2').id).to.equal('my-custom-id');
    });

    it('deduplicates ids by appending a numeric suffix when two h2s share text', async () => {
      makeDOM({ h2Texts: ['Overview', 'Overview'] });
      await init(el);
      const [first, second] = document.querySelectorAll('main h2');
      expect(first.id).to.equal('overview');
      expect(second.id).to.equal('overview-2');
    });

    it('sets tabindex="-1" on each h2 heading', async () => {
      makeDOM();
      await init(el);
      document.querySelectorAll('main h2').forEach((h) => {
        expect(h.getAttribute('tabindex')).to.equal('-1');
      });
    });

    it('adds page-nav-target class to each h2 heading', async () => {
      makeDOM();
      await init(el);
      document.querySelectorAll('main h2').forEach((h) => {
        expect(h.classList.contains('page-nav-target')).to.be.true;
      });
    });

    it('sets tabindex="-1" on the h1', async () => {
      makeDOM();
      await init(el);
      expect(document.querySelector('main h1').getAttribute('tabindex')).to.equal('-1');
    });

    it('adds page-nav-target class to the h1', async () => {
      makeDOM();
      await init(el);
      expect(document.querySelector('main h1').classList.contains('page-nav-target')).to.be.true;
    });
  });
});
