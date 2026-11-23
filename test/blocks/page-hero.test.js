import { expect } from '@esm-bundle/chai';
import sinon from 'sinon';
import { loadBlock, setConfig } from '../../scripts/ak.js';

const COMPONENT_PATH = '/web/swc/components/button';

// The per-component status slice component-status fetches (deps/status/<slug>.json).
const STATUS_SLICE = {
  web: {
    swc: { status: 'available' },
    figma: {
      status: 'experimental',
      figmaSource: 's2-web',
      figmaFile: 'xHBWBBIe2eo5vwoCeNrC4Q',
      figmaPageId: '9230:3620',
    },
  },
};

function setMeta(name, content) {
  document.head.querySelector(`meta[name="${name}"]`)?.remove();
  if (content === undefined) { return; }
  const meta = document.createElement('meta');
  meta.name = name;
  meta.content = content;
  document.head.append(meta);
}

// page-hero reads the page template once, at module-evaluation time, so a test
// that needs a different template imports a fresh copy behind a cache-busting
// query rather than trying to change it after the fact.
let runCount = 0;
async function loadPageHero({ template, description } = {}) {
  setMeta('template', template);
  setMeta('description', description);
  runCount += 1;
  const { default: init } = await import(`../../blocks/page-hero/page-hero.js?run=${runCount}`);
  return init;
}

// init() is synchronous and fires loadBlock without awaiting it, so returning
// from init only means the hero's own markup is in place — a nested block's
// decoration lands a few microtasks later.
function waitFor(predicate, description, timeout = 2000) {
  return new Promise((resolve, reject) => {
    const start = performance.now();
    const check = () => {
      if (predicate()) {
        resolve();
        return;
      }
      if (performance.now() - start > timeout) {
        reject(new Error(`timed out waiting for ${description}`));
        return;
      }
      setTimeout(check, 10);
    };
    check();
  });
}

