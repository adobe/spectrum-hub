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

const SINGLE_COL_WITH_IMAGE = `
  <div>
    <div><picture><img src="hero.jpg" alt="" loading="lazy"></picture></div>
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

const TWO_UP_TEXT = `
  <div>
    <div><h3>Title A</h3><p>Content A</p></div>
    <div><h3>Title B</h3><p>Content B</p></div>
  </div>
  <div>
    <div><h3>Title C</h3><p>Content C</p></div>
    <div><h3>Title D</h3><p>Content D</p></div>
  </div>
`;

const THREE_UP_MIXED_ROWS = `
  <div>
    <div><picture><img src="a.jpg" alt=""></picture></div>
    <div><picture><img src="b.jpg" alt=""></picture></div>
    <div><picture><img src="c.jpg" alt=""></picture></div>
  </div>
  <div>
    <div><h3>Title A</h3><p>Content A</p></div>
    <div><h3>Title B</h3><p>Content B</p></div>
    <div><h3>Title C</h3><p>Content C</p></div>
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

const DEFAULT_WITH_CAPTION = `
  <div>
    <div><h3>Title</h3><p>Content</p></div>
    <div><picture><img src="hero.jpg" alt="" loading="lazy"></picture></div>
  </div>
  <div>
    <div></div>
    <div>image caption here</div>
  </div>
`;

const IMAGE_RIGHT_WITH_CAPTION = `
  <div>
    <div><picture><img src="hero.jpg" alt="" loading="lazy"></picture></div>
    <div><h3>Title</h3><p>Content</p></div>
  </div>
  <div>
    <div>image caption here</div>
    <div></div>
  </div>
`;

const SINGLE_IMAGE_NO_CAPTION_ROW = `
  <div>
    <div><h3>Title</h3><p>Content</p></div>
    <div><picture><img src="hero.jpg" alt="" loading="lazy"></picture></div>
  </div>
`;

const BARE_IMG_WITH_CAPTION = `
  <div>
    <div><h3>Title</h3><p>Content</p></div>
    <div><img src="hero.jpg" alt="" loading="lazy"></div>
  </div>
  <div>
    <div></div>
    <div>bare img caption</div>
  </div>
`;

const CAPTION_ROW_COLUMN_COUNT_MISMATCH = `
  <div>
    <div><picture><img src="hero.jpg" alt="" loading="lazy"></picture></div>
  </div>
  <div>
    <div>caption text</div>
    <div></div>
  </div>
`;

const REAL_SECOND_ROW_NOT_A_CAPTION = `
  <div>
    <div><h3>Title</h3><p>Content</p></div>
    <div><picture><img src="hero.jpg" alt="" loading="lazy"></picture></div>
  </div>
  <div>
    <div><p>Second row text</p></div>
    <div><p>Second row more text</p></div>
  </div>
`;

