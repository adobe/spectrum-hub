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

function stubMatchMedia(sandbox, matches = false) {
  return sandbox.stub(window, 'matchMedia').returns({ matches, addEventListener: () => {} });
}

describe('page-nav block', () => {
  let sandbox;
  let el;

  beforeEach(() => {
    sandbox = sinon.createSandbox();
    el = document.createElement('nav');
    el.className = 'page-nav';
    document.body.append(el);
  });

  afterEach(() => {
    sandbox.restore();
    document.body.innerHTML = '';
  });

  describe('init leaves the nav empty when no h2 headings are present', () => {
    it('does not append content when main has no h2 headings', async () => {
      stubMatchMedia(sandbox);
      makeDOM({ h2Texts: [] });
      await init(el);
      expect(el.children.length).to.equal(0);
    });

    it('does not throw when main has no h2 headings', async () => {
      stubMatchMedia(sandbox);
      makeDOM({ h2Texts: [] });
      await init(el);
    });
  });

  describe('init builds the disclosure widget and navigation links', () => {
    beforeEach(async () => {
      stubMatchMedia(sandbox);
      makeDOM();
      await init(el);
    });

    it('appends a details element', () => {
      expect(el.querySelector('details')).to.not.be.null;
    });

    it('appends a summary inside details', () => {
      expect(el.querySelector('details summary')).to.not.be.null;
    });

    it('summary shows the h1 text as the current section label', () => {
      expect(el.querySelector('.page-nav-current').textContent).to.equal('Page Title');
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

  describe('init when h1 is absent', () => {
    it('summary falls back to document.title', async () => {
      stubMatchMedia(sandbox);
      document.title = 'Test Doc Title';
      makeDOM({ h1Text: null });
      await init(el);
      expect(el.querySelector('.page-nav-current').textContent).to.equal('Test Doc Title');
    });

    it('does not include a back-to-top link', async () => {
      stubMatchMedia(sandbox);
      makeDOM({ h1Text: null });
      await init(el);
      const links = [...el.querySelectorAll('ul a')];
      expect(links.every((a) => a.textContent !== 'Back to top')).to.be.true;
    });
  });

  describe('init assigns ids and accessibility attributes to headings', () => {
    beforeEach(() => {
      stubMatchMedia(sandbox);
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

  describe('init syncs the details open state to the viewport width', () => {
    it('details is open at desktop viewport width', async () => {
      stubMatchMedia(sandbox, true);
      makeDOM();
      await init(el);
      expect(el.querySelector('details').open).to.be.true;
    });

    it('details is closed at mobile viewport width', async () => {
      stubMatchMedia(sandbox, false);
      makeDOM();
      await init(el);
      expect(el.querySelector('details').open).to.be.false;
    });
  });

  describe('init closes the overlay after a link is clicked on mobile', () => {
    it('details closes when a nav link is clicked at mobile viewport', async () => {
      stubMatchMedia(sandbox, false);
      makeDOM();
      await init(el);
      const details = el.querySelector('details');
      details.open = true;
      el.querySelector('ul a').click();
      expect(details.open).to.be.false;
    });

    it('details stays open when a nav link is clicked at desktop viewport', async () => {
      stubMatchMedia(sandbox, true);
      makeDOM();
      await init(el);
      const details = el.querySelector('details');
      el.querySelector('ul a').click();
      expect(details.open).to.be.true;
    });

    it('closes details when a click lands outside the nav on mobile', async () => {
      stubMatchMedia(sandbox, false);
      makeDOM();
      await init(el);
      const details = el.querySelector('details');
      details.open = true;
      const outside = document.createElement('button');
      document.body.append(outside);
      outside.click();
      expect(details.open).to.be.false;
    });
  });
});
