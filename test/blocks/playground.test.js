import { expect } from '@esm-bundle/chai';
import sinon from 'sinon';
import init, {
  parseBlockMetadata,
  parseDefault,
  buildSwcSnippet,
  buildRspSnippet,
} from '../../blocks/playground/playground.js';
import { setConfig } from '../../scripts/ak.js';

// Minimal DOM-like helpers — just enough structure for the pure-function tests.
function makeRow(key, value, href = null) {
  const keyCell = { textContent: key, querySelector: () => null };
  const valueCell = {
    textContent: value,
    querySelector: (sel) => (sel === 'a' && href ? { href } : null),
  };
  return { children: [keyCell, valueCell] };
}

function makeEl(rows) {
  return { children: rows };
}

// --- parseBlockMetadata -----------------------------------------------------

describe('parseBlockMetadata', () => {
  it('returns an object keyed by lowercase row keys', () => {
    const el = makeEl([
      makeRow('implementation', 'swc'),
      makeRow('component', 'button'),
    ]);
    const result = parseBlockMetadata(el);
    expect(result.implementation).to.equal('swc');
    expect(result.component).to.equal('button');
  });

  it('extracts href from a link cell for the spreadsheet row', () => {
    const el = makeEl([
      makeRow('spreadsheet', 'ignored text', 'https://example.com/data.json'),
    ]);
    expect(parseBlockMetadata(el).spreadsheet).to.equal('https://example.com/data.json');
  });

  it('falls back to textContent when no link is present', () => {
    const el = makeEl([makeRow('component', 'button')]);
    expect(parseBlockMetadata(el).component).to.equal('button');
  });

  it('normalises key casing to lowercase', () => {
    const el = makeEl([makeRow('Implementation', 'swc')]);
    expect(parseBlockMetadata(el).implementation).to.equal('swc');
  });

  it('ignores rows with empty keys', () => {
    const el = makeEl([makeRow('', 'orphan'), makeRow('component', 'badge')]);
    expect(parseBlockMetadata(el).component).to.equal('badge');
    expect(Object.keys(parseBlockMetadata(el)).length).to.equal(1);
  });

  it('ignores rows with missing cells', () => {
    const el = { children: [{ children: [] }] };
    expect(parseBlockMetadata(el)).to.deep.equal({});
  });
});

// --- parseDefault -----------------------------------------------------------

describe('parseDefault', () => {
  it("strips surrounding single quotes from string defaults like \"'primary'\"", () => {
    expect(parseDefault("'primary'")).to.equal('primary');
  });

  it('returns bare values unchanged', () => {
    expect(parseDefault('true')).to.equal('true');
    expect(parseDefault('false')).to.equal('false');
  });

  it('returns undefined for null input', () => {
    expect(parseDefault(null)).to.be.undefined;
  });

  it('returns undefined for undefined input', () => {
    expect(parseDefault(undefined)).to.be.undefined;
  });

  it('returns undefined for an empty string', () => {
    expect(parseDefault('')).to.be.undefined;
  });
});

// --- buildSwcSnippet --------------------------------------------------------