describe('page-hero block', () => {
  let sandbox;
  const originalUrl = window.location.pathname + window.location.search + window.location.hash;

  beforeEach(() => {
    sandbox = sinon.createSandbox();
    document.body.innerHTML = '';
    // init() loads nested blocks via ak.js's loadBlock, which reads config.components —
    // normally set by scripts.js's loadPage(), which this file never calls.
    setConfig({ components: [] });
  });

  afterEach(() => {
    sandbox.restore();
    document.body.innerHTML = '';
    setMeta('template', undefined);
    setMeta('description', undefined);
    window.history.pushState({}, '', originalUrl);
  });

  // component-status fetches one slice per component (deps/status/<slug>.json).
  function stubStatusFetch(slice = STATUS_SLICE) {
    return sandbox.stub(window, 'fetch').callsFake((url) => {
      if (String(url).includes('/deps/status/')) {
        return Promise.resolve(new Response(JSON.stringify(slice), { status: 200 }));
      }
      return Promise.resolve(new Response('[]', { status: 200 }));
    });
  }

  function mount(children) {
    const el = document.createElement('div');
    el.className = 'page-hero';
    el.append(...children);
    document.body.append(el);
    return el;
  }

  function heading(text = 'Button') {
    const h1 = document.createElement('h1');
    h1.textContent = text;
    return h1;
  }

  function breadcrumbsBlock() {
    const div = document.createElement('div');
    div.className = 'breadcrumbs';
    return div;
  }

  function authoredStatusBlock() {
    const el = document.createElement('div');
    el.className = 'component-status';
    el.innerHTML = `
      <div><div><a href="/legacy">Code deprecated</a></div></div>
    `;
    return el;
  }

  for (const template of [undefined, 'component']) {
    it(`initializes an authored status nested in a ${template ?? 'non-component'} hero`, async () => {
      const fetch = stubStatusFetch();
      window.history.pushState({}, '', '/content/manual-status');
      const init = await loadPageHero({ template });
      const manualStatus = authoredStatusBlock();
      const el = mount([heading(), manualStatus]);

      init(el);

      expect(el.querySelectorAll('.component-status')).to.have.lengthOf(1);
      expect(manualStatus.dataset.blockName).to.equal('component-status');
      await waitFor(
        () => manualStatus.querySelector('.component-status-pill'),
        'the authored status pill',
      );
      expect(manualStatus.textContent.trim()).to.equal('Code deprecated');
      expect(fetch.called).to.be.false;
    });
  }

  describe('without a heading', () => {
    it('replaces the block content with a "No heading found" message', async () => {
      const init = await loadPageHero();
      const el = mount([document.createElement('p')]);

      init(el);

      expect(el.textContent).to.equal('No heading found');
      expect(el.children.length).to.equal(0);
    });

    it('does not load a nested breadcrumbs block', async () => {
      const init = await loadPageHero();
      const breadcrumbs = breadcrumbsBlock();
      const el = mount([breadcrumbs]);

      init(el);

      expect(breadcrumbs.dataset.blockName).to.be.undefined;
    });
  });

  describe('on a non-component page', () => {
    it('leaves the heading in place and adds nothing to it', async () => {
      const init = await loadPageHero();
      const h1 = heading();
      const el = mount([h1]);

      init(el);

      expect(el.contains(h1)).to.be.true;
      expect(el.children.length).to.equal(1);
    });

    it('adds neither a description nor a status block', async () => {
      const init = await loadPageHero({ description: 'A clickable action.' });
      const el = mount([heading()]);

      init(el);

      expect(el.querySelector('.description')).to.be.null;
      expect(el.querySelector('.component-status')).to.be.null;
    });

    it('leaves authored statuses outside the hero on non-component pages', async () => {
      const init = await loadPageHero();
      const el = mount([heading()]);
      const main = document.createElement('main');
      const section = document.createElement('div');
      const status = authoredStatusBlock();
      section.append(el, status);
      main.append(section);
      document.body.append(main);

      init(el);
      await loadBlock(status);

      expect(status.parentElement).to.equal(section);
      expect(el.querySelector('.component-status')).to.be.null;
    });

    it('still loads a nested breadcrumbs child (calls its real init)', async () => {
      window.history.pushState({}, '', COMPONENT_PATH);
      const init = await loadPageHero();
      const breadcrumbs = breadcrumbsBlock();
      const el = mount([breadcrumbs, heading()]);

      init(el);

      // dataset.blockName is stamped by ak.js's loadBlock before breadcrumbs' own
      // init replaces the placeholder <div> with a <nav> (WAI-ARIA breadcrumb
      // pattern) — check it first as proof loadBlock reached this block at all.
      expect(breadcrumbs.dataset.blockName).to.equal('breadcrumbs');
      await waitFor(() => el.querySelector('nav.breadcrumbs'), 'the breadcrumbs nav');
      expect(el.querySelector('nav.breadcrumbs').textContent).to.include('SWC');
    });

    it('lets breadcrumbs remove itself on a page its own resolveContext rejects', async () => {
      window.history.pushState({}, '', '/web/overview');
      const init = await loadPageHero();
      const breadcrumbs = breadcrumbsBlock();
      const el = mount([breadcrumbs, heading()]);

      init(el);

      await waitFor(() => !el.contains(breadcrumbs), 'the breadcrumbs block to be removed');
      expect(el.querySelector('nav.breadcrumbs')).to.be.null;
    });
  });

  describe('on a component page', () => {
    it('collapses source-only wrappers and sections without removing ordering markers', async () => {
      const init = await loadPageHero({ template: 'component' });
      const el = mount([heading()]);
      const main = document.createElement('main');
      const heroSection = document.createElement('div');
      heroSection.className = 'section';
      heroSection.append(el);
      const sourceSection = document.createElement('div');
      sourceSection.className = 'section';
      sourceSection.style.paddingBlock = '80px';
      sourceSection.style.borderBlockEnd = '1px solid black';
      const wrapper = document.createElement('div');
      wrapper.className = 'block-content';
      const status = authoredStatusBlock();
      wrapper.append(status);
      sourceSection.append(wrapper);
      main.append(heroSection, sourceSection);
      document.body.append(main);
      init(el);

      await loadBlock(status);

      expect(status.parentElement).to.equal(el);
      expect(sourceSection.isConnected).to.be.true;
      expect(wrapper.childNodes[0].nodeType).to.equal(Node.COMMENT_NODE);
      expect(getComputedStyle(wrapper).display).to.equal('none');
      expect(sourceSection.getBoundingClientRect().height).to.equal(0);
      expect(getComputedStyle(heroSection).display).not.to.equal('none');
    });

    it('preserves a source section containing other content', async () => {
      const init = await loadPageHero({ template: 'component' });
      const el = mount([heading()]);
      const main = document.createElement('main');
      const sourceSection = document.createElement('div');
      sourceSection.className = 'section';
      const wrapper = document.createElement('div');
      const status = authoredStatusBlock();
      wrapper.append(status);
      const content = document.createElement('p');
      content.textContent = 'Keep this documentation.';
      sourceSection.append(wrapper, content);
      main.append(el, sourceSection);
      document.body.append(main);
      init(el);

      await loadBlock(status);

      expect(getComputedStyle(wrapper).display).to.equal('none');
      expect(getComputedStyle(sourceSection).display).not.to.equal('none');
      expect(content.parentElement).to.equal(sourceSection);
      expect(content.getBoundingClientRect().height).to.be.greaterThan(0);
    });

    it('restores source containers when late content is inserted', async () => {
      const init = await loadPageHero({ template: 'component' });
      const el = mount([heading()]);
      const main = document.createElement('main');
      const section = document.createElement('div');
      const wrapper = document.createElement('div');
      const status = authoredStatusBlock();
      wrapper.append(status);
      section.append(wrapper);
      main.append(el, section);
      document.body.append(main);
      init(el);
      await loadBlock(status);
      expect(getComputedStyle(section).display).to.equal('none');

      const content = document.createTextNode('Late fragment content.');
      wrapper.append(content);
      await waitFor(() => getComputedStyle(section).display !== 'none', 'restored source content');

      expect(getComputedStyle(wrapper).display).not.to.equal('none');
      expect(wrapper.textContent).to.equal('Late fragment content.');
      content.textContent = ' ';
      await waitFor(() => getComputedStyle(section).display === 'none', 'empty source containers');
      expect(wrapper.firstChild.nodeType).to.equal(Node.COMMENT_NODE);
    });

    it('moves an authored status from another section after it decorates without generating automatic pills', async () => {
      const fetch = stubStatusFetch();
      window.history.pushState({}, '', COMPONENT_PATH);
      const init = await loadPageHero({ template: 'component', description: 'A clickable action.' });
      const el = mount([heading()]);
      const main = document.createElement('main');
      const heroSection = document.createElement('div');
      const manualSection = document.createElement('div');
      const manualStatus = authoredStatusBlock();
      heroSection.append(el);
      manualSection.append(manualStatus);
      main.append(heroSection, manualSection);
      document.body.append(main);

      init(el);

      expect(main.querySelectorAll('.component-status')).to.have.lengthOf(1);
      expect(el.querySelector('.component-status')).to.be.null;
      expect(el.querySelector('.description').textContent).to.equal('A clickable action.');
      expect(manualStatus.parentElement).to.equal(manualSection);
      expect(manualStatus.dataset.blockName).to.be.undefined;

      const link = manualStatus.querySelector('a');
      await loadBlock(manualStatus);

      expect(manualStatus.parentElement).to.equal(el);
      expect(manualStatus.previousElementSibling).to.equal(el.querySelector('.description'));
      expect(manualStatus.querySelector('a')).to.equal(link);
      expect(fetch.called).to.be.false;
    });

    it('keeps all authored statuses in authoring order and retains inherited audience settings', async () => {
      const fetch = stubStatusFetch();
      const init = await loadPageHero({ template: 'component' });
      const el = mount([heading()]);
      const main = document.createElement('main');
      const section = document.createElement('div');
      const privateSection = document.createElement('div');
      privateSection.className = 'audience-private';
      const publicSection = document.createElement('div');
      publicSection.className = 'audience-public';
      const first = authoredStatusBlock();
      const second = authoredStatusBlock();
      section.append(el);
      privateSection.append(first);
      publicSection.append(second);
      main.append(section, privateSection, publicSection);
      document.body.append(main);

      init(el);
      await loadBlock(second);
      await loadBlock(first);

      expect([...el.querySelectorAll('.component-status')]).to.deep.equal([first, second]);
      expect(first.previousElementSibling).to.equal(el.querySelector('.description'));
      expect(first.classList.contains('audience-private')).to.be.true;
      expect(second.classList.contains('audience-public')).to.be.true;
      expect(main.querySelectorAll('.component-status')).to.have.lengthOf(2);
      expect(fetch.called).to.be.false;
    });

    it('places an already-nested authored status after the description', async () => {
      const init = await loadPageHero({ template: 'component' });
      const status = authoredStatusBlock();
      const el = mount([heading(), status]);

      init(el);
      await waitFor(() => status.querySelector('.component-status-pill'), 'the authored pill');

      expect(status.previousElementSibling).to.equal(el.querySelector('.description'));
    });

    it('retains the audience of a status nested in a hero content wrapper', async () => {
      const init = await loadPageHero({ template: 'component' });
      const status = authoredStatusBlock();
      const wrapper = document.createElement('div');
      wrapper.className = 'audience-private';
      wrapper.append(status);
      const el = mount([heading(), wrapper]);
      const main = document.createElement('main');
      main.append(el);
      document.body.append(main);

      init(el);
      await waitFor(() => status.querySelector('.component-status-pill'), 'the nested authored pill');

      expect(status.classList.contains('audience-private')).to.be.true;
      expect(status.previousElementSibling).to.equal(el.querySelector('.description'));
    });

    it('keeps a late fragment before statuses authored in later sections', async () => {
      const init = await loadPageHero({ template: 'component' });
      const el = mount([heading()]);
      const main = document.createElement('main');
      const heroSection = document.createElement('div');
      const fragmentSection = document.createElement('div');
      fragmentSection.className = 'section';
      const laterSection = document.createElement('div');
      laterSection.className = 'section';
      const later = authoredStatusBlock();
      heroSection.append(el);
      laterSection.append(later);
      main.append(heroSection, fragmentSection, laterSection);
      document.body.append(main);
      init(el);
      await loadBlock(later);
      const fragment = document.createElement('div');
      const earlier = authoredStatusBlock();
      fragment.append(earlier);
      document.body.append(fragment);
      await loadBlock(earlier);

      fragmentSection.append(fragment);
      await waitFor(() => earlier.parentElement === el, 'the late fragment in the hero');

      const statuses = [...el.querySelectorAll('.component-status')];
      expect(statuses[0]).to.equal(earlier);
      expect(statuses[1]).to.equal(later);
      expect(fragmentSection.isConnected).to.be.true;
      expect(getComputedStyle(fragmentSection).display).to.equal('none');
      expect(getComputedStyle(laterSection).display).to.equal('none');
    });

    it('appends the description from metadata after the heading', async () => {
      stubStatusFetch();
      window.history.pushState({}, '', COMPONENT_PATH);
      const init = await loadPageHero({ template: 'component', description: 'A clickable action.' });
      const el = mount([heading()]);

      init(el);

      const desc = el.querySelector('p.description');
      expect(desc.textContent).to.equal('A clickable action.');
      expect(desc.previousElementSibling.tagName).to.equal('H1');
    });

    it('falls back to a placeholder when the page has no description metadata', async () => {
      stubStatusFetch();
      window.history.pushState({}, '', COMPONENT_PATH);
      const init = await loadPageHero({ template: 'component' });
      const el = mount([heading()]);

      init(el);

      expect(el.querySelector('p.description').textContent)
        .to.equal('No description found in metadata.');
    });

    it('appends a component-status block and loads it (calls its real init)', async () => {
      stubStatusFetch();
      window.history.pushState({}, '', COMPONENT_PATH);
      const init = await loadPageHero({ template: 'component' });
      const el = mount([heading()]);

      init(el);

      const status = el.querySelector('.component-status');
      expect(status.dataset.blockName).to.equal('component-status');
      await waitFor(
        () => status.querySelectorAll('.component-status-pill').length === 2,
        'the Development and Design status pills',
      );
      expect(status.getAttribute('role')).to.equal('group');
    });

    it('lets component-status remove itself when the path has no indexed component', async () => {
      stubStatusFetch();
      window.history.pushState({}, '', '/web/swc/get-started');
      const init = await loadPageHero({ template: 'component' });
      const el = mount([heading()]);

      init(el);

      const status = el.querySelector('.component-status');
      await waitFor(() => !el.contains(status), 'the component-status block to be removed');
    });

    it('loads a nested breadcrumbs child alongside the status block', async () => {
      stubStatusFetch();
      window.history.pushState({}, '', COMPONENT_PATH);
      const init = await loadPageHero({ template: 'component' });
      const breadcrumbs = breadcrumbsBlock();
      const el = mount([breadcrumbs, heading()]);

      init(el);

      expect(breadcrumbs.dataset.blockName).to.equal('breadcrumbs');
      expect(el.querySelector('.component-status').dataset.blockName).to.equal('component-status');
      await waitFor(() => el.querySelector('nav.breadcrumbs'), 'the breadcrumbs nav');
    });
  });

  it('ignores children that are not blocks it knows about', async () => {
    const init = await loadPageHero();
    const p = document.createElement('p');
    p.textContent = 'A clickable action.';
    const el = mount([heading(), p]);

    init(el);

    expect(p.dataset.blockName).to.be.undefined;
    expect(el.contains(p)).to.be.true;
  });
});
