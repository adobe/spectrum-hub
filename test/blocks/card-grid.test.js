import { expect } from '@esm-bundle/chai';
import sinon from 'sinon';
import init from '../../blocks/card-grid/card-grid.js';
import { loadStyle, setConfig } from '../../scripts/ak.js';
import { clear } from '../../scripts/utils/data-store.js';

const SAFE_CONFIG = {
  hostnames: ['authorkit.dev'],
  components: [],
  locales: { '': { lang: 'en' } },
};

const ROLLUP = {
  data: [
    {
      path: '/web/rsp/components/accordion',
      'card-title': 'Accordion',
      'card-description': 'An accordion expands and collapses.',
      'card-image': '/img/accordion-card.svg',
      image: '/img/spectrum.svg',
      'card-subject': 'web',
      'card-team': 'CXO',
      'card-category': 'Components',
    },
    {
      path: '/web/swc/components/accordion',
      'card-title': 'Accordion',
      'card-description': 'An accordion expands and collapses.',
      image: '/img/spectrum.svg',
      'card-subject': 'web',
      'card-team': 'CXO',
      'card-category': 'Components',
    },
    {
      path: '/web/rsp/components/avatar',
      title: 'Avatar',
      description: 'An avatar is a thumbnail representation.',
      'card-subject': 'web',
      'card-team': 'Design Systems',
      'card-category': 'Components',
    },
    {
      path: '/web/design-only/components/rating',
      // Both titles present, so the card-title precedence test has something to
      // actually prefer.
      title: 'Rating | Spectrum',
      'card-title': 'Rating',
      'card-description': 'A rating collects a score.',
      'card-image': '',
      image: '/img/spectrum.svg',
      'card-subject': 'web',
      'card-team': 'CXO',
      'card-category': 'Patterns',
    },
  ],
};

const STATUS_INDEX = {
  components: [
    { name: 'Accordion', platforms: { web: { rsp: { status: 'available' }, swc: { status: 'experimental' } } } },
    { name: 'Avatar', platforms: { web: { rsp: { status: 'deprecated' } } } },
    { name: 'Rating', platforms: { web: { figma: { status: 'available' } } } },
  ],
};

// What the index looks like to a viewer the edge did NOT strip: the private
// columns are present on the first row only. Kept apart from ROLLUP so the
// rest of the suite renders cards without a steward badge.
const ROLLUP_PRIVATE = {
  data: ROLLUP.data.map((row, i) => (i > 0 ? row : {
    ...row,
    'card-steward': 'Michael Scott',
    'card-design-resources': 'https://www.figma.com/design/abc',
    'card-contact': '#spectrum-help',
  })),
};

const badgesIn = (card) => [...card.querySelectorAll('.card-grid-item-badge')]
  .map((badge) => [badge.dataset.field, badge.textContent]);

const ok = (payload) => ({ ok: true, json: async () => payload });
const notFound = () => ({ ok: false, status: 404 });

function stubIndexes(sandbox, { index = ROLLUP } = {}) {
  return sandbox.stub(window, 'fetch').callsFake(async (url) => {
    const target = url.toString();
    if (target.includes('query-index.json')) { return ok(index); }
    if (target.includes('/deps/status-index.json')) { return ok(STATUS_INDEX); }
    return notFound();
  });
}

// An authored config table: one row per key, label cell then value cell.
function makeBlock(rows = [], wrapper = null) {
  const parent = wrapper ?? document.createElement('div');
  if (!wrapper) {
    parent.className = 'block-content';
    const section = document.createElement('div');
    section.className = 'section';
    section.append(parent);
    document.body.append(section);
  }
  const el = document.createElement('div');
  el.className = 'card-grid';

  rows.forEach(([label, value]) => {
    const row = document.createElement('div');
    const labelCell = document.createElement('div');
    labelCell.textContent = label;
    const valueCell = document.createElement('div');
    valueCell.textContent = value;
    row.append(labelCell, valueCell);
    el.append(row);
  });

  parent.append(el);
  return el;
}

const titlesIn = (el) => [...el.querySelectorAll('.card-grid-item-title a')]
  .map((a) => a.textContent);

