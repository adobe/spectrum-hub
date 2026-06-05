import { expect } from '@esm-bundle/chai';
import init from '../../blocks/columns/columns.js';

function makeEl(html) {
  const el = document.createElement('div');
  el.innerHTML = html;
  return el;
}

const MOCK_COLUMNS = `
  <div>
    <div><picture><img src="hero.jpg" alt="" loading="lazy"></picture></div>
    <div><p>Content</p></div>
  </div>
  <div>
    <div>R2 C1</div>
    <div><p>R2 C2</p></div>
    <div>R2 C3</div>
  </div>
`;

const SINGLE_COL = `
  <div>
    <div><p>Single column content</p></div>
  </div>
`;

const ALL_SINGLE_COL_ROWS = `
  <div>
    <div><p>Row one</p></div>
  </div>
  <div>
    <div><p>Row two</p></div>
  </div>
`;

const IMAGE_RIGHT = `
  <div>
    <div><p>Content</p></div>
    <div><picture><img src="hero.jpg" alt="" loading="lazy"></picture></div>
  </div>
`;

const IMAGE_LEFT = `
  <div>
    <div><picture><img src="hero.jpg" alt="" loading="lazy"></picture></div>
    <div><p>Content</p></div>
  </div>
`;

const IMAGE_RIGHT_BARE_IMG = `
  <div>
    <div><p>Content</p></div>
    <div><img src="hero.jpg" alt="" loading="lazy"></div>
  </div>
`;

const IMAGE_LEFT_BARE_IMG = `
  <div>
    <div><img src="hero.jpg" alt="" loading="lazy"></div>
    <div><p>Content</p></div>
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
    const [c1, , c3] = [...el.children[1].children];
    expect(c1.classList.contains('col-1')).to.be.true;
    expect(c3.classList.contains('col-3')).to.be.true;
  });

  it('does not add "image-right" when the image is in the first column', () => {
    expect(el.classList.contains('image-right')).to.be.false;
  });

  describe('centered', () => {
    it('adds "centered" to the block when all rows are single-column', () => {
      el = makeEl(SINGLE_COL);
      init(el);
      expect(el.classList.contains('centered')).to.be.true;
    });

    it('does not add "centered" when rows have multiple columns', () => {
      expect(el.classList.contains('centered')).to.be.false;
    });

    it('adds "centered" to the block when multiple rows are all single-column', () => {
      el = makeEl(ALL_SINGLE_COL_ROWS);
      init(el);
      expect(el.classList.contains('centered')).to.be.true;
    });
  });

  describe('image-right detection', () => {
    it('adds "image-right" when the image is not in the first column', () => {
      el = makeEl(IMAGE_RIGHT);
      init(el);
      expect(el.classList.contains('image-right')).to.be.true;
    });

    it('does not add "image-right" when the image is in the first column', () => {
      el = makeEl(IMAGE_LEFT);
      init(el);
      expect(el.classList.contains('image-right')).to.be.false;
    });

    it('does not add "image-right" when the first column has a bare img', () => {
      el = makeEl(IMAGE_LEFT_BARE_IMG);
      init(el);
      expect(el.classList.contains('image-right')).to.be.false;
    });

    it('adds "image-right" when the image is a bare img in the second column', () => {
      el = makeEl(IMAGE_RIGHT_BARE_IMG);
      init(el);
      expect(el.classList.contains('image-right')).to.be.true;
    });

    it('does not add "image-right" when every row is single-column', () => {
      el = makeEl(ALL_SINGLE_COL_ROWS);
      init(el);
      expect(el.classList.contains('image-right')).to.be.false;
    });
  });

  describe('init edge cases', () => {
    it('does not throw when the block has no rows', () => {
      el = document.createElement('div');
      expect(() => init(el)).to.not.throw();
      expect(el.children.length).to.equal(0);
    });

    it('can run init twice without duplicate row or col classes', () => {
      el = makeEl(MOCK_COLUMNS);
      init(el);
      init(el);
      expect(el.children.length).to.equal(2);
      [...el.children].forEach((row) => {
        expect(row.classList.contains('row')).to.be.true;
        expect([...row.classList].filter((name) => name === 'row').length).to.equal(1);
        [...row.children].forEach((col) => {
          expect(col.classList.contains('col')).to.be.true;
          expect([...col.classList].filter((name) => name === 'col').length).to.equal(1);
        });
      });
      expect(el.children[0].classList.contains('row-1')).to.be.true;
      expect(el.children[1].classList.contains('row-2')).to.be.true;
      expect(el.children[1].classList.contains('row-3')).to.be.false;
    });
  });
});
