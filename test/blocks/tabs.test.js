import { expect } from '@esm-bundle/chai';
import sinon from 'sinon';
import { loadArea, setConfig } from '../../scripts/ak.js';
import initMetadata from '../../blocks/section-metadata/section-metadata.js';

const logStub = sinon.stub();
setConfig({ log: logStub });
const { default: init } = await import('../../blocks/tabs/tabs.js');

function makeTabs({ container = 'main', labels = ['Overview', 'Details'], panels = 2 } = {}) {
  const parent = document.createElement(container === 'main' ? 'main' : 'div');
  if (container === 'fragment') { parent.className = 'fragment-content'; }
  parent.innerHTML = `
    <div class="section intro"><p>Introduction</p></div>
    <div class="section tabs-section">
      <div class="block-content"><div class="tabs">
        <div><div><ul>${labels.map((label) => `<li>${label}</li>`).join('')}</ul></div></div>
      </div></div>
    </div>
    ${Array.from({ length: panels }, (_, index) => `
      <div class="section panel-content" id="content-${index + 1}" data-authored="preserved">
        <div class="default-content"><p>Panel ${index + 1}</p></div>
      </div>
    `).join('')}
  `;
  document.body.append(parent);
  return {
    parent,
    block: parent.querySelector('.tabs'),
    sections: [...parent.querySelectorAll('.panel-content')],
  };
}

async function settle(block) {
  const tabs = block.querySelector('swc-tabs');
  if (!tabs) { return; }
  await tabs.updateComplete;
  await Promise.all([...tabs.children].map((child) => child.updateComplete));
  await tabs.updateComplete;
}

function markBoundary(section, value) {
  const wrapper = document.createElement('div');
  wrapper.className = 'block-content';
  wrapper.innerHTML = `
    <div class="section-metadata"><div><div>tabs</div><div>${value}</div></div></div>
  `;
  section.append(wrapper);
  return wrapper.firstElementChild;
}