describe('card-grid block', () => {
  let sandbox;

  beforeEach(() => {
    sandbox = sinon.createSandbox();
    setConfig({ ...SAFE_CONFIG, log: sandbox.spy() });
    clear();
    document.body.innerHTML = '';
  });

  afterEach(() => {
    sandbox.restore();
    clear();
    document.body.innerHTML = '';
  });

  describe('rendering', () => {
    it('renders every row as a list item when no filter is authored', async () => {
      stubIndexes(sandbox);
      const el = makeBlock();

      await init(el);

      expect(el.querySelectorAll('.card-grid-list > li.card-grid-item')).to.have.length(4);
    });

    it('marks the list as a list, since list-style none strips the role in Safari', async () => {
      stubIndexes(sandbox);
      const el = makeBlock();

      await init(el);

      expect(el.querySelector('.card-grid-list').getAttribute('role')).to.equal('list');
    });

    it('removes the authored config rows', async () => {
      stubIndexes(sandbox);
      const el = makeBlock([['Card team', 'CXO']]);

      await init(el);

      expect(el.textContent).to.not.contain('Card team');
    });

    it('prefers card-title over the SEO title', async () => {
      stubIndexes(sandbox);
      const el = makeBlock([['Card category', 'Patterns']]);

      await init(el);

      expect(titlesIn(el)).to.deep.equal(['Rating']);
    });

    it('falls back to the SEO title when no card-title is authored', async () => {
      stubIndexes(sandbox);
      const el = makeBlock([['Card team', 'Design Systems']]);

      await init(el);

      expect(titlesIn(el)).to.deep.equal(['Avatar']);
    });

    it('prefers card-image over the social image', async () => {
      stubIndexes(sandbox);
      const el = makeBlock([['Implementation', 'rsp'], ['Count', '1']]);

      await init(el);

      const image = el.querySelector('.card-grid-item-image img');
      expect(new URL(image.src).pathname).to.equal('/img/accordion-card.svg');
    });

    it('falls back to the social image when card-image is absent', async () => {
      stubIndexes(sandbox);
      const el = makeBlock([['Implementation', 'swc']]);

      await init(el);

      const image = el.querySelector('.card-grid-item-image img');
      expect(new URL(image.src).pathname).to.equal('/img/spectrum.svg');
    });

    it('falls back to the social image when card-image is empty', async () => {
      stubIndexes(sandbox);
      const el = makeBlock([['Card category', 'Patterns']]);

      await init(el);

      const image = el.querySelector('.card-grid-item-image img');
      expect(new URL(image.src).pathname).to.equal('/img/spectrum.svg');
    });

    it('omits the image when neither image field is present', async () => {
      stubIndexes(sandbox);
      const el = makeBlock([['Card team', 'Design Systems']]);

      await init(el);

      expect(el.querySelector('.card-grid-item-image')).to.equal(null);
    });

    it('derives each status from the status index', async () => {
      stubIndexes(sandbox);
      const el = makeBlock([['Card team', 'Design Systems']]);

      await init(el);

      expect(el.querySelector('.card-grid-item-status').getAttribute('data-status'))
        .to.equal('deprecated');
    });

    it('derives the implementation label from the path', async () => {
      stubIndexes(sandbox);
      const el = makeBlock([['Card category', 'Patterns']]);

      await init(el);

      expect(el.querySelector('.card-grid-item-impl').textContent).to.equal('Figma');
    });
  });

  describe('card eligibility', () => {
    const invalidRows = [
      { name: 'missing title', row: { path: '/web/rsp/components/untitled' } },
      { name: 'blank titles', row: { path: '/web/rsp/components/blank', 'card-title': '  ', title: '\n' } },
      { name: 'non-string titles', row: { path: '/web/rsp/components/invalid-title', 'card-title': 42 } },
      { name: 'missing path', row: { title: 'No path' } },
      { name: 'blank path', row: { title: 'Blank path', path: '   ' } },
      { name: 'non-string path', row: { title: 'Invalid path', path: 42 } },
      { name: 'relative path', row: { title: 'Relative', path: 'components/button' } },
      { name: 'external path', row: { title: 'External', path: 'https://example.com/button' } },
      { name: 'protocol-relative path', row: { title: 'External', path: '//example.com/button' } },
      { name: 'path with spaces', row: { title: 'Spaces', path: '/web/rsp/components/a button' } },
      { name: 'path with backslashes', row: { title: 'Backslashes', path: '/\\example.com/button' } },
      { name: 'null row', row: null },
    ];

    invalidRows.forEach(({ name, row }) => {
      it(`skips a row with ${name} before applying count`, async () => {
        stubIndexes(sandbox, { index: { data: [row, ...ROLLUP.data] } });
        const el = makeBlock([['Count', '1']]);

        await init(el);

        expect(titlesIn(el)).to.deep.equal(['Accordion']);
        expect(el.querySelectorAll('.card-grid-item')).to.have.length(1);
      });
    });

    it('validates paths before applying implementation filters', async () => {
      stubIndexes(sandbox, { index: { data: [null, { title: 'No path' }, ...ROLLUP.data] } });
      const el = makeBlock([['Implementation', 'swc']]);

      await init(el);

      expect(titlesIn(el)).to.deep.equal(['Accordion']);
      expect(el.querySelector('.card-grid-item-title a').getAttribute('href'))
        .to.equal('/web/swc/components/accordion');
    });

    it('uses the page title when the card title is whitespace', async () => {
      stubIndexes(sandbox, {
        index: { data: [{ path: '/web/rsp/components/button', 'card-title': '  ', title: ' Button ' }] },
      });
      const el = makeBlock();

      await init(el);

      expect(titlesIn(el)).to.deep.equal(['Button']);
      expect(el.querySelector('.card-grid-item-title a').getAttribute('href'))
        .to.equal('/web/rsp/components/button');
      expect(el.querySelector('.card-grid-item-image')).to.equal(null);
      expect(el.querySelector('.card-grid-item-description')).to.equal(null);
    });

    it('logs skipped paths through the configured logger', async () => {
      const log = sandbox.spy();
      setConfig({ ...SAFE_CONFIG, log });
      stubIndexes(sandbox, {
        index: { data: [{ path: '/web/rsp/components/untitled' }, ...ROLLUP.data] },
      });

      await init(makeBlock());

      expect(log.calledOnce).to.be.true;
      expect(log.firstCall.args[0]).to.contain('/web/rsp/components/untitled');
    });

    it('does not log when every row is eligible', async () => {
      const log = sandbox.spy();
      setConfig({ ...SAFE_CONFIG, log });
      stubIndexes(sandbox);

      await init(makeBlock());

      expect(log.called).to.be.false;
    });

    it('hides an empty grid when every row is ineligible', async () => {
      stubIndexes(sandbox, { index: { data: [{ path: '/web/rsp/components/untitled' }] } });
      const el = makeBlock();

      await init(el);

      expect(el.querySelector('.card-grid-list') === null).to.be.true;
      expect(el.hidden).to.be.true;
    });
  });

  describe('card field fallbacks', () => {
    const fields = [
      { field: 'title', fallback: 'Button', override: 'Card button', selector: '.card-grid-item-title a' },
      { field: 'description', fallback: 'Page description', override: 'Card description', selector: '.card-grid-item-description' },
      { field: 'image', fallback: '/img/page.svg', override: '/img/card.svg', selector: '.card-grid-item-image img' },
    ];

    fields.forEach(({
      field, fallback, override, selector,
    }) => {
      const valueIn = (el) => {
        const element = el.querySelector(selector);
        return field === 'image' ? new URL(element.src).pathname : element.textContent;
      };

      [
        { name: 'whitespace', value: ' \t\n ' },
        { name: 'not a string', value: 42 },
      ].forEach(({ name, value }) => {
        it(`uses the trimmed page ${field} when card-${field} is ${name}`, async () => {
          stubIndexes(sandbox, {
            index: {
              data: [{
                path: '/web/rsp/components/button',
                title: 'Button',
                [field]: ` ${fallback} `,
                [`card-${field}`]: value,
              }],
            },
          });
          const el = makeBlock();

          await init(el);

          expect(valueIn(el)).to.equal(fallback);
        });
      });

      it(`prefers and trims a nonblank card-${field}`, async () => {
        stubIndexes(sandbox, {
          index: {
            data: [{
              path: '/web/rsp/components/button',
              title: 'Button',
              [field]: fallback,
              [`card-${field}`]: ` ${override} `,
            }],
          },
        });
        const el = makeBlock();

        await init(el);

        expect(valueIn(el)).to.equal(override);
      });

      if (field !== 'title') {
        it(`omits the ${field} when both values are blank`, async () => {
          stubIndexes(sandbox, {
            index: {
              data: [{
                path: '/web/rsp/components/button',
                title: 'Button',
                [field]: ' \n ',
                [`card-${field}`]: '\t',
              }],
            },
          });
          const el = makeBlock();

          await init(el);

          expect(el.querySelectorAll('.card-grid-item')).to.have.length(1);
          expect(el.querySelector(selector) === null).to.be.true;
        });
      }
    });
  });

  describe('image paths', () => {
    const media = 'media_14a731d79cc618583e8e672c04acdc161e6528a04.png';
    const cases = [
      {
        name: 'document-relative',
        value: `./${media}?width=750&format=png&optimize=medium`,
        expected: `/web/design-only/components/${media}`,
      },
      {
        name: 'parent-relative',
        value: `../${media}`,
        expected: `/web/design-only/${media}`,
      },
      {
        name: 'root-relative',
        value: `/${media}`,
        expected: `/${media}`,
      },
      {
        name: 'absolute',
        value: `https://images.example.com/${media}`,
        expected: `https://images.example.com/${media}`,
      },
    ];

    ['card-image', 'image'].forEach((field) => {
      cases.forEach(({ name, value, expected }) => {
        it(`resolves a ${name} ${field} from the component page, not the grid page`, async () => {
          stubIndexes(sandbox, {
            index: {
              data: [{
                path: '/web/design-only/components/alert-banner',
                'card-title': 'Alert banners',
                [field]: value,
              }],
            },
          });
          const el = makeBlock();

          await init(el);

          const image = new URL(el.querySelector('.card-grid-item-image img').src);
          expect(`${image.origin}${image.pathname}`)
            .to.equal(new URL(expected, window.location.origin).href);
        });
      });
    });
  });

  describe('config', () => {
    it('reads keys by label text, not row order', async () => {
      stubIndexes(sandbox);
      const el = makeBlock([['Count', '1'], ['Card team', 'Design Systems']]);

      await init(el);

      expect(titlesIn(el)).to.deep.equal(['Avatar']);
    });

    it('filters on a single authored key', async () => {
      stubIndexes(sandbox);
      const el = makeBlock([['Card category', 'Patterns']]);

      await init(el);

      expect(titlesIn(el)).to.deep.equal(['Rating']);
    });

    ['Card team', 'Card subject', 'Card category'].forEach((label) => {
      it(`does not coerce a numeric ${label.toLowerCase()} into a filter match`, async () => {
        const field = label.toLowerCase().replaceAll(' ', '-');
        stubIndexes(sandbox, {
          index: {
            data: [
              { path: '/patterns/invalid', title: 'Numeric value', [field]: 42 },
              { path: '/patterns/valid', title: 'String value', [field]: ' 42 ' },
            ],
          },
        });
        const el = makeBlock([[label, '42'], ['Count', '1']]);

        await init(el);

        expect(titlesIn(el)).to.deep.equal(['String value']);
      });
    });

    it('preserves case-insensitive comma-separated matching for string values', async () => {
      stubIndexes(sandbox, {
        index: {
          data: [{
            path: '/patterns/forms',
            title: 'Forms',
            'card-team': ' CXO, Design Systems ',
          }],
        },
      });
      const el = makeBlock([['Card team', 'design systems']]);

      await init(el);

      expect(titlesIn(el)).to.deep.equal(['Forms']);
      expect(badgesIn(el.querySelector('.card-grid-item')))
        .to.deep.equal([['card-team', 'CXO, Design Systems']]);
    });

    it('requires every authored key to match', async () => {
      stubIndexes(sandbox);
      const el = makeBlock([['Card team', 'CXO'], ['Card category', 'Patterns']]);

      await init(el);

      expect(titlesIn(el)).to.deep.equal(['Rating']);
    });

    it('filters on the implementation derived from the path', async () => {
      stubIndexes(sandbox);
      const el = makeBlock([['Implementation', 'swc']]);

      await init(el);

      expect(el.querySelectorAll('.card-grid-item')).to.have.length(1);
    });

    it('limits the rendered items to count', async () => {
      stubIndexes(sandbox);
      const el = makeBlock([['Count', '2']]);

      await init(el);

      expect(el.querySelectorAll('.card-grid-item')).to.have.length(2);
    });

    it('ignores a count that is not a positive number', async () => {
      stubIndexes(sandbox);
      const el = makeBlock([['Count', 'lots']]);

      await init(el);

      expect(el.querySelectorAll('.card-grid-item')).to.have.length(4);
    });

    it('treats an authored All as no filter', async () => {
      stubIndexes(sandbox);
      const el = makeBlock([['Card category', 'All']]);

      await init(el);

      expect(el.querySelectorAll('.card-grid-item')).to.have.length(4);
    });

    it('matches a key case-insensitively', async () => {
      stubIndexes(sandbox);
      const el = makeBlock([['Card category', 'patterns']]);

      await init(el);

      expect(titlesIn(el)).to.deep.equal(['Rating']);
    });
  });

  describe('content selects the index', () => {
    const indexesRequested = (fetchStub) => fetchStub.getCalls()
      .map((call) => call.args[0].toString())
      .filter((url) => url.includes('query-index.json'));

    it('reads the web roll-up for content: web', async () => {
      const fetchStub = stubIndexes(sandbox);
      const el = makeBlock([['Content', 'web']]);

      await init(el);

      expect(indexesRequested(fetchStub)).to.deep.equal(['/web/components/query-index.json']);
    });

    it('reads the mobile roll-up for content: mobile', async () => {
      const fetchStub = stubIndexes(sandbox);
      const el = makeBlock([['Content', 'mobile']]);

      await init(el);

      expect(indexesRequested(fetchStub)).to.deep.equal(['/mobile/components/query-index.json']);
    });

    it('reads the patterns index for content: patterns', async () => {
      const fetchStub = stubIndexes(sandbox);
      const el = makeBlock([['Content', 'patterns']]);

      await init(el);

      expect(indexesRequested(fetchStub)).to.deep.equal(['/patterns/query-index.json']);
    });

    it('defaults to the web roll-up when no content is authored', async () => {
      const fetchStub = stubIndexes(sandbox);
      const el = makeBlock();

      await init(el);

      expect(indexesRequested(fetchStub)).to.deep.equal(['/web/components/query-index.json']);
    });

    it('matches the authored value case-insensitively', async () => {
      const fetchStub = stubIndexes(sandbox);
      const el = makeBlock([['Content', 'Mobile']]);

      await init(el);

      expect(indexesRequested(fetchStub)).to.deep.equal(['/mobile/components/query-index.json']);
    });

    // A typo must not silently fall back to another collection's content.
    it('requests nothing and hides the block for an unknown content value', async () => {
      const fetchStub = stubIndexes(sandbox);
      const el = makeBlock([['Content', 'desktop']]);

      await init(el);

      expect(indexesRequested(fetchStub)).to.have.length(0);
      expect(el.hidden).to.be.true;
    });

    it('does not also filter rows by content', async () => {
      stubIndexes(sandbox);
      const el = makeBlock([['Content', 'web']]);

      await init(el);

      expect(el.querySelectorAll('.card-grid-item')).to.have.length(4);
    });
  });

  describe('empty and failed states', () => {
    it('hides the block and its wrapper when no row matches', async () => {
      stubIndexes(sandbox);
      const el = makeBlock([['Card team', 'Nobody']]);

      await init(el);

      expect(el.querySelectorAll('.card-grid-item')).to.have.length(0);
      expect(el.hidden).to.be.true;
    });

    it('hides the block when the index cannot be read', async () => {
      sandbox.stub(window, 'fetch').callsFake(async () => notFound());
      const el = makeBlock();

      await init(el);

      expect(el.hidden).to.be.true;
    });

    describe('section visibility', () => {
      before(async () => {
        await Promise.all([
          loadStyle('/styles/styles.css'),
          loadStyle('/blocks/section-metadata/section-metadata.css'),
          loadStyle('/blocks/card-grid/card-grid.css'),
        ]);
      });

      /*
       * section-metadata sets `display` on `.block-content` from a selector
       * per layout class, each one more specific than a bare
       * `.block-content.card-grid-empty`. Enumerating only `.grid` left an
       * empty grid's wrapper holding a cell beside a populated sibling in
       * every other layout. `.grid-4` and `.grid-6` sit behind a 900px media
       * query, so they assert trivially on a narrow runner and start biting
       * above it.
       */
      ['grid', 'grid-2', 'grid-3', 'grid-4', 'grid-6', 'layout-bento'].forEach((layout) => {
        it(`collapses an empty grid's wrapper beside a populated one in .${layout}`, async () => {
          stubIndexes(sandbox);
          const empty = makeBlock([['Card team', 'Nobody']]);
          const section = empty.closest('.section');
          section.classList.add(layout);

          const fullWrapper = document.createElement('div');
          fullWrapper.className = 'block-content';
          section.append(fullWrapper);
          const full = makeBlock([], fullWrapper);

          await Promise.all([init(empty), init(full)]);

          expect(empty.hidden, 'empty grid hidden').to.be.true;
          expect(full.hidden, 'populated grid hidden').to.be.false;
          expect(getComputedStyle(empty.parentElement).display, `.${layout} wrapper display`)
            .to.equal('none');
          expect(empty.parentElement.getBoundingClientRect().height, 'collapsed wrapper height')
            .to.equal(0);
          expect(full.querySelector('.card-grid-item').checkVisibility()).to.be.true;
        });
      });

      it('collapses an empty section even when its wrapper uses a grid layout', async () => {
        stubIndexes(sandbox, { index: { data: [] } });
        const el = makeBlock();
        const section = el.closest('.section');
        section.classList.add('grid');

        await init(el);

        expect(el.hidden).to.be.true;
        expect(getComputedStyle(el.parentElement).display).to.equal('none');
        expect(getComputedStyle(section).display).to.equal('none');
      });

      it('keeps an adjacent non-grid block visible', async () => {
        stubIndexes(sandbox, { index: { data: [] } });
        const el = makeBlock();
        const sibling = document.createElement('div');
        sibling.className = 'columns';
        sibling.textContent = 'Other content';
        el.after(sibling);

        await init(el);

        expect(el.hidden).to.be.true;
        expect(sibling.checkVisibility()).to.be.true;
      });

      it('preserves section copy while collapsing its empty block wrapper', async () => {
        stubIndexes(sandbox, { index: { data: [] } });
        const el = makeBlock();
        const copy = document.createElement('div');
        copy.className = 'default-content';
        copy.innerHTML = '<h2>Resources</h2>';
        el.closest('.section').prepend(copy);

        await init(el);

        expect(el.hidden).to.be.true;
        expect(getComputedStyle(el.parentElement).display).to.equal('none');
        expect(copy.querySelector('h2').checkVisibility()).to.be.true;
      });

      [
        { name: 'empty grid finishes first', order: [0, 1] },
        { name: 'populated grid finishes first', order: [1, 0] },
      ].forEach(({ name, order }) => {
        it(`keeps grid visibility independent when the ${name}`, async () => {
          stubIndexes(sandbox);
          const empty = makeBlock([['Card team', 'Nobody']]);
          const full = makeBlock([], empty.parentElement);
          const grids = [empty, full];

          await Promise.all(order.map((i) => init(grids[i])));

          expect(empty.hidden).to.be.true;
          expect(full.hidden).to.be.false;
          expect(full.querySelector('.card-grid-item-title a').checkVisibility()).to.be.true;
        });
      });

      it('collapses the section only after every grid is empty', async () => {
        stubIndexes(sandbox, { index: { data: [] } });
        const first = makeBlock();
        const second = makeBlock([], first.parentElement);
        const section = first.closest('.section');

        await init(first);
        expect(getComputedStyle(section).display).not.to.equal('none');

        await init(second);
        expect(first.hidden).to.be.true;
        expect(second.hidden).to.be.true;
        expect(getComputedStyle(section).display).to.equal('none');
      });

      it('does not clear an independently hidden section', async () => {
        stubIndexes(sandbox);
        const el = makeBlock();
        const section = el.closest('.section');
        section.hidden = true;

        await init(el);

        expect(section.hidden).to.be.true;
      });
    });

    it('does not throw on a block with no authored rows and no data', async () => {
      sandbox.stub(window, 'fetch').callsFake(async () => notFound());
      const el = makeBlock();

      let threw = false;
      try {
        await init(el);
      } catch {
        threw = true;
      }

      expect(threw).to.be.false;
    });
  });

  describe('card-status', () => {
    // A patterns path has no `components` segment, so statusForPath can never
    // resolve one however complete the status index is.
    const PATTERN_ROW = {
      path: '/patterns/conversational-ai',
      'card-title': 'Conversational AI',
    };

    const statusOf = (el) => el.querySelector('.card-grid-item-status')?.dataset.status ?? null;

    it('supplies a status for a row the status index cannot address', async () => {
      stubIndexes(sandbox, {
        index: { data: [{ ...PATTERN_ROW, 'card-status': 'experimental' }] },
      });
      const el = makeBlock();

      await init(el);

      expect(statusOf(el)).to.equal('experimental');
    });

    it('reads the authored wording, not just the id', async () => {
      stubIndexes(sandbox, {
        index: { data: [{ ...PATTERN_ROW, 'card-status': 'Not available' }] },
      });
      const el = makeBlock();

      await init(el);

      expect(statusOf(el)).to.equal('not-available');
    });

    // The whole point of the precedence: a component's status comes from the
    // pipeline, so an authored column cannot make the card disagree with the
    // status table.
    it('lets the derived status win over an authored one', async () => {
      stubIndexes(sandbox, {
        index: {
          data: [{
            path: '/web/rsp/components/avatar',
            'card-title': 'Avatar',
            'card-status': 'available',
          }],
        },
      });
      const el = makeBlock();

      await init(el);

      expect(statusOf(el)).to.equal('deprecated');
    });

    it('treats a card-status that is not a string as absent', async () => {
      const log = sandbox.spy();
      setConfig({ ...SAFE_CONFIG, log });
      stubIndexes(sandbox, {
        index: { data: [{ ...PATTERN_ROW, 'card-status': 42 }] },
      });
      const el = makeBlock();

      await init(el);

      expect(statusOf(el)).to.equal(null);
      // Absent, not invalid - nothing to warn an author about.
      expect(log.calledWithMatch(/card-status/)).to.be.false;
    });

    it('ignores a status outside the unified vocabulary, and says so', async () => {
      const log = sandbox.spy();
      setConfig({ ...SAFE_CONFIG, log });
      stubIndexes(sandbox, {
        index: { data: [{ ...PATTERN_ROW, 'card-status': 'Totally made up' }] },
      });
      const el = makeBlock();

      await init(el);

      expect(statusOf(el)).to.equal(null);
      expect(log.calledWithMatch(/Totally made up/)).to.be.true;
      expect(log.calledWithMatch(/\/patterns\/conversational-ai/)).to.be.true;
    });

    it('renders no status badge when nothing resolves one', async () => {
      stubIndexes(sandbox, { index: { data: [PATTERN_ROW] } });
      const el = makeBlock();

      await init(el);

      expect(el.querySelectorAll('.card-grid-item')).to.have.length(1);
      expect(statusOf(el)).to.equal(null);
    });

    describe('as a filter', () => {
      it('narrows on the authored status', async () => {
        stubIndexes(sandbox, {
          index: {
            data: [
              { ...PATTERN_ROW, 'card-status': 'experimental' },
              { path: '/patterns/forms', 'card-title': 'Forms', 'card-status': 'available' },
            ],
          },
        });
        const el = makeBlock([['Card status', 'Experimental']]);

        await init(el);

        expect(titlesIn(el)).to.deep.equal(['Conversational AI']);
      });

      // Reading the column would match nothing here: a component's status
      // never appears on its row.
      it('narrows components on their derived status', async () => {
        stubIndexes(sandbox);
        const el = makeBlock([['Card status', 'Deprecated']]);

        await init(el);

        expect(titlesIn(el)).to.deep.equal(['Avatar']);
      });

      it('matches the authored wording of a multi-word status', async () => {
        stubIndexes(sandbox, {
          index: {
            data: [
              { ...PATTERN_ROW, 'card-status': 'not-available' },
              { path: '/patterns/forms', 'card-title': 'Forms', 'card-status': 'available' },
            ],
          },
        });
        const el = makeBlock([['Card status', 'Not available']]);

        await init(el);

        expect(titlesIn(el)).to.deep.equal(['Conversational AI']);
      });
    });
  });

  describe('badges', () => {
    it('renders team, subject and steward in that order', async () => {
      stubIndexes(sandbox, { index: ROLLUP_PRIVATE });
      const el = makeBlock();

      await init(el);

      expect(badgesIn(el.querySelector('.card-grid-item'))).to.deep.equal([
        ['card-team', 'CXO'],
        ['card-subject', 'web'],
        ['card-steward', 'Michael Scott'],
      ]);
    });

    // The edge strips card-steward for an anonymous viewer, so the row simply
    // arrives without it and the card shows the two public badges.
    it('omits the steward badge when the column was stripped', async () => {
      stubIndexes(sandbox);
      const el = makeBlock();

      await init(el);

      const fields = badgesIn(el.querySelector('.card-grid-item')).map(([field]) => field);
      expect(fields).to.deep.equal(['card-team', 'card-subject']);
    });

    // `rowValue` is the single rule: a value that is not authored text is
    // absent. A number used to render as a badge while the same number in
    // card-title fell back to the page title.
    it('treats a badge value that is not a string as absent', async () => {
      stubIndexes(sandbox, {
        index: {
          data: [{
            path: '/web/rsp/components/button',
            'card-title': 'Button',
            'card-team': 42,
            'card-subject': 'web',
          }],
        },
      });
      const el = makeBlock();

      await init(el);

      expect(badgesIn(el.querySelector('.card-grid-item')))
        .to.deep.equal([['card-subject', 'web']]);
    });

    it('renders no badge row when the row carries no badge values', async () => {
      stubIndexes(sandbox, {
        index: { data: [{ path: '/web/rsp/components/accordion', 'card-title': 'Accordion' }] },
      });
      const el = makeBlock();

      await init(el);

      expect(el.querySelectorAll('.card-grid-item')).to.have.length(1);
      expect(el.querySelector('.card-grid-item-badges')).to.equal(null);
    });

    // list-style: none strips the role in Safari, as it does for the grid list.
    it('marks the badge row as a list', async () => {
      stubIndexes(sandbox);
      const el = makeBlock();

      await init(el);

      expect(el.querySelector('.card-grid-item-badges').getAttribute('role')).to.equal('list');
    });

    it('sets the values as text, never as markup', async () => {
      stubIndexes(sandbox, {
        index: {
          data: [{
            path: '/web/rsp/components/accordion',
            'card-title': 'Accordion',
            'card-team': '<img src=x onerror="window.pwned = true">',
          }],
        },
      });
      const el = makeBlock();

      await init(el);

      const badge = el.querySelector('.card-grid-item-badge');
      expect(badge.querySelector('img')).to.equal(null);
      expect(badge.textContent).to.equal('<img src=x onerror="window.pwned = true">');
      expect(window.pwned).to.equal(undefined);
    });

    it('renders no second index request for the badge values', async () => {
      const fetchStub = stubIndexes(sandbox, { index: ROLLUP_PRIVATE });
      const el = makeBlock();

      await init(el);

      const requested = fetchStub.getCalls().map((call) => call.args[0].toString());
      expect(requested.every((url) => url.includes('query-index.json')
        || url.includes('/deps/status-index.json'))).to.be.true;
    });
  });
});
