import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  parseBlockMetadata,
  parseDefault,
  buildSwcSnippet,
} from '../../blocks/playground/playground.js';

// Minimal DOM-like helpers — just enough structure for the functions under test.
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
    assert.equal(result.implementation, 'swc');
    assert.equal(result.component, 'button');
  });

  it('extracts href from a link cell for the spreadsheet row', () => {
    const el = makeEl([
      makeRow('spreadsheet', 'ignored text', 'https://example.com/data.json'),
    ]);
    assert.equal(parseBlockMetadata(el).spreadsheet, 'https://example.com/data.json');
  });

  it('falls back to textContent when no link is present', () => {
    const el = makeEl([makeRow('component', 'button')]);
    assert.equal(parseBlockMetadata(el).component, 'button');
  });

  it('normalises key casing to lowercase', () => {
    const el = makeEl([makeRow('Implementation', 'swc')]);
    assert.equal(parseBlockMetadata(el).implementation, 'swc');
  });

  it('ignores rows with empty keys', () => {
    const el = makeEl([makeRow('', 'orphan'), makeRow('component', 'badge')]);
    assert.equal(parseBlockMetadata(el).component, 'badge');
    assert.equal(Object.keys(parseBlockMetadata(el)).length, 1);
  });

  it('ignores rows with missing cells', () => {
    const el = { children: [{ children: [] }] };
    assert.deepEqual(parseBlockMetadata(el), {});
  });
});

// --- parseDefault -----------------------------------------------------------

describe('parseDefault', () => {
  it("strips surrounding single quotes from string defaults like \"'primary'\"", () => {
    assert.equal(parseDefault("'primary'"), 'primary');
  });

  it('returns bare values unchanged', () => {
    assert.equal(parseDefault('true'), 'true');
    assert.equal(parseDefault('false'), 'false');
  });

  it('returns undefined for null input', () => {
    assert.equal(parseDefault(null), undefined);
  });

  it('returns undefined for undefined input', () => {
    assert.equal(parseDefault(undefined), undefined);
  });

  it('returns undefined for an empty string', () => {
    assert.equal(parseDefault(''), undefined);
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
    assert.ok(snippet.startsWith('<swc-button'));
    assert.ok(snippet.includes('variant="primary"'));
    assert.ok(snippet.includes('fill-style="fill"'));
    assert.ok(snippet.endsWith('</swc-button>'));
  });

  it('uses the text/label/children property as inner text content', () => {
    const props = {
      text: { attribute: null, value: 'Click me' },
      variant: { attribute: 'variant', value: 'secondary' },
    };
    const snippet = buildSwcSnippet('swc-button', props);
    assert.ok(snippet.includes('>Click me<'));
  });

  it('omits attributes with null attribute names from the opening tag', () => {
    const props = {
      text: { attribute: null, value: 'Label' },
    };
    const snippet = buildSwcSnippet('swc-button', props);
    assert.ok(!snippet.includes('null'));
    assert.equal(snippet, '<swc-button>Label</swc-button>');
  });

  it('omits props with undefined or empty string values', () => {
    const props = {
      variant: { attribute: 'variant', value: '' },
      size: { attribute: 'size', value: undefined },
    };
    const snippet = buildSwcSnippet('swc-badge', props);
    assert.ok(!snippet.includes('variant'));
    assert.ok(!snippet.includes('size'));
  });

  it('defaults inner text to "Label" when no text-type prop exists', () => {
    const props = {
      variant: { attribute: 'variant', value: 'accent' },
    };
    assert.ok(buildSwcSnippet('swc-button', props).includes('>Label<'));
  });

  it('uses the tag name as both opening and closing tag', () => {
    const snippet = buildSwcSnippet('swc-badge', {});
    assert.ok(snippet.startsWith('<swc-badge'));
    assert.ok(snippet.endsWith('</swc-badge>'));
  });

  it('renders a boolean-true value as a bare attribute (no ="value")', () => {
    const props = { disabled: { attribute: 'disabled', value: 'yes' } };
    const snippet = buildSwcSnippet('swc-action-button', props);
    assert.ok(snippet.includes(' disabled'), 'bare attribute should appear');
    assert.ok(!snippet.includes('disabled="'), 'should not include ="..."');
  });

  it('omits a boolean-false attribute entirely', () => {
    const props = {
      disabled: { attribute: 'disabled', value: 'no' },
      variant: { attribute: 'variant', value: 'primary' },
    };
    const snippet = buildSwcSnippet('swc-action-button', props);
    assert.ok(!snippet.includes('disabled'), 'false boolean should be omitted');
    assert.ok(snippet.includes('variant="primary"'));
  });
});