describe('tabs block', () => {
  let originalUrl;

  beforeEach(() => {
    originalUrl = window.location.href;
    window.history.replaceState(null, '', window.location.pathname + window.location.search);
  });

  afterEach(async () => {
    await Promise.all([...document.querySelectorAll('.tabs')].map(settle));
    document.body.innerHTML = '';
    logStub.resetHistory();
    window.history.replaceState(null, '', originalUrl);
  });

  it('registers the entire SWC tabs family', () => {
    for (const tag of ['swc-tabs', 'swc-tab', 'swc-tab-panel']) {
      expect(customElements.get(tag), `${tag} must be registered`).to.be.a('function');
    }
  });

  it('resolves initialization after SWC has established tab semantics', async () => {
    const { block } = makeTabs();

    const ready = init(block);
    expect(ready?.then).to.be.a('function');
    await ready;

    const tab = block.querySelector('swc-tab');
    const panel = block.querySelector('swc-tab-panel');
    expect(tab.getAttribute('role')).to.equal('tab');
    expect(tab.getAttribute('aria-controls')).to.equal(panel.id);
    expect(panel.getAttribute('role')).to.equal('tabpanel');
  });

  it('wraps only following sections in panels and preserves the original nodes', async () => {
    const { parent, block, sections } = makeTabs();
    const intro = parent.querySelector('.intro');
    const onClick = sinon.stub();
    sections[0].addEventListener('click', onClick);

    await init(block);

    const tabs = block.querySelector('swc-tabs');
    const panels = [...tabs.querySelectorAll(':scope > swc-tab-panel')];
    expect(panels).to.have.length(2);
    expect(parent.querySelector(':scope > .intro') === intro).to.be.true;
    panels.forEach((panel, index) => {
      expect(panel.firstElementChild === sections[index]).to.be.true;
      expect(sections[index].id).to.equal(`content-${index + 1}`);
      expect(sections[index].dataset.authored).to.equal('preserved');
      expect(sections[index].hasAttribute('role')).to.be.false;
    });
    sections[0].click();
    expect(onClick.calledOnce).to.be.true;
    expect(block.querySelector('ul')).to.be.null;
  });

  it('connects each tab and panel through matching tab-id and ARIA attributes', async () => {
    const { block } = makeTabs();
    await init(block);

    const tabs = [...block.querySelectorAll('swc-tab')];
    const panels = [...block.querySelectorAll('swc-tab-panel')];
    expect(tabs.map((tab) => tab.textContent)).to.deep.equal(['Overview', 'Details']);
    tabs.forEach((tab, index) => {
      expect(tab.tabId).to.equal(panels[index].tabId);
      expect(tab.getAttribute('aria-controls')).to.equal(panels[index].id);
      expect(panels[index].getAttribute('aria-labelledby')).to.equal(tab.id);
      expect(panels[index].slot).to.equal('tab-panel');
    });
    expect(block.querySelector('swc-tabs').hasAttribute('role')).to.be.false;
  });

  it('selects the first tab and lets SWC control panel visibility', async () => {
    const { block } = makeTabs();
    await init(block);

    const tabs = [...block.querySelectorAll('swc-tab')];
    const panels = [...block.querySelectorAll('swc-tab-panel')];
    expect(block.querySelector('swc-tabs').selected).to.equal(tabs[0].tabId);
    expect(tabs.map((tab) => tab.getAttribute('aria-selected'))).to.deep.equal(['true', 'false']);
    expect(tabs.map((tab) => tab.tabIndex)).to.deep.equal([0, -1]);
    expect(getComputedStyle(panels[0]).display).not.to.equal('none');
    expect(getComputedStyle(panels[1]).display).to.equal('none');
    expect(block.querySelector('.is-active, .is-visible')).to.be.null;
  });

  it('switches selection and panel visibility on click', async () => {
    const { block } = makeTabs();
    await init(block);
    const tabs = [...block.querySelectorAll('swc-tab')];
    const panels = [...block.querySelectorAll('swc-tab-panel')];

    tabs[1].click();
    await settle(block);

    expect(block.querySelector('swc-tabs').selected).to.equal(tabs[1].tabId);
    expect(tabs.map((tab) => tab.getAttribute('aria-selected'))).to.deep.equal(['false', 'true']);
    expect(getComputedStyle(panels[0]).display).to.equal('none');
    expect(getComputedStyle(panels[1]).display).not.to.equal('none');
  });

  it('uses SWC manual keyboard activation with roving focus', async () => {
    const { block } = makeTabs();
    await init(block);
    const tabs = [...block.querySelectorAll('swc-tab')];
    tabs[0].focus();

    tabs[0].dispatchEvent(new KeyboardEvent('keydown', {
      key: 'ArrowRight', code: 'ArrowRight', bubbles: true, composed: true,
    }));
    await settle(block);

    expect(document.activeElement === tabs[1]).to.be.true;
    expect(block.querySelector('swc-tabs').selected).to.equal(tabs[0].tabId);

    tabs[1].dispatchEvent(new KeyboardEvent('keydown', {
      key: 'Enter', code: 'Enter', bubbles: true, composed: true,
    }));
    await settle(block);

    expect(block.querySelector('swc-tabs').selected).to.equal(tabs[1].tabId);
  });

  it('limits panel collection to the nearest fragment', async () => {
    const main = document.createElement('main');
    main.innerHTML = '<div class="section outside"><p>Outside fragment</p></div>';
    document.body.append(main);
    const { parent, block, sections } = makeTabs({ container: 'fragment' });
    main.prepend(parent);

    await init(block);

    expect(block.querySelectorAll('swc-tab-panel')).to.have.length(sections.length);
    expect(main.querySelector(':scope > .outside')).not.to.be.null;
  });

  it('keeps generated accessibility IDs unique across independent tab groups', async () => {
    const first = makeTabs({ container: 'fragment' });
    const second = makeTabs({ container: 'fragment' });
    await Promise.all([init(first.block), init(second.block)]);

    const ids = [...document.querySelectorAll('swc-tab, swc-tab-panel')].map((el) => el.id);
    expect(new Set(ids).size).to.equal(ids.length);
  });

  it('preserves parent inline styles', async () => {
    const { parent, block } = makeTabs();
    parent.style.cssText = 'display: grid; color: red;';
    const before = parent.getAttribute('style');

    await init(block);

    expect(parent.getAttribute('style')).to.equal(before);
  });

  it('gives the tablist an accessible name, allowing an authored override', async () => {
    const { block } = makeTabs();
    block.setAttribute('aria-label', 'Product information');
    await init(block);

    const tablist = block.querySelector('swc-tabs').shadowRoot.querySelector('[role="tablist"]');
    expect(tablist.getAttribute('aria-label')).to.equal('Product information');
  });

  it('opens the panel containing the initial hash target', async () => {
    const { block, sections } = makeTabs();
    sections[1].innerHTML = '<h2 id="details">Details heading</h2>';
    window.history.replaceState(null, '', '#details');

    await init(block);

    const panel = sections[1].parentElement;
    expect(panel.localName).to.equal('swc-tab-panel');
    expect(block.querySelector('swc-tabs').selected).to.equal(panel.tabId);
    expect(panel.selected).to.be.true;
  });

  // TODO: unskip once the deep linking is figured out with page-nav
  it.skip('reveals a page-nav target and supplies its pending SWC update', async () => {
    const { block, sections } = makeTabs();
    sections[1].innerHTML = '<h2 id="details">Details heading</h2>';
    await init(block);
    const updates = [];
    const heading = sections[1].querySelector('h2');

    heading.dispatchEvent(new CustomEvent('page-nav:reveal-target', {
      bubbles: true,
      detail: { waitUntil: (update) => updates.push(update) },
    }));
    await Promise.all(updates);

    expect(updates).to.have.length(1);
    expect(sections[1].parentElement.selected).to.be.true;
    expect(getComputedStyle(sections[1].parentElement).display).not.to.equal('none');
    expect(document.querySelectorAll('main h2')).to.have.length(1);
  });

  // TODO: unskip once the deep linking is figured out with page-nav
  it.skip('reveals each containing tab group when a page-nav target is inside a nested fragment', async () => {
    const outer = makeTabs();
    const inner = makeTabs({ container: 'fragment' });
    outer.sections[1].append(inner.parent);
    inner.sections[1].innerHTML = '<h2>Nested heading</h2>';
    await Promise.all([init(outer.block), init(inner.block)]);
    const updates = [];

    inner.sections[1].querySelector('h2').dispatchEvent(new CustomEvent('page-nav:reveal-target', {
      bubbles: true,
      detail: { waitUntil: (update) => updates.push(update) },
    }));
    await Promise.all(updates);

    expect(updates).to.have.length(2);
    expect(outer.sections[1].parentElement.selected).to.be.true;
    expect(inner.sections[1].parentElement.selected).to.be.true;
  });

  it('preserves normal section loading for blocks inside the moved panels', async () => {
    setConfig({ components: [], hostnames: [], linkBlocks: [], log: logStub });
    const fragment = document.createElement('div');
    fragment.className = 'fragment-content';
    fragment.innerHTML = `
      <div>
        <div class="tabs"><div><div><ul><li>Overview</li><li>Details</li></ul></div></div></div>
      </div>
      <div>
        <h2>Overview heading</h2>
        <div class="columns"><div><div><p>Overview column</p></div></div></div>
      </div>
      <div>
        <h2>Details heading</h2>
        <div class="columns"><div><div><p>Details column</p></div></div></div>
      </div>
    `;
    document.body.append(fragment);

    await loadArea({ area: fragment });
    await settle(fragment.querySelector('.tabs'));

    expect(fragment.querySelectorAll('swc-tab-panel .columns .col-1')).to.have.length(2);
    expect(fragment.querySelectorAll('.section[data-status]')).to.have.length(0);
    expect(fragment.querySelectorAll('swc-tab-panel h2')).to.have.length(2);
    expect(logStub.called).to.be.false;
  });

  describe('section metadata boundaries', () => {
    it('groups original sections using pending metadata and leaves sections outside the range', async () => {
      const { parent, block, sections } = makeTabs({ panels: 6 });
      const markers = [
        markBoundary(sections[1], 'start'),
        markBoundary(sections[3], 'start'),
        markBoundary(sections[4], 'end'),
      ];
      const onClick = sinon.stub();
      sections[2].addEventListener('click', onClick);

      await init(block);

      const panels = [...block.querySelectorAll('swc-tab-panel')];
      expect(panels).to.have.length(2);
      expect([...panels[0].children]).to.deep.equal(sections.slice(1, 3));
      expect([...panels[1].children]).to.deep.equal(sections.slice(3, 5));
      expect(sections[0].parentElement === parent).to.be.true;
      expect(sections[5].parentElement === parent).to.be.true;
      expect(markers.every((marker) => marker.isConnected)).to.be.true;
      expect(sections[1].classList.contains('tabs-start')).to.be.false;
      sections[2].click();
      expect(onClick.calledOnce).to.be.true;
      expect(sections.every((section) => section.dataset.authored === 'preserved')).to.be.true;
      expect(logStub.called).to.be.false;
    });

    it('reads reflected boundaries after section metadata has already initialized', async () => {
      const { block, sections } = makeTabs({ panels: 4 });
      const markers = [
        markBoundary(sections[0], 'start'),
        markBoundary(sections[2], 'start'),
        markBoundary(sections[3], 'end'),
      ];
      await Promise.all(markers.map(initMetadata));

      await init(block);

      const panels = [...block.querySelectorAll('swc-tab-panel')];
      expect(panels).to.have.length(2);
      expect([...panels[0].children]).to.deep.equal(sections.slice(0, 2));
      expect([...panels[1].children]).to.deep.equal(sections.slice(2));
    });

    it('supports a final single-section panel with both start and end', async () => {
      const { block, sections } = makeTabs({ panels: 3 });
      markBoundary(sections[0], ' Start ');
      markBoundary(sections[2], ' Start, End ');

      await init(block);

      const panels = [...block.querySelectorAll('swc-tab-panel')];
      expect(panels).to.have.length(2);
      expect([...panels[0].children]).to.deep.equal(sections.slice(0, 2));
      expect([...panels[1].children]).to.deep.equal([sections[2]]);
    });

    it('switches visibility for every section in a grouped panel', async () => {
      const { block, sections } = makeTabs({ panels: 4 });
      markBoundary(sections[0], 'start');
      markBoundary(sections[2], 'start');
      markBoundary(sections[3], 'end');

      await init(block);
      const panels = [...block.querySelectorAll('swc-tab-panel')];
      expect(sections[2].checkVisibility()).to.be.false;
      expect(sections[3].checkVisibility()).to.be.false;
      block.querySelectorAll('swc-tab')[1].click();
      await settle(block);

      expect(getComputedStyle(panels[0]).display).to.equal('none');
      expect(getComputedStyle(panels[1]).display).not.to.equal('none');
      expect(sections[0].checkVisibility()).to.be.false;
      expect(sections[1].checkVisibility()).to.be.false;
      expect(sections[2].checkVisibility()).to.be.true;
      expect(sections[3].checkVisibility()).to.be.true;
    });

    it('opens a grouped panel for a hash target in its later section', async () => {
      const { block, sections } = makeTabs({ panels: 4 });
      markBoundary(sections[0], 'start');
      markBoundary(sections[2], 'start');
      markBoundary(sections[3], 'end');
      sections[3].querySelector('.default-content').innerHTML = '<h2 id="later-details">Later details</h2>';
      window.history.replaceState(null, '', '#later-details');

      await init(block);

      expect(block.querySelector('swc-tabs').selected).to.equal('tab-2');
      expect(sections[3].parentElement === sections[2].parentElement).to.be.true;
      expect(sections[3].parentElement.selected).to.be.true;
    });
    // TODO: unskip once the deep linking is figured out with page-nav
    it.skip('reveals a page-nav target in a later section of a grouped panel', async () => {
      const { block, sections } = makeTabs({ panels: 4 });
      markBoundary(sections[0], 'start');
      markBoundary(sections[2], 'start');
      markBoundary(sections[3], 'end');
      const heading = document.createElement('h2');
      heading.textContent = 'Later details';
      sections[3].append(heading);
      await init(block);
      const updates = [];

      heading.dispatchEvent(new CustomEvent('page-nav:reveal-target', {
        bubbles: true,
        detail: { waitUntil: (update) => updates.push(update) },
      }));
      await Promise.all(updates);

      expect(updates).to.have.length(1);
      expect(block.querySelector('swc-tabs').selected).to.equal('tab-2');
      expect(sections[3].parentElement === sections[2].parentElement).to.be.true;
      expect(heading.checkVisibility()).to.be.true;
    });

    it('does not use boundary metadata belonging to a nested fragment', async () => {
      const outer = makeTabs();
      const inner = makeTabs({ container: 'fragment', panels: 3 });
      markBoundary(inner.sections[0], 'start');
      markBoundary(inner.sections[2], 'start, end');
      outer.sections[1].append(inner.parent);

      await init(outer.block);
      await init(inner.block);

      expect(outer.block.querySelectorAll(':scope swc-tabs > swc-tab-panel')).to.have.length(4);
      expect(outer.sections[0].parentElement.localName).to.equal('swc-tab-panel');
      expect(inner.sections[0].parentElement === inner.sections[1].parentElement).to.be.true;
      expect(logStub.called).to.be.false;
    });

    it('supports independent marked groups in the same main', async () => {
      const first = makeTabs({ panels: 3 });
      const second = makeTabs({ panels: 3 });
      for (const group of [first, second]) {
        markBoundary(group.sections[0], 'start');
        markBoundary(group.sections[2], 'start, end');
      }
      first.parent.append(...second.parent.children);
      second.parent.remove();

      await Promise.all([init(first.block), init(second.block)]);

      expect(first.block.querySelectorAll('swc-tab-panel')).to.have.length(2);
      expect(second.block.querySelectorAll('swc-tab-panel')).to.have.length(2);
      expect(second.block.contains(first.sections[0])).to.be.false;
      expect(first.block.contains(second.sections[0])).to.be.false;
      expect(logStub.called).to.be.false;
    });

    it('keeps section metadata and nested block loading on the normal serial lifecycle', async () => {
      setConfig({ components: [], hostnames: [], linkBlocks: [], log: logStub });
      const fragment = document.createElement('div');
      fragment.className = 'fragment-content';
      fragment.innerHTML = `
        <div>
          <div class="tabs"><div><div><ul><li>Overview</li><li>Details</li></ul></div></div></div>
        </div>
        ${['start', '', 'start', 'end', ''].map((marker, index) => `
          <div>
            <h2>Section ${index + 1}</h2>
            <div class="columns"><div><div><p>Column ${index + 1}</p></div></div></div>
            <div class="section-metadata">
              ${marker ? `<div><div>tabs</div><div>${marker}</div></div>` : ''}
              <div><div>style</div><div>container</div></div>
              <div><div>spacing</div><div>xxl</div></div>
            </div>
          </div>
        `).join('')}
      `;
      document.body.append(fragment);
      const originalSections = [...fragment.children].slice(1);

      await loadArea({ area: fragment });

      const panels = [...fragment.querySelectorAll('swc-tab-panel')];
      expect(panels).to.have.length(2);
      expect([...panels[0].children]).to.deep.equal(originalSections.slice(0, 2));
      expect([...panels[1].children]).to.deep.equal(originalSections.slice(2, 4));
      expect(fragment.querySelectorAll('swc-tab-panel .columns .col-1')).to.have.length(4);
      expect(fragment.querySelectorAll('.columns .col-1')).to.have.length(5);
      expect(originalSections[4].parentElement === fragment).to.be.true;
      expect(originalSections.every((section) => section.matches('.container.spacing-xxl'))).to.be.true;
      expect(originalSections[0].classList.contains('tabs-start')).to.be.true;
      expect(originalSections[3].classList.contains('tabs-end')).to.be.true;
      expect(fragment.querySelectorAll('.section-metadata, .section[data-status]')).to.have.length(0);
      expect(logStub.called).to.be.false;
    });

    for (const { name, boundaries, labels = ['Overview', 'Details', 'Extra'] } of [
      { name: 'an end before any start', boundaries: ['end', 'start', 'end'] },
      { name: 'a missing group end', boundaries: ['start', null, 'start'] },
      { name: 'an unknown boundary value', boundaries: ['start', 'middle', 'end'] },
      { name: 'an empty boundary value', boundaries: ['start', '', 'start, end'] },
      { name: 'a panel count that differs from labels', boundaries: ['start', null, 'end'] },
      { name: 'a blank label in a marked group', boundaries: ['start', null, 'start, end'], labels: ['Overview', ' '] },
    ]) {
      it(`logs ${name} and leaves all content unchanged`, async () => {
        const { parent, block, sections } = makeTabs({ labels, panels: 3 });
        boundaries.forEach((value, index) => {
          if (value !== null) { markBoundary(sections[index], value); }
        });
        const before = parent.outerHTML;

        await init(block);

        expect(parent.outerHTML).to.equal(before);
        expect(logStub.calledOnce).to.be.true;
        expect(logStub.firstCall.args[1] === block).to.be.true;
      });
    }

    it('does not extend an unfinished range across another tabs block', async () => {
      const { parent, block, sections } = makeTabs({ labels: ['Overview', 'Details', 'Extra'], panels: 3 });
      markBoundary(sections[0], 'start');
      sections[1].innerHTML = '<div class="block-content"><div class="tabs"><ul><li>Other tab</li></ul></div></div>';
      markBoundary(sections[2], 'start, end');
      const before = parent.outerHTML;

      await init(block);

      expect(parent.outerHTML).to.equal(before);
      expect(logStub.calledOnce).to.be.true;
    });
  });

  for (const { name, labels, panels } of [
    { name: 'no labels', labels: [], panels: 2 },
    { name: 'a blank label', labels: ['Overview', ' '], panels: 2 },
    { name: 'more labels than panels', labels: ['Overview', 'Details'], panels: 1 },
    { name: 'fewer labels than panels', labels: ['Overview'], panels: 2 },
    { name: 'no following sections', labels: ['Overview'], panels: 0 },
  ]) {
    it(`logs ${name} and leaves content unchanged`, async () => {
      const { parent, block } = makeTabs({ labels, panels });
      const before = parent.outerHTML;

      await init(block);

      expect(parent.outerHTML).to.equal(before);
      expect(logStub.calledOnce).to.be.true;
      expect(logStub.firstCall.args[1] === block).to.be.true;
    });
  }

  it('logs a missing list without hiding or modifying the parent', async () => {
    const { parent, block } = makeTabs();
    block.querySelector('ul').remove();
    const before = parent.outerHTML;

    await init(block);

    expect(parent.outerHTML).to.equal(before);
    expect(logStub.calledOnce).to.be.true;
    expect(logStub.firstCall.args[1] === block).to.be.true;
  });

  it('logs a missing section container without changing the block', async () => {
    const block = document.createElement('div');
    block.className = 'tabs';
    block.innerHTML = '<div><div><ul><li>Overview</li></ul></div></div>';
    document.body.append(block);
    const before = block.outerHTML;

    await init(block);
    expect(block.outerHTML).to.equal(before);
    expect(logStub.calledOnce).to.be.true;
  });
});