describe('buildSwcSnippet', () => {
  it('builds a tag with attributes from currentProps', () => {
    const props = {
      variant: { attribute: 'variant', value: 'primary' },
      fillStyle: { attribute: 'fill-style', value: 'fill' },
    };
    const snippet = buildSwcSnippet('swc-button', props);
    expect(snippet.startsWith('<swc-button')).to.be.true;
    expect(snippet.includes('variant="primary"')).to.be.true;
    expect(snippet.includes('fill-style="fill"')).to.be.true;
    expect(snippet.endsWith('</swc-button>')).to.be.true;
  });

  it('uses the text/label/children property as inner text content', () => {
    const props = {
      text: { attribute: null, value: 'Click me' },
      variant: { attribute: 'variant', value: 'secondary' },
    };
    const snippet = buildSwcSnippet('swc-button', props);
    expect(snippet.includes('>\n  Click me\n</swc-button>')).to.be.true;
  });

  it('omits attributes with null attribute names from the opening tag', () => {
    const props = {
      text: { attribute: null, value: 'Label' },
    };
    const snippet = buildSwcSnippet('swc-button', props);
    expect(snippet.includes('null')).to.be.false;
    expect(snippet).to.equal('<swc-button>Label</swc-button>');
  });

  it('omits props with undefined or empty string values', () => {
    const props = {
      variant: { attribute: 'variant', value: '' },
      size: { attribute: 'size', value: undefined },
    };
    const snippet = buildSwcSnippet('swc-badge', props);
    expect(snippet.includes('variant')).to.be.false;
    expect(snippet.includes('size')).to.be.false;
  });

  it('defaults inner text to "Label" when no text-type prop exists', () => {
    const props = {
      variant: { attribute: 'variant', value: 'accent' },
    };
    expect(buildSwcSnippet('swc-button', props).includes('>\n  Label\n</swc-button>')).to.be.true;
  });

  it('uses the tag name as both opening and closing tag', () => {
    const snippet = buildSwcSnippet('swc-badge', {});
    expect(snippet.startsWith('<swc-badge')).to.be.true;
    expect(snippet.endsWith('</swc-badge>')).to.be.true;
  });

  it('renders a boolean-true value as a bare attribute (no ="value")', () => {
    const props = { disabled: { attribute: 'disabled', value: 'yes' } };
    const snippet = buildSwcSnippet('swc-action-button', props);
    expect(snippet.includes(' disabled')).to.be.true;
    expect(snippet.includes('disabled="')).to.be.false;
  });

  it('omits a boolean-false attribute entirely', () => {
    const props = {
      disabled: { attribute: 'disabled', value: 'no' },
      variant: { attribute: 'variant', value: 'primary' },
    };
    const snippet = buildSwcSnippet('swc-action-button', props);
    expect(snippet.includes('disabled')).to.be.false;
    expect(snippet.includes('variant="primary"')).to.be.true;
  });
});

// --- buildRspSnippet ---------------------------------------------------------

describe('buildRspSnippet', () => {
  it('renders a PascalCase tag with JSX-style boolean and string props', () => {
    const props = {
      isDisabled: { value: 'yes' },
      variant: { value: 'primary' },
      children: { value: 'Action' },
    };
    const snippet = buildRspSnippet('ActionButton', props);
    expect(snippet).to.equal('<ActionButton\n  isDisabled\n  variant="primary">\n  Action\n</ActionButton>');
  });

  it('omits a boolean-false prop entirely', () => {
    const props = {
      isQuiet: { value: 'no' },
      children: { value: 'Action' },
    };
    const snippet = buildRspSnippet('ActionButton', props);
    expect(snippet.includes('isQuiet')).to.be.false;
  });

  it('uses the property name as-authored, not a translated attribute', () => {
    const props = { staticColor: { value: 'white' } };
    const snippet = buildRspSnippet('ActionButton', props);
    expect(snippet.includes('staticColor="white"')).to.be.true;
  });

  it('defaults inner text to "Label" when no text-type prop exists', () => {
    const props = { variant: { value: 'accent' } };
    expect(buildRspSnippet('Badge', props).includes('>\n  Label\n</Badge>')).to.be.true;
  });

  it('uses the component name as both opening and closing tag', () => {
    const snippet = buildRspSnippet('Badge', {});
    expect(snippet.startsWith('<Badge')).to.be.true;
    expect(snippet.endsWith('</Badge>')).to.be.true;
  });
});

// --- init() (default export) -------------------------------------------------

function makeMetaEl(rows) {
  const el = document.createElement('div');
  Object.entries(rows).forEach(([key, value]) => {
    const row = document.createElement('div');
    const keyCell = document.createElement('div');
    keyCell.textContent = key;
    const valueCell = document.createElement('div');
    valueCell.textContent = value;
    row.append(keyCell, valueCell);
    el.append(row);
  });
  return el;
}

function jsonResponse(body) {
  return new Response(JSON.stringify(body), { status: 200 });
}

