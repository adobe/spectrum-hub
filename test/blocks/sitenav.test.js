import { expect } from '@esm-bundle/chai';
import sinon from 'sinon';

// sitenav.js runs a top-level IIFE that fetches nav content immediately on
// import. Stub fetch first so that hits a controlled 404 (short-circuiting
// the IIFE cleanly) instead of the network.
const bootstrapFetchStub = sinon.stub(window, 'fetch').resolves(new Response('', { status: 404 }));

const {
  decorateLevel, getSiteNav, getExpandButton, getTriggerButton, closeSitenav,
  isMobileViewport, setupOutsideClose, setupSitenavKeyboardHandling, setupSearchIntegration,
  syncLevel1Tooltips, decorateIndexBasedNav, decorateBadges, filterNavByIndex,
  findCurrentPageInNav,
} = await import('../../blocks/sitenav/sitenav.js');

bootstrapFetchStub.restore();

function buildNavList(html) {
  const wrapper = document.createElement('div');
  wrapper.innerHTML = html;
  return wrapper.querySelector('ul');
}

// Chai serializes both operands into its diff when an equality assertion fails.
// For document.activeElement that operand is usually <body> — a payload large
// enough to hang the test runner (0 passed, 0 failed, silent timeout) instead of
// reporting the failure. Compare identity as a boolean so a miss prints a
// readable message rather than the whole DOM.
function expectFocus(el, description) {
  const active = document.activeElement;
  const actual = active ? `<${active.tagName.toLowerCase()} class="${active.className}">` : 'nothing';
  expect(active === el, `expected focus on ${description}, got ${actual}`).to.be.true;
}

function stubMatchMedia(sandbox, matches) {
  const mql = {
    matches,
    addEventListener: sandbox.stub(),
    removeEventListener: sandbox.stub(),
  };
  sandbox.stub(window, 'matchMedia').returns(mql);
  return mql;
}

function stubIconFetch(sandbox) {
  return sandbox.stub(window, 'fetch').resolves(new Response('<svg></svg>', {
    status: 200,
    headers: { 'Content-Type': 'image/svg+xml' },
  }));
}

