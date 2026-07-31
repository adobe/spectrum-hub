import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { parse } from 'node-html-parser';

import { splitSections, stripNoise } from '../../tools/indexer/sections.js';

const main = (html) => parse(`<main>${html}</main>`).querySelector('main');

describe('splitSections', () => {
  it('finds headings at any depth, in document order', () => {
    const el = main(`
      <div><div><div><div><div><h1 id="a">Deep H1</h1></div></div>
        <p>lead text</p></div>
        <section><article><h2 id="b">Deep H2</h2><p>b text</p>
          <div><span><h3 id="c">Very deep H3</h3></span></div><p>c text</p>
        </article></section>
      </div>
      <h2 id="d">Shallow H2</h2><p>d text</p>
      <div><h4>Not a boundary</h4><p>h4 body</p></div>`);
    assert.deepEqual(
      splitSections(el).map((s) => [s.level, s.heading, s.content]),
      [
        [1, 'Deep H1', 'lead text'],
        [2, 'Deep H2', 'b text'],
        [3, 'Very deep H3', 'c text'],
        [2, 'Shallow H2', 'd text Not a boundary h4 body'],
      ],
    );
  });

  it('merges pre-heading content into the first section', () => {
    const el = main('<div><p>breadcrumb</p><h1 id="t">Title</h1><p>body</p></div>');
    const [first] = splitSections(el);
    assert.equal(first.heading, 'Title');
    assert.equal(first.content, 'breadcrumb body');
  });

  it('takes the anchor from the heading id and defaults to empty', () => {
    const el = main('<h1 id="one">One</h1><p>x</p><h2>Two</h2><p>y</p>');
    assert.deepEqual(splitSections(el).map((s) => s.anchor), ['one', '']);
  });

  it('tracks hierarchy across levels and resets deeper levels', () => {
    const el = main(`
      <h1 id="p">Page</h1><p>a</p>
      <h2 id="s1">Sec One</h2><p>b</p>
      <h3 id="d1">Deep</h3><p>c</p>
      <h2 id="s2">Sec Two</h2><p>d</p>`);
    assert.deepEqual(splitSections(el).map((s) => s.hierarchy), [
      { lvl0: 'Page', lvl1: '', lvl2: '' },
      { lvl0: 'Page', lvl1: 'Sec One', lvl2: '' },
      { lvl0: 'Page', lvl1: 'Sec One', lvl2: 'Deep' },
      { lvl0: 'Page', lvl1: 'Sec Two', lvl2: '' },
    ]);
  });

  it('always keeps the first section but drops content-less later ones', () => {
    const el = main(`
      <h1 id="t">Title Only</h1>
      <h2 id="empty">Empty Parent</h2>
      <h3 id="real">Real</h3><p>has text</p>`);
    assert.deepEqual(
      splitSections(el).map((s) => s.heading),
      ['Title Only', 'Real'],
    );
  });

  it('keeps a dropped parent in its children hierarchy', () => {
    // This is what makes dropping content-less parents safe: the heading still
    // reaches the index through its children. Compute hierarchy before
    // filtering or this silently regresses.
    const el = main(`
      <h1 id="t">Page</h1>
      <h2 id="empty">Behaviors</h2>
      <h3 id="real">Title wrapping</h3><p>has text</p>`);
    const sections = splitSections(el);
    assert.equal(sections.length, 2);
    assert.deepEqual(sections[1].hierarchy, {
      lvl0: 'Page',
      lvl1: 'Behaviors',
      lvl2: 'Title wrapping',
    });
  });

  it('numbers position by final array index', () => {
    const el = main('<h1 id="t">T</h1><h2 id="e">Empty</h2><h2 id="k">Keep</h2><p>x</p>');
    assert.deepEqual(splitSections(el).map((s) => s.position), [0, 1]);
  });

  it('collapses whitespace and does not double-count nested text', () => {
    const el = main('<h1 id="t">T</h1><p>The   <strong>bold</strong>\n  word</p>');
    assert.equal(splitSections(el)[0].content, 'The bold word');
  });

  it('caps content at 8000 characters', () => {
    const el = main(`<h1 id="t">T</h1><p>${'x'.repeat(9000)}</p>`);
    assert.equal(splitSections(el)[0].content.length, 8000);
  });

  it('returns an empty array for an empty main', () => {
    assert.deepEqual(splitSections(main('')), []);
  });
});

describe('stripNoise', () => {
  it('removes playground and section-metadata blocks', () => {
    const el = main('<h1 id="t">T</h1><div class="playground"><div>impl</div></div><p>keep</p>');
    stripNoise(el);
    assert.equal(splitSections(el)[0].content, 'keep');
  });

  it('removes images and pictures but keeps surrounding prose', () => {
    const el = main('<h1 id="t">T</h1><picture><img alt="alt text"></picture><p>keep</p>');
    stripNoise(el);
    assert.equal(splitSections(el)[0].content, 'keep');
  });

  it('removes anchors whose text is a bare URL', () => {
    const el = main('<h1 id="t">T</h1><p><a href="/deps/x.json">https://example.test/deps/x.json</a></p><p>keep</p>');
    stripNoise(el);
    assert.equal(splitSections(el)[0].content, 'keep');
  });

  it('keeps anchors with real link text', () => {
    const el = main('<h1 id="t">T</h1><p>see <a href="/x">the guide</a></p>');
    stripNoise(el);
    assert.equal(splitSections(el)[0].content, 'see the guide');
  });

  it('keeps hero, columns, and table blocks', () => {
    const el = main('<h1 id="t">T</h1><div class="columns"><div><p>prose</p></div></div>');
    stripNoise(el);
    assert.equal(splitSections(el)[0].content, 'prose');
  });
});
