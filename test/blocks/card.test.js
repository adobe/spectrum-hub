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

// Metadata row for link-out, plus a content row
const WITH_LINK_OUT = `
  <div>
    <div>link-out</div>
    <div><a href="/tools/widgets" title="style:quiet | label:hide"><span class="icon icon-openin"></span>Open in new tab</a></div>
  </div>
  <div>
    <div>
      <h3>Title</h3>
      <p>Body text</p>
    </div>
  </div>
`;

// Both link-out and card-link rows — card-link should win; link-out must be suppressed
const WITH_BOTH = `
  <div>
    <div>link-out</div>
    <div><a href="/tools/widgets"><span class="icon icon-openin"></span>Open in new tab</a></div>
  </div>
  <div>
    <div>
      <h3>Title</h3>
      <p>Body text</p>
    </div>
  </div>
  <div>
    <div>card-link</div>
    <div><a href="/platforms/swc/components/button">Visit the docs</a></div>
  </div>
`;

// Content row plus a metadata row that makes the whole card a link
const WITH_CARD_LINK = `
  <div>
    <div>
      <h3>Title</h3>
      <p>Body text</p>
    </div>
  </div>
  <div>
    <div>card-link</div>
    <div><a href="/platforms/swc/components/button">Visit the docs</a></div>
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

  describe('link-out row', () => {
    let el;
    beforeEach(() => {
      el = makeCard(WITH_LINK_OUT);
      init(el);
    });

    it('creates a card-link-out element', () => {
      expect(el.querySelector('.card-link-out')).to.not.be.null;
    });

    it('places card-link-out inside card-text-container', () => {
      expect(el.querySelector('.card-text-container .card-link-out')).to.not.be.null;
    });

    it('places card-link-out after card-text-content', () => {
      const children = [...el.querySelector('.card-text-container').children];
      const textContentIdx = children.findIndex((c) => c.classList.contains('card-text-content'));
      const linkOutIdx = children.findIndex((c) => c.classList.contains('card-link-out'));
      expect(linkOutIdx).to.be.greaterThan(textContentIdx);
    });

    it('wraps link-out text nodes in visually-hidden spans', () => {
      expect(el.querySelector('.card-link-out a .visually-hidden')).to.not.be.null;
    });

    it('sets aria-hidden on icon spans inside the link-out anchor', () => {
      expect(el.querySelector('.card-link-out .icon').getAttribute('aria-hidden')).to.equal('true');
    });
  });

  describe('button row (clickable card)', () => {
    let el;
    beforeEach(() => {
      el = makeCard(WITH_CARD_LINK);
      init(el);
    });

    it('wraps card-content-container in a card-link anchor', () => {
      expect(el.querySelector('a.card-link > .card-content-container')).to.not.be.null;
    });

    it('sets the correct href on card-link', () => {
      expect(el.querySelector('a.card-link').getAttribute('href')).to.equal('/platforms/swc/components/button');
    });

    it('does not render a visible button element', () => {
      expect(el.querySelector('button, .card-button-container')).to.be.null;
    });

    it('appends window.location.hash to the href when hash-aware class is set', () => {
      window.history.pushState({}, '', '#section-one');
      const hashEl = makeCard(WITH_CARD_LINK, 'hash-aware');
      init(hashEl);
      expect(hashEl.querySelector('a.card-link').getAttribute('href')).to.equal('/platforms/swc/components/button#section-one');
    });

    it('does not append the hash when hash-aware class is absent', () => {
      window.history.pushState({}, '', '#section-one');
      expect(el.querySelector('a.card-link').getAttribute('href')).to.equal('/platforms/swc/components/button');
    });

    it('sets aria-label on card-link from the card heading text', () => {
      expect(el.querySelector('a.card-link').getAttribute('aria-label')).to.equal('Title');
    });
  });

  describe('card-link takes precedence over link-out (no nested anchors)', () => {
    let el;
    beforeEach(() => {
      el = makeCard(WITH_BOTH);
      init(el);
    });

    it('renders the card as a clickable card-link', () => {
      expect(el.querySelector('a.card-link')).to.not.be.null;
    });

    it('does not render a link-out inside the card-link anchor', () => {
      expect(el.querySelector('a.card-link .card-link-out')).to.be.null;
    });

    it('does not render a link-out anywhere in the card', () => {
      expect(el.querySelector('.card-link-out')).to.be.null;
    });
  });

  describe('card without button row', () => {
    let el;
    beforeEach(() => {
      el = makeCard(SINGLE_COL_NO_IMAGE);
      init(el);
    });

    it('appends card-content-container directly to the card element', () => {
      expect(el.querySelector(':scope > .card-content-container')).to.not.be.null;
    });

    it('does not create a card-link anchor', () => {
      expect(el.querySelector('a.card-link')).to.be.null;
    });
  });
});
