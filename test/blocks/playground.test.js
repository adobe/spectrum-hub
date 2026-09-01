import { expect } from '@esm-bundle/chai';
import sinon from 'sinon';
import { resolveRspComponentName } from '../../deps/rsp/playground/pascal-case.js';
import { NONE_OPTION } from '../../deps/shared/playground/none-option.js';
import init, {
  parseBlockMetadata,
  parseDefault,
  buildSwcSnippet,
  buildRspSnippet,
  debounce,
  resolveComponentMeta,
} from '../../blocks/playground/playground.js';
import { clearFetchCache } from '../../blocks/playground/playground-data.js';
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

// --- debounce -----------------------------------------------------------

describe('debounce', () => {
  let clock;

  beforeEach(() => {
    clock = sinon.useFakeTimers();
  });

  afterEach(() => {
    clock.restore();
  });

  it('does not call fn before the delay has passed', () => {
    const fn = sinon.stub();
    debounce(fn, 200)();
    clock.tick(199);
    expect(fn.called).to.be.false;
  });

  it('calls fn once the delay has passed', () => {
    const fn = sinon.stub();
    debounce(fn, 200)();
    clock.tick(200);
    expect(fn.calledOnce).to.be.true;
  });

  it('collapses a burst of calls into a single trailing call', () => {
    const fn = sinon.stub();
    const debounced = debounce(fn, 200);
    debounced();
    clock.tick(100);
    debounced();
    clock.tick(100);
    debounced();
    clock.tick(200);
    expect(fn.calledOnce).to.be.true;
  });

  it('calls fn with the arguments from the most recent call', () => {
    const fn = sinon.stub();
    const debounced = debounce(fn, 200);
    debounced('first');
    debounced('second');
    clock.tick(200);
    expect(fn.calledOnceWith('second')).to.be.true;
  });

  it('allows a new call after the delay has already elapsed', () => {
    const fn = sinon.stub();
    const debounced = debounce(fn, 200);
    debounced();
    clock.tick(200);
    debounced();
    clock.tick(200);
    expect(fn.calledTwice).to.be.true;
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

// --- buildSwcSnippet — "label" property routing -----------------------------
//
// "text" and "children" always push to flat text content (the tests above
// already cover this and are unchanged). "label" is different: it routes to
// a real attribute or a `slot="label"` element when the component has one
// (found via currentProps.label.attribute, already resolved by
// resolveControl), and only falls back to flat text content — identical to
// "text"/"children" — when neither exists.
describe('buildSwcSnippet — "label" property routing', () => {
  it('applies "label" as a real attribute when currentProps.label.attribute is set (e.g. swc-progress-circle)', () => {
    const props = { label: { attribute: 'label', value: 'Loading' } };
    const snippet = buildSwcSnippet('swc-progress-circle', props);
    expect(snippet).to.equal('<swc-progress-circle\n  label="Loading">\n  Label\n</swc-progress-circle>');
  });

  it('does not duplicate a real "label" attribute into the element\'s text content', () => {
    const props = { label: { attribute: 'label', value: 'Loading' } };
    const snippet = buildSwcSnippet('swc-progress-circle', props);
    expect(snippet.includes('>\n  Loading\n<')).to.be.false;
  });

  it('syncs a fragment\'s [slot="label"] element from currentProps.label when there is no real attribute (e.g. swc-meter)', () => {
    const meterMarkup = '<swc-meter value="60"><span slot="label">Storage used</span></swc-meter>';
    const props = {
      label: { attribute: null, value: 'Disk space' },
      value: { attribute: 'value', value: '60' },
    };
    const snippet = buildSwcSnippet('swc-meter', props, meterMarkup);
    // The slot span has its own attribute, so serializeElement always
    // multi-lines it (see the tabs/tab-panel composite tests above).
    expect(snippet.includes('<span\n    slot="label">\n    Disk space\n  </span>')).to.be.true;
    expect(snippet.includes('Storage used')).to.be.false;
  });

  it('falls back to flat text content for "label" when neither a real attribute nor a label slot exists', () => {
    const props = { label: { attribute: null, value: 'Click me' } };
    const snippet = buildSwcSnippet('swc-button', props);
    expect(snippet).to.equal('<swc-button>Click me</swc-button>');
  });
});

// --- buildSwcSnippet — composite components ---------------------------------

describe('buildSwcSnippet — composite components', () => {
  // Mirrors deps/swc/playground/snippets/tabs.html — the same fragment the
  // preview iframe fetches to render the live swc-tabs preview.
  const tabsMarkup = `
    <swc-tabs selected="overview">
      <swc-tab tab-id="overview">Overview</swc-tab>
      <swc-tab tab-id="details">Details</swc-tab>
      <swc-tab-panel tab-id="overview" selected>Overview panel content.</swc-tab-panel>
      <swc-tab-panel tab-id="details">Details panel content.</swc-tab-panel>
    </swc-tabs>
  `;

  it('embeds the static markup fragment\'s subcomponents instead of a flat label', () => {
    const props = { selected: { attribute: 'selected', value: 'overview' } };
    const snippet = buildSwcSnippet('swc-tabs', props, tabsMarkup);
    expect(snippet).to.equal([
      '<swc-tabs',
      '  selected="overview">',
      '  <swc-tab',
      '    tab-id="overview">',
      '    Overview',
      '  </swc-tab>',
      '  <swc-tab',
      '    tab-id="details">',
      '    Details',
      '  </swc-tab>',
      '  <swc-tab-panel',
      '    tab-id="overview"',
      '    selected>',
      '    Overview panel content.',
      '  </swc-tab-panel>',
      '  <swc-tab-panel',
      '    tab-id="details">',
      '    Details panel content.',
      '  </swc-tab-panel>',
      '</swc-tabs>',
    ].join('\n'));
  });

  it('still drives the root element\'s own attributes from currentProps, not the markup\'s defaults', () => {
    const props = { selected: { attribute: 'selected', value: 'details' } };
    const snippet = buildSwcSnippet('swc-tabs', props, tabsMarkup);
    expect(snippet.startsWith('<swc-tabs\n  selected="details">')).to.be.true;
  });

  it('falls back to the flat text/label behavior when the fragment has no element children', () => {
    const props = { text: { attribute: null, value: 'Click me' } };
    const snippet = buildSwcSnippet('swc-button', props, '<swc-button>Button</swc-button>');
    expect(snippet).to.equal('<swc-button>Click me</swc-button>');
  });

  it('falls back to the flat text/label behavior when no markup fragment is given at all', () => {
    const props = { text: { attribute: null, value: 'Click me' } };
    expect(buildSwcSnippet('swc-button', props)).to.equal('<swc-button>Click me</swc-button>');
  });

  // Found via a live browser reproduction: the fragment's own root attributes
  // (e.g. a required accessible-label) were never read at all, only its
  // children — so a required attribute authored on the fragment silently
  // never made it into the snippet, even though there's no authored control
  // for it (nothing in currentProps to carry it).
  it('carries a fragment-authored root attribute through when no control overrides it', () => {
    const markupWithLabel = `
      <swc-tabs accessible-label="Example tabs" selected="overview">
        <swc-tab tab-id="overview">Overview</swc-tab>
        <swc-tab-panel tab-id="overview" selected>Overview panel content.</swc-tab-panel>
      </swc-tabs>
    `;
    const props = { selected: { attribute: 'selected', value: 'overview' } };
    const snippet = buildSwcSnippet('swc-tabs', props, markupWithLabel);
    expect(snippet.includes('accessible-label="Example tabs"')).to.be.true;
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

// --- buildRspSnippet — "label" property routing -----------------------------
//
// "children" (and "text") always push to flat children content (the tests
// above already cover this and are unchanged). "label" is different: when
// the caller passes hasRealLabelProp: true (resolved via apply-rsp-prop.js's
// hasLabelProp, from the component's own RSP data — e.g. Meter, AvatarGroup),
// it routes to a real "label" prop instead, and only falls back to flat
// children content — identical to before this existed — when
// hasRealLabelProp is false or omitted.
describe('buildRspSnippet — "label" property routing', () => {
  it('sets a real "label" prop instead of children when hasRealLabelProp is true (e.g. Meter)', () => {
    const props = { label: { value: 'Storage used' }, value: { value: '60' } };
    const snippet = buildRspSnippet('Meter', props, undefined, true);
    expect(snippet).to.equal('<Meter\n  label="Storage used"\n  value="60">\n  Label\n</Meter>');
  });

  it('falls back to children for "label" when hasRealLabelProp is false', () => {
    const props = { label: { value: 'Click me' } };
    const snippet = buildRspSnippet('ActionButton', props, undefined, false);
    expect(snippet).to.equal('<ActionButton>Click me</ActionButton>');
  });

  it('falls back to children for "label" when hasRealLabelProp is omitted entirely (backward-compatible default)', () => {
    const props = { label: { value: 'Click me' } };
    const snippet = buildRspSnippet('ActionButton', props);
    expect(snippet).to.equal('<ActionButton>Click me</ActionButton>');
  });

  it('does not affect "children" routing even when hasRealLabelProp is true', () => {
    const props = { children: { value: 'Action' } };
    const snippet = buildRspSnippet('ActionButton', props, undefined, true);
    expect(snippet).to.equal('<ActionButton>Action</ActionButton>');
  });
});

// --- buildRspSnippet — composite components ---------------------------------

describe('buildRspSnippet — composite components', () => {
  // Mirrors deps/rsp/playground/snippets/tabs.jsx — a dev-authored JSX
  // fragment (RSP has no live-preview markup file to source this from, unlike
  // SWC's deps/swc/playground/snippets fragments, since the RSP preview renders via
  // React.createElement rather than an HTML string).
  const tabsMarkup = `
    <Tabs>
      <TabList>
        <Tab id="overview">Overview</Tab>
        <Tab id="details">Details</Tab>
      </TabList>
      <TabPanel id="overview">Overview panel content.</TabPanel>
      <TabPanel id="details">Details panel content.</TabPanel>
    </Tabs>
  `;

  it('embeds the JSX fragment\'s subcomponents, preserving their PascalCase tag names', () => {
    const props = { density: { value: 'compact' } };
    const snippet = buildRspSnippet('Tabs', props, tabsMarkup);
    expect(snippet).to.equal([
      '<Tabs',
      '  density="compact">',
      '  <TabList>',
      '    <Tab',
      '      id="overview">',
      '      Overview',
      '    </Tab>',
      '    <Tab',
      '      id="details">',
      '      Details',
      '    </Tab>',
      '  </TabList>',
      '  <TabPanel',
      '    id="overview">',
      '    Overview panel content.',
      '  </TabPanel>',
      '  <TabPanel',
      '    id="details">',
      '    Details panel content.',
      '  </TabPanel>',
      '</Tabs>',
    ].join('\n'));
  });

  it('falls back to the flat children/label behavior when no JSX fragment is given', () => {
    const props = { children: { value: 'Action' } };
    expect(buildRspSnippet('ActionButton', props)).to.equal('<ActionButton>Action</ActionButton>');
  });

  // Found via a live browser reproduction: RSP.Tabs throws
  // "An aria-label or aria-labelledby prop is required on Tabs for
  // accessibility" — a real runtime requirement with no authored control to
  // satisfy it. The fragment's own root attributes were never read at all
  // (only its children), so this was silently missing from both the live
  // preview and the copy-pasteable snippet.
  it('carries a fragment-authored root attribute through when no control overrides it', () => {
    const markupWithAriaLabel = `
      <Tabs aria-label="Example tabs">
        <TabList>
          <Tab id="overview">Overview</Tab>
        </TabList>
        <TabPanel id="overview">Overview panel content.</TabPanel>
      </Tabs>
    `;
    const snippet = buildRspSnippet('Tabs', { density: { value: 'compact' } }, markupWithAriaLabel);
    expect(snippet.includes('aria-label="Example tabs"')).to.be.true;
  });
});

// --- buildRspSnippet — self-closing / no-children components ----------------

// Mirrors deps/rsp/playground/snippets/divider.jsx — Divider has no children/text
// prop at all, so its fragment is authored self-closing with no text of its own.
describe('buildRspSnippet — self-closing components', () => {
  it('renders self-closing when the fragment has no text and no matching prop', () => {
    expect(buildRspSnippet('Divider', {}, '<Divider />')).to.equal('<Divider />');
  });

  it('renders self-closing with attributes on their own lines', () => {
    const snippet = buildRspSnippet('Divider', { size: { value: 'L' } }, '<Divider />');
    expect(snippet).to.equal('<Divider\n  size="L"\n/>');
  });

  // Was asserting the opposite. The fragment's own text is the authored content and
  // the live preview always used it (initRsp sets currentProps.children from it), so
  // replacing it with the placeholder here made the copyable code disagree with what
  // was on screen — "Label" in the disclosure, "New" in the preview, on 13 routes.
  it('keeps the fragment\'s own text rather than the placeholder', () => {
    expect(buildRspSnippet('Button', {}, '<Button>Button</Button>')).to.equal('<Button>Button</Button>');
  });

  it('still falls back to Label when no fragment is given at all', () => {
    expect(buildRspSnippet('ActionButton', {})).to.equal('<ActionButton>Label</ActionButton>');
  });
});

// --- buildRspSnippet — overlay trigger wrapping ------------------------------

// Mirrors deps/rsp/playground/snippets/alert-dialog.jsx (see overlay-triggers.js).
describe('buildRspSnippet — overlay trigger wrapping', () => {
  const alertDialogMarkup = '<AlertDialog title="Delete file?" primaryActionLabel="Delete">This action cannot be undone.</AlertDialog>';

  it('wraps a DialogTrigger-family route in DialogTrigger + a labeled Button', () => {
    // The fragment's own body text is kept — alert-dialog authors no text control, so
    // this is the only content source and the preview renders it either way.
    const snippet = buildRspSnippet('AlertDialog', {}, alertDialogMarkup, false, 'alert-dialog');
    expect(snippet).to.equal([
      '<DialogTrigger>',
      '  <Button>Open dialog</Button>',
      '  <AlertDialog',
      '    title="Delete file?"',
      '    primaryActionLabel="Delete">',
      '    This action cannot be undone.',
      '  </AlertDialog>',
      '</DialogTrigger>',
    ].join('\n'));
  });

  it('wraps the tooltip route in TooltipTrigger, not DialogTrigger', () => {
    const snippet = buildRspSnippet('Tooltip', {}, '<Tooltip>Helpful tip text</Tooltip>', false, 'tooltip');
    expect(snippet.startsWith('<TooltipTrigger>')).to.be.true;
    expect(snippet.includes('<Button>Hover me</Button>')).to.be.true;
  });

  it('does not wrap a route with no OVERLAY_TRIGGERS entry', () => {
    const snippet = buildRspSnippet('ActionButton', { children: { value: 'Action' } }, undefined, false, 'action-button');
    expect(snippet).to.equal('<ActionButton>Action</ActionButton>');
  });

  it('does not wrap when routeName is omitted (back-compat with existing callers)', () => {
    const snippet = buildRspSnippet('AlertDialog', {}, alertDialogMarkup);
    expect(snippet.startsWith('<DialogTrigger>')).to.be.false;
    expect(snippet.startsWith('<AlertDialog')).to.be.true;
  });

  it('shows the toast route\'s Button as a sibling line, not a wrapper', () => {
    const snippet = buildRspSnippet('ToastContainer', {}, '<ToastContainer />', false, 'toast');
    // Same multi-attribute formatting as any other element serializeElement prints (e.g.
    // the DialogTrigger case's AlertDialog above) — onPress is a JSX expression (unquoted),
    // variant is a normal string attribute.
    expect(snippet).to.equal([
      '<Button',
      '  onPress={() => ToastQueue.info(\'Toasting…\')}',
      '  variant="accent">',
      '  Show Toast',
      '</Button>',
      '<ToastContainer />',
    ].join('\n'));
  });
});

// Guards against a typo/malformed-markup regression in the real committed
// fragment files, which have no other build-time validation. Real (unmocked)
// fetches — window.fetch is only stubbed inside the init() describe block below.
describe('composite snippet fragments — real committed files', () => {
  it('parses the real snippet tabs fragment and embeds swc-tab/swc-tab-panel', async () => {
    const markup = await (await fetch('/deps/swc/playground/snippets/tabs.html')).text();
    const snippet = buildSwcSnippet('swc-tabs', { selected: { attribute: 'selected', value: 'overview' } }, markup);
    expect(snippet.includes('<swc-tab')).to.be.true;
    expect(snippet.includes('<swc-tab-panel')).to.be.true;
  });

  it('parses the real snippet accordion fragment and embeds swc-accordion-item', async () => {
    const markup = await (await fetch('/deps/swc/playground/snippets/accordion.html')).text();
    const snippet = buildSwcSnippet('swc-accordion', {}, markup);
    expect(snippet.includes('<swc-accordion-item')).to.be.true;
  });

  it('parses the real RSP tabs JSX snippet and embeds TabList/Tab/TabPanel', async () => {
    const markup = await (await fetch('/deps/rsp/playground/snippets/tabs.jsx')).text();
    const snippet = buildRspSnippet('Tabs', { density: { value: 'compact' } }, markup);
    expect(snippet.includes('<TabList>')).to.be.true;
    expect(snippet.includes('<Tab\n')).to.be.true;
    expect(snippet.includes('<TabPanel')).to.be.true;
  });

  it('parses the real RSP accordion JSX snippet and embeds AccordionItemTitle/Panel', async () => {
    const markup = await (await fetch('/deps/rsp/playground/snippets/accordion.jsx')).text();
    const snippet = buildRspSnippet('Accordion', {}, markup);
    expect(snippet.includes('<AccordionItemTitle>')).to.be.true;
    expect(snippet.includes('<AccordionItemPanel>')).to.be.true;
  });

  it('parses the real RSP button-group JSX snippet and embeds Button', async () => {
    const markup = await (await fetch('/deps/rsp/playground/snippets/button-group.jsx')).text();
    const snippet = buildRspSnippet('ButtonGroup', {}, markup);
    expect(snippet.includes('<Button\n')).to.be.true;
  });

  it('renders the real RSP divider JSX snippet self-closing', async () => {
    const markup = await (await fetch('/deps/rsp/playground/snippets/divider.jsx')).text();
    expect(buildRspSnippet('Divider', {}, markup)).to.equal('<Divider />');
  });

  // Regression guard against a typo in overlay-triggers.js or a route's .jsx file.
  it('wraps the real RSP alert-dialog JSX snippet in a DialogTrigger', async () => {
    const markup = await (await fetch('/deps/rsp/playground/snippets/alert-dialog.jsx')).text();
    const snippet = buildRspSnippet('AlertDialog', {}, markup, false, 'alert-dialog');
    expect(snippet.startsWith('<DialogTrigger>')).to.be.true;
    expect(snippet.includes('<Button>Open dialog</Button>')).to.be.true;
    expect(snippet.includes('<AlertDialog')).to.be.true;
  });

  it('wraps the real RSP tooltip JSX snippet in a TooltipTrigger', async () => {
    const markup = await (await fetch('/deps/rsp/playground/snippets/tooltip.jsx')).text();
    const snippet = buildRspSnippet('Tooltip', {}, markup, false, 'tooltip');
    expect(snippet.startsWith('<TooltipTrigger>')).to.be.true;
    expect(snippet.includes('<Tooltip>')).to.be.true;
  });

  it('gives the real RSP toast JSX snippet a sibling trigger Button', async () => {
    const markup = await (await fetch('/deps/rsp/playground/snippets/toast.jsx')).text();
    const snippet = buildRspSnippet('ToastContainer', {}, markup, false, 'toast');
    expect(snippet.includes('onPress={() => ToastQueue.info(\'Toasting…\')}')).to.be.true;
    expect(snippet.includes('<ToastContainer />')).to.be.true;
  });
});

// --- init() (default export) -------------------------------------------------

// The code disclosure rebuild is debounced (see DISCLOSURE_DEBOUNCE_MS in
// playground.js) — tests that assert on `pre.textContent` after a control
// change need to wait past that window first.
function waitPastDisclosureDebounce() {
  return new Promise((resolve) => { setTimeout(resolve, 250); });
}

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
      { Property: 'variant', control: 'picker' },
      { Property: 'size', control: 'picker' },
      { Property: 'isDisabled', control: 'picker' },
    ];
  // Rows carry `kind`/`values` because that is what the extractors write and what
  // resolveControl reads — a fixture with only `type` would exercise a path that no
  // longer exists (deps/shared/prop-contract.js).
  const rspBody = overrides.rsp
    ?? {
      props: [{
        property: 'variant', type: "'primary' | 'secondary'", kind: 'enum', values: ['primary', 'secondary'], default: "'primary'",
      }],
    };
  const swcBody = overrides.swc
    ?? [
      // Deliberately a row with no fixed option set — kind 'unknown', no values, the
      // shape an opaque API type produces (RSP's StylesProp, an interface, a generic).
      // Several tests below assert that such a row draws no control and warns.
      {
        property: 'size', attribute: 'size', type: 'ElementSize', kind: 'unknown', values: [],
      },
      {
        property: 'disabled', attribute: 'disabled', type: 'boolean', kind: 'boolean', values: [],
      },
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
    // Every test below hits the same URLs (same codeBase + mostly the same
    // component) with its own per-test mocked responses — without this, a
    // test would get a previous test's cached response instead of its own.
    clearFetchCache();
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

  it('builds the iframe src pointing at the SWC shell with query params for swc', async () => {
    stubPlaygroundFetch(sandbox);
    await init(el);
    const iframe = el.querySelector('iframe');
    expect(iframe.src).to.include('/deps/swc/playground/index.html');
    expect(iframe.src).to.include('component=button');
    expect(iframe.src).to.include('implementation=swc');
  });

  it('builds the iframe src pointing at the RSP shell with query params for rsp', async () => {
    stubPlaygroundFetch(sandbox);
    const rspEl = makeMetaEl({ implementation: 'rsp', component: 'button' });
    document.body.append(rspEl);
    await init(rspEl);
    const iframe = rspEl.querySelector('iframe');
    expect(iframe.src).to.include('/deps/rsp/playground/index.html');
    expect(iframe.src).to.include('component=button');
    expect(iframe.src).to.include('implementation=rsp');
  });

  it('falls back to the generic shell for an implementation that is neither rsp nor swc', async () => {
    stubPlaygroundFetch(sandbox);
    const iosEl = makeMetaEl({ implementation: 'ios', component: 'button' });
    document.body.append(iosEl);
    await init(iosEl);
    const iframe = iosEl.querySelector('iframe');
    expect(iframe.src).to.include('/blocks/playground/index.html');
    expect(iframe.src).to.include('component=button');
    expect(iframe.src).to.include('implementation=ios');
  });

  // IMPL_COMPONENT_NAMES's `export` field (deps/impl-component-names.js) resolves a
  // component whose real RSP export differs from its canonical Spectrum Hub name — e.g.
  // "action-group" ships as
  // RSP's ActionButtonGroup, not a naive pascalCase("action-group") -> "ActionGroup".
  // Regression: before this resolution existed, such components 404'd on their prop
  // data and snippet markup, and threw "No RSP export named ..." in the live preview.
  it('resolves the real RSP export name for a component whose canonical name differs', async () => {
    const fetchStub = stubPlaygroundFetch(sandbox);
    const rspEl = makeMetaEl({ implementation: 'rsp', component: 'action-group' });
    document.body.append(rspEl);
    await init(rspEl);

    expect(rspEl.querySelector('pre').textContent).to.equal('<ActionButtonGroup>Label</ActionButtonGroup>');

    const urls = fetchStub.getCalls().map((call) => String(call.args[0]));
    expect(urls.some((url) => url.includes('/snippets/action-button-group.jsx'))).to.be.false;
    expect(urls.some((url) => url.includes('/snippets/action-group.jsx'))).to.be.true;
  });

  // @react-spectrum/s2 publishes no runtime export for these, so the shell's only
  // possible outcome is a failed import — see deps/rsp/playground/unreachable-exports.js.
  describe('a component with no reachable RSP export', () => {
    it('renders an explanatory note instead of the preview iframe', async () => {
      stubPlaygroundFetch(sandbox);
      const rspEl = makeMetaEl({ implementation: 'rsp', component: 'coach-mark' });
      document.body.append(rspEl);
      await init(rspEl);

      expect(rspEl.querySelector('iframe')).to.equal(null);
      const note = rspEl.querySelector('.playground-preview-note');
      expect(note).to.not.equal(null);
      expect(note.textContent).to.include('CoachMark');
      expect(note.parentElement.classList.contains('playground-preview')).to.be.true;
    });

    it('still renders the code disclosure', async () => {
      stubPlaygroundFetch(sandbox);
      const rspEl = makeMetaEl({ implementation: 'rsp', component: 'coach-mark' });
      document.body.append(rspEl);
      await init(rspEl);
      expect(rspEl.querySelector('pre')).to.not.equal(null);
    });

    // The same slug under swc has a working preview of its own; only rsp is affected.
    it('keeps the preview for the same slug on a non-rsp implementation', async () => {
      stubPlaygroundFetch(sandbox);
      const swcEl = makeMetaEl({ implementation: 'swc', component: 'coach-mark' });
      document.body.append(swcEl);
      await init(swcEl);
      expect(swcEl.querySelector('iframe')).to.not.equal(null);
      expect(swcEl.querySelector('.playground-preview-note')).to.equal(null);
    });

    // CloseButton *is* exported; ClearButton is not. One letter apart, opposite outcomes.
    it('keeps the preview for close-button, whose export does exist', async () => {
      stubPlaygroundFetch(sandbox);
      const rspEl = makeMetaEl({ implementation: 'rsp', component: 'close-button' });
      document.body.append(rspEl);
      await init(rspEl);
      expect(rspEl.querySelector('iframe')).to.not.equal(null);
      expect(rspEl.querySelector('.playground-preview-note')).to.equal(null);
    });
  });

  // Regression: fetchPlaygroundInputs used to fetch deps/swc/data/swc-<component>.json
  // unconditionally, even on rsp pages — most RSP components have no SWC counterpart at
  // all, so this was a guaranteed, noisy 404 on every RSP playground page.
  it('does not fetch SWC prop data on an rsp-implementation page', async () => {
    const fetchStub = stubPlaygroundFetch(sandbox);
    const rspEl = makeMetaEl({ implementation: 'rsp', component: 'button' });
    document.body.append(rspEl);
    await init(rspEl);
    const urls = fetchStub.getCalls().map((call) => String(call.args[0]));
    expect(urls.some((url) => url.includes('/deps/swc/data/'))).to.be.false;
  });

  it('does fetch SWC prop data on an swc-implementation page', async () => {
    const fetchStub = stubPlaygroundFetch(sandbox);
    await init(el);
    const urls = fetchStub.getCalls().map((call) => String(call.args[0]));
    expect(urls.some((url) => url.includes('/deps/swc/data/'))).to.be.true;
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
      controls: [{ Property: 'disabled', control: 'picker' }],
      rsp: {
        props: [{
          property: 'isDisabled', type: 'boolean', kind: 'boolean', values: [], default: 'true',
        }],
      },
      swc: [],
    });
    const rspEl = makeMetaEl({ implementation: 'rsp', component: 'button' });
    document.body.append(rspEl);
    await init(rspEl);
    const picker = rspEl.querySelector('.playground-control se-select');
    expect(picker).to.exist;
    expect(picker.value).to.equal('yes');
  });

  it('renders a control only for the property that resolves to picker options', async () => {
    stubPlaygroundFetch(sandbox);
    await init(el);
    const labels = [...el.querySelectorAll('.playground-control')]
      .map((wrapper) => wrapper.firstElementChild.label);
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
    const picker = el.querySelector('.playground-control se-select');
    await picker.updateComplete;
    const pre = el.querySelector('pre');
    const before = pre.textContent;
    const native = picker.shadowRoot.querySelector('select');
    native.value = 'yes';
    native.dispatchEvent(new Event('change', { bubbles: true }));
    await waitPastDisclosureDebounce();
    expect(pre.textContent).to.not.equal(before);
    expect(pre.textContent.includes(' disabled')).to.be.true;
  });

  // The iframe's own document does an async fetch (per-component markup) before
  // it registers its prop-update listener, so the outer iframe's `load` event
  // fires well before that listener exists. Sending on `load` alone silently
  // drops the very first batch of prop values (including e.g. a textfield's
  // default label) — the iframe must explicitly signal readiness instead.
  it('does not send prop updates to the iframe on load alone', async () => {
    stubPlaygroundFetch(sandbox);
    await init(el);
    const iframe = el.querySelector('iframe');
    const postMessageSpy = sandbox.stub(iframe.contentWindow, 'postMessage');
    iframe.dispatchEvent(new Event('load'));
    expect(postMessageSpy.getCalls().some((c) => c.args[0]?.type === 'prop-update')).to.be.false;
  });

  it('sends the current prop values once the iframe signals it is ready', async () => {
    stubPlaygroundFetch(sandbox);
    await init(el);
    const iframe = el.querySelector('iframe');
    const postMessageSpy = sandbox.stub(iframe.contentWindow, 'postMessage');
    iframe.dispatchEvent(new Event('load'));
    window.dispatchEvent(new MessageEvent('message', {
      data: { type: 'preview-ready' },
      source: iframe.contentWindow,
    }));
    expect(postMessageSpy.calledWith(
      sinon.match({
        type: 'prop-update', property: 'isDisabled', attribute: 'disabled', value: false,
      }),
      '*',
    )).to.be.true;
  });

  it('ignores a preview-ready message from an unrelated frame', async () => {
    stubPlaygroundFetch(sandbox);
    await init(el);
    const iframe = el.querySelector('iframe');
    const postMessageSpy = sandbox.stub(iframe.contentWindow, 'postMessage');
    const otherFrame = document.createElement('iframe');
    document.body.append(otherFrame);
    window.dispatchEvent(new MessageEvent('message', {
      data: { type: 'preview-ready' },
      source: otherFrame.contentWindow,
    }));
    otherFrame.remove();
    expect(postMessageSpy.getCalls().some((c) => c.args[0]?.type === 'prop-update')).to.be.false;
  });

  // The shell used to re-fetch snippets/<component>.html itself; it now asks the
  // block for the copy already fetched by fetchPlaygroundInputs, over the same
  // postMessage channel as preview-ready, so the file is only ever fetched once.
  it('answers the iframe\'s markup-request with the already-fetched snippet markup', async () => {
    sandbox.stub(window, 'fetch').callsFake(async (input) => {
      const url = String(input);
      if (url.includes('sheet=components')) {
        return jsonResponse({ data: [{ Component: 'Button', Properties: 'isDisabled' }] });
      }
      if (url.includes('sheet=controls')) {
        return jsonResponse({ data: [{ Property: 'isDisabled', control: 'picker' }] });
      }
      if (url.includes('/deps/rsp/data/')) { return jsonResponse([]); }
      if (url.includes('/deps/swc/data/')) {
        return jsonResponse([{
          property: 'disabled', attribute: 'disabled', type: 'boolean', kind: 'boolean', values: [],
        }]);
      }
      if (url.includes('/deps/swc/playground/snippets/button.html')) {
        return new Response('<swc-button>Label</swc-button>', { status: 200 });
      }
      return new Response('', { status: 404 });
    });
    await init(el);
    const iframe = el.querySelector('iframe');
    const postMessageSpy = sandbox.stub(iframe.contentWindow, 'postMessage');
    window.dispatchEvent(new MessageEvent('message', {
      data: { type: 'markup-request' },
      source: iframe.contentWindow,
    }));
    expect(postMessageSpy.calledWith(
      { type: 'markup-response', markup: '<swc-button>Label</swc-button>' },
      '*',
    )).to.be.true;
  });

  it('ignores a markup-request from an unrelated frame', async () => {
    stubPlaygroundFetch(sandbox);
    await init(el);
    const iframe = el.querySelector('iframe');
    const postMessageSpy = sandbox.stub(iframe.contentWindow, 'postMessage');
    const otherFrame = document.createElement('iframe');
    document.body.append(otherFrame);
    window.dispatchEvent(new MessageEvent('message', {
      data: { type: 'markup-request' },
      source: otherFrame.contentWindow,
    }));
    otherFrame.remove();
    expect(postMessageSpy.getCalls().some((c) => c.args[0]?.type === 'markup-response')).to.be.false;
  });

  it('posts an updated prop value to the iframe when a control changes', async () => {
    stubPlaygroundFetch(sandbox);
    const postMessageSpy = sandbox.stub();
    sandbox.stub(HTMLIFrameElement.prototype, 'contentWindow').get(() => ({ postMessage: postMessageSpy }));
    await init(el);
    const picker = el.querySelector('.playground-control se-select');
    await picker.updateComplete;
    const native = picker.shadowRoot.querySelector('select');
    native.value = 'yes';
    native.dispatchEvent(new Event('change', { bubbles: true }));
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

  it('announces a successful copy via a status live region', async () => {
    stubPlaygroundFetch(sandbox);
    sandbox.stub(navigator, 'clipboard').value({ writeText: sandbox.stub().resolves() });
    await init(el);
    el.querySelector('.playground-copy').click();
    await Promise.resolve();
    const status = el.querySelector('.playground-disclosure [role="status"]');
    expect(status).to.exist;
    expect(status.textContent).to.equal('Copied');
  });

  it('announces a failed copy via the status live region', async () => {
    stubPlaygroundFetch(sandbox);
    sandbox.stub(navigator, 'clipboard').value({ writeText: sandbox.stub().rejects() });
    await init(el);
    el.querySelector('.playground-copy').click();
    await Promise.resolve();
    const status = el.querySelector('.playground-disclosure [role="status"]');
    expect(status.textContent).to.equal('Copy failed');
  });

  it('renders se-input type="text" for a textfield control', async () => {
    stubPlaygroundFetch(sandbox, {
      components: [{ Component: 'Button', Properties: 'label' }],
      controls: [{ Property: 'label', control: 'textfield' }],
      swc: [{
        property: 'label', attribute: 'label', type: 'string', kind: 'text', values: [], default: "'Click me'",
      }],
      rsp: { props: [] },
    });
    await init(el);
    const input = el.querySelector('.playground-control se-input');
    expect(input).to.exist;
    expect(input.type).to.equal('text');
    expect(input.value).to.equal('Click me');
  });

  it('does not warn about an unresolved options list for a textfield control', async () => {
    stubPlaygroundFetch(sandbox, {
      components: [{ Component: 'Button', Properties: 'label' }],
      controls: [{ Property: 'label', control: 'textfield' }],
      swc: [{
        property: 'label', attribute: 'label', type: 'string', kind: 'text', values: [],
      }],
      rsp: { props: [] },
    });
    await init(el);
    const messages = warnStub.getCalls().map((c) => c.args.join(' '));
    expect(messages.some((m) => m.includes('"label"'))).to.be.false;
  });

  it('falls back to "Label" for a textfield control with no authored default', async () => {
    stubPlaygroundFetch(sandbox, {
      components: [{ Component: 'Button', Properties: 'label' }],
      controls: [{ Property: 'label', control: 'textfield' }],
      swc: [{
        property: 'label', attribute: 'label', type: 'string', kind: 'text', values: [],
      }],
      rsp: { props: [] },
    });
    await init(el);
    const input = el.querySelector('.playground-control se-input');
    expect(input.value).to.equal('Label');
  });

  it('updates the code disclosure live as the user types, without needing blur', async () => {
    stubPlaygroundFetch(sandbox, {
      components: [{ Component: 'Button', Properties: 'label' }],
      controls: [{ Property: 'label', control: 'textfield' }],
      swc: [{
        property: 'label', attribute: 'label', type: 'string', kind: 'text', values: [], default: "'Click me'",
      }],
      rsp: { props: [] },
    });
    await init(el);
    const input = el.querySelector('.playground-control se-input');
    await input.updateComplete;
    const pre = el.querySelector('pre');
    const before = pre.textContent;
    const native = input.shadowRoot.querySelector('input');
    native.value = 'Typing...';
    // 'input' fires on every keystroke; 'change' only fires on blur/submit —
    // typing must not require the field to lose focus to see a live update.
    native.dispatchEvent(new Event('input', { bubbles: true }));
    await waitPastDisclosureDebounce();
    expect(pre.textContent).to.not.equal(before);
    expect(pre.textContent.includes('Typing...')).to.be.true;
  });

  it('renders se-input type="range" for a slider control', async () => {
    stubPlaygroundFetch(sandbox, {
      components: [{ Component: 'Button', Properties: 'weight' }],
      controls: [{ Property: 'weight', control: 'slider' }],
      swc: [{
        property: 'weight', attribute: 'weight', type: 'number', kind: 'number', values: [], default: '50',
      }],
      rsp: { props: [] },
    });
    await init(el);
    const input = el.querySelector('.playground-control se-input');
    expect(input).to.exist;
    expect(input.type).to.equal('range');
    expect(input.value).to.equal('50');
  });

  it('renders se-segmentedcontrol with a radio per option for a segmentedControl control', async () => {
    stubPlaygroundFetch(sandbox, {
      components: [{ Component: 'Button', Properties: 'variant' }],
      controls: [{ Property: 'variant', control: 'segmentedControl' }],
      rsp: {
        props: [{
          property: 'variant', type: "'primary' | 'secondary'", kind: 'enum', values: ['primary', 'secondary'], default: "'primary'",
        }],
      },
      swc: [],
    });
    const rspEl = makeMetaEl({ implementation: 'rsp', component: 'button' });
    document.body.append(rspEl);
    await init(rspEl);
    const segmented = rspEl.querySelector('.playground-control se-segmentedcontrol');
    expect(segmented).to.exist;
    await segmented.updateComplete;
    const radios = [...segmented.shadowRoot.querySelectorAll('input[type="radio"]')];
    expect(radios.map((r) => r.value)).to.deep.equal(['primary', 'secondary']);
    expect(radios.find((r) => r.checked).value).to.equal('primary');
  });

  it('updates the code disclosure when a segmentedControl radio changes', async () => {
    stubPlaygroundFetch(sandbox, {
      components: [{ Component: 'Button', Properties: 'variant' }],
      controls: [{ Property: 'variant', control: 'segmentedControl' }],
      rsp: {
        props: [{
          property: 'variant', type: "'primary' | 'secondary'", kind: 'enum', values: ['primary', 'secondary'], default: "'primary'",
        }],
      },
      swc: [],
    });
    const rspEl = makeMetaEl({ implementation: 'rsp', component: 'button' });
    document.body.append(rspEl);
    await init(rspEl);
    const segmented = rspEl.querySelector('.playground-control se-segmentedcontrol');
    await segmented.updateComplete;
    const pre = rspEl.querySelector('pre');
    const before = pre.textContent;
    const secondaryRadio = [...segmented.shadowRoot.querySelectorAll('input[type="radio"]')]
      .find((r) => r.value === 'secondary');
    secondaryRadio.checked = true;
    secondaryRadio.dispatchEvent(new Event('change', { bubbles: true }));
    await waitPastDisclosureDebounce();
    expect(pre.textContent).to.not.equal(before);
    expect(pre.textContent.includes('variant="secondary"')).to.be.true;
  });

  it('renders se-switch for a switch control, checked from the boolean default', async () => {
    stubPlaygroundFetch(sandbox, {
      components: [{ Component: 'Button', Properties: 'isDisabled' }],
      controls: [{ Property: 'isDisabled', control: 'switch' }],
      swc: [{
        property: 'disabled', attribute: 'disabled', type: 'boolean', kind: 'boolean', values: [], default: 'true',
      }],
      rsp: { props: [] },
    });
    await init(el);
    const sw = el.querySelector('.playground-control se-switch');
    expect(sw).to.exist;
    await sw.updateComplete;
    expect(sw.checked).to.be.true;
    expect(sw.textContent.trim()).to.equal('isDisabled');
  });

  it('updates the code disclosure when a switch is toggled', async () => {
    stubPlaygroundFetch(sandbox, {
      components: [{ Component: 'Button', Properties: 'isDisabled' }],
      controls: [{ Property: 'isDisabled', control: 'switch' }],
      swc: [{
        property: 'disabled', attribute: 'disabled', type: 'boolean', kind: 'boolean', values: [], default: 'false',
      }],
      rsp: { props: [] },
    });
    await init(el);
    const sw = el.querySelector('.playground-control se-switch');
    await sw.updateComplete;
    const pre = el.querySelector('pre');
    const before = pre.textContent;
    const native = sw.shadowRoot.querySelector('input');
    native.checked = true;
    native.dispatchEvent(new Event('change', { bubbles: true }));
    await waitPastDisclosureDebounce();
    expect(pre.textContent).to.not.equal(before);
    expect(pre.textContent.includes('disabled')).to.be.true;
  });

  // "icon" has no real prop for resolvePickerOptions to introspect (no "icon"
  // row in either dataset) — its options come from the controls sheet, so swc
  // and rsp are both left empty here to prove the existence check doesn't gate it.
  it('renders se-select for an icon control, with options from the controls sheet', async () => {
    stubPlaygroundFetch(sandbox, {
      components: [{ Component: 'Button', Properties: 'icon' }],
      controls: [{ Property: 'icon', control: 'icon', Options: 'search, copy, checkmarkcircle' }],
      swc: [],
      rsp: { props: [] },
    });
    await init(el);
    const select = el.querySelector('.playground-control se-select');
    expect(select).to.exist;
    await select.updateComplete;
    const native = select.shadowRoot.querySelector('select');
    const optionValues = [...native.querySelectorAll('option')].map((o) => o.value);
    expect(optionValues).to.deep.equal(['No icon', 'search', 'copy', 'checkmarkcircle']);
    expect(select.value).to.equal('No icon');
  });

  it('posts a prop-update with the icon name as the value (no attribute) when the selection changes', async () => {
    stubPlaygroundFetch(sandbox, {
      components: [{ Component: 'Button', Properties: 'icon' }],
      controls: [{ Property: 'icon', control: 'icon', Options: 'search, copy' }],
      swc: [],
      rsp: { props: [] },
    });
    const postMessageSpy = sandbox.stub();
    sandbox.stub(HTMLIFrameElement.prototype, 'contentWindow').get(() => ({ postMessage: postMessageSpy }));
    await init(el);
    const select = el.querySelector('.playground-control se-select');
    await select.updateComplete;
    const native = select.shadowRoot.querySelector('select');
    native.value = 'copy';
    native.dispatchEvent(new Event('change', { bubbles: true }));
    expect(postMessageSpy.calledWith(
      sinon.match({
        type: 'prop-update', property: 'icon', attribute: null, value: 'copy',
      }),
      '*',
    )).to.be.true;
  });

  // --- Composite components ---------------------------------------------------

  it('renders composite subcomponents in the code disclosure for a swc composite component', async () => {
    const tabsMarkup = `
      <swc-tabs selected="overview">
        <swc-tab tab-id="overview">Overview</swc-tab>
        <swc-tab tab-id="details">Details</swc-tab>
        <swc-tab-panel tab-id="overview" selected>Overview panel content.</swc-tab-panel>
        <swc-tab-panel tab-id="details">Details panel content.</swc-tab-panel>
      </swc-tabs>
    `;
    sandbox.stub(window, 'fetch').callsFake(async (input) => {
      const url = String(input);
      if (url.includes('sheet=components')) {
        return jsonResponse({ data: [{ Component: 'Tabs', Properties: 'selected' }] });
      }
      if (url.includes('sheet=controls')) {
        return jsonResponse({ data: [{ Property: 'selected', control: 'picker' }] });
      }
      if (url.includes('/deps/rsp/data/')) { return jsonResponse({ props: [] }); }
      if (url.includes('/deps/swc/data/')) {
        return jsonResponse([{
          property: 'selected', attribute: 'selected', type: 'string', kind: 'text', values: [], default: "'overview'",
        }]);
      }
      if (url.includes('/deps/swc/playground/snippets/tabs.html')) {
        return new Response(tabsMarkup, { status: 200 });
      }
      return new Response('', { status: 404 });
    });
    const tabsEl = makeMetaEl({ implementation: 'swc', component: 'tabs' });
    document.body.append(tabsEl);
    await init(tabsEl);
    const pre = tabsEl.querySelector('pre');
    expect(pre.textContent.includes('<swc-tab')).to.be.true;
    expect(pre.textContent.includes('<swc-tab-panel')).to.be.true;
    expect(pre.textContent.includes('Details panel content.')).to.be.true;
  });

  it('renders composite subcomponents in the code disclosure for an rsp composite component', async () => {
    const tabsMarkup = `
      <Tabs>
        <TabList>
          <Tab id="overview">Overview</Tab>
          <Tab id="details">Details</Tab>
        </TabList>
        <TabPanel id="overview">Overview panel content.</TabPanel>
        <TabPanel id="details">Details panel content.</TabPanel>
      </Tabs>
    `;
    sandbox.stub(window, 'fetch').callsFake(async (input) => {
      const url = String(input);
      if (url.includes('sheet=components')) {
        return jsonResponse({ data: [{ Component: 'Tabs', Properties: 'density' }] });
      }
      if (url.includes('sheet=controls')) {
        return jsonResponse({ data: [{ Property: 'density', control: 'picker' }] });
      }
      if (url.includes('/deps/rsp/data/')) {
        return jsonResponse({
          props: [{
            property: 'density', type: "'compact' | 'regular'", kind: 'enum', values: ['compact', 'regular'], default: "'regular'",
          }],
        });
      }
      if (url.includes('/deps/swc/data/')) { return jsonResponse([]); }
      if (url.includes('/deps/rsp/playground/snippets/tabs.jsx')) {
        return new Response(tabsMarkup, { status: 200 });
      }
      return new Response('', { status: 404 });
    });
    const tabsEl = makeMetaEl({ implementation: 'rsp', component: 'tabs' });
    document.body.append(tabsEl);
    await init(tabsEl);
    const pre = tabsEl.querySelector('pre');
    expect(pre.textContent.includes('<TabList>')).to.be.true;
    expect(pre.textContent.includes('<TabPanel')).to.be.true;
    expect(pre.textContent.includes('Details panel content.')).to.be.true;
  });
});

// The authored slug and the RSP export diverge for a minority of components:
// `action-group` ships as ActionButtonGroup. Without this the data fetch, the
// snippet URL and the live esm.sh import all 404 on a name that does not exist.
describe('resolveRspComponentName', () => {
  it('resolves an authored slug to its real RSP export', () => {
    expect(resolveRspComponentName('action-group')).to.equal('ActionButtonGroup');
    expect(resolveRspComponentName('table')).to.equal('TableView');
    expect(resolveRspComponentName('takeover-dialog')).to.equal('FullscreenDialog');
  });

  it('falls back to plain PascalCase when the names already agree', () => {
    expect(resolveRspComponentName('action-button')).to.equal('ActionButton');
    expect(resolveRspComponentName('button')).to.equal('Button');
  });

  it('is case- and whitespace-insensitive on the slug', () => {
    expect(resolveRspComponentName('  Action-Group ')).to.equal('ActionButtonGroup');
  });
});

// A component can legitimately have no controls — swc's link is utility CSS classes
// rather than a component API. An empty controls column stole 300px from the preview
// and left a labelled region with nothing in it.
describe('playground block — a component with no controls', () => {
  let sandbox;

  const noControls = {
    components: [{ Component: 'Link', Properties: 'variant, isQuiet' }],
    // Neither property exists in this implementation's data, so both are skipped.
    swc: [],
    rsp: { props: [] },
  };

  beforeEach(() => {
    sandbox = sinon.createSandbox();
    sandbox.stub(console, 'warn');
    document.body.innerHTML = '';
    clearFetchCache();
  });

  afterEach(() => {
    sandbox.restore();
  });

  it('omits the controls panel entirely', async () => {
    stubPlaygroundFetch(sandbox, noControls);
    const el = makeMetaEl({ implementation: 'swc', component: 'link' });
    document.body.append(el);
    await init(el);

    // Boolean, not .to.equal(null) — chai diffing a live DOM element hangs wtr.
    expect(el.querySelector('.playground-controls') === null).to.be.true;
    const layout = el.querySelector('.playground-layout');
    expect([...layout.children].map((c) => c.className)).to.deep.equal(['playground-preview']);
  });

  it('still renders the preview and the code disclosure', async () => {
    stubPlaygroundFetch(sandbox, noControls);
    const el = makeMetaEl({ implementation: 'swc', component: 'link' });
    document.body.append(el);
    await init(el);

    expect(el.querySelector('.playground-preview iframe') !== null).to.be.true;
    expect(el.querySelector('.playground-disclosure') !== null).to.be.true;
  });

  it('keeps the controls panel when at least one control renders', async () => {
    stubPlaygroundFetch(sandbox);
    const el = makeMetaEl({ implementation: 'swc', component: 'button' });
    document.body.append(el);
    await init(el);

    const panel = el.querySelector('.playground-controls');
    expect(panel !== null).to.be.true;
    expect(panel.children.length).to.be.greaterThan(0);
  });
});

// RSP declares Tooltip's controllable props on TooltipTrigger, so the route reads that
// catalog (propsOwner in overlay-triggers.js) and must apply them there too — a
// `placement` landing on <Tooltip> would render a control that does nothing.
describe('playground block — a route whose props live on its trigger', () => {
  let sandbox;

  beforeEach(() => {
    sandbox = sinon.createSandbox();
    sandbox.stub(console, 'warn');
    document.body.innerHTML = '';
    clearFetchCache();
  });

  afterEach(() => { sandbox.restore(); });

  it('serializes the props onto the trigger, not the tooltip', () => {
    const snippet = buildRspSnippet(
      'Tooltip',
      { placement: { value: 'top', attribute: 'placement' } },
      '<Tooltip>Tip text</Tooltip>',
      false,
      'tooltip',
    );
    // serializeElement breaks attributes onto their own lines.
    expect(snippet.startsWith('<TooltipTrigger\n  placement="top">')).to.be.true;
    expect(snippet.includes('<Tooltip placement')).to.be.false;
    // The route's own element is still the wrapped child.
    expect(snippet.includes('<Tooltip>')).to.be.true;
  });

  it('leaves a self-owned overlay route applying props to its own element', () => {
    const snippet = buildRspSnippet(
      'AlertDialog',
      { title: { value: 'Heads up', attribute: 'title' } },
      '<AlertDialog />',
      false,
      'alert-dialog',
    );
    expect(snippet, snippet).to.include('title="Heads up"');
    expect(snippet.includes('<DialogTrigger title')).to.be.false;
  });

  it('fetches the trigger\'s catalog for the tooltip route', async () => {
    const fetchStub = stubPlaygroundFetch(sandbox);
    const el = makeMetaEl({ implementation: 'rsp', component: 'tooltip' });
    document.body.append(el);
    await init(el);

    const urls = fetchStub.getCalls().map((call) => String(call.args[0]));
    expect(urls.some((url) => url.includes('/deps/rsp/data/TooltipTrigger.json'))).to.be.true;
    expect(urls.some((url) => url.includes('/deps/rsp/data/Tooltip.json'))).to.be.false;
  });

  it('still names the route\'s own component in the code disclosure', async () => {
    stubPlaygroundFetch(sandbox);
    const el = makeMetaEl({ implementation: 'rsp', component: 'tooltip' });
    document.body.append(el);
    await init(el);
    expect(el.querySelector('pre').textContent.includes('<Tooltip')).to.be.true;
  });
});

// The 'Label' placeholder exists for a component whose text control has no value yet.
// A component with NO text control (tooltip: placement, delay, trigger — none of them
// TEXT_KEYS) was getting its authored fragment text replaced by that placeholder, so
// the tooltip rendered the word "Label" instead of its content.
describe('a fragment\'s own text survives when there is no text control', () => {
  it('keeps the authored text', () => {
    const snippet = buildRspSnippet(
      'Tooltip',
      { placement: { value: 'top', attribute: 'placement' } },
      '<Tooltip>Helpful tip text</Tooltip>',
      false,
      'tooltip',
    );
    expect(snippet.includes('Helpful tip text')).to.be.true;
    expect(snippet.includes('Label')).to.be.false;
  });

  it('still lets a text control override it', () => {
    const snippet = buildRspSnippet(
      'Button',
      { text: { value: 'Press me', attribute: null } },
      '<Button>Authored</Button>',
      false,
      null,
    );
    expect(snippet.includes('Press me')).to.be.true;
    expect(snippet.includes('Authored')).to.be.false;
  });

  it('still falls back to the placeholder with no fragment at all', () => {
    const snippet = buildRspSnippet('Button', {}, '', false, null);
    expect(snippet.includes('Label')).to.be.true;
  });
});

// resolveComponentMeta was neither exported nor tested before Layer 2; it is now the
// single place per-implementation routing happens, so it earns direct coverage.
describe('resolveComponentMeta', () => {
  const BASE = 'https://example.test';

  it('routes an rsp component through the rsp shell and jsx snippet', () => {
    const meta = resolveComponentMeta('action-button', 'rsp', BASE);
    expect(meta.componentTitle).to.equal('ActionButton');
    expect(meta.previewName).to.equal('ActionButton');
    expect(meta.previewShellPath).to.equal('deps/rsp/playground/index.html');
    expect(meta.markupUrl).to.equal(`${BASE}/deps/rsp/playground/snippets/action-button.jsx`);
  });

  it('routes an swc component through the swc shell and html snippet', () => {
    const meta = resolveComponentMeta('action-button', 'swc', BASE);
    expect(meta.previewName).to.equal('swc-action-button');
    expect(meta.previewShellPath).to.equal('deps/swc/playground/index.html');
    expect(meta.markupUrl).to.equal(`${BASE}/deps/swc/playground/snippets/action-button.html`);
  });

  // ios/android have no registry entry, no catalog and no snippets — the generic
  // image-viewer shell needs none of them, so markupUrl is null rather than a bogus URL.
  it('falls back to the generic shell for an implementation with no playground', () => {
    for (const impl of ['ios', 'android', 'nonsense']) {
      const meta = resolveComponentMeta('button', impl, BASE);
      expect(meta.previewShellPath, impl).to.equal('blocks/playground/index.html');
      expect(meta.markupUrl, impl).to.equal(null);
      expect(meta.componentTitle, impl).to.equal('Button');
    }
  });
});

// The "unset" sentinel is a control-layer label, never real markup. The apply path
// already removed it from the live preview; the snippet builders were still printing
// it (staticColor="None" predates the optional work — badge's `fixed` made it visible).
describe('the unset sentinel never reaches a snippet', () => {
  const props = (value) => ({
    variant: { value: 'primary', attribute: 'variant' },
    staticColor: { value, attribute: 'static-color' },
  });

  it('omits the attribute from an swc snippet', () => {
    const out = buildSwcSnippet('swc-button', props(NONE_OPTION), '');
    expect(out).to.not.include('None');
    expect(out).to.not.include('static-color');
    expect(out).to.include('variant="primary"');
  });

  it('still prints a real value', () => {
    expect(buildSwcSnippet('swc-button', props('white'), '')).to.include('static-color="white"');
  });

  it('omits the prop from an rsp snippet', () => {
    const out = buildRspSnippet('Button', props(NONE_OPTION), '', false, 'button');
    expect(out).to.not.include('None');
    expect(out).to.include('variant="primary"');
  });
});
