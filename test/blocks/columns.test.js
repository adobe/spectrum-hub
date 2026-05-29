import { expect } from '@esm-bundle/chai';
import init from '../../blocks/columns/columns.js';

function makeEl(html) {
  const el = document.createElement('div');
  el.innerHTML = html;
  return el;
}

// Two rows with intentionally different column counts. This example:
// - exercises per-row numbering
// - removing the alt text row
// - copies alt text from the second row onto the image
// - keeps a third row when the alt row is removed
// - adds row and col classes and sets --child-count on each row
// - leaves image-right off when the image is in the first column

const MOCK_COLUMNS = `
  <div>
    <div><picture><img src="hero.jpg" alt loading="lazy"></picture></div>
    <div><p>Content</p></div>
  </div>
  <div>
    <div><p>Hero illustration</p></div>
    <div></div>
  </div>
  <div>
    <div>R3 C1</div>
    <div><p>R3 C2</p></div>
    <div>R3 C3</div>
  </div>
`;

const SINGLE_COL = `
  <div>
    <div><p>Single column content</p></div>
  </div>
`;

const IMAGE_RIGHT_WITH_ALT_ROW = `
  <div>
    <div><p>Content</p></div>
    <div><picture><img src="hero.jpg" alt loading="lazy"></picture></div>
  </div>
  <div>
    <div></div>
    <div><p>Hero illustration</p></div>
  </div>
`;

const WITH_EMPTY_ALT_ROW = `
  <div>
    <div><picture><img src="hero.jpg" alt loading="lazy"></picture></div>
    <div><p>Content</p></div>
  </div>
  <div>
    <div></div>
    <div></div>
  </div>
`;

const WITH_CONTENT_ROW = `
  <div>
    <div><picture><img src="hero.jpg" alt loading="lazy"></picture></div>
    <div><p>Content</p></div>
  </div>
  <div>
    <div></div>
    <div><p>Second row content</p></div>
  </div>
`;

const WITH_PICTURE_IN_ROW2 = `
  <div>
    <div><picture><img src="hero.jpg" alt loading="lazy"></picture></div>
    <div><p>Content</p></div>
  </div>
  <div>
    <div><picture><img src="other.jpg" alt loading="lazy"></picture></div>
    <div></div>
  </div>
`;

describe('columns block', () => {
  let el;

  beforeEach(() => {
    el = makeEl(MOCK_COLUMNS);
    init(el);
  });

  it('adds "row" class to every row', () => {
    [...el.children].forEach((row) => expect(row.classList.contains('row')).to.be.true);
  });

  it('adds a 1-based row-N class to each row', () => {
    expect(el.children[0].classList.contains('row-1')).to.be.true;
    expect(el.children[1].classList.contains('row-2')).to.be.true;
  });

  it('adds "col" class to every cell in every row', () => {
    [...el.querySelectorAll('.row > *')].forEach((col) => expect(col.classList.contains('col')).to.be.true);
  });

  it('adds a 1-based col-N class to each cell', () => {
    const [c1, c2] = [...el.children[0].children];
    expect(c1.classList.contains('col-1')).to.be.true;
    expect(c2.classList.contains('col-2')).to.be.true;
  });

  it('sets --child-count on each row to its own column count', () => {
    expect(el.children[0].getAttribute('style')).to.include('--child-count: 2');
    expect(el.children[1].getAttribute('style')).to.include('--child-count: 3');
  });

  it('resets col-N numbering independently per row', () => {
    // Row 2 has 3 cells; col numbering starts at 1 again, not continuing from row 1
    const [c1, , c3] = [...el.children[1].children];
    expect(c1.classList.contains('col-1')).to.be.true;
    expect(c3.classList.contains('col-3')).to.be.true;
  });

  it('adds "single-col" to a one-column row', () => {
    el = makeEl(SINGLE_COL);
    init(el);
    expect(el.children[0].classList.contains('single-col')).to.be.true;
  });

  it('does not add "image-right" when the image is in the first column', () => {
    expect(el.classList.contains('image-right')).to.be.false;
  });

  it('does not override an authored "image-right" class', () => {
    el = makeEl(MOCK_COLUMNS);
    el.classList.add('image-right');
    init(el);
    expect(el.classList.contains('image-right')).to.be.true;
  });

  describe('image-right detection', () => {
    it('adds "image-right" when the image is not in the first column', () => {
      el = makeEl(IMAGE_RIGHT_WITH_ALT_ROW);
      init(el);
      expect(el.classList.contains('image-right')).to.be.true;
    });
  });

  describe('image alt text', () => {
    it('applies alt text from the second row to the image', () => {
      expect(el.querySelector('img').getAttribute('alt')).to.equal('Hero illustration');
    });

    it('applies alt text to an image in the second column', () => {
      el = makeEl(IMAGE_RIGHT_WITH_ALT_ROW);
      init(el);
      expect(el.querySelector('img').getAttribute('alt')).to.equal('Hero illustration');
    });

    it('removes the alt text row after applying alt text', () => {
      expect(el.children.length).to.equal(2);
    });

    it('decorates the remaining row after the alt text row is removed', () => {
      const row = el.children[0];
      expect(row.classList.contains('row-1')).to.be.true;
      expect(row.getAttribute('style')).to.include('--child-count: 2');
      const [c1, c2] = [...row.children];
      expect(c1.classList.contains('col-1')).to.be.true;
      expect(c2.classList.contains('col-2')).to.be.true;
    });

    it('keeps rows after the alt text row when a third row is present', () => {
      expect(el.children.length).to.equal(2);
      expect(el.children[1].textContent).to.include('R3 C3');
    });

    it('removes the alt text row when the alt cell is empty', () => {
      el = makeEl(WITH_EMPTY_ALT_ROW);
      init(el);
      expect(el.children.length).to.equal(1);
    });

    it('does not set alt text when the alt cell is empty', () => {
      el = makeEl(WITH_EMPTY_ALT_ROW);
      init(el);
      expect(el.querySelector('img').getAttribute('alt')).to.equal('');
    });

    it('keeps a second content row when non-image columns have text', () => {
      el = makeEl(WITH_CONTENT_ROW);
      init(el);
      expect(el.children.length).to.equal(2);
    });

    it('does not treat a second row as alt text when it contains a picture', () => {
      el = makeEl(WITH_PICTURE_IN_ROW2);
      init(el);
      expect(el.children.length).to.equal(2);
    });

    it('does not treat a content row as alt text when it has multiple columns of text', () => {
      expect(el.children.length).to.equal(2);
    });
  });
});
