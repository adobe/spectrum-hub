import { expect } from '@esm-bundle/chai';
import '../../blocks/hub-sidenav-item/hub-sidenav-item.js';

// Creates an upgraded <hub-sidenav-item>, applies reactive properties, mounts
// it, and waits for the first render.
async function mount(props = {}) {
  const el = document.createElement('hub-sidenav-item');
  Object.assign(el, props);
  document.body.append(el);
  await el.updateComplete;
  return el;
}

describe('hub-sidenav-item block', () => {
  afterEach(() => {
    document.body.innerHTML = '';
    window.history.pushState({}, '', '/');
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
      expect(el.shadowRoot.querySelector('.hub-sidenav-item__label').textContent.trim())
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

    it('renders an icon span with the mask-image when iconPath is set', async () => {
      const el = await mount({ label: 'Color', href: '/x', iconPath: '/img/icons/s2-icon-color-20-n.svg' });
      const icon = el.shadowRoot.querySelector('.hub-sidenav-item__icon');
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
      const toggle = el.shadowRoot.querySelector('button.hub-sidenav-item__toggle');
      expect(toggle).to.not.be.null;
      expect(toggle.getAttribute('aria-expanded')).to.equal('false');
    });

    it('renders a slot for nested children', async () => {
      const el = await mount({ label: 'Visual language', expandable: true });
      expect(el.shadowRoot.querySelector('.hub-sidenav-item__children slot')).to.not.be.null;
    });

    it('marks the children container inert while collapsed', async () => {
      const el = await mount({ label: 'Visual language', expandable: true });
      expect(el.shadowRoot.querySelector('.hub-sidenav-item__children').inert).to.be.true;
    });

    it('expands and exposes the children when the toggle is clicked', async () => {
      const el = await mount({ label: 'Visual language', expandable: true });
      el.shadowRoot.querySelector('button.hub-sidenav-item__toggle').click();
      await el.updateComplete;
      expect(el.expanded).to.be.true;
      expect(el.shadowRoot.querySelector('button.hub-sidenav-item__toggle').getAttribute('aria-expanded')).to.equal('true');
      expect(el.shadowRoot.querySelector('.hub-sidenav-item__children').inert).to.be.false;
    });

    it('renders expanded when the expanded property is set', async () => {
      const el = await mount({ label: 'Visual language', expandable: true, expanded: true });
      expect(el.shadowRoot.querySelector('button.hub-sidenav-item__toggle').getAttribute('aria-expanded')).to.equal('true');
    });
  });
});
