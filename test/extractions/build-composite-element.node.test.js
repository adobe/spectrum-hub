import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { collectFragmentTagNames, buildCompositeElement } from '../../deps/rsp/playground/build-composite-element.js';

// Plain object matching the shape of a real parsed DOM Element (tagName,
// attributes, children, textContent) — a real Element satisfies this
// directly, so this is what buildCompositeElement/collectFragmentTagNames
// actually receive in the browser (see initRsp() in
// deps/rsp/playground/index.html), just constructed by hand here
// instead of via DOMParser so this suite can run under node:test.
function makeNode(tagName, attrs = {}, children = [], text = '') {
  return {
    tagName,
    attributes: Object.entries(attrs).map(([name, value]) => ({ name, value })),
    children,
    textContent: text,
  };
}

describe('collectFragmentTagNames', () => {
  it('collects the root tag and every descendant tag', () => {
    const tree = makeNode('Tabs', {}, [
      makeNode('TabList', {}, [
        makeNode('Tab', { id: 'a' }, [], 'A'),
        makeNode('Tab', { id: 'b' }, [], 'B'),
      ]),
      makeNode('TabPanel', { id: 'a' }, [], 'Panel A'),
    ]);
    assert.deepEqual(collectFragmentTagNames(tree).sort(), ['Tab', 'TabList', 'TabPanel', 'Tabs'].sort());
  });

  it('dedupes a tag that appears more than once', () => {
    const tree = makeNode('ButtonGroup', {}, [
      makeNode('Button', {}, [], 'Cancel'),
      makeNode('Button', {}, [], 'Save'),
    ]);
    assert.deepEqual(collectFragmentTagNames(tree), ['ButtonGroup', 'Button']);
  });

  it('returns just the root tag for a leaf node with no children', () => {
    assert.deepEqual(collectFragmentTagNames(makeNode('Badge', {}, [], 'New')), ['Badge']);
  });
});

describe('buildCompositeElement', () => {
  function fakeCreateElement(type, props, ...children) {
    return { type, props, children };
  }

  it('resolves the tag to its real component reference via componentsByTag, not the tag string', () => {
    const node = makeNode('Tab', { id: 'overview' }, [], 'Overview');
    const el = buildCompositeElement(node, { Tab: 'REAL_TAB_COMPONENT' }, fakeCreateElement);
    assert.equal(el.type, 'REAL_TAB_COMPONENT');
  });

  it('passes attributes through as props', () => {
    const node = makeNode('Tab', { id: 'overview' }, [], 'Overview');
    const el = buildCompositeElement(node, { Tab: 'TAB' }, fakeCreateElement);
    assert.deepEqual(el.props, { id: 'overview' });
  });

  it('uses textContent as the sole child for a leaf node', () => {
    const node = makeNode('Tab', {}, [], 'Overview');
    const el = buildCompositeElement(node, { Tab: 'TAB' }, fakeCreateElement);
    assert.deepEqual(el.children, ['Overview']);
  });

  it('recurses into nested children, building a full element tree', () => {
    const tree = makeNode('TabList', {}, [
      makeNode('Tab', { id: 'a' }, [], 'A'),
      makeNode('Tab', { id: 'b' }, [], 'B'),
    ]);
    const componentsByTag = { TabList: 'TABLIST', Tab: 'TAB' };
    const el = buildCompositeElement(tree, componentsByTag, fakeCreateElement);
    assert.equal(el.type, 'TABLIST');
    assert.equal(el.children.length, 2);
    assert.equal(el.children[0].type, 'TAB');
    assert.deepEqual(el.children[0].props, { id: 'a' });
    assert.deepEqual(el.children[0].children, ['A']);
    assert.equal(el.children[1].type, 'TAB');
    assert.deepEqual(el.children[1].props, { id: 'b' });
  });

  it('renders a bare boolean attribute (empty string value) as `true`', () => {
    const node = makeNode('AccordionItem', { isQuiet: '' }, [], 'x');
    const el = buildCompositeElement(node, { AccordionItem: 'ITEM' }, fakeCreateElement);
    assert.equal(el.props.isQuiet, true);
  });
});
