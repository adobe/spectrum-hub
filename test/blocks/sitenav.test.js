import { expect } from '@esm-bundle/chai';
import sinon from 'sinon';
import init, {
  formatLabel,
  isAncestorOf,
  buildPathTree,
  flattenPathNode,
} from '../../blocks/sitenav/sitenav.js';

describe('sitenav block', () => {
  describe('formatLabel', () => {
    it('capitalizes the first character', () => {
      expect(formatLabel('hello')).to.equal('Hello');
    });

    it('replaces hyphens with spaces', () => {
      expect(formatLabel('hello-world')).to.equal('Hello world');
    });

    it('handles multi-hyphen slugs', () => {
      expect(formatLabel('getting-started')).to.equal('Getting started');
      expect(formatLabel('core-systems')).to.equal('Core systems');
    });

    it('handles a single character', () => {
      expect(formatLabel('a')).to.equal('A');
    });

    it('returns the empty string when given an empty string', () => {
      expect(formatLabel('')).to.equal('');
    });
  });

  describe('isAncestorOf', () => {
    it('returns false when ancestorPath is null or empty', () => {
      expect(isAncestorOf(null, '/foo')).to.be.false;
      expect(isAncestorOf('', '/foo')).to.be.false;
    });

    it('returns true when paths are an exact match', () => {
      expect(isAncestorOf('/foo', '/foo')).to.be.true;
    });

    it('returns true when currentPath is a descendant of ancestorPath', () => {
      expect(isAncestorOf('/foo', '/foo/bar')).to.be.true;
      expect(isAncestorOf('/foo/bar', '/foo/bar/baz')).to.be.true;
    });

    it('returns false for similar prefixes that are not actually descendants', () => {
      expect(isAncestorOf('/foo', '/foobar')).to.be.false;
      expect(isAncestorOf('/foundations', '/foundations-old/intro')).to.be.false;
    });

    it('returns false for unrelated paths', () => {
      expect(isAncestorOf('/foo', '/bar')).to.be.false;
    });

    it('returns false when ancestorPath is actually a descendant of currentPath', () => {
      expect(isAncestorOf('/foo/bar', '/foo')).to.be.false;
    });
  });

  describe('buildPathTree', () => {
    it('returns a root with empty children when no pages match the section', () => {
      const pages = [{ path: '/components/button', title: 'Button' }];
      const root = buildPathTree(pages, 'foundations');
      expect(root.children.size).to.equal(0);
    });

    it('returns an empty root when given no pages', () => {
      const root = buildPathTree([], 'foundations');
      expect(root.children.size).to.equal(0);
    });

    it('creates a leaf for a single page', () => {
      const pages = [{ path: '/foundations/principles', title: 'Principles' }];
      const root = buildPathTree(pages, 'foundations');
      expect(root.children.size).to.equal(1);
      const node = root.children.get('principles');
      expect(node.title).to.equal('Principles');
      expect(node.path).to.equal('/foundations/principles');
      expect(node.children.size).to.equal(0);
    });

    it('groups sibling pages under the same parent', () => {
      const pages = [
        { path: '/foundations/principles', title: 'Principles' },
        { path: '/foundations/system', title: 'System' },
      ];
      const root = buildPathTree(pages, 'foundations');
      expect(root.children.size).to.equal(2);
      expect(root.children.get('principles').title).to.equal('Principles');
      expect(root.children.get('system').title).to.equal('System');
    });

    it('builds nested branches from deeper paths', () => {
      const pages = [
        { path: '/foundations/visual-language/color', title: 'Color' },
        { path: '/foundations/visual-language/typography', title: 'Typography' },
      ];
      const root = buildPathTree(pages, 'foundations');
      const visual = root.children.get('visual-language');
      expect(visual).to.exist;
      expect(visual.children.size).to.equal(2);
      expect(visual.children.get('color').title).to.equal('Color');
      expect(visual.children.get('typography').title).to.equal('Typography');
      // The intermediate node has no title of its own.
      expect(visual.title).to.be.null;
    });

    it('ignores pages outside the section', () => {
      const pages = [
        { path: '/foundations/principles', title: 'Principles' },
        { path: '/components/button', title: 'Button' },
        { path: '/random/page', title: 'Random' },
      ];
      const root = buildPathTree(pages, 'foundations');
      expect(root.children.size).to.equal(1);
      expect(root.children.has('principles')).to.be.true;
    });

    it('preserves a page title even when other deeper pages walk through it', () => {
      const pages = [
        { path: '/foundations/visual-language', title: 'Visual language' },
        { path: '/foundations/visual-language/color', title: 'Color' },
      ];
      const root = buildPathTree(pages, 'foundations');
      const visual = root.children.get('visual-language');
      expect(visual.title).to.equal('Visual language');
      expect(visual.children.get('color').title).to.equal('Color');
    });
  });

  describe('init', () => {
    let el;
    let sandbox;

    beforeEach(() => {
      sandbox = sinon.createSandbox();
      window.history.pushState({}, '', '/foundations/color');
      sandbox.stub(window, 'fetch').resolves({
        ok: true,
        json: () => Promise.resolve({ data: [{ path: '/foundations/color', title: 'Color' }] }),
      });
      el = document.createElement('nav');
      document.body.append(el);
    });

    afterEach(() => {
      sandbox.restore();
      el.remove();
      window.history.pushState({}, '', '/');
    });

    it('closes the disclosure when a click lands outside the nav on mobile', async () => {
      sandbox.stub(window, 'matchMedia').returns({ matches: false, addEventListener: () => {} });
      await init(el);
      const disclosure = el.querySelector('details');
      disclosure.open = true;
      document.body.click();
      expect(disclosure.open).to.be.false;
    });

    it('leaves the disclosure open when a click lands inside the nav on mobile', async () => {
      sandbox.stub(window, 'matchMedia').returns({ matches: false, addEventListener: () => {} });
      await init(el);
      const disclosure = el.querySelector('details');
      disclosure.open = true;
      el.click();
      expect(disclosure.open).to.be.true;
    });

    it('does not close the disclosure on desktop even when a click lands outside', async () => {
      sandbox.stub(window, 'matchMedia').returns({ matches: true, addEventListener: () => {} });
      await init(el);
      const disclosure = el.querySelector('details');
      document.body.click();
      expect(disclosure.open).to.be.true;
    });
  });

  describe('flattenPathNode', () => {
    it('flattens a leaf into a label-and-empty-children object', () => {
      const node = {
        key: 'principles',
        path: '/foundations/principles',
        title: 'Principles',
        children: new Map(),
      };
      expect(flattenPathNode(node)).to.deep.equal({
        path: '/foundations/principles',
        label: 'Principles',
        children: [],
      });
    });

    it('falls back to formatLabel(key) when title is null', () => {
      const node = {
        key: 'getting-started',
        path: '/foundations/getting-started',
        title: null,
        children: new Map(),
      };
      expect(flattenPathNode(node)).to.deep.equal({
        path: '/foundations/getting-started',
        label: 'Getting started',
        children: [],
      });
    });

    it('recurses into children', () => {
      const child = {
        key: 'color',
        path: '/foundations/visual-language/color',
        title: 'Color',
        children: new Map(),
      };
      const node = {
        key: 'visual-language',
        path: '/foundations/visual-language',
        title: 'Visual language',
        children: new Map([['color', child]]),
      };
      const result = flattenPathNode(node);
      expect(result.label).to.equal('Visual language');
      expect(result.children).to.have.lengthOf(1);
      expect(result.children[0]).to.deep.equal({
        path: '/foundations/visual-language/color',
        label: 'Color',
        children: [],
      });
    });
  });
});
