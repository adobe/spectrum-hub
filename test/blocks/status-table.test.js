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

    // The table loads sorted by Component ascending, so target rows by name, not position.
    const rowByName = (root, name) => [...root.querySelectorAll('tbody tr')]
      .find((tr) => tr.querySelector('th').textContent === name);

    it('renders the unified status label per column cell, in index column order', () => {
      const calendarCells = rowByName(el, 'Calendar').querySelectorAll('td');
      expect(calendarCells[0].textContent).to.include('Not available'); // figma
      expect(calendarCells[1].textContent).to.include('Available'); // rsp
      expect(calendarCells[2].textContent).to.include('Not available'); // swc
    });

    it('tags each status with a data-status hook for its color', () => {
      const cells = rowByName(el, 'Calendar').querySelectorAll('td');
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
      const calendarRow = rowByName(el, 'Calendar');
      expect(calendarRow.querySelector('.status-table__secondary')).to.be.null;
    });
  });

  describe('status cards', () => {
    let el;
    beforeEach(async () => {
      stubFetchOk();
      el = makeEl();
      await init(el);
    });

    it('renders a card for each status present in the data, in canonical order', () => {
      const statuses = [...el.querySelectorAll('.status-table__card')]
        .map((card) => card.getAttribute('data-status'));
      // MOCK_INDEX exercises available, experimental, and not-available only.
      expect(statuses).to.deep.equal(['available', 'experimental', 'not-available']);
    });

    it('does not render cards for statuses absent from the data', () => {
      const statuses = [...el.querySelectorAll('.status-table__card')]
        .map((card) => card.getAttribute('data-status'));
      expect(statuses).to.not.include('deprecated');
      expect(statuses).to.not.include('removed');
    });

    it('shows each status label and definition on its card', () => {
      const card = [...el.querySelectorAll('.status-table__card')]
        .find((c) => c.getAttribute('data-status') === 'available');
      expect(card).to.not.be.undefined;
      expect(card.textContent).to.include(STATUSES.available.label);
      expect(card.textContent).to.include(STATUSES.available.definition);
    });

    it('replaces the old inline legend list', () => {
      expect(el.querySelector('.status-table__legend')).to.be.null;
    });
  });

  describe('toolbar — search', () => {
    let el;
    beforeEach(async () => {
      stubFetchOk();
      el = makeEl();
      await init(el);
    });

    it('renders a search input (se-input type=search)', () => {
      const input = el.querySelector('.status-table__search');
      expect(input).to.not.be.null;
      expect(input.tagName.toLowerCase()).to.equal('se-input');
      expect(input.getAttribute('type')).to.equal('search');
    });

    it('keeps an accessible label but hides it visually', () => {
      const input = el.querySelector('.status-table__search');
      expect(input.getAttribute('label')).to.equal('Search components');
      expect(input.hasAttribute('hide-label')).to.be.true;
    });

    it('filters rows to those whose component name matches the query', () => {
      const input = el.querySelector('.status-table__search');
      input.value = 'color';
      input.dispatchEvent(new Event('input'));
      const visible = [...el.querySelectorAll('tbody tr')].filter((tr) => !tr.hidden);
      expect(visible.map((tr) => tr.querySelector('th').textContent)).to.deep.equal(['Color Area']);
    });

    it('is case-insensitive and matches on substrings', () => {
      const input = el.querySelector('.status-table__search');
      input.value = 'BUTTON';
      input.dispatchEvent(new Event('input'));
      const visible = [...el.querySelectorAll('tbody tr')].filter((tr) => !tr.hidden);
      expect(visible.map((tr) => tr.querySelector('th').textContent)).to.deep.equal(['Button']);
    });

    it('restores every row when the query is cleared', () => {
      const input = el.querySelector('.status-table__search');
      input.value = 'button';
      input.dispatchEvent(new Event('input'));
      input.value = '';
      input.dispatchEvent(new Event('input'));
      const hidden = [...el.querySelectorAll('tbody tr')].filter((tr) => tr.hidden);
      expect(hidden).to.have.length(0);
    });

    it('announces the matching component count in the live region', () => {
      const input = el.querySelector('.status-table__search');
      const region = el.querySelector('[role="status"]');
      input.value = 'color';
      input.dispatchEvent(new Event('input'));
      expect(region.textContent).to.equal('1 component');
      input.value = '';
      input.dispatchEvent(new Event('input'));
      expect(region.textContent).to.equal('3 components');
    });
  });

  describe('toolbar — show details toggle', () => {
    let el;
    beforeEach(async () => {
      stubFetchOk();
      el = makeEl();
      await init(el);
    });

    it('renders a show-details switch (se-switch)', () => {
      const sw = el.querySelector('.status-table__details-toggle');
      expect(sw).to.not.be.null;
      expect(sw.tagName.toLowerCase()).to.equal('se-switch');
    });

    it('hides secondary detail lines by default', () => {
      expect(el.classList.contains('status-table--show-details')).to.be.false;
    });

    it('reveals details when toggled on and hides them again when toggled off', () => {
      const sw = el.querySelector('.status-table__details-toggle');
      sw.checked = true;
      sw.dispatchEvent(new Event('change'));
      expect(el.classList.contains('status-table--show-details')).to.be.true;
      sw.checked = false;
      sw.dispatchEvent(new Event('change'));
      expect(el.classList.contains('status-table--show-details')).to.be.false;
    });
  });

  describe('toolbar — column filter', () => {
    let el;
    beforeEach(async () => {
      stubFetchOk();
      el = makeEl();
      await init(el);
    });

    it('renders a filter button wired to a popover panel', () => {
      const button = el.querySelector('.status-table__filter-button');
      const popover = el.querySelector('.status-table__filter-popover');
      expect(button).to.not.be.null;
      expect(popover).to.not.be.null;
      expect(popover.hasAttribute('popover')).to.be.true;
      expect(button.getAttribute('popovertarget')).to.equal(popover.id);
    });

    it('starts with the popover closed', () => {
      const popover = el.querySelector('.status-table__filter-popover');
      expect(popover.matches(':popover-open')).to.be.false;
    });

    it('is icon-only with a visually hidden accessible name', () => {
      const button = el.querySelector('.status-table__filter-button');
      const label = button.querySelector('.visually-hidden');
      expect(label).to.not.be.null;
      expect(label.textContent).to.equal('Filter columns');
    });

    it('offers one checkbox per implementation column, in column order', () => {
      const toggles = [...el.querySelectorAll('.status-table__column-toggle')];
      expect(toggles.map((c) => c.getAttribute('data-col'))).to.deep.equal(['figma', 'rsp', 'swc']);
    });

    it('checks every column by default', () => {
      const toggles = [...el.querySelectorAll('.status-table__column-toggle')];
      expect(toggles.every((c) => c.checked)).to.be.true;
    });

    it('hides a column\'s cells when its checkbox is unchecked', () => {
      const figmaToggle = el.querySelector('.status-table__column-toggle[data-col="figma"]');
      figmaToggle.checked = false;
      figmaToggle.dispatchEvent(new Event('change'));
      const figmaCells = el.querySelectorAll('.status-table__table [data-col="figma"]');
      expect([...figmaCells].every((c) => c.hidden)).to.be.true;
      const rspCells = el.querySelectorAll('.status-table__table [data-col="rsp"]');
      expect([...rspCells].some((c) => c.hidden)).to.be.false;
    });

    it('re-shows a column when its checkbox is re-checked', () => {
      const figmaToggle = el.querySelector('.status-table__column-toggle[data-col="figma"]');
      figmaToggle.checked = false;
      figmaToggle.dispatchEvent(new Event('change'));
      figmaToggle.checked = true;
      figmaToggle.dispatchEvent(new Event('change'));
      const figmaCells = el.querySelectorAll('.status-table__table [data-col="figma"]');
      expect([...figmaCells].some((c) => c.hidden)).to.be.false;
    });

    it('announces a column show/hide change in the live region', () => {
      const region = el.querySelector('[role="status"]');
      const figmaToggle = el.querySelector('.status-table__column-toggle[data-col="figma"]');
      figmaToggle.checked = false;
      figmaToggle.dispatchEvent(new Event('change'));
      expect(region.textContent).to.match(/figma column hidden/i);
      figmaToggle.checked = true;
      figmaToggle.dispatchEvent(new Event('change'));
      expect(region.textContent).to.match(/figma column shown/i);
    });
  });

  describe('toolbar — sort', () => {
    let el;
    beforeEach(async () => {
      stubFetchOk();
      el = makeEl();
      await init(el);
    });

    const names = (root) => [...root.querySelectorAll('tbody tr')]
      .map((tr) => tr.querySelector('th').textContent);

    it('loads sorted by Component ascending', () => {
      expect(names(el)).to.deep.equal(['Button', 'Calendar', 'Color Area']);
      expect(el.querySelector('thead th:first-child').getAttribute('aria-sort')).to.equal('ascending');
    });

    it('turns each sortable header into a button', () => {
      expect(el.querySelectorAll('thead th .status-table__sort-header')).to.have.length(4);
    });

    it('reverses to descending when the active header is clicked again', () => {
      const header = el.querySelector('thead th:first-child');
      header.querySelector('.status-table__sort-header').click();
      expect(header.getAttribute('aria-sort')).to.equal('descending');
      expect(names(el)).to.deep.equal(['Color Area', 'Calendar', 'Button']);
    });

    it('moves aria-sort onto a newly clicked column and resets the others', () => {
      const figmaHeader = el.querySelector('thead th[data-col="figma"]');
      figmaHeader.querySelector('.status-table__sort-header').click();
      expect(figmaHeader.getAttribute('aria-sort')).to.equal('ascending');
      expect(el.querySelector('thead th:first-child').getAttribute('aria-sort')).to.equal('none');
    });

    it('renders a mobile Sort by control (se-select + direction button)', () => {
      const control = el.querySelector('.status-table__sort');
      expect(control).to.not.be.null;
      expect(control.querySelector('se-select')).to.not.be.null;
      expect(control.querySelector('.status-table__sort-direction')).to.not.be.null;
    });

    it('keeps the header and the control in one shared state', () => {
      el.querySelector('thead th[data-col="figma"] .status-table__sort-header').click();
      expect(el.querySelector('.status-table__sort-select').value).to.equal('figma');
    });

    it('announces the sort in the live region', () => {
      const region = el.querySelector('[role="status"]');
      el.querySelector('thead th[data-col="figma"] .status-table__sort-header').click();
      expect(region.textContent).to.match(/sorted by figma, ascending/i);
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

    it('exposes the scrollable block as a named region landmark', async () => {
      stubFetchOk();
      const el = makeEl();
      await init(el);
      expect(el.getAttribute('role')).to.equal('region');
      expect(el.getAttribute('aria-label')).to.have.length.greaterThan(0);
    });

    it('renders a polite status live region for filter feedback', async () => {
      stubFetchOk();
      const el = makeEl();
      await init(el);
      const region = el.querySelector('[role="status"]');
      expect(region).to.not.be.null;
      expect(region.classList.contains('visually-hidden')).to.be.true;
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
