import { expect } from '@esm-bundle/chai';
import init from '../../blocks/card/card.js';

const originalHref = window.location.href;

function makeCard(innerHtml, ...extraClasses) {
  const el = document.createElement('div');
  el.classList.add('card', ...extraClasses);
  el.innerHTML = innerHtml;
  return el;
}

// Single cell containing both image and text (vertical layout)
const SINGLE_COL_WITH_IMAGE = `
  <div>
    <div>
      <p><picture><img src="card.jpg" alt=""></picture></p>
      <h3>Title</h3>
      <p>Body text</p>
    </div>
  </div>
`;

// Single cell with text only, no image
const SINGLE_COL_NO_IMAGE = `
  <div>
    <div>
      <h3>Title</h3>
      <p>Body text</p>
    </div>
  </div>
`;

// Two cells: image column + text column (horizontal layout)
const MULTI_COL_WITH_IMAGE = `
  <div>
    <div>
      <p><picture><img src="card.jpg" alt=""></picture></p>
    </div>
    <div>
      <h3>Title</h3>
      <p>Body text</p>
    </div>
  </div>
`;

// Card with a standalone link in the last paragraph (internal)
const WITH_INTERNAL_LINK = `
  <div>
    <div>
      <h3>Title</h3>
      <p>Body text</p>
      <p><a href="/platforms/swc/components/button">Visit the docs</a></p>
    </div>
  </div>
`;

// Card with an external link — should get target="_blank" automatically
const WITH_EXTERNAL_LINK = `
  <div>
    <div>
      <h3>Title</h3>
      <p>Body text</p>
      <p><a href="https://external.example.com/page">External resource</a></p>
    </div>
  </div>
`;

// Card with #_blank fragment — force blank tab, strip fragment
const WITH_FORCE_BLANK = `
  <div>
    <div>
      <h3>Title</h3>
      <p>Body text</p>
      <p><a href="/internal/page#_blank">Open in new tab</a></p>
    </div>
  </div>
`;

// Card where the link is embedded inline inside body text — should NOT trigger card-link
const WITH_INLINE_LINK_ONLY = `
  <div>
    <div>
      <h3>Title</h3>
      <p>Text with <a href="/inline">inline link</a> embedded</p>
    </div>
  </div>
`;

// Portrait image (width < height via attributes)
const WITH_PORTRAIT_IMAGE = `
  <div>
    <div>
      <p><picture><img src="portrait.jpg" alt="" width="300" height="400"></picture></p>
      <h3>Title</h3>
    </div>
  </div>
`;

// Landscape image (width > height via attributes)
const WITH_LANDSCAPE_IMAGE = `
  <div>
    <div>
      <p><picture><img src="landscape.jpg" alt="" width="400" height="300"></picture></p>
      <h3>Title</h3>
    </div>
  </div>
`;

// Image with no dimension attributes — relies on naturalWidth/naturalHeight
const WITH_IMAGE_NO_ATTRS = `
  <div>
    <div>
      <p><picture><img src="card.jpg" alt=""></picture></p>
      <h3>Title</h3>
    </div>
  </div>
`;

