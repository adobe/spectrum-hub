import { expect } from '@esm-bundle/chai';
import sinon from 'sinon';
import { getConfig } from '../../scripts/ak.js';
import init from '../../blocks/table/table.js';

function makeEl(html) {
  const el = document.createElement('div');
  el.innerHTML = html;
  return el;
}

describe('table block', () => {
  let sandbox;

  beforeEach(() => {
    sandbox = sinon.createSandbox();
    document.body.innerHTML = '';
  });

  afterEach(() => {
    sandbox.restore();
  });

  // Shared fixture: header with inline markup, body rows with formatting/links/empty cell
  const MOCK_TABLE = `
    <div>
      <div>
        <strong>Name</strong>
      </div>
      <div>Type</div>
    </div>
    <div>
      <div><em>italic</em> text</div>
      <div><a href="/foo">link</a></div>
    </div>
    <div>
      <div>plain</div>
      <div></div>
    </div>
  `;

  describe('when content authors manually create a table', () => {
    let el;

    beforeEach(async () => {
      el = makeEl(MOCK_TABLE);
      await init(el);
    });

    it('produces one <table>, one <thead>, and one <tbody>', () => {
      expect(el.querySelectorAll('table')).to.have.length(1);
      expect(el.querySelectorAll('thead')).to.have.length(1);
      expect(el.querySelectorAll('tbody')).to.have.length(1);
    });

    it('converts the first row to <th scope="col"> cells', () => {
      const ths = [...el.querySelectorAll('thead th')];
      expect(ths).to.have.length(2);
      ths.forEach((th) => expect(th.scope).to.equal('col'));
    });

    it('converts remaining rows to <tbody> <tr> rows of <td> cells', () => {
      const bodyRows = el.querySelectorAll('tbody tr');
      expect(bodyRows).to.have.length(2);
      [...bodyRows].forEach((row) => expect(row.querySelectorAll('td')).to.have.length(2));
    });

    it('preserves innerHTML in header cells', () => {
      expect(el.querySelector('th').innerHTML.trim()).to.equal('<strong>Name</strong>');
    });

    it('preserves inline markup in body cells', () => {
      expect(el.querySelector('tbody tr:first-child td:first-child').innerHTML).to.equal('<em>italic</em> text');
    });

    it('preserves anchor links in body cells', () => {
      const a = el.querySelector('td a');
      expect(a).to.not.be.null;
      expect(a.getAttribute('href')).to.equal('/foo');
      expect(a.textContent).to.equal('link');
    });

    it('emits a <td> for an empty authored body cell', () => {
      expect(el.querySelectorAll('tbody tr:last-child td')).to.have.length(2);
    });
  });

  describe('the shared table structured, buildTableElement', () => {
    let el;

    beforeEach(async () => {
      el = makeEl(`
        <div>
          <div>H</div>
        </div>
        <div>
          <div>D</div>
        </div>
      `);
      await init(el);
    });

    it('creates <table> that has role="table"', () => {
      expect(el.querySelector('table').role).to.equal('table');
    });

    it('creates <thead> that has class "header-row" and role="rowgroup"', () => {
      const thead = el.querySelector('thead');
      expect(thead.classList.contains('header-row')).to.be.true;
      expect(thead.role).to.equal('rowgroup');
    });

    it('has a header <tr> that has class "row" and role="row"', () => {
      const tr = el.querySelector('thead tr');
      expect(tr.classList.contains('row')).to.be.true;
      expect(tr.role).to.equal('row');
    });

    it('creates header cells that have role="columnheader"', () => {
      [...el.querySelectorAll('th')].forEach((th) => expect(th.role).to.equal('columnheader'));
    });

    it('creates <tbody> that has role="rowgroup"', () => {
      expect(el.querySelector('tbody').role).to.equal('rowgroup');
    });

    it('creates a body <tr> that has class "row" and role="row"', () => {
      const tr = el.querySelector('tbody tr');
      expect(tr.classList.contains('row')).to.be.true;
      expect(tr.role).to.equal('row');
    });

    it('creates body <td> cells have role="cell"', () => {
      [...el.querySelectorAll('td')].forEach((td) => expect(td.role).to.equal('cell'));
    });
  });

  describe('when init decorates the block', () => {
    let el;

    beforeEach(() => {
      el = makeEl(MOCK_TABLE);
    });

    it('does not remove block variant classes set by DA before init', async () => {
      el.classList.add('quiet');
      await init(el);
      expect(el.classList.contains('quiet')).to.be.true;
    });

    it('sets el.tabIndex to 0', async () => {
      await init(el);
      expect(el.tabIndex).to.equal(0);
    });

    it('sets aria-labelledby from an existing h1 id', async () => {
      const h1 = document.createElement('h1');
      h1.id = 'page-heading';
      document.body.append(h1);
      await init(el);
      expect(el.querySelector('table').getAttribute('aria-labelledby')).to.equal('page-heading');
    });

    it('generates a table-heading-* id for h1 when none is set', async () => {
      const h1 = document.createElement('h1');
      document.body.append(h1);
      await init(el);
      expect(h1.id).to.match(/^table-heading-/);
      expect(el.querySelector('table').getAttribute('aria-labelledby')).to.equal(h1.id);
    });

    it('uses the heading immediately preceding the table, not the first in the section', async () => {
      const section = document.createElement('div');
      section.className = 'section';

      const h2Options = document.createElement('h2');
      h2Options.id = 'options-id';
      section.append(h2Options);

      const optionsEl = el;
      section.append(optionsEl);

      const h2States = document.createElement('h2');
      h2States.id = 'states-id';
      section.append(h2States);

      const statesEl = makeEl(MOCK_TABLE);
      section.append(statesEl);
      document.body.append(section);

      await init(optionsEl);
      await init(statesEl);

      expect(optionsEl.querySelector('table').getAttribute('aria-labelledby')).to.include('options-id');
      expect(statesEl.querySelector('table').getAttribute('aria-labelledby')).to.include('states-id');
      expect(statesEl.querySelector('table').getAttribute('aria-labelledby')).not.to.include('options-id');
    });

    it('includes a section heading in aria-labelledby when inside .section', async () => {
      const section = document.createElement('div');
      section.className = 'section';
      const h2 = document.createElement('h2');
      h2.id = 'section-title';
      section.append(h2);
      section.append(el);
      document.body.append(section);
      await init(el);
      expect(el.querySelector('table').getAttribute('aria-labelledby')).to.include('section-title');
    });

    it('includes both h1 and section heading in aria-labelledby', async () => {
      const h1 = document.createElement('h1');
      h1.id = 'h1-id';
      document.body.append(h1);

      const section = document.createElement('div');
      section.className = 'section';
      const h2 = document.createElement('h2');
      h2.id = 'h2-id';
      section.append(h2);
      section.append(el);
      document.body.append(section);

      await init(el);
      const labelledBy = el.querySelector('table').getAttribute('aria-labelledby');
      expect(labelledBy).to.include('h1-id');
      expect(labelledBy).to.include('h2-id');
    });

    it('omits aria-labelledby when no headings are present', async () => {
      await init(el);
      expect(el.querySelector('table').hasAttribute('aria-labelledby')).to.be.false;
    });
  });

  describe('when content authors opt for the data table path', () => {
    const PROPS = [
      {
        attribute: 'size', type: 'string', default: 'M', description: 'Component size',
      },
      {
        attribute: 'disabled', type: 'boolean', inheritedFrom: 'StyleProps',
      },
    ];

    function makeDataEl(href = 'https://example.com/props.json') {
      return makeEl(`
        <div>
          <div><a href="${href}">data</a></div>
        </div>
      `);
    }

    function stubFetchOk(data) {
      return sandbox.stub(window, 'fetch').resolves(
        new Response(JSON.stringify(data), { status: 200 }),
      );
    }

    it('calls fetch with the JSON href', async () => {
      const stub = stubFetchOk(PROPS.slice(0, 1));
      await init(makeDataEl('https://example.com/props.json'));
      expect(stub.calledOnceWith('https://example.com/props.json')).to.be.true;
    });

    it('resolves a relative href and calls fetch with the absolute URL', async () => {
      const stub = stubFetchOk(PROPS.slice(0, 1));
      await init(makeDataEl('/deps/swc/data/swc-button.json'));
      // a.href resolves the relative path against the page origin
      const calledUrl = stub.firstCall.args[0];
      expect(calledUrl).to.match(/\/deps\/swc\/data\/swc-button\.json$/);
    });

    it('creates header cells from JSON keys using PROPS_TO_LABELS', async () => {
      stubFetchOk(PROPS.slice(0, 1));
      const el = makeDataEl();
      await init(el);
      const headers = [...el.querySelectorAll('th')].map((th) => th.textContent);
      expect(headers).to.include('Attribute');
      expect(headers).to.include('Type');
      expect(headers).to.include('Default value');
      expect(headers).to.include('Description');
    });

    it('keeps status and since metadata out of table columns', async () => {
      stubFetchOk([
        {
          attribute: 'variant',
          type: 'string',
          status: 'internal',
          since: '2.0.0',
        },
      ]);
      const el = makeDataEl();
      await init(el);
      const headers = [...el.querySelectorAll('th')].map((th) => th.textContent);
      const cells = [...el.querySelectorAll('td')].map((td) => td.textContent);
      expect(headers).to.not.include('Status');
      expect(headers).to.not.include('Since');
      expect(cells).to.not.include('internal');
      expect(cells).to.not.include('2.0.0');
    });

    it('filters rows whose inheritedFrom is StyleProps', async () => {
      stubFetchOk(PROPS);
      const el = makeDataEl();
      await init(el);
      expect(el.querySelectorAll('tbody tr')).to.have.length(1);
    });

    it('uses "-" for missing cell values', async () => {
      // Row 2 lacks 'type', so its type cell should fall back to '-'
      stubFetchOk([
        { attribute: 'size', type: 'string' },
        { attribute: 'disabled' },
      ]);
      const el = makeDataEl();
      await init(el);
      const fallbacks = [...el.querySelectorAll('td')].filter((td) => td.textContent === '-');
      expect(fallbacks.length).to.be.above(0);
    });

    it('does not produce a table and calls config.log when fetch returns an error status', async () => {
      sandbox.stub(window, 'fetch').resolves(new Response('', { status: 500 }));
      const config = getConfig();
      const logStub = sandbox.stub(config, 'log');

      const el = makeDataEl();
      await init(el);
      expect(el.querySelector('table')).to.be.null;
      expect(logStub.calledOnce).to.be.true;
    });

    it('does not produce a table when the JSON response is empty', async () => {
      stubFetchOk([]);
      const el = makeDataEl();
      await init(el);
      expect(el.querySelector('table')).to.be.null;
    });
  });
});
