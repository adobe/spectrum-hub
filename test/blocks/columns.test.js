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

const SAME_CELL_CAPTION = `
  <div>
    <div><picture><img src="hero.jpg" alt="" loading="lazy"></picture>Plain caption</div>
    <div><h3>Title</h3><p>Content</p></div>
  </div>
`;

const SAME_CELL_MARKUP_CAPTION = `
  <div>
    <div>
      <picture><img src="hero.jpg" alt="" loading="lazy"></picture>
      Caption with <strong>emphasis</strong> and <a href="/details">a link</a>.
    </div>
  </div>
`;

const ELEMENT_ONLY_CAPTION = `
  <div>
    <div><picture><img src="hero.jpg" alt=""></picture><span aria-label="Visual caption"></span></div>
  </div>
`;

const EDS_PARAGRAPH_IMAGE_CAPTION = `
  <div>
    <div>
      <p><picture><img src="hero.jpg" alt="" loading="lazy"></picture></p>
      <p>Caption after an EDS image paragraph.</p>
    </div>
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
    <div><img src="hero.jpg" alt="" loading="lazy">Bare image caption</div>
  </div>
`;

const LEGACY_TRAILING_ROW_CAPTION = `
  <div>
    <div><picture><img src="hero.jpg" alt=""></picture></div>
  </div>
  <div>
    <div>Legacy trailing row content</div>
  </div>
`;

const SINGLE_IMAGE_WITH_CAPTION = `
  <div>
    <div><picture><img src="hero.jpg" alt=""></picture>Large image caption</div>
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

    it('groups same-position cells into logical grid columns', () => {
      el = makeEl(THREE_UP_MIXED_ROWS);
      init(el);
      const groups = [...el.querySelectorAll('.grid-column')];
      expect(groups.length).to.equal(3);
      expect(groups.map((group) => [...group.children].map((cell) => cell.textContent.trim())))
        .to.deep.equal([
          ['', 'Title AContent A'],
          ['', 'Title BContent B'],
          ['', 'Title CContent C'],
        ]);
      groups.forEach((group) => {
        expect(group.style.getPropertyValue('--grid-row-count')).to.equal('2');
        [...group.children].forEach((cell) => {
          expect(cell.style.order).to.equal('');
          expect(cell.style.getPropertyValue('--row-idx')).to.equal('');
        });
      });
      expect(el.querySelectorAll('.row').length).to.equal(0);
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
    it('wraps every image in a semantic figure and media frame', () => {
      el = makeEl(SINGLE_IMAGE_NO_CAPTION_ROW);
      init(el);
      const figure = el.querySelector('.col-image');
      expect(figure).to.exist;
      expect(figure.tagName).to.equal('FIGURE');
      expect(figure.querySelector(':scope > .col-image-media > picture img')).to.exist;
      expect(el.querySelector('figcaption')).to.not.exist;
    });

    it('marks the img as errored (revealing the fallback background) once it fails to load', () => {
      el = makeEl(SINGLE_IMAGE_NO_CAPTION_ROW);
      init(el);
      const img = el.querySelector('.col-image img');
      expect(img.classList.contains('img-error')).to.be.false;

      img.dispatchEvent(new Event('error'));

      expect(img.classList.contains('img-error')).to.be.true;
    });

    it('does not mark the img as errored while it is merely loading', () => {
      el = makeEl(SINGLE_IMAGE_NO_CAPTION_ROW);
      init(el);
      const img = el.querySelector('.col-image img');
      expect(img.classList.contains('img-error')).to.be.false;
    });

    it('moves same-cell content after the image into a figcaption', () => {
      el = makeEl(SAME_CELL_CAPTION);
      init(el);
      const figure = el.querySelector('.col-image');
      const figcaption = figure.querySelector(':scope > figcaption');
      expect(figcaption).to.exist;
      expect(figcaption.textContent.trim()).to.equal('Plain caption');
      expect(figcaption.classList.contains('col-caption')).to.be.true;
      expect(figure.querySelector('.col-image-media picture')).to.exist;
    });

    it('preserves caption markup and whitespace', () => {
      el = makeEl(SAME_CELL_MARKUP_CAPTION);
      init(el);
      const figcaption = el.querySelector('figcaption');
      expect(figcaption.textContent.replace(/\s+/g, ' ').trim())
        .to.equal('Caption with emphasis and a link.');
      expect(figcaption.querySelector('strong').textContent).to.equal('emphasis');
      expect(figcaption.querySelector('a').getAttribute('href')).to.equal('/details');
    });

    it('creates a caption when the caption range contains only an element', () => {
      el = makeEl(ELEMENT_ONLY_CAPTION);
      init(el);
      expect(el.querySelector('figcaption > span[aria-label="Visual caption"]')).to.exist;
    });

    it('extracts a caption for a bare img (no picture wrapper)', () => {
      el = makeEl(BARE_IMG_WITH_CAPTION);
      init(el);
      expect(el.querySelector('.col-image-media > img')).to.exist;
      expect(el.querySelector('figcaption').textContent.trim()).to.equal('Bare image caption');
    });

    it('normalizes an EDS image paragraph without leaving it around the figure', () => {
      el = makeEl(EDS_PARAGRAPH_IMAGE_CAPTION);
      init(el);
      const figure = el.querySelector('.col-image');
      expect(figure.parentElement.matches('.col')).to.be.true;
      expect(figure.querySelector('.col-image-media picture')).to.exist;
      expect(figure.querySelector('figcaption p').textContent)
        .to.equal('Caption after an EDS image paragraph.');
      expect(figure.parentElement.querySelector(':scope > p')).to.not.exist;
    });

    it('leaves legacy trailing-row captions as ordinary content', () => {
      el = makeEl(LEGACY_TRAILING_ROW_CAPTION);
      init(el);
      expect(el.querySelectorAll('.row').length).to.equal(2);
      expect(el.querySelector('figcaption')).to.not.exist;
      expect(el.textContent).to.include('Legacy trailing row content');
    });

    it('centers a single image row that also contains a caption', () => {
      el = makeEl(SINGLE_IMAGE_WITH_CAPTION);
      init(el);
      expect(el.classList.contains('centered')).to.be.true;
      expect(el.querySelector('figcaption').textContent.trim()).to.equal('Large image caption');
    });

    it('can run init twice without duplicating the figcaption or the .col-image wrapper', () => {
      el = makeEl(SAME_CELL_CAPTION);
      init(el);
      init(el);
      expect(el.querySelectorAll('figcaption').length).to.equal(1);
      expect(el.querySelectorAll('.col-image').length).to.equal(1);
      expect(el.querySelectorAll('.col-image-media').length).to.equal(1);
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
