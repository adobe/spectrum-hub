import { expect } from '@esm-bundle/chai';
import { resolveContext, buildPills } from '../../blocks/component-status/component-status.js';

describe('component-status block', () => {
  describe('resolveContext', () => {
    it('resolves the impl and slug from a component page path', () => {
      expect(resolveContext('/web/rsp/components/action-group')).to.deep.equal({ impl: 'rsp', slug: 'action-group' });
    });

    it('returns null for a page with no components segment', () => {
      expect(resolveContext('/web/rsp/get-started')).to.equal(null);
    });

    it('returns null for an unregistered implementation', () => {
      expect(resolveContext('/web/ios/components/button')).to.equal(null);
    });
  });

  describe('buildPills — Development pill link', () => {
    it('deep-links to the current impl\'s own name by default (no originalName on the cell)', () => {
      const componentData = { web: { rsp: { status: 'available' }, figma: { status: 'available' } } };
      const pills = buildPills('/web/rsp/components/action-button', componentData);
      const dev = pills.find((p) => p.dataset.kind === 'dev');
      expect(dev.getAttribute('href')).to.equal('https://react-spectrum.adobe.com/ActionButton.html');
    });

    it('deep-links to the real upstream name when the current impl\'s cell carries originalName', () => {
      // Matches the real shape deps/build-status-index.js writes (a renamed alias, e.g.
      // ActionButtonGroup -> ActionGroup, or a shared/merged page) — originalName lives on
      // the specific impl's own cell, not at the top of the slice.
      const componentData = {
        web: {
          rsp: { status: 'available', originalName: 'ActionButtonGroup' },
          figma: { status: 'available' },
        },
      };
      const pills = buildPills('/web/rsp/components/action-group', componentData);
      const dev = pills.find((p) => p.dataset.kind === 'dev');
      expect(dev.getAttribute('href')).to.equal('https://react-spectrum.adobe.com/ActionButtonGroup.html');
    });

    it('ignores another impl\'s originalName — only the current impl\'s cell applies', () => {
      const componentData = {
        web: {
          swc: { status: 'available', originalName: 'ColorHandle' },
          rsp: { status: 'available' },
        },
      };
      const pills = buildPills('/web/rsp/components/color-handle-and-loupe', componentData);
      const dev = pills.find((p) => p.dataset.kind === 'dev');
      expect(dev.getAttribute('href')).to.equal(
        'https://react-spectrum.adobe.com/ColorHandleAndLoupe.html',
      );
    });

    it('returns no pills when the path does not resolve to an indexed component', () => {
      const componentData = { web: { rsp: { status: 'available' } } };
      expect(buildPills('/web/rsp/get-started', componentData)).to.deep.equal([]);
    });

    it('returns no pills when there is no component data', () => {
      expect(buildPills('/web/rsp/components/action-button', null)).to.deep.equal([]);
    });
  });
});