// Component: "button" with three authored properties, one per skip reason:
//  - "variant" only exists in the RSP data, so it's absent from the SWC data used here.
//  - "size" exists in the SWC data but its type ("ElementSize") can't be resolved to options.
//  - "isDisabled" resolves to a working boolean control via SWC name normalization.
function stubPlaygroundFetch(sandbox, overrides = {}) {
  const componentsSheet = overrides.components
    ?? [{ Component: 'Button', Properties: 'variant, size, isDisabled' }];
  const controlsSheet = overrides.controls
    ?? [
      { Property: 'variant', v1: 'picker' },
      { Property: 'size', v1: 'picker' },
      { Property: 'isDisabled', v1: 'picker' },
    ];
  const rspBody = overrides.rsp
    ?? { props: [{ property: 'variant', type: "'primary' | 'secondary'", default: "'primary'" }] };
  const swcBody = overrides.swc
    ?? [
      { property: 'size', attribute: 'size', type: 'ElementSize' },
      { property: 'disabled', attribute: 'disabled', type: 'boolean' },
    ];

  return sandbox.stub(window, 'fetch').callsFake(async (input) => {
    const url = String(input);
    if (url.includes('sheet=components')) { return jsonResponse({ data: componentsSheet }); }
    if (url.includes('sheet=controls')) { return jsonResponse({ data: controlsSheet }); }
    if (url.includes('/deps/rsp/data/')) { return jsonResponse(rspBody); }
    if (url.includes('/deps/swc/data/')) { return jsonResponse(swcBody); }
    return new Response('', { status: 404 });
  });
}