describe('sitenav block', () => {
  let sandbox;

  beforeEach(() => {
    sandbox = sinon.createSandbox();
    document.body.innerHTML = '';
    sessionStorage.clear();
  });

  afterEach(async () => {
    // swc-tooltip's own Lit update cycle is async; if a test leaves one newly
    // created without awaiting it, the *next* test's beforeEach wipes
    // document.body out from under it mid-render, logging an unrelated error.
    await Promise.all(
      [...document.querySelectorAll('swc-tooltip')].map((tooltip) => tooltip.updateComplete),
    );
    sandbox.restore();
  });

  describe('getSiteNav', () => {
    it('builds the #sitenav wrapper around a labelled nav landmark', () => {
      const { sitenav, nav } = getSiteNav();
      expect(sitenav.id).to.equal('sitenav');
      expect(nav.tagName).to.equal('NAV');
      expect(nav.getAttribute('aria-label')).to.equal('Spectrum Hub');
      expect(nav.parentElement).to.equal(sitenav);
    });

    it('starts expanded by default', () => {
      const { sitenav } = getSiteNav();
      expect(sitenav.hasAttribute('is-expanded')).to.be.true;
    });
  });

  describe('decorateLevel — accessible name for icon-only toggle buttons', () => {
    it('sets aria-label on the toggle button when the heading has a link (no visible label text)', () => {
      const ul = buildNavList(`
        <ul>
          <li>
            <p><a href="/web/rsp/components">Components</a></p>
            <ul><li><a href="/web/rsp/components/action-bar">Action bar</a></li></ul>
          </li>
        </ul>
      `);
      decorateLevel(ul, 2);
      const btn = ul.querySelector('button.level-2-button');
      expect(btn.getAttribute('aria-label')).to.equal('Components');
      expect(btn.textContent.trim()).to.equal('');
    });

    it('does not set aria-label when the heading has no link (visible label already present)', () => {
      const ul = buildNavList(`
        <ul>
          <li>
            <p>Foundations</p>
            <ul><li><a href="/foundations/overview">Overview</a></li></ul>
          </li>
        </ul>
      `);
      decorateLevel(ul, 1);
      const btn = ul.querySelector('button.level-1-button');
      expect(btn.hasAttribute('aria-label')).to.be.false;
      expect(btn.querySelector('.list-item-label').textContent).to.equal('Foundations');
    });
  });

  describe('decorateLevel — disclosure wiring', () => {
    it('points aria-controls at the menu wrapper it expands', () => {
      const ul = buildNavList(`
        <ul>
          <li>
            <p>Foundations</p>
            <ul><li><a href="/foundations/overview">Overview</a></li></ul>
          </li>
        </ul>
      `);
      decorateLevel(ul, 1);
      const btn = ul.querySelector('button.level-1-button');
      const menu = ul.querySelector('.level-2-menu');
      expect(menu.classList.contains('can-expand')).to.be.true;
      expect(btn.getAttribute('aria-controls')).to.equal(menu.id);
      expect(menu.id).to.equal('foundations');
    });

    it('starts collapsed and toggles aria-expanded on click', () => {
      const ul = buildNavList(`
        <ul>
          <li>
            <p>Foundations</p>
            <ul><li><a href="/foundations/overview">Overview</a></li></ul>
          </li>
        </ul>
      `);
      decorateLevel(ul, 1);
      const btn = ul.querySelector('button.level-1-button');
      expect(btn.getAttribute('aria-expanded')).to.equal('false');
      btn.click();
      expect(btn.getAttribute('aria-expanded')).to.equal('true');
      btn.click();
      expect(btn.getAttribute('aria-expanded')).to.equal('false');
    });

    it('leaves a leaf item (no nested list) as a plain link', () => {
      const ul = buildNavList('<ul><li><a href="/x">Overview</a></li></ul>');
      decorateLevel(ul, 1);
      expect(ul.querySelector('button')).to.be.null;
      expect(ul.querySelector('a').getAttribute('href')).to.equal('/x');
    });

    // Real content repeats this shape: the index-based nav stitches a sibling
    // "Components" item under each of rsp/swc/ios/android, so two menu
    // wrappers with the same label can legitimately land in the same list.
    it('disambiguates menu ids when sibling items share a label', () => {
      const ul = buildNavList(`
        <ul>
          <li>
            <p>Overview</p>
            <ul><li><a href="/web/rsp/overview/intro">Intro</a></li></ul>
          </li>
          <li>
            <p>Overview</p>
            <ul><li><a href="/web/swc/overview/intro">Intro</a></li></ul>
          </li>
        </ul>
      `);
      decorateLevel(ul, 1);
      const [firstBtn, secondBtn] = ul.querySelectorAll('button.level-1-button');
      const [firstMenu, secondMenu] = ul.querySelectorAll('.level-2-menu');

      expect(firstMenu.id).to.equal('overview');
      expect(secondMenu.id).to.equal('overview-2');
      expect(firstBtn.getAttribute('aria-controls')).to.equal(firstMenu.id);
      expect(secondBtn.getAttribute('aria-controls')).to.equal(secondMenu.id);
    });
  });

  describe('decorateLevel — depth-3 toggle buttons match depth-2 treatment', () => {
    function buildFourLevelList() {
      return buildNavList(`
        <ul>
          <li>
            <p>Foundations</p>
            <ul>
              <li>
                <p>Layout and structure</p>
                <ul>
                  <li>
                    <p>Spacing</p>
                    <ul>
                      <li>
                        <p>Overview</p>
                        <ul><li><a href="/x">Intro</a></li></ul>
                      </li>
                    </ul>
                  </li>
                </ul>
              </li>
            </ul>
          </li>
        </ul>
      `);
    }

    it('gives a depth-3 button the same expanding chevron icon as depth-2, but stops there', () => {
      const ul = buildFourLevelList();
      decorateLevel(ul, 1);

      const level1Btn = ul.querySelector('.level-1-button');
      const level2Btn = ul.querySelector('.level-2-button');
      const level3Btn = ul.querySelector('.level-3-button');
      const level4Btn = ul.querySelector('.level-4-button');

      expect(level1Btn.querySelector('.icon')).to.be.null;
      expect(level2Btn.querySelector('.icon')).to.not.be.null;
      expect(level3Btn.querySelector('.icon')).to.not.be.null;
      expect(level4Btn.querySelector('.icon')).to.be.null;
    });

    it('toggles aria-expanded on the depth-3 button independently, same as depth-2', () => {
      const ul = buildFourLevelList();
      decorateLevel(ul, 1);
      const level3Btn = ul.querySelector('.level-3-button');

      expect(level3Btn.getAttribute('aria-expanded')).to.equal('false');
      level3Btn.click();
      expect(level3Btn.getAttribute('aria-expanded')).to.equal('true');
      level3Btn.click();
      expect(level3Btn.getAttribute('aria-expanded')).to.equal('false');
    });

    it('keeps the depth-3 button immediately followed by its level-4-menu wrapper', () => {
      const ul = buildFourLevelList();
      decorateLevel(ul, 1);
      const level3Btn = ul.querySelector('.level-3-button');
      const level4Menu = ul.querySelector('.level-4-menu');

      expect(level3Btn.nextElementSibling).to.equal(level4Menu);
      expect(level4Menu.classList.contains('can-expand')).to.be.true;
      expect(level3Btn.getAttribute('aria-controls')).to.equal(level4Menu.id);
    });
  });

  describe('decorateLevel — level-1 tooltip id', () => {
    it('gives a level-1 button a stable id for a tooltip to target via `for`', () => {
      const ul = buildNavList(`
        <ul>
          <li><p>Foundations</p><ul><li><a href="/x">Overview</a></li></ul></li>
        </ul>
      `);
      decorateLevel(ul, 1);
      const btn = ul.querySelector('button.level-1-button');

      expect(btn.id).to.equal('sitenav-level-1-tooltip-foundations');
    });

    it('does not id a nested (depth 2+) button the same way', () => {
      const ul = buildNavList(`
        <ul>
          <li>
            <p>Foundations</p>
            <ul><li><p>Overview</p><ul><li><a href="/x">Intro</a></li></ul></li></ul>
          </li>
        </ul>
      `);
      decorateLevel(ul, 1);
      const level2Btn = ul.querySelector('button.level-2-button');

      expect(level2Btn.id).to.equal('');
    });
  });

  describe('syncLevel1Tooltips', () => {
    function buildSitenavWithLevel1(html) {
      const sitenav = document.createElement('div');
      sitenav.id = 'sitenav';
      const ul = buildNavList(html);
      decorateLevel(ul, 1);
      sitenav.append(ul);
      document.body.append(sitenav);
      return sitenav;
    }

    it('adds a tooltip for each level-1 button while the rail is collapsed (default)', () => {
      const sitenav = buildSitenavWithLevel1(`
        <ul>
          <li><p>Foundations</p><ul><li><a href="/x">Overview</a></li></ul></li>
        </ul>
      `);

      syncLevel1Tooltips(sitenav);

      const btn = sitenav.querySelector('.level-1-button');
      const tooltip = sitenav.querySelector('swc-tooltip');
      expect(tooltip).to.not.be.null;
      expect(tooltip.getAttribute('for')).to.equal(btn.id);
      expect(tooltip.getAttribute('placement')).to.equal('end');
      expect(tooltip.getAttribute('delay')).to.equal('200');
      expect(tooltip.textContent).to.equal('Foundations');
    });

    it('removes the tooltip once the rail is expanded', async () => {
      const sitenav = buildSitenavWithLevel1(`
        <ul>
          <li><p>Foundations</p><ul><li><a href="/x">Overview</a></li></ul></li>
        </ul>
      `);
      syncLevel1Tooltips(sitenav);
      // Let swc-tooltip's own Lit update cycle settle before removing it
      await sitenav.querySelector('swc-tooltip').updateComplete;

      sitenav.setAttribute('is-expanded', '');
      syncLevel1Tooltips(sitenav);

      expect(sitenav.querySelector('swc-tooltip')).to.be.null;
    });

    it('re-adds the tooltip once the rail collapses again', async () => {
      const sitenav = buildSitenavWithLevel1(`
        <ul>
          <li><p>Foundations</p><ul><li><a href="/x">Overview</a></li></ul></li>
        </ul>
      `);
      syncLevel1Tooltips(sitenav);
      await sitenav.querySelector('swc-tooltip').updateComplete;
      sitenav.setAttribute('is-expanded', '');
      syncLevel1Tooltips(sitenav);

      sitenav.removeAttribute('is-expanded');
      syncLevel1Tooltips(sitenav);
      await sitenav.querySelector('swc-tooltip').updateComplete;

      expect(sitenav.querySelector('swc-tooltip')).to.not.be.null;
    });

    it('does not duplicate a tooltip on repeated calls while collapsed', () => {
      const sitenav = buildSitenavWithLevel1(`
        <ul>
          <li><p>Foundations</p><ul><li><a href="/x">Overview</a></li></ul></li>
        </ul>
      `);

      syncLevel1Tooltips(sitenav);
      syncLevel1Tooltips(sitenav);

      expect(sitenav.querySelectorAll('swc-tooltip').length).to.equal(1);
    });

    it('does not add a tooltip for nested (depth 2+) buttons', () => {
      const sitenav = buildSitenavWithLevel1(`
        <ul>
          <li>
            <p>Foundations</p>
            <ul><li><p>Overview</p><ul><li><a href="/x">Intro</a></li></ul></li></ul>
          </li>
        </ul>
      `);

      syncLevel1Tooltips(sitenav);

      const level2Btn = sitenav.querySelector('button.level-2-button');
      expect(level2Btn.closest('li').querySelector('swc-tooltip')).to.be.null;
      expect(sitenav.querySelectorAll('swc-tooltip').length).to.equal(1);
    });

    it('does not break the button-to-menu adjacency the disclosure CSS relies on', () => {
      const sitenav = buildSitenavWithLevel1(`
        <ul>
          <li><p>Foundations</p><ul><li><a href="/x">Overview</a></li></ul></li>
        </ul>
      `);

      syncLevel1Tooltips(sitenav);

      const btn = sitenav.querySelector('.level-1-button');
      const menu = sitenav.querySelector('.level-2-menu');
      expect(btn.nextElementSibling).to.equal(menu);
    });

    it('uses the aria-label as the tooltip text for a linked heading', () => {
      const sitenav = buildSitenavWithLevel1(`
        <ul>
          <li>
            <p><a href="/web/rsp/components">Components</a></p>
            <ul><li><a href="/web/rsp/components/action-bar">Action bar</a></li></ul>
          </li>
        </ul>
      `);

      syncLevel1Tooltips(sitenav);

      expect(sitenav.querySelector('swc-tooltip').textContent).to.equal('Components');
    });
  });

  // decorateIndexBasedNav stitches query-index pages under the "Components"
  // item of a known implementation. It finds that item by the marker
  // decorateLevel stamps here, so the marker is the contract between them.
  describe('decorateLevel — index-based nav marker', () => {
    function buildImplList(parentLabel) {
      return buildNavList(`
        <ul>
          <li><p>${parentLabel}</p></li>
          <li>
            <p>Components</p>
            <ul><li>[auto-generated]</li></ul>
          </li>
        </ul>
      `);
    }

    it('marks a Components item that follows a known implementation with its prefix', () => {
      const ul = buildImplList('SWC');
      decorateLevel(ul, 2);
      const label = ul.querySelector('.list-item-label[index-based-nav-prefix]');
      expect(label.getAttribute('index-based-nav-prefix')).to.equal('/web/swc');
    });

    it('leaves a Components item unmarked when the preceding item is not a known implementation', () => {
      const ul = buildImplList('Foundations');
      decorateLevel(ul, 2);
      expect(ul.querySelector('[index-based-nav-prefix]')).to.be.null;
    });

    // The parent heading is authored with natural spacing ("Design only"), not
    // pre-hyphenated — decorateLevel normalizes spaces to hyphens to match the
    // "design-only" URL segment, the same way "RSP"/"SWC" already lowercase directly.
    it('marks a Components item that follows "Design only" with its prefix', () => {
      const ul = buildImplList('Design only');
      decorateLevel(ul, 2);
      const label = ul.querySelector('.list-item-label[index-based-nav-prefix]');
      expect(label.getAttribute('index-based-nav-prefix')).to.equal('/web/design-only');
    });

    it('matches the "Design only" parent label regardless of case', () => {
      const ul = buildImplList('DESIGN ONLY');
      decorateLevel(ul, 2);
      const label = ul.querySelector('.list-item-label[index-based-nav-prefix]');
      expect(label.getAttribute('index-based-nav-prefix')).to.equal('/web/design-only');
    });
  });

  describe('decorateIndexBasedNav + decorateBadges', () => {
    it('counts design-only pages from the query index, badges the label, and lists them', () => {
      const ul = buildNavList(`
        <ul>
          <li><p>Design only</p></li>
          <li>
            <p>Components</p>
            <ul><li>[auto-generated]</li></ul>
          </li>
        </ul>
      `);
      const navList = decorateLevel(ul, 2);
      const index = [
        { path: '/web/design-only/components/alert-banner', title: 'Alert banner' },
        { path: '/web/design-only/components/coach-mark', title: 'Coach mark' },
        { path: '/web/rsp/components/action-button', title: 'Action button' },
      ];

      decorateIndexBasedNav(navList, index);
      decorateBadges();

      const label = navList.querySelector('[index-based-nav-prefix="/web/design-only"]');
      const badge = label.nextElementSibling;
      expect(badge.classList.contains('count-badge')).to.be.true;
      expect(badge.textContent).to.equal('2');

      const items = [...navList.querySelectorAll('.level-3-list li')];
      expect(items.map((li) => li.querySelector('a').getAttribute('href'))).to.deep.equal([
        '/web/design-only/components/alert-banner',
        '/web/design-only/components/coach-mark',
      ]);
    });

    it('alphabetizes the auto-generated links by title, independent of the query index order', () => {
      const ul = buildNavList(`
        <ul>
          <li><p>SWC</p></li>
          <li>
            <p>Components</p>
            <ul><li>[auto-generated]</li></ul>
          </li>
        </ul>
      `);
      const navList = decorateLevel(ul, 2);
      const index = [
        { path: '/web/swc/components/zebra', title: 'Zebra' },
        { path: '/web/swc/components/action-bar', title: 'Action bar' },
        { path: '/web/swc/components/monkey', title: 'Monkey' },
        { path: '/web/swc/components/apple', title: 'Apple' },
      ];

      decorateIndexBasedNav(navList, index);

      const items = [...navList.querySelectorAll('.level-3-list li')];
      expect(items.map((li) => li.textContent)).to.deep.equal([
        'Action bar', 'Apple', 'Monkey', 'Zebra',
      ]);
    });
  });

  describe('filterNavByIndex', () => {
    const paths = (ul) => [...ul.querySelectorAll('a')].map((a) => a.getAttribute('href'));

    it('removes a leaf link whose path is not in the index', () => {
      const ul = buildNavList('<ul><li><a href="/a">A</a></li><li><a href="/secret">Secret</a></li></ul>');
      filterNavByIndex(ul, [{ path: '/a' }]);
      expect(paths(ul)).to.deep.equal(['/a']);
    });

    it('keeps a leaf whose path is in the index', () => {
      const ul = buildNavList('<ul><li><a href="/a">A</a></li></ul>');
      filterNavByIndex(ul, [{ path: '/a' }]);
      expect(paths(ul)).to.deep.equal(['/a']);
    });

    it('removes a private leaf but keeps the section parent and its visible siblings', () => {
      const ul = buildNavList(`
        <ul>
          <li>
            <p>Support</p>
            <ul>
              <li><a href="/support/faqs">FAQs</a></li>
              <li><a href="/support/contact">Contact</a></li>
            </ul>
          </li>
        </ul>
      `);
      filterNavByIndex(ul, [{ path: '/support/faqs' }]);
      expect(paths(ul)).to.deep.equal(['/support/faqs']);
      // The section wrapper (a parent with a nested list) is untouched.
      expect(ul.querySelector('li > p').textContent).to.equal('Support');
    });

    it('does not drop a parent whose own link is unindexed when it has children', () => {
      const ul = buildNavList(`
        <ul>
          <li>
            <p><a href="/parent">Parent</a></p>
            <ul><li><a href="/parent/child">Child</a></li></ul>
          </li>
        </ul>
      `);
      filterNavByIndex(ul, [{ path: '/parent/child' }]);
      expect(ul.querySelector('a[href="/parent"]')).to.not.be.null;
      expect(ul.querySelector('a[href="/parent/child"]')).to.not.be.null;
    });

    it('ignores external (non-root-relative) links', () => {
      const ul = buildNavList('<ul><li><a href="https://example.com">Ext</a></li></ul>');
      filterNavByIndex(ul, [{ path: '/a' }]);
      expect(ul.querySelector('a[href="https://example.com"]')).to.not.be.null;
    });

    it('is a no-op (fail-open) when the index is missing', () => {
      const ul = buildNavList('<ul><li><a href="/secret">Secret</a></li></ul>');
      filterNavByIndex(ul, null);
      expect(paths(ul)).to.deep.equal(['/secret']);
    });
  });

  describe('decorateLevel — level-1 mutual exclusivity', () => {
    it('collapses the previously-expanded level-1-button when a sibling is expanded', () => {
      const ul = buildNavList(`
        <ul>
          <li><p>Foundations</p><ul><li><a href="/x">Overview</a></li></ul></li>
          <li><p>Web</p><ul><li><a href="/y">Overview</a></li></ul></li>
        </ul>
      `);
      decorateLevel(ul, 1);
      const [first, second] = ul.querySelectorAll('button.level-1-button');

      first.click();
      expect(first.getAttribute('aria-expanded')).to.equal('true');

      second.click();
      expect(second.getAttribute('aria-expanded')).to.equal('true');
      expect(first.getAttribute('aria-expanded')).to.equal('false');
    });
  });

  describe('findCurrentPageInNav', () => {
    const originalUrl = window.location.pathname + window.location.search + window.location.hash;

    afterEach(() => {
      window.history.pushState({}, '', originalUrl);
    });

    function buildFourLevelNavList() {
      return buildNavList(`
        <ul>
          <li>
            <p>Foundations</p>
            <ul>
              <li>
                <p>Layout and structure</p>
                <ul>
                  <li>
                    <p>Spacing</p>
                    <ul>
                      <li><a href="/foundations/layout-and-structure/spacing/overview">Overview</a></li>
                    </ul>
                  </li>
                </ul>
              </li>
            </ul>
          </li>
        </ul>
      `);
    }

    it('marks the link matching the current path as the current page', () => {
      window.history.pushState({}, '', '/foundations/layout-and-structure/spacing/overview');
      const navList = buildFourLevelNavList();
      decorateLevel(navList, 1);

      const currentLink = findCurrentPageInNav(navList);

      expect(currentLink.classList.contains('is-current-page')).to.be.true;
      expect(currentLink.textContent.trim()).to.equal('Overview');
    });

    it('expands the level-1, level-2, and level-3 ancestor buttons so a level-4 current page is visible', () => {
      window.history.pushState({}, '', '/foundations/layout-and-structure/spacing/overview');
      const navList = buildFourLevelNavList();
      decorateLevel(navList, 1);

      findCurrentPageInNav(navList);

      const level1Btn = navList.querySelector('.level-1-button');
      const level2Btn = navList.querySelector('.level-2-button');
      const level3Btn = navList.querySelector('.level-3-button');

      expect(level1Btn.getAttribute('aria-expanded')).to.equal('true');
      expect(level2Btn.getAttribute('aria-expanded')).to.equal('true');
      expect(level3Btn.getAttribute('aria-expanded')).to.equal('true');
    });

    it('returns null and marks nothing when no link matches the current path', () => {
      window.history.pushState({}, '', '/nonexistent');
      const navList = buildFourLevelNavList();
      decorateLevel(navList, 1);

      const currentLink = findCurrentPageInNav(navList);

      expect(currentLink).to.be.null;
      expect(navList.querySelector('.is-current-page')).to.be.null;
    });
  });

  describe('getExpandButton — accessible name and state', () => {
    it('has an accessible label, aria-controls, and starts collapsed', async () => {
      stubMatchMedia(sandbox, false);
      stubIconFetch(sandbox);
      const sitenav = document.createElement('div');
      sitenav.id = 'sitenav';
      document.body.append(sitenav);

      const btn = await getExpandButton(sitenav);

      expect(btn.getAttribute('aria-label')).to.equal('Expand navigation');
      expect(btn.getAttribute('aria-expanded')).to.equal('false');
      expect(btn.getAttribute('aria-controls')).to.equal('sitenav');
    });

    it('renders a tooltip mirroring the aria-label, associated by id', async () => {
      stubMatchMedia(sandbox, false);
      stubIconFetch(sandbox);
      const sitenav = document.createElement('div');
      sitenav.id = 'sitenav';
      document.body.append(sitenav);

      const btn = await getExpandButton(sitenav);

      const tooltip = sitenav.querySelector('swc-tooltip');
      expect(tooltip.getAttribute('for')).to.equal(btn.id);
      expect(tooltip.textContent).to.equal('Expand navigation');
    });

    it('starts expanded when the sitenav already carries is-expanded', async () => {
      stubMatchMedia(sandbox, false);
      stubIconFetch(sandbox);
      const sitenav = document.createElement('div');
      sitenav.id = 'sitenav';
      sitenav.setAttribute('is-expanded', '');
      document.body.append(sitenav);

      const btn = await getExpandButton(sitenav);

      expect(btn.getAttribute('aria-label')).to.equal('Collapse navigation');
      expect(btn.getAttribute('aria-expanded')).to.equal('true');
    });
  });

  // The expand button widens/narrows the rail (is-expanded). Opening the
  // mobile tray (is-open) is getTriggerButton's job — see below.
  describe('getExpandButton — rail widen/narrow', () => {
    let sitenav;
    let btn;
    let main;

    beforeEach(async () => {
      stubMatchMedia(sandbox, false);
      stubIconFetch(sandbox);
      sitenav = document.createElement('div');
      sitenav.id = 'sitenav';
      main = document.createElement('main');
      document.body.append(main, sitenav);
      btn = await getExpandButton(sitenav);
      sitenav.append(btn);
    });

    it('toggles is-expanded and aria-expanded together on click', () => {
      btn.click();
      expect(sitenav.hasAttribute('is-expanded')).to.be.true;
      expect(btn.getAttribute('aria-expanded')).to.equal('true');

      btn.click();
      expect(sitenav.hasAttribute('is-expanded')).to.be.false;
      expect(btn.getAttribute('aria-expanded')).to.equal('false');
    });

    it('flips aria-label and the tooltip text together with is-expanded', () => {
      const tooltip = sitenav.querySelector('swc-tooltip');

      btn.click();
      expect(btn.getAttribute('aria-label')).to.equal('Collapse navigation');
      expect(tooltip.textContent).to.equal('Collapse navigation');

      btn.click();
      expect(btn.getAttribute('aria-label')).to.equal('Expand navigation');
      expect(tooltip.textContent).to.equal('Expand navigation');
    });

    it('does not open the mobile tray — the rail width is a separate state', () => {
      btn.click();
      expect(sitenav.hasAttribute('is-open')).to.be.false;
    });
  });

  describe('getTriggerButton — mobile tray', () => {
    let sitenav;
    let trigger;

    beforeEach(async () => {
      stubMatchMedia(sandbox, true);
      stubIconFetch(sandbox);
      sitenav = document.createElement('div');
      sitenav.id = 'sitenav';
      document.body.append(sitenav);
      trigger = await getTriggerButton(sitenav);
      sitenav.append(trigger);
    });

    it('has an accessible label, aria-controls, and starts collapsed', () => {
      expect(trigger.classList.contains('sitenav-trigger-btn')).to.be.true;
      expect(trigger.getAttribute('aria-label')).to.equal('Toggle site navigation');
      expect(trigger.getAttribute('aria-expanded')).to.equal('false');
      expect(trigger.getAttribute('aria-controls')).to.equal('sitenav');
    });

    it('opens the tray on the first tap', () => {
      trigger.click();
      expect(sitenav.hasAttribute('is-open')).to.be.true;
      expect(trigger.getAttribute('aria-expanded')).to.equal('true');
    });

    it('closes the tray on the second tap', () => {
      trigger.click();
      trigger.click();
      expect(sitenav.hasAttribute('is-open')).to.be.false;
      expect(trigger.getAttribute('aria-expanded')).to.equal('false');
    });

    it('collapses a drilled-in level-1-button as it closes', () => {
      const level1Btn = document.createElement('button');
      level1Btn.className = 'level-1-button';
      level1Btn.setAttribute('aria-expanded', 'true');
      sitenav.append(level1Btn);

      trigger.click();
      trigger.click();

      expect(level1Btn.getAttribute('aria-expanded')).to.equal('false');
      expect(sitenav.hasAttribute('is-open')).to.be.false;
    });
  });

  describe('closeSitenav', () => {
    it('removes is-open and collapses any expanded level-1-button', () => {
      stubMatchMedia(sandbox, true);
      const sitenav = document.createElement('div');
      sitenav.setAttribute('is-open', '');
      const level1Btn = document.createElement('button');
      level1Btn.className = 'level-1-button';
      level1Btn.setAttribute('aria-expanded', 'true');
      sitenav.append(level1Btn);
      document.body.append(sitenav);

      closeSitenav(sitenav);

      expect(sitenav.hasAttribute('is-open')).to.be.false;
      expect(level1Btn.getAttribute('aria-expanded')).to.equal('false');
    });

    it('resets the trigger button back to collapsed', () => {
      const sitenav = document.createElement('div');
      sitenav.setAttribute('is-open', '');
      const trigger = document.createElement('button');
      trigger.className = 'sitenav-trigger-btn';
      trigger.setAttribute('aria-expanded', 'true');
      sitenav.append(trigger);
      document.body.append(sitenav);

      closeSitenav(sitenav);

      expect(trigger.getAttribute('aria-expanded')).to.equal('false');
    });

    it('is a no-op when nothing is expanded', () => {
      const sitenav = document.createElement('div');
      document.body.append(sitenav);

      expect(() => closeSitenav(sitenav)).to.not.throw();
      expect(sitenav.hasAttribute('is-open')).to.be.false;
    });
  });

  // Migrated from header.test.js's old "header mobile navigation" suite, which
  // tested a button.mobile-nav-button + #main-nav-list that no longer exist —
  // that responsibility moved here when the sitenav took over primary site
  // navigation. The handlers live on document and only act while the tray is
  // open, so they are wired up explicitly rather than by the toggle buttons.
  describe('setupSitenavKeyboardHandling — Escape key', () => {
    let sitenav;
    let btn;

    beforeEach(async () => {
      stubIconFetch(sandbox);
      sitenav = document.createElement('div');
      sitenav.id = 'sitenav';
      document.body.append(sitenav);
      btn = await getExpandButton(sitenav);
      sitenav.append(btn);
      setupSitenavKeyboardHandling(sitenav, [btn]);
    });

    function pressEscape() {
      document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    }

    it('closes the open sitenav', () => {
      stubMatchMedia(sandbox, true);
      sitenav.setAttribute('is-open', '');

      pressEscape();

      expect(sitenav.hasAttribute('is-open')).to.be.false;
    });

    it('also collapses a drilled-in level-2 list, not just the sitenav itself', () => {
      stubMatchMedia(sandbox, true);
      const level1Btn = document.createElement('button');
      level1Btn.className = 'level-1-button';
      level1Btn.setAttribute('aria-expanded', 'true');
      sitenav.append(level1Btn);
      sitenav.setAttribute('is-open', '');

      pressEscape();

      expect(level1Btn.getAttribute('aria-expanded')).to.equal('false');
      expect(sitenav.hasAttribute('is-open')).to.be.false;
    });

    it('returns focus to the toggle button', () => {
      stubMatchMedia(sandbox, true);
      sitenav.setAttribute('is-open', '');

      pressEscape();

      expectFocus(btn, 'the sitenav toggle button');
    });

    it('closes on desktop too — Escape is not viewport-gated', () => {
      stubMatchMedia(sandbox, false);
      sitenav.setAttribute('is-open', '');

      pressEscape();

      expect(sitenav.hasAttribute('is-open')).to.be.false;
    });

    it('does nothing when the sitenav is already closed', () => {
      stubMatchMedia(sandbox, true);

      expect(() => pressEscape()).to.not.throw();
      expect(sitenav.hasAttribute('is-open')).to.be.false;
    });

    it('ignores other keys', () => {
      stubMatchMedia(sandbox, true);
      sitenav.setAttribute('is-open', '');

      document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));

      expect(sitenav.hasAttribute('is-open')).to.be.true;
    });
  });

  describe('setupSitenavKeyboardHandling — focus trap', () => {
    let sitenav;
    let btn;
    let navLink;

    beforeEach(async () => {
      stubIconFetch(sandbox);
      sitenav = document.createElement('div');
      sitenav.id = 'sitenav';
      document.body.append(sitenav);
      btn = await getExpandButton(sitenav);
      sitenav.append(btn);
      navLink = document.createElement('a');
      navLink.href = '/foo';
      navLink.textContent = 'Foo';
      sitenav.append(navLink);
      setupSitenavKeyboardHandling(sitenav, [btn]);
    });

    function pressTab({ shiftKey = false } = {}) {
      const event = new KeyboardEvent('keydown', {
        key: 'Tab', shiftKey, bubbles: true, cancelable: true,
      });
      document.dispatchEvent(event);
      return event;
    }

    it('wraps Tab from the last focusable element back to the first', () => {
      stubMatchMedia(sandbox, true);
      sitenav.setAttribute('is-open', '');
      navLink.focus();

      const event = pressTab();

      expect(event.defaultPrevented).to.be.true;
      expectFocus(btn, 'the first focusable element in the tray');
    });

    it('wraps Shift+Tab from the first focusable element to the last', () => {
      stubMatchMedia(sandbox, true);
      sitenav.setAttribute('is-open', '');
      btn.focus();

      const event = pressTab({ shiftKey: true });

      expect(event.defaultPrevented).to.be.true;
      expectFocus(navLink, 'the last focusable element in the tray');
    });

    it('leaves Tab alone in the middle of the tray', () => {
      stubMatchMedia(sandbox, true);
      sitenav.setAttribute('is-open', '');
      btn.focus();

      expect(pressTab().defaultPrevented).to.be.false;
    });

    it('does not trap Tab while the tray is closed', () => {
      stubMatchMedia(sandbox, true);
      navLink.focus();

      expect(pressTab().defaultPrevented).to.be.false;
    });

    // The desktop rail sits beside the content rather than over it, so focus
    // must be free to leave it.
    it('does not trap Tab on desktop', () => {
      stubMatchMedia(sandbox, false);
      sitenav.setAttribute('is-open', '');
      navLink.focus();

      expect(pressTab().defaultPrevented).to.be.false;
    });
  });

  describe('setupOutsideClose', () => {
    let sitenav;
    let outside;

    beforeEach(() => {
      sitenav = document.createElement('div');
      sitenav.id = 'sitenav';
      const inside = document.createElement('button');
      inside.className = 'inside';
      sitenav.append(inside);
      outside = document.createElement('button');
      document.body.append(sitenav, outside);
      setupOutsideClose(sitenav);
    });

    it('closes the open tray when the click lands outside it on mobile', () => {
      stubMatchMedia(sandbox, true);
      sitenav.setAttribute('is-open', '');

      outside.click();

      expect(sitenav.hasAttribute('is-open')).to.be.false;
    });

    it('ignores clicks inside the tray', () => {
      stubMatchMedia(sandbox, true);
      sitenav.setAttribute('is-open', '');

      sitenav.querySelector('.inside').click();

      expect(sitenav.hasAttribute('is-open')).to.be.true;
    });

    // The desktop rail is in-flow, so clicking the page beside it is not a
    // dismiss gesture the way tapping outside a floating overlay is.
    it('ignores outside clicks on desktop', () => {
      stubMatchMedia(sandbox, false);
      sitenav.setAttribute('is-open', '');

      outside.click();

      expect(sitenav.hasAttribute('is-open')).to.be.true;
    });

    it('does nothing when the tray is already closed', () => {
      stubMatchMedia(sandbox, true);

      expect(() => outside.click()).to.not.throw();
      expect(sitenav.hasAttribute('is-open')).to.be.false;
    });
  });

  describe('isMobileViewport', () => {
    it('is true below the 900px breakpoint', () => {
      const mql = stubMatchMedia(sandbox, true);
      expect(isMobileViewport()).to.be.true;
      expect(window.matchMedia.calledWith('(width < 900px)')).to.be.true;
      expect(mql.matches).to.be.true;
    });

    it('is false at or above the breakpoint', () => {
      stubMatchMedia(sandbox, false);
      expect(isMobileViewport()).to.be.false;
    });
  });

  describe('setupSearchIntegration', () => {
    let navList;

    beforeEach(() => {
      navList = buildNavList(`
        <ul>
          <li><p>Getting started</p><ul><li><a href="/a">a</a></li></ul></li>
          <li><p>Foundations</p><ul><li><a href="/b">b</a></li></ul></li>
        </ul>
      `);
      decorateLevel(navList, 1);
      document.body.append(navList);
      setupSearchIntegration(navList);
    });

    afterEach(() => navList.remove());

    it('expands the level-1 button matching the dispatched label', () => {
      document.dispatchEvent(new CustomEvent('sitenav:expand-level1', { detail: { label: 'Foundations' } }));

      const btn = navList.querySelector('.level-1-button[aria-controls="foundations"]');
      expect(btn.getAttribute('aria-expanded')).to.equal('true');
    });

    it('does nothing when no level-1 button matches the label', () => {
      document.dispatchEvent(new CustomEvent('sitenav:expand-level1', { detail: { label: 'Nonexistent' } }));

      const anyExpanded = [...navList.querySelectorAll('.level-1-button')]
        .some((btn) => btn.getAttribute('aria-expanded') === 'true');
      expect(anyExpanded).to.be.false;
    });
  });
});
