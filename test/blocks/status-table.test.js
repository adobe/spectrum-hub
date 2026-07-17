import { expect } from '@esm-bundle/chai';
import sinon from 'sinon';
import { getConfig } from '../../scripts/ak.js';
import { STATUSES } from '../../scripts/utils/status-model.js';
import init from '../../blocks/status-table/status-table.js';

// A minimal, hand-authored index that exercises every rendering branch:
// - a component available in one impl and not the other, with a maturity context
// - a component available in both
// - a component carrying a secondary-status guidance line
const MOCK_INDEX = {
  implementations: {
    web: [
      { id: 'figma', label: 'Figma' },
      { id: 'rsp', label: 'React Spectrum' },
      { id: 'swc', label: 'Spectrum Web Components' },
    ],
  },
  components: [
    {
      name: 'Calendar',
      label: 'Calendar',
      platforms: {
        web: {
          figma: { status: 'not-available' },
          rsp: { status: 'available', context: 'Stable' },
          swc: { status: 'not-available' },
        },
      },
    },
    {
      name: 'Button',
      label: 'Button',
      platforms: {
        web: {
          figma: { status: 'available' },
          rsp: { status: 'available' },
          swc: { status: 'available' },
        },
      },
    },
    {
      name: 'ColorArea',
      label: 'Color Area',
      platforms: {
        web: {
          figma: { status: 'available' },
          rsp: { status: 'experimental' },
          swc: { status: 'not-available', secondary: 'Use Gen1' },
        },
      },
    },
  ],
};

function makeEl(html = '') {
  const el = document.createElement('div');
  el.innerHTML = html;
  return el;
}

