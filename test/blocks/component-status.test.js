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

    it('resolves the design-only route to its own impl', () => {
      expect(resolveContext('/web/design-only/components/alert-banner'))
        .to.deep.equal({ impl: 'design-only', slug: 'alert-banner' });
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

  // A design-only component's slice never carries a `design-only` key in `web` (only
  // figma/rsp/swc) — the Development pill must still render as Not available rather
  // than being silently omitted.
  describe('buildPills — design-only components', () => {
    it('renders Development as not available, with no link, when there is no code cell', () => {
      const componentData = { web: { figma: { status: 'available' } } };
      const pills = buildPills('/web/design-only/components/alert-banner', componentData);
      const dev = pills.find((p) => p.dataset.kind === 'dev');

      expect(dev.dataset.status).to.equal('not-available');
      expect(dev.tagName).to.equal('SPAN');
      expect(dev.querySelector('.component-status-label').textContent).to.equal('Development not available');
    });

    it('still renders the Design pill from the figma cell', () => {
      const componentData = { web: { figma: { status: 'available' } } };
      const pills = buildPills('/web/design-only/components/alert-banner', componentData);
      const design = pills.find((p) => p.dataset.kind === 'design');

      expect(design.dataset.status).to.equal('available');
      expect(design.querySelector('.component-status-label').textContent).to.equal('Design available');
    });

    it('links the Design pill to Figma when the slice has a figmaPageId', () => {
      const componentData = { web: { figma: { status: 'available' } }, figmaPageId: '123:456' };
      const pills = buildPills('/web/design-only/components/alert-banner', componentData);
      const design = pills.find((p) => p.dataset.kind === 'design');

      expect(design.tagName).to.equal('A');
    });

    it('renders both pills even with no code implementation ever registered for design-only', () => {
      const componentData = { web: { figma: { status: 'available' } } };
      const pills = buildPills('/web/design-only/components/alert-banner', componentData);

      expect(pills).to.have.lengthOf(2);
    });
  });
});
