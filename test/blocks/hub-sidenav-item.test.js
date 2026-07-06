import { expect } from '@esm-bundle/chai';
import '../../blocks/hub-global-sidenav/hub-sidenav-item/hub-sidenav-item.js';
import { setConfig } from '../../scripts/ak.js';

// Creates an upgraded <hub-sidenav-item>, applies reactive properties, mounts
// it, and waits for the first render.
async function mount(props = {}) {
  const el = document.createElement('hub-sidenav-item');
  Object.assign(el, props);
  document.body.append(el);
  await el.updateComplete;
  return el;
}

describe('hub-sidenav-item', () => {
  afterEach(() => {
    document.body.innerHTML = '';
    window.history.pushState({}, '', '/');
    setConfig({ locales: { '': {} } });
  });

  describe('anchor variant (default)', () => {
    it('renders an <a> pointing at the href', async () => {
      const el = await mount({ label: 'Color', href: '/foundations/color' });
      const link = el.shadowRoot.querySelector('a');
      expect(link).to.not.be.null;
      expect(link.getAttribute('href')).to.equal('/foundations/color');
    });

    it('renders the label text', async () => {
      const el = await mount({ label: 'Color', href: '/foundations/color' });
      expect(el.shadowRoot.querySelector('.hub-sidenav-item-label').textContent.trim())
        .to.equal('Color');
    });

    it('omits aria-current when the href is not the current page', async () => {
      window.history.pushState({}, '', '/somewhere-else');
      const el = await mount({ label: 'Color', href: '/foundations/color' });
      expect(el.shadowRoot.querySelector('a').hasAttribute('aria-current')).to.be.false;
    });

    it('sets aria-current="page" when the href matches the current page', async () => {
      window.history.pushState({}, '', '/foundations/color');
      const el = await mount({ label: 'Color', href: '/foundations/color' });
      expect(el.shadowRoot.querySelector('a').getAttribute('aria-current')).to.equal('page');
    });

    it('sets aria-current="page" when the href matches the current page under a locale prefix', async () => {
      window.history.pushState({}, '', '/fr/foundations/color');
      setConfig({ locales: { '': {}, '/fr': { lang: 'fr' } } });
      const el = await mount({ label: 'Color', href: '/foundations/color' });
      expect(el.shadowRoot.querySelector('a').getAttribute('aria-current')).to.equal('page');
    });

    it('keeps the link focusable and keyboard-operable even if href is not provided', async () => {
      const el = await mount({ label: 'Untitled' });
      const link = el.shadowRoot.querySelector('a');
      expect(link.hasAttribute('href')).to.be.true;
    });

    it('renders an icon span with the mask-image when iconPath is set', async () => {
      const el = await mount({ label: 'Color', href: '/x', iconPath: '/img/icons/s2-icon-color-20-n.svg' });
      const icon = el.shadowRoot.querySelector('.hub-sidenav-item-icon');
      expect(icon).to.not.be.null;
      expect(icon.getAttribute('style')).to.contain('/img/icons/s2-icon-color-20-n.svg');
    });

    it('does not render a tooltip when not collapsed', async () => {
      const el = await mount({ label: 'Color', href: '/x' });
      expect(el.shadowRoot.querySelector('swc-tooltip')).to.be.null;
    });

    it('renders a tooltip with the label when collapsed', async () => {
      const el = await mount({ label: 'Color', href: '/x', collapsed: true });
      const tooltip = el.shadowRoot.querySelector('swc-tooltip');
      expect(tooltip).to.not.be.null;
      expect(tooltip.getAttribute('for')).to.equal('hub-sidenav-item-link');
      expect(tooltip.textContent.trim()).to.equal('Color');
    });
  });

  describe('expandable variant', () => {
    it('renders a toggle button collapsed by default', async () => {
      const el = await mount({ label: 'Visual language', expandable: true });
      const toggle = el.shadowRoot.querySelector('button.hub-sidenav-item-toggle');
      expect(toggle).to.not.be.null;
      expect(toggle.getAttribute('aria-expanded')).to.equal('false');
    });

    it('links the toggle button to the disclosure region via aria-controls', async () => {
      const el = await mount({ label: 'Visual language', href: '/foundations/visual-language', expandable: true });
      const toggle = el.shadowRoot.querySelector('button.hub-sidenav-item-toggle');
      const region = el.shadowRoot.querySelector('.hub-sidenav-item-children');
      expect(region.id).to.not.equal('');
      expect(toggle.getAttribute('aria-controls')).to.equal(region.id);
    });

    it('the toggle button has type="button" so it cannot submit an ancestor form', async () => {
      const el = await mount({ label: 'Visual language', expandable: true });
      const toggle = el.shadowRoot.querySelector('button.hub-sidenav-item-toggle');
      expect(toggle.getAttribute('type')).to.equal('button');
    });

    it('renders a tooltip with the label when collapsed', async () => {
      const el = await mount({
        label: 'Visual language', href: '/foundations/visual-language', expandable: true, collapsed: true,
      });
      const toggle = el.shadowRoot.querySelector('button.hub-sidenav-item-toggle');
      const tooltip = el.shadowRoot.querySelector('swc-tooltip');
      expect(tooltip).to.not.be.null;
      expect(tooltip.getAttribute('for')).to.equal(toggle.id);
      expect(tooltip.textContent.trim()).to.equal('Visual language');
    });

    it('does not render a tooltip when not collapsed', async () => {
      const el = await mount({ label: 'Visual language', expandable: true });
      expect(el.shadowRoot.querySelector('swc-tooltip')).to.be.null;
    });

    it('renders a slot for nested children', async () => {
      const el = await mount({ label: 'Visual language', expandable: true });
      expect(el.shadowRoot.querySelector('.hub-sidenav-item-children slot')).to.not.be.null;
    });

    it('marks the children container inert while collapsed', async () => {
      const el = await mount({ label: 'Visual language', expandable: true });
      expect(el.shadowRoot.querySelector('.hub-sidenav-item-children').inert).to.be.true;
    });

    it('expands and exposes the children when the toggle is clicked', async () => {
      const el = await mount({ label: 'Visual language', expandable: true });
      el.shadowRoot.querySelector('button.hub-sidenav-item-toggle').click();
      await el.updateComplete;
      expect(el.expanded).to.be.true;
      expect(el.shadowRoot.querySelector('button.hub-sidenav-item-toggle').getAttribute('aria-expanded')).to.equal('true');
      expect(el.shadowRoot.querySelector('.hub-sidenav-item-children').inert).to.be.false;
    });

    it('renders expanded when the expanded property is set', async () => {
      const el = await mount({ label: 'Visual language', expandable: true, expanded: true });
      expect(el.shadowRoot.querySelector('button.hub-sidenav-item-toggle').getAttribute('aria-expanded')).to.equal('true');
    });
  });
});