const MULTI_IMAGE_ROW_WITH_TRAILING_ROW = `
  <div>
    <div><picture><img src="a.jpg" alt=""></picture></div>
    <div><picture><img src="b.jpg" alt=""></picture></div>
  </div>
  <div>
    <div>caption a</div>
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
    const [c1, , c3] = [...el.children[1].children];
    expect(c1.classList.contains('col-1')).to.be.true;
    expect(c3.classList.contains('col-3')).to.be.true;
  });

  it('does not add "image-right" when the image is in the first column', () => {
    expect(el.classList.contains('image-right')).to.be.false;
  });

  describe('centered', () => {
    it('does not add "centered" when rows have multiple columns', () => {
      expect(el.classList.contains('centered')).to.be.false;
    });

    it('does not add "centered" when all rows are single-column text only', () => {
      el = makeEl(SINGLE_COL);
      init(el);
      expect(el.classList.contains('centered')).to.be.false;
    });

    it('does not add "centered" when multiple single-column rows are text only', () => {
      el = makeEl(ALL_SINGLE_COL_ROWS);
      init(el);
      expect(el.classList.contains('centered')).to.be.false;
    });

    it('adds "centered" when all rows are single-column and contain an image', () => {
      el = makeEl(SINGLE_COL_WITH_IMAGE);
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

    it('does not add "image-right" when all columns are text-only (two-up grid)', () => {
      el = makeEl(TWO_UP_TEXT);
      init(el);
      expect(el.classList.contains('image-right')).to.be.false;
    });

    it('does not add "image-right" when all columns in a row are images (three-up grid)', () => {
      el = makeEl(THREE_UP_MIXED_ROWS);
      init(el);
      expect(el.classList.contains('image-right')).to.be.false;
    });
  });

  describe('column grid detection', () => {
    it('adds "grid-layout" and "grid-layout-2" for two-up text rows', () => {
      el = makeEl(TWO_UP_TEXT);
      init(el);
      expect(el.classList.contains('grid-layout')).to.be.true;
      expect(el.classList.contains('grid-layout-2')).to.be.true;
    });

    it('adds "grid-layout" and "grid-layout-3" when rows alternate all-image and all-text', () => {
      el = makeEl(THREE_UP_MIXED_ROWS);
      init(el);
      expect(el.classList.contains('grid-layout')).to.be.true;
      expect(el.classList.contains('grid-layout-3')).to.be.true;
    });

    it('sets order on cells so same-position cols group together on mobile', () => {
      el = makeEl(THREE_UP_MIXED_ROWS);
      init(el);
      const [row1, row2] = el.querySelectorAll('.row');
      // 2 rows total: order = colIndex * 2 + rowIndex
      expect(row1.children[0].style.order).to.equal('0'); // col0, row0
      expect(row2.children[0].style.order).to.equal('1'); // col0, row1
      expect(row1.children[1].style.order).to.equal('2'); // col1, row0
      expect(row2.children[1].style.order).to.equal('3'); // col1, row1
    });

    it('does not add "grid-layout" when a row mixes image and text columns', () => {
      el = makeEl(IMAGE_LEFT);
      init(el);
      expect(el.classList.contains('grid-layout')).to.be.false;
    });

    it('does not add "grid-layout" when every row is single-column', () => {
      el = makeEl(ALL_SINGLE_COL_ROWS);
      init(el);
      expect(el.classList.contains('grid-layout')).to.be.false;
    });
  });

  describe('image caption extraction', () => {
    it('wraps every image column in a .col-image figure, captioned or not', () => {
      el = makeEl(SINGLE_IMAGE_NO_CAPTION_ROW);
      init(el);
      const figure = el.querySelector('.col-image');
      expect(figure).to.exist;
      expect(figure.tagName).to.equal('FIGURE');
      expect(figure.querySelector('picture img')).to.exist;
      expect(el.querySelector('figcaption')).to.not.exist;
    });

    it('extracts a trailing caption row into a figcaption next to the image', () => {
      el = makeEl(DEFAULT_WITH_CAPTION);
      init(el);
      const [row] = el.querySelectorAll('.row');
      const imageCol = row.children[1];
      const figcaption = imageCol.querySelector('figcaption');
      expect(figcaption).to.exist;
      expect(figcaption.textContent).to.equal('image caption here');
      expect(figcaption.classList.contains('col-caption')).to.be.true;
      // figcaption sits beside the .col-image figure, not clipped inside it
      expect(figcaption.parentElement).to.equal(imageCol);
      expect(imageCol.querySelector('.col-image picture')).to.exist;
    });

    it('removes the caption row entirely from the DOM once extracted', () => {
      el = makeEl(DEFAULT_WITH_CAPTION);
      init(el);
      expect(el.querySelectorAll('.row').length).to.equal(1);
    });

    it('matches the caption to the image column position when the image is on the left', () => {
      el = makeEl(IMAGE_RIGHT_WITH_CAPTION);
      init(el);
      const [row] = el.querySelectorAll('.row');
      const imageCol = row.children[0];
      const textCol = row.children[1];
      expect(imageCol.querySelector('figcaption').textContent).to.equal('image caption here');
      expect(textCol.querySelector('figcaption')).to.not.exist;
    });

    it('extracts a caption for a bare img (no picture wrapper)', () => {
      el = makeEl(BARE_IMG_WITH_CAPTION);
      init(el);
      const [row] = el.querySelectorAll('.row');
      const imageCol = row.children[1];
      expect(imageCol.querySelector('.col-image img')).to.exist;
      expect(imageCol.querySelector('figcaption').textContent).to.equal('bare img caption');
    });

    it('does not treat a row as a caption when its column count differs from the image row', () => {
      el = makeEl(CAPTION_ROW_COLUMN_COUNT_MISMATCH);
      init(el);
      expect(el.querySelectorAll('.row').length).to.equal(2);
      expect(el.querySelector('figcaption')).to.not.exist;
    });

    it('does not treat a genuine two-column content row as a caption row', () => {
      el = makeEl(REAL_SECOND_ROW_NOT_A_CAPTION);
      init(el);
      expect(el.querySelectorAll('.row').length).to.equal(2);
      expect(el.querySelector('figcaption')).to.not.exist;
      const [, row2] = el.querySelectorAll('.row');
      expect(row2.children[0].textContent).to.equal('Second row text');
      expect(row2.children[1].textContent).to.equal('Second row more text');
    });

    it('does not pair a caption row with a multi-image row', () => {
      el = makeEl(MULTI_IMAGE_ROW_WITH_TRAILING_ROW);
      init(el);
      expect(el.querySelectorAll('.row').length).to.equal(2);
      expect(el.querySelector('figcaption')).to.not.exist;
    });

    it('can run init twice without duplicating the figcaption or the .col-image wrapper', () => {
      el = makeEl(DEFAULT_WITH_CAPTION);
      init(el);
      init(el);
      expect(el.querySelectorAll('figcaption').length).to.equal(1);
      expect(el.querySelectorAll('.col-image').length).to.equal(1);
      expect(el.querySelectorAll('.row').length).to.equal(1);
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