describe('status-table block', () => {
  let sandbox;

  beforeEach(() => {
    sandbox = sinon.createSandbox();
    document.body.innerHTML = '';
  });

  afterEach(() => {
    sandbox.restore();
  });

  function stubFetchOk(index = MOCK_INDEX) {
    return sandbox.stub(window, 'fetch').resolves(
      new Response(JSON.stringify(index), { status: 200 }),
    );
  }

  describe('data source', () => {
    it('fetches the build-time status index by default', async () => {
      const stub = stubFetchOk();
      await init(makeEl());
      expect(stub.calledOnce).to.be.true;
      expect(stub.firstCall.args[0]).to.match(/status-index\.json$/);
    });

    it('reads an authored JSON link when present', async () => {
      const stub = stubFetchOk();
      await init(makeEl('<div><div><a href="/deps/status-index.json">index</a></div></div>'));
      expect(stub.firstCall.args[0]).to.match(/\/deps\/status-index\.json$/);
    });

    it('renders no table and logs when the fetch fails', async () => {
      sandbox.stub(window, 'fetch').resolves(new Response('', { status: 500 }));
      const logStub = sandbox.stub(getConfig(), 'log');
      const el = makeEl();
      await init(el);
      expect(el.querySelector('table')).to.be.null;
      expect(logStub.calledOnce).to.be.true;
    });
  });

  describe('table structure', () => {
    let el;
    beforeEach(async () => {
      stubFetchOk();
      el = makeEl();
      await init(el);
    });

    it('produces one <table> with a <thead> and <tbody>', () => {
      expect(el.querySelectorAll('table')).to.have.length(1);
      expect(el.querySelectorAll('thead')).to.have.length(1);
      expect(el.querySelectorAll('tbody')).to.have.length(1);
    });

    it('builds columns data-driven from the index (Component + column labels)', () => {
      const headers = [...el.querySelectorAll('thead th')].map((th) => th.textContent.trim());
      expect(headers).to.deep.equal([
        'Component', 'Figma', 'React Spectrum', 'Spectrum Web Components',
      ]);
    });

    it('renders one body row per component', () => {
      expect(el.querySelectorAll('tbody tr')).to.have.length(3);
    });

    it('renders the component display label in the row header cell', () => {
      const colorAreaRow = [...el.querySelectorAll('tbody tr')]
        .find((tr) => tr.querySelector('th').textContent === 'Color Area');
      expect(colorAreaRow).to.not.be.undefined;
    });
  });

  describe('status cells', () => {
    let el;
    beforeEach(async () => {
      stubFetchOk();
      el = makeEl();
      await init(el);
    });

    it('renders the unified status label per column cell, in index column order', () => {
      const calendarCells = el.querySelectorAll('tbody tr:first-child td');
      expect(calendarCells[0].textContent).to.include('Not available'); // figma
      expect(calendarCells[1].textContent).to.include('Available'); // rsp
      expect(calendarCells[2].textContent).to.include('Not available'); // swc
    });

    it('tags each status with a data-status hook for its color', () => {
      const cells = el.querySelectorAll('tbody tr:first-child td');
      expect(cells[0].querySelector('[data-status]').getAttribute('data-status')).to.equal('not-available'); // figma
      expect(cells[1].querySelector('[data-status]').getAttribute('data-status')).to.equal('available'); // rsp
    });

    it('renders the secondary guidance line when present', () => {
      const colorAreaRow = [...el.querySelectorAll('tbody tr')]
        .find((tr) => tr.querySelector('th').textContent === 'Color Area');
      const secondary = colorAreaRow.querySelector('.status-table__secondary');
      expect(secondary).to.not.be.null;
      expect(secondary.textContent).to.include('Use Gen1');
    });

    it('omits the secondary line when absent', () => {
      const calendarRow = el.querySelector('tbody tr:first-child');
      expect(calendarRow.querySelector('.status-table__secondary')).to.be.null;
    });
  });

  describe('legend', () => {
    let el;
    beforeEach(async () => {
      stubFetchOk();
      el = makeEl();
      await init(el);
    });

    it('always renders every unified status with its definition', () => {
      const legend = el.querySelector('.status-table__legend');
      expect(legend).to.not.be.null;
      const text = legend.textContent;
      Object.values(STATUSES).forEach(({ label, definition }) => {
        expect(text).to.include(label);
        expect(text).to.include(definition);
      });
    });
  });

  describe('accessibility', () => {
    it('resets ARIA roles on the table structure', async () => {
      stubFetchOk();
      const el = makeEl();
      await init(el);
      expect(el.querySelector('table').role).to.equal('table');
      expect(el.querySelector('thead').role).to.equal('rowgroup');
      expect(el.querySelector('tbody').role).to.equal('rowgroup');
    });

    it('sets tabIndex on the block for keyboard scrolling', async () => {
      stubFetchOk();
      const el = makeEl();
      await init(el);
      expect(el.tabIndex).to.equal(0);
    });

    it('labels the table from the nearest preceding heading', async () => {
      stubFetchOk();
      const section = document.createElement('div');
      section.className = 'section';
      const h2 = document.createElement('h2');
      h2.id = 'status-heading';
      section.append(h2);
      const el = makeEl();
      section.append(el);
      document.body.append(section);
      await init(el);
      expect(el.querySelector('table').getAttribute('aria-labelledby')).to.include('status-heading');
    });

    it('does not drop variant classes set before init', async () => {
      stubFetchOk();
      const el = makeEl();
      el.classList.add('compact');
      await init(el);
      expect(el.classList.contains('compact')).to.be.true;
    });
  });

  describe('CSV export', () => {
    let el;
    beforeEach(async () => {
      stubFetchOk();
      el = makeEl();
      await init(el);
    });

    it('renders an Export CSV button', () => {
      const button = el.querySelector('.status-table__export');
      expect(button).to.not.be.null;
      expect(button.tagName).to.equal('BUTTON');
    });

    it('downloads a CSV mirroring the table when clicked', async () => {
      let captured;
      sandbox.stub(URL, 'createObjectURL').callsFake((blob) => {
        captured = blob;
        return 'blob:mock';
      });
      sandbox.stub(URL, 'revokeObjectURL');
      // Prevent the anchor from actually navigating/downloading in the test browser.
      sandbox.stub(window.HTMLAnchorElement.prototype, 'click');

      el.querySelector('.status-table__export').click();

      expect(captured, 'a Blob should be created for download').to.not.be.undefined;
      expect(captured.type).to.match(/text\/csv/);

      const text = await captured.text();
      const [header, ...rows] = text.split('\r\n');
      expect(header).to.equal('Component,Figma,React Spectrum,Spectrum Web Components');
      expect(rows).to.include('Calendar,Not available,Available,Not available');
      expect(rows).to.include('Color Area,Available,Experimental,Not available (Use Gen1)');
    });
  });
});