describe('playground block — init()', () => {
  let sandbox;
  let el;
  let logStub;
  let warnStub;

  beforeEach(() => {
    sandbox = sinon.createSandbox();
    logStub = sandbox.stub();
    setConfig({ log: logStub });
    warnStub = sandbox.stub(console, 'warn');
    document.body.innerHTML = '';
    el = makeMetaEl({ implementation: 'swc', component: 'button' });
    document.body.append(el);
  });

  afterEach(() => {
    sandbox.restore();
  });

  it('logs and removes the block when implementation or component metadata is missing', async () => {
    const bareEl = document.createElement('div');
    document.body.append(bareEl);
    await init(bareEl);
    expect(logStub.called).to.be.true;
    expect(document.body.contains(bareEl)).to.be.false;
  });

  it('logs and removes the block when data fetching fails', async () => {
    sandbox.stub(window, 'fetch').resolves(new Response('', { status: 500 }));
    await init(el);
    expect(logStub.called).to.be.true;
    expect(document.body.contains(el)).to.be.false;
  });

  it('builds the iframe src pointing at the dev-owned static file for swc', async () => {
    stubPlaygroundFetch(sandbox);
    await init(el);
    const iframe = el.querySelector('iframe');
    expect(iframe.src).to.include('/blocks/playground/static-html/button.html');
    expect(iframe.src).to.not.include('component=');
  });

  it('builds the iframe src with the component and implementation query params for non-swc implementations', async () => {
    stubPlaygroundFetch(sandbox);
    const rspEl = makeMetaEl({ implementation: 'rsp', component: 'button' });
    document.body.append(rspEl);
    await init(rspEl);
    const iframe = rspEl.querySelector('iframe');
    expect(iframe.src).to.include('/blocks/playground/static-html/index.html');
    expect(iframe.src).to.include('component=button');
    expect(iframe.src).to.include('implementation=rsp');
  });

  it('uses the PascalCase RSP-style code disclosure for rsp implementation', async () => {
    stubPlaygroundFetch(sandbox);
    const rspEl = makeMetaEl({ implementation: 'rsp', component: 'button' });
    document.body.append(rspEl);
    await init(rspEl);
    expect(rspEl.querySelector('pre').textContent).to.equal('<Button\n  variant="primary">\n  Label\n</Button>');
  });

  it('uses the RSP default for a control authored with a swc-style name', async () => {
    stubPlaygroundFetch(sandbox, {
      components: [{ Component: 'Button', Properties: 'disabled' }],
      controls: [{ Property: 'disabled', v1: 'picker' }],
      rsp: { props: [{ property: 'isDisabled', type: 'boolean', default: 'true' }] },
      swc: [],
    });
    const rspEl = makeMetaEl({ implementation: 'rsp', component: 'button' });
    document.body.append(rspEl);
    await init(rspEl);
    const picker = rspEl.querySelector('.playground-control hub-picker');
    expect(picker).to.exist;
    expect(picker.value).to.equal('yes');
  });

  it('renders a control only for the property that resolves to picker options', async () => {
    stubPlaygroundFetch(sandbox);
    await init(el);
    const labels = [...el.querySelectorAll('.playground-control label')].map((l) => l.textContent);
    expect(labels).to.deep.equal(['isDisabled']);
  });

  it('warns with a plain-English reason when a property is missing from the implementation data', async () => {
    stubPlaygroundFetch(sandbox);
    await init(el);
    const messages = warnStub.getCalls().map((c) => c.args.join(' '));
    expect(messages.some((m) => m.includes('button') && m.includes('"variant"') && m.toLowerCase().includes('swc data'))).to.be.true;
  });

  it('warns with a plain-English reason when a property type cannot be resolved to options', async () => {
    stubPlaygroundFetch(sandbox);
    await init(el);
    const messages = warnStub.getCalls().map((c) => c.args.join(' '));
    expect(messages.some((m) => m.includes('"size"') && m.includes('ElementSize'))).to.be.true;
  });

  it('does not warn about a property that resolves to a working control', async () => {
    stubPlaygroundFetch(sandbox);
    await init(el);
    const messages = warnStub.getCalls().map((c) => c.args.join(' '));
    expect(messages.some((m) => m.includes('"isDisabled"'))).to.be.false;
  });

  it('updates the code disclosure when a control value changes', async () => {
    stubPlaygroundFetch(sandbox);
    await init(el);
    const picker = el.querySelector('.playground-control hub-picker');
    const pre = el.querySelector('pre');
    const before = pre.textContent;
    picker.dispatchEvent(new CustomEvent('change', { detail: { value: 'yes' } }));
    expect(pre.textContent).to.not.equal(before);
    expect(pre.textContent.includes(' disabled')).to.be.true;
  });

  it('sends the current prop values into the iframe once it loads', async () => {
    stubPlaygroundFetch(sandbox);
    const postMessageSpy = sandbox.stub();
    sandbox.stub(HTMLIFrameElement.prototype, 'contentWindow').get(() => ({ postMessage: postMessageSpy }));
    await init(el);
    const iframe = el.querySelector('iframe');
    iframe.dispatchEvent(new Event('load'));
    expect(postMessageSpy.calledWith(
      sinon.match({
        type: 'prop-update', property: 'isDisabled', attribute: 'disabled', value: false,
      }),
      '*',
    )).to.be.true;
  });

  it('posts an updated prop value to the iframe when a control changes', async () => {
    stubPlaygroundFetch(sandbox);
    const postMessageSpy = sandbox.stub();
    sandbox.stub(HTMLIFrameElement.prototype, 'contentWindow').get(() => ({ postMessage: postMessageSpy }));
    await init(el);
    const picker = el.querySelector('.playground-control hub-picker');
    picker.dispatchEvent(new CustomEvent('change', { detail: { value: 'yes' } }));
    expect(postMessageSpy.calledWith(
      sinon.match({
        type: 'prop-update', property: 'isDisabled', attribute: 'disabled', value: true,
      }),
      '*',
    )).to.be.true;
  });

  it('renders a copy-code button inside the disclosure', async () => {
    stubPlaygroundFetch(sandbox);
    await init(el);
    const button = el.querySelector('.playground-disclosure .playground-copy');
    expect(button).to.exist;
    expect(button.textContent).to.equal('Copy code');
  });

  it('copies the current code snippet to the clipboard when the copy button is clicked', async () => {
    stubPlaygroundFetch(sandbox);
    const writeText = sandbox.stub().resolves();
    sandbox.stub(navigator, 'clipboard').value({ writeText });
    await init(el);
    const pre = el.querySelector('pre');
    el.querySelector('.playground-copy').click();
    expect(writeText.calledOnceWithExactly(pre.textContent)).to.be.true;
  });
});