describe('card block', () => {
  afterEach(() => {
    window.history.pushState({}, '', originalHref);
    document.body.innerHTML = '';
  });

  describe('card-content-container wrapper', () => {
    it('always creates a card-content-container div', () => {
      const el = makeCard(SINGLE_COL_NO_IMAGE);
      init(el);
      expect(el.querySelector('.card-content-container')).to.not.be.null;
    });

    it('removes all original authored rows', () => {
      const el = makeCard(SINGLE_COL_WITH_IMAGE);
      init(el);
      expect(el.querySelectorAll(':scope > div:not(.card-content-container)').length).to.equal(0);
    });
  });

  describe('single-column card with image', () => {
    let el;
    beforeEach(() => {
      el = makeCard(SINGLE_COL_WITH_IMAGE);
      init(el);
    });

    it('creates a card-picture-container', () => {
      expect(el.querySelector('.card-picture-container')).to.not.be.null;
    });

    it('moves the picture into card-picture-container', () => {
      expect(el.querySelector('.card-picture-container picture')).to.not.be.null;
    });

    it('removes the picture paragraph from card-text-container', () => {
      expect(el.querySelector('.card-text-container > p > picture')).to.be.null;
    });

    it('places card-picture-container before card-text-container inside card-content-container', () => {
      const content = el.querySelector('.card-content-container');
      expect(content.firstElementChild.classList.contains('card-picture-container')).to.be.true;
    });

    it('creates a card-text-container', () => {
      expect(el.querySelector('.card-text-container')).to.not.be.null;
    });

    it('wraps remaining text nodes in card-text-content', () => {
      expect(el.querySelector('.card-text-container .card-text-content')).to.not.be.null;
    });

    it('preserves heading and paragraph inside card-text-content', () => {
      const textContent = el.querySelector('.card-text-content');
      expect(textContent.querySelector('h3')).to.not.be.null;
      expect(textContent.querySelector('p')).to.not.be.null;
    });
  });

  describe('single-column card without image', () => {
    let el;
    beforeEach(() => {
      el = makeCard(SINGLE_COL_NO_IMAGE);
      init(el);
    });

    it('does not create a card-picture-container', () => {
      expect(el.querySelector('.card-picture-container')).to.be.null;
    });

    it('creates a card-text-container', () => {
      expect(el.querySelector('.card-text-container')).to.not.be.null;
    });

    it('wraps text in card-text-content', () => {
      expect(el.querySelector('.card-text-content')).to.not.be.null;
    });
  });

  describe('multi-column card with image in its own column', () => {
    let el;
    beforeEach(() => {
      el = makeCard(MULTI_COL_WITH_IMAGE);
      init(el);
    });

    it('creates a card-picture-container', () => {
      expect(el.querySelector('.card-picture-container')).to.not.be.null;
    });

    it('moves the picture into card-picture-container', () => {
      expect(el.querySelector('.card-picture-container picture')).to.not.be.null;
    });

    it('uses the text column as card-text-container', () => {
      const textContainer = el.querySelector('.card-text-container');
      expect(textContainer).to.not.be.null;
      expect(textContainer.querySelector('h3')).to.not.be.null;
    });

    it('does not include the picture inside card-text-container', () => {
      expect(el.querySelector('.card-text-container picture')).to.be.null;
    });
  });

  describe('auto card-link from standalone link paragraph', () => {
    let el;
    beforeEach(() => {
      el = makeCard(WITH_INTERNAL_LINK);
      init(el);
    });

    it('wraps card-content-container in a card-link anchor', () => {
      expect(el.querySelector('a.card-link > .card-content-container')).to.not.be.null;
    });

    it('sets href from the link paragraph', () => {
      expect(el.querySelector('a.card-link').getAttribute('href')).to.equal('/platforms/swc/components/button');
    });

    it('sets aria-label from the link text', () => {
      expect(el.querySelector('a.card-link').getAttribute('aria-label')).to.equal('Visit the docs');
    });

    it('visually hides the link paragraph', () => {
      expect(el.querySelector('.card-text-content p.visually-hidden')).to.not.be.null;
    });

    it('marks the visually-hidden paragraph as aria-hidden', () => {
      expect(el.querySelector('.card-text-content p.visually-hidden').getAttribute('aria-hidden')).to.equal('true');
    });

    it('removes the nested anchor from the visually-hidden paragraph to prevent invalid HTML', () => {
      expect(el.querySelector('.card-text-content p.visually-hidden a')).to.be.null;
    });

    it('does not add target="_blank" for internal links', () => {
      expect(el.querySelector('a.card-link').getAttribute('target')).to.be.null;
    });
  });

  describe('hash-aware: appends window.location.hash to card-link href', () => {
    it('appends window.location.hash to the href when hash-aware class is set', () => {
      window.history.pushState({}, '', '#section-one');
      const el = makeCard(WITH_INTERNAL_LINK, 'hash-aware');
      init(el);
      expect(el.querySelector('a.card-link').getAttribute('href')).to.equal('/platforms/swc/components/button#section-one');
    });

    it('does not append the hash when hash-aware class is absent', () => {
      window.history.pushState({}, '', '#section-one');
      const el = makeCard(WITH_INTERNAL_LINK);
      init(el);
      expect(el.querySelector('a.card-link').getAttribute('href')).to.equal('/platforms/swc/components/button');
    });
  });

  describe('no card-link when there is no standalone link paragraph', () => {
    it('does not create a card-link when card has no link', () => {
      const el = makeCard(SINGLE_COL_NO_IMAGE);
      init(el);
      expect(el.querySelector('a.card-link')).to.be.null;
    });

    it('does not create a card-link when link is embedded inline in body text', () => {
      const el = makeCard(WITH_INLINE_LINK_ONLY);
      init(el);
      expect(el.querySelector('a.card-link')).to.be.null;
    });

    it('appends card-content-container directly to the card element when there is no link', () => {
      const el = makeCard(SINGLE_COL_NO_IMAGE);
      init(el);
      expect(el.querySelector(':scope > .card-content-container')).to.not.be.null;
    });
  });

  describe('external link detection', () => {
    it('adds target="_blank" and rel for external links', () => {
      const el = makeCard(WITH_EXTERNAL_LINK);
      init(el);
      const link = el.querySelector('a.card-link');
      expect(link.getAttribute('target')).to.equal('_blank');
      expect(link.getAttribute('rel')).to.include('noopener');
      expect(link.getAttribute('rel')).to.include('noreferrer');
    });

    it('appends "(opens in new tab)" to aria-label for external links', () => {
      const el = makeCard(WITH_EXTERNAL_LINK);
      init(el);
      expect(el.querySelector('a.card-link').getAttribute('aria-label')).to.equal('External resource (opens in new tab)');
    });
  });

  describe('link-out icon for external links', () => {
    let el;
    beforeEach(() => {
      el = makeCard(WITH_EXTERNAL_LINK);
      init(el);
    });

    it('adds a card-link-out element inside card-text-container for external links', () => {
      expect(el.querySelector('.card-text-container .card-link-out')).to.not.be.null;
    });

    it('places card-link-out after card-text-content', () => {
      const children = [...el.querySelector('.card-text-container').children];
      const textIdx = children.findIndex((c) => c.classList.contains('card-text-content'));
      const iconIdx = children.findIndex((c) => c.classList.contains('card-link-out'));
      expect(iconIdx).to.be.greaterThan(textIdx);
    });

    it('renders an svg inside card-link-out', () => {
      expect(el.querySelector('.card-link-out svg')).to.not.be.null;
    });

    it('svg use element references the open-in icon', () => {
      const use = el.querySelector('.card-link-out svg use');
      expect(use.getAttribute('href')).to.include('s2-icon-openin-20-n.svg');
    });

    it('marks the icon svg as aria-hidden', () => {
      expect(el.querySelector('.card-link-out svg').getAttribute('aria-hidden')).to.equal('true');
    });

    it('does not add card-link-out for internal links', () => {
      const internalEl = makeCard(WITH_INTERNAL_LINK);
      init(internalEl);
      expect(internalEl.querySelector('.card-link-out')).to.be.null;
    });
  });

  describe('#_blank fragment to force blank tab', () => {
    let el;
    beforeEach(() => {
      el = makeCard(WITH_FORCE_BLANK);
      init(el);
    });

    it('adds target="_blank" when href ends with #_blank', () => {
      expect(el.querySelector('a.card-link').getAttribute('target')).to.equal('_blank');
    });

    it('strips #_blank from the href', () => {
      expect(el.querySelector('a.card-link').getAttribute('href')).to.equal('/internal/page');
    });

    it('adds rel="noopener noreferrer" when #_blank is used', () => {
      const rel = el.querySelector('a.card-link').getAttribute('rel');
      expect(rel).to.include('noopener');
      expect(rel).to.include('noreferrer');
    });

    it('does not add a link-out icon for internal links forced to blank tab', () => {
      expect(el.querySelector('.card-link-out')).to.be.null;
    });

    it('appends "(opens in new tab)" to aria-label for #_blank links', () => {
      expect(el.querySelector('a.card-link').getAttribute('aria-label')).to.equal('Open in new tab (opens in new tab)');
    });
  });

  describe('portrait auto-detection from image dimension attributes', () => {
    it('adds vertical class to card when img width < height', () => {
      const el = makeCard(WITH_PORTRAIT_IMAGE);
      init(el);
      expect(el.classList.contains('vertical')).to.be.true;
    });

    it('does not add vertical class when img width >= height', () => {
      const el = makeCard(WITH_LANDSCAPE_IMAGE);
      init(el);
      expect(el.classList.contains('vertical')).to.be.false;
    });
  });

  describe('portrait auto-detection from naturalWidth/naturalHeight (no dimension attributes)', () => {
    it('adds vertical class after image load when naturalWidth < naturalHeight', () => {
      const el = makeCard(WITH_IMAGE_NO_ATTRS);
      init(el);
      const img = el.querySelector('img');
      Object.defineProperty(img, 'naturalWidth', { value: 300, configurable: true });
      Object.defineProperty(img, 'naturalHeight', { value: 400, configurable: true });
      img.dispatchEvent(new Event('load'));
      expect(el.classList.contains('vertical')).to.be.true;
    });

    it('does not add vertical class when naturalWidth >= naturalHeight', () => {
      const el = makeCard(WITH_IMAGE_NO_ATTRS);
      init(el);
      const img = el.querySelector('img');
      Object.defineProperty(img, 'naturalWidth', { value: 400, configurable: true });
      Object.defineProperty(img, 'naturalHeight', { value: 300, configurable: true });
      img.dispatchEvent(new Event('load'));
      expect(el.classList.contains('vertical')).to.be.false;
    });

    it('adds vertical class synchronously when img is already loaded and portrait', () => {
      const el = makeCard(WITH_IMAGE_NO_ATTRS);
      const img = el.querySelector('img');
      Object.defineProperty(img, 'naturalWidth', { value: 300, configurable: true });
      Object.defineProperty(img, 'naturalHeight', { value: 400, configurable: true });
      Object.defineProperty(img, 'complete', { value: true, configurable: true });
      init(el);
      expect(el.classList.contains('vertical')).to.be.true;
    });
  });
});
