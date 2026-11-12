import { expect } from '@esm-bundle/chai';
import sinon from 'sinon';
import { getConfig } from '../../scripts/ak.js';
import init from '../../blocks/table/table.js';

function makeEl(html) {
  const el = document.createElement('div');
  el.innerHTML = html;
  return el;
}

// Each body cell also carries a repeated column-header label for the narrow stacked
// layout, so read the value wrapper rather than the cell's whole textContent.
const cellValues = (el) => [...el.querySelectorAll('td .table-cell-value')]
  .map((value) => value.textContent);

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
      expect(el.querySelector('tbody tr:first-child td:first-child .table-cell-value').innerHTML).to.equal('<em>italic</em> text');
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

  // Below the block's 650px container width the thead is clipped out of view, so each
  // body cell repeats its column header beside the value.
  describe('the stacked layout labels', () => {
    let el;

    beforeEach(async () => {
      el = makeEl(MOCK_TABLE);
      await init(el);
    });

    it('enhances only extracted Type values without modifying their full text', async () => {
      const type = Array.from({ length: 200 }, (_, i) => `"value-${i}"`).join(' | ');
      sandbox.stub(window, 'fetch').callThrough().withArgs(sinon.match(/\/props\.json$/)).resolves(new Response(
        JSON.stringify([{ attribute: 'autocomplete', type, description: type }]),
        { status: 200 },
      ));
      const dataEl = makeEl('<div><div><a href="/props.json">data</a></div></div>');
      await init(dataEl);
      const disclosures = dataEl.querySelectorAll('se-disclosure');
      expect(disclosures).to.have.length(1);
      expect(disclosures[0].textContent).to.equal(type);
      expect(disclosures[0].getAttribute('label')).to.equal('View more about autocomplete');
      expect(disclosures[0].hasAttribute('preview')).to.be.true;
      expect(dataEl.querySelector('td:last-child se-disclosure')).to.be.null;
    });

    it('repeats every column header inside its body cells', () => {
      const labels = [...el.querySelectorAll('tbody tr:first-child .table-cell-label')]
        .map((label) => label.textContent);
      expect(labels).to.deep.equal(['Name', 'Type']);
    });

    it('takes the label from the header cell text, not its markup', () => {
      // the authored header is `<strong>Name</strong>`
      const label = el.querySelector('tbody .table-cell-label');
      expect(label.innerHTML).to.equal('Name');
    });

    it('hides the labels from assistive tech, which already gets the real column header', () => {
      const labels = [...el.querySelectorAll('.table-cell-label')];
      expect(labels.length).to.be.above(0);
      labels.forEach((label) => expect(label.getAttribute('aria-hidden')).to.equal('true'));
    });

    it('labels the data-table columns too', async () => {
      sandbox.stub(window, 'fetch').resolves(new Response(
        JSON.stringify([{ attribute: 'size', type: 'string' }]),
        { status: 200 },
      ));
      const dataEl = makeEl('<div><div><a href="https://example.com/props.json">data</a></div></div>');
      await init(dataEl);
      const labels = [...dataEl.querySelectorAll('tbody .table-cell-label')]
        .map((label) => label.textContent);
      expect(labels).to.deep.equal(['Attribute', 'Type']);
    });

    it('omits the label for a column whose header is blank', async () => {
      const blankHeader = makeEl(`
        <div><div>Name</div><div></div></div>
        <div><div>size</div><div>string</div></div>
      `);
      await init(blankHeader);
      const cells = blankHeader.querySelectorAll('tbody td');
      expect(cells[0].querySelector('.table-cell-label')).to.not.be.null;
      expect(cells[1].querySelector('.table-cell-label')).to.be.null;
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

    it('makes the scroll container keyboard reachable rather than the block', async () => {
      await init(el);
      expect(el.querySelector('.table-scroll')?.tabIndex).to.equal(0);
      expect(el.tabIndex).to.equal(-1);
    });

    it('wraps the table in a scroll container', async () => {
      await init(el);
      const scroller = el.querySelector('.table-scroll');
      expect(scroller?.parentElement).to.equal(el);
      expect(scroller?.querySelector('table')).to.equal(el.querySelector('table'));
    });

    it('names the scroll region with the same headings as the table', async () => {
      const h1 = document.createElement('h1');
      h1.id = 'page-heading';
      document.body.append(h1, el);
      await init(el);
      const scroller = el.querySelector('.table-scroll');
      expect(scroller?.role).to.equal('region');
      expect(scroller?.getAttribute('aria-labelledby'))
        .to.equal(el.querySelector('table').getAttribute('aria-labelledby'));
    });

    it('leaves the scroll container roleless when no heading names it', async () => {
      await init(el);
      const scroller = el.querySelector('.table-scroll');
      expect(scroller).not.to.be.null;
      expect(scroller.role).to.equal(null);
      expect(scroller.hasAttribute('aria-labelledby')).to.be.false;
    });

    it('handles horizontal arrows on an overflowing scroll container', async () => {
      sandbox.stub(Element.prototype, 'scrollWidth').get(() => 1000);
      sandbox.stub(Element.prototype, 'clientWidth').get(() => 600);
      await init(el);
      const scroller = el.querySelector('.table-scroll');
      const scroll = sandbox.stub(scroller, 'scrollBy');
      for (const key of ['ArrowLeft', 'ArrowRight']) {
        const event = new KeyboardEvent('keydown', { key, cancelable: true });
        scroller.dispatchEvent(event);
        expect(event.defaultPrevented).to.be.true;
        const { left } = scroll.lastCall.args[0];
        expect(key === 'ArrowLeft' ? left < 0 : left > 0).to.be.true;
      }
    });

    it('leaves descendant controls, modified arrows, and fitting tables alone', async () => {
      sandbox.stub(Element.prototype, 'scrollWidth').get(() => 1000);
      const width = sandbox.stub(Element.prototype, 'clientWidth').get(() => 600);
      await init(el);
      const scroller = el.querySelector('.table-scroll');
      const scroll = sandbox.stub(scroller, 'scrollBy');
      const linkEvent = new KeyboardEvent('keydown', {
        key: 'ArrowRight', bubbles: true, cancelable: true,
      });
      scroller.querySelector('a').dispatchEvent(linkEvent);
      expect(linkEvent.defaultPrevented).to.be.false;
      for (const modifier of ['altKey', 'ctrlKey', 'metaKey', 'shiftKey']) {
        const event = new KeyboardEvent('keydown', {
          key: 'ArrowRight', [modifier]: true, cancelable: true,
        });
        scroller.dispatchEvent(event);
        expect(event.defaultPrevented).to.be.false;
      }
      width.get(() => 1000);
      const fittingEvent = new KeyboardEvent('keydown', { key: 'ArrowRight', cancelable: true });
      scroller.dispatchEvent(fittingEvent);
      expect(fittingEvent.defaultPrevented).to.be.false;
      expect(scroll.called).to.be.false;
    });

    it('updates the scroll hint on scroll and resize, including RTL offsets', async () => {
      await init(el);
      const scroller = el.querySelector('.table-scroll');
      expect(scroller).not.to.be.null;
      Object.defineProperties(scroller, {
        scrollWidth: { value: 1000, configurable: true },
        clientWidth: { value: 600, configurable: true },
        scrollLeft: { value: 0, writable: true, configurable: true },
      });
      scroller.dispatchEvent(new Event('scroll'));
      expect(el.hasAttribute('data-scroll-hint')).to.be.true;
      for (const offset of [400, -400]) {
        scroller.scrollLeft = offset;
        scroller.dispatchEvent(new Event('scroll'));
        expect(el.hasAttribute('data-scroll-hint')).to.be.false;
      }
      scroller.scrollLeft = 0;
      window.dispatchEvent(new Event('resize'));
      expect(el.hasAttribute('data-scroll-hint')).to.be.true;
      Object.defineProperty(scroller, 'clientWidth', { value: 1000 });
      window.dispatchEvent(new Event('resize'));
      expect(el.hasAttribute('data-scroll-hint')).to.be.false;
    });

    it('describes overflow before scrolling and retains instructions at both scroll ends', async () => {
      sandbox.stub(Element.prototype, 'scrollWidth').get(() => 1000);
      sandbox.stub(Element.prototype, 'clientWidth').get(() => 600);
      await init(el);
      const scroller = el.querySelector('.table-scroll');
      const descriptionId = scroller.getAttribute('aria-describedby');
      expect(descriptionId).to.be.a('string');
      const instructions = el.querySelector(`#${descriptionId}`);
      expect(instructions.textContent)
        .to.equal('Scrollable table. Use the left and right arrow keys to view more.');
      expect(instructions.classList.contains('visually-hidden')).to.be.true;
      expect(instructions.hidden).to.be.false;
      expect(el.querySelector('[aria-live], [role="status"], [role="alert"]')).to.be.null;
      for (const offset of [400, -400]) {
        Object.defineProperty(scroller, 'scrollLeft', { value: offset, configurable: true });
        scroller.dispatchEvent(new Event('scroll'));
        expect(el.hasAttribute('data-scroll-hint')).to.be.false;
        expect(scroller.getAttribute('aria-describedby')).to.equal(descriptionId);
      }
      Object.defineProperty(scroller, 'clientWidth', { value: 1000, configurable: true });
      window.dispatchEvent(new Event('resize'));
      expect(scroller.hasAttribute('aria-describedby')).to.be.false;
      expect(instructions.hidden).to.be.true;
      Object.defineProperty(scroller, 'clientWidth', { value: 600 });
      window.dispatchEvent(new Event('resize'));
      expect(scroller.getAttribute('aria-describedby')).to.equal(descriptionId);
      expect(instructions.hidden).to.be.false;
    });

    it('keeps instructions inactive for fitting tables and gives each table its own description', async () => {
      const other = makeEl(MOCK_TABLE);
      await init(el);
      await init(other);
      const scrollers = [el, other].map((block) => block.querySelector('.table-scroll'));
      const instructions = [el, other].map((block) => block.querySelector('.visually-hidden'));
      for (const scroller of scrollers) {
        expect(scroller.hasAttribute('aria-describedby')).to.be.false;
      }
      instructions.forEach((text) => {
        expect(text).not.to.be.null;
        expect(text.hidden).to.be.true;
      });
      expect(instructions[0].id).not.to.equal(instructions[1].id);
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
      return sandbox.stub(window, 'fetch').callThrough().withArgs(sinon.match(/\.json$/)).resolves(
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

    it('renders description links while preserving surrounding text and other columns', async () => {
      const description = 'See [MDN](https://developer.mozilla.org/en-US/docs/Web/HTML#attributes) and [the\nreference](http://example.com/reference?a=1&b=2).';
      stubFetchOk([{
        property: '[property](https://example.com/property)',
        type: '[type](https://example.com/type)',
        description,
      }]);
      const el = makeDataEl();
      await init(el);
      const cell = el.querySelector('td:last-child .table-cell-value');
      const links = [...cell.querySelectorAll('a')];
      expect(links.map((link) => link.textContent)).to.deep.equal(['MDN', 'the\nreference']);
      expect(links.map((link) => link.getAttribute('href'))).to.deep.equal([
        'https://developer.mozilla.org/en-US/docs/Web/HTML#attributes',
        'http://example.com/reference?a=1&b=2',
      ]);
      expect(cell.textContent).to.equal('See MDN and the\nreference.');
      expect(el.querySelectorAll('td:not(:last-child) a')).to.have.length(0);
    });

    it('keeps HTML, unsafe destinations, and invalid URLs as literal description text', async () => {
      const description = '<img src=x onerror=alert(1)> [run](javascript:alert(1)) [data](data:text/html,test) [invalid](https://[invalid) [safe](https://example.com).';
      stubFetchOk([{ property: 'size', description }]);
      const el = makeDataEl();
      await init(el);
      const cell = el.querySelector('td:last-child .table-cell-value');
      expect(cell.querySelectorAll('img, script')).to.have.length(0);
      expect(cell.querySelectorAll('a')).to.have.length(1);
      expect(cell.querySelector('a').textContent).to.equal('safe');
      expect(cell.textContent).to.equal(description.replace('[safe](https://example.com)', 'safe'));
    });

    it('preserves parentheses in link destinations and treats labels as plain text', async () => {
      stubFetchOk([{
        property: 'size',
        description: 'See [<em>reference</em>](https://example.com/docs/function(test)#usage).',
      }]);
      const el = makeDataEl();
      await init(el);
      const link = el.querySelector('td:last-child a');
      expect(link).not.to.be.null;
      expect(link.getAttribute('href')).to.equal('https://example.com/docs/function(test)#usage');
      expect(link.textContent).to.equal('<em>reference</em>');
      expect(link.children).to.have.length(0);
    });

    it('renders backtick-delimited description text as code alongside links', async () => {
      stubFetchOk([{
        property: '`size`',
        type: '`string`',
        description: 'Set `size` to `M`. See [MDN](https://example.com).',
      }]);
      const el = makeDataEl();
      await init(el);
      const cell = el.querySelector('td:last-child .table-cell-value');
      expect([...cell.querySelectorAll('code')].map((code) => code.textContent))
        .to.deep.equal(['size', 'M']);
      expect(cell.textContent).to.equal('Set size to M. See MDN.');
      expect(cell.querySelector('a').href).to.equal('https://example.com/');
      expect(el.querySelectorAll('td:not(:last-child) code')).to.have.length(0);
    });

    it('keeps code contents literal and leaves unmatched backticks unchanged', async () => {
      stubFetchOk([{
        property: 'size',
        description: '`<img src=x onerror=alert(1)> [MDN](https://example.com)` and `unclosed',
      }]);
      const el = makeDataEl();
      await init(el);
      const cell = el.querySelector('td:last-child .table-cell-value');
      expect(cell.querySelector('code').textContent)
        .to.equal('<img src=x onerror=alert(1)> [MDN](https://example.com)');
      expect(cell.querySelectorAll('img, a')).to.have.length(0);
      expect(cell.textContent).to.equal('<img src=x onerror=alert(1)> [MDN](https://example.com) and `unclosed');
    });

    it('supports matching backtick runs and code in link labels', async () => {
      stubFetchOk([{
        property: 'size',
        description: 'Use ``a `literal` backtick`` or [`size`](https://example.com/size).',
      }]);
      const el = makeDataEl();
      await init(el);
      const cell = el.querySelector('td:last-child .table-cell-value');
      expect([...cell.querySelectorAll('code')].map((code) => code.textContent))
        .to.deep.equal(['a `literal` backtick', 'size']);
      expect(cell.querySelector('a code').textContent).to.equal('size');
      expect(cell.querySelector('a').href).to.equal('https://example.com/size');
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
      const cells = cellValues(el);
      expect(headers).to.not.include('Status');
      expect(headers).to.not.include('Since');
      expect(cells).to.not.include('internal');
      expect(cells).to.not.include('2.0.0');
    });

    // kind/values back the playground's controls; the table shows the human-readable
    // `type` instead. Without this they append as columns, and `values` renders as a
    // comma-joined array.
    it('keeps the playground control contract out of table columns', async () => {
      stubFetchOk([
        {
          attribute: 'variant',
          type: '"accent" | "primary"',
          kind: 'enum',
          values: ['accent', 'primary'],
          optional: true,
        },
      ]);
      const el = makeDataEl();
      await init(el);
      const headers = [...el.querySelectorAll('th')].map((th) => th.textContent);
      const cells = cellValues(el);
      expect(headers).to.not.include('Kind');
      expect(headers).to.not.include('Values');
      expect(headers).to.not.include('Optional');
      expect(cells).to.not.include('enum');
      expect(cells).to.not.include('accent,primary');
      expect(headers).to.include('Type');
    });

    // The compiler-based RSP extractor resolves the full inherited surface, so a
    // component carries its DOM/ARIA/event plumbing alongside its Spectrum API —
    // Button goes from 7 rows to 42. These sources are the plumbing.
    it('filters rows inherited from DOM, ARIA and event base interfaces', async () => {
      stubFetchOk([
        { property: 'variant', type: '"primary"', inheritedFrom: 'ButtonStyleProps' },
        { property: 'isDisabled', type: 'boolean' },
        { property: 'aria-label', type: 'string', inheritedFrom: 'AriaLabelingProps' },
        { property: 'onPress', type: '() => void', inheritedFrom: 'PressEvents' },
        { property: 'onKeyDown', type: '() => void', inheritedFrom: 'GlobalDOMEvents' },
        { property: 'id', type: 'string', inheritedFrom: 'DOMProps' },
      ]);
      const el = makeDataEl();
      await init(el);
      const cells = cellValues(el);
      expect(cells).to.include('variant');
      expect(cells).to.include('isDisabled');
      for (const dropped of ['aria-label', 'onPress', 'onKeyDown', 'id']) {
        expect(cells).to.not.include(dropped);
      }
    });

    it('filters rows whose inheritedFrom is StyleProps', async () => {
      stubFetchOk(PROPS);
      const el = makeDataEl();
      await init(el);
      expect(el.querySelectorAll('tbody tr')).to.have.length(1);
    });

    it('reads props from RSP extraction shape { status, props }', async () => {
      stubFetchOk({ status: 'stable', props: PROPS });
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
      const fallbacks = cellValues(el).filter((text) => text === '-');
      expect(fallbacks.length).to.be.above(0);
    });

    it('styles default cells only when their displayed value is not the placeholder', async () => {
      stubFetchOk([
        { property: 'size', type: 'string', default: 'M' },
        { property: 'weight', type: 'string', default: 'regular' },
        { property: 'placeholder', type: 'string', default: '-' },
        { property: 'missing', type: 'string' },
        { property: 'empty', type: 'string', default: '' },
        { property: 'nullable', type: 'string', default: null },
      ]);
      const el = makeDataEl();
      await init(el);
      const cells = [...el.querySelectorAll('tbody tr td:last-child')];
      expect(cells.map((cell) => cell.querySelector('.table-cell-value').textContent))
        .to.deep.equal(['M', 'regular', '-', '-', '-', '-']);
      expect(cells.map((cell) => cell.classList.contains('table-type-cell')))
        .to.deep.equal([true, true, false, false, false, false]);
      el.querySelectorAll('tbody tr').forEach((row) => {
        expect(row.children[0].classList.contains('table-type-cell')).to.be.true;
        expect(row.children[1].classList.contains('table-type-cell')).to.be.true;
      });
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
