import { expect } from '@esm-bundle/chai';
import sinon from 'sinon';
import { getConfig, setConfig } from '../../scripts/ak.js';

// sitenav.js calls initSitenav at module scope and fetches nav content immediately on
// import. Stub fetch first so that hits a controlled 404 (short-circuiting
// initialization cleanly) instead of the network.
const bootstrapFetchStub = sinon.stub(window, 'fetch').resolves(new Response('', { status: 404 }));

const {
  decorateLevel, getSiteNav, getExpandButton, getTriggerButton, closeSitenav,
  isMobileViewport, setupOutsideClose, setupSitenavKeyboardHandling, setupSearchIntegration,
  syncLevel1Tooltips, decorateIndexBasedNav, decorateBadges, filterNavByIndex,
  findCurrentPageInNav, removeEmptyMenus, setupRovingTabindex,
  restoreMenuScroll, setupScrollMemory, parseNavSource, buildSitenav, fetchNavSource,
  createSitenavController, initSitenav,
} = await import('../../blocks/sitenav/sitenav.js');
const { CACHE_KEY, CACHE_VERSION } = await import('../../blocks/sitenav/sitenav-cache.js');

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

function setMeta(name, content) {
  document.head.querySelector(`meta[name="${name}"]`)?.remove();
  if (content === undefined) { return; }
  const meta = document.createElement('meta');
  meta.name = name;
  meta.content = content;
  document.head.append(meta);
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
    setMeta('template', undefined);
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

    it('starts collapsed when the page has no marketing template', () => {
      const { sitenav } = getSiteNav();
      expect(sitenav.hasAttribute('is-expanded')).to.be.false;
    });

    it('starts collapsed for a non-marketing template (e.g. component pages)', () => {
      setMeta('template', 'component');
      const { sitenav } = getSiteNav();
      expect(sitenav.hasAttribute('is-expanded')).to.be.false;
    });

    it('starts expanded when the page has the marketing template', () => {
      setMeta('template', 'marketing');
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
      expect(menu.id).to.equal('sitenav-menu-foundations');
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

    // The reason menu ids carry a prefix: a category label slugifies to the same
    // string as an unrelated element's id often enough on a docs page, and whichever
    // one lost would silently break aria-controls.
    it('namespaces the menu id so it cannot collide with an unrelated page id', () => {
      const heading = document.createElement('h2');
      heading.id = 'typography';
      document.body.append(heading);

      const ul = buildNavList(`
        <ul>
          <li>
            <p>Typography</p>
            <ul><li><a href="/foundations/typography/scale">Scale</a></li></ul>
          </li>
        </ul>
      `);
      decorateLevel(ul, 1);
      document.body.append(ul);

      try {
        const menu = ul.querySelector('.level-2-menu');
        const btn = ul.querySelector('button.level-1-button');
        expect(menu.id).to.not.equal(heading.id);
        const controlled = document.getElementById(btn.getAttribute('aria-controls'));
        expect(controlled === menu).to.be.true;
      } finally {
        heading.remove();
        ul.remove();
      }
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

      expect(firstMenu.id).to.equal('sitenav-menu-overview');
      expect(secondMenu.id).to.equal('sitenav-menu-overview-2');
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

  describe('decorateLevel — sublists are named by the control that opens them', () => {
    // Matches sp-sidenav, which labels each nested role="list" back to its item. Without
    // it the flyout is an unnamed list. On the <ul>, not the wrapper: a role-less <div>
    // ignores aria-labelledby.
    function buildTwoDeep() {
      const ul = buildNavList(`
        <ul>
          <li><p>Web</p>
            <ul>
              <li><p>Components</p>
                <ul><li><a href="/web/button">Button</a></li></ul>
              </li>
            </ul>
          </li>
        </ul>`);
      return decorateLevel(ul, 1);
    }

    it('labels the level-2 list with the level-1 button', () => {
      const navList = buildTwoDeep();
      const lvl2 = navList.querySelector('.level-2-list');
      const btn = navList.querySelector('.level-1-button');
      expect(lvl2.getAttribute('aria-labelledby')).to.equal(btn.id);
      expect(btn.id).to.not.be.empty;
    });

    it('labels the level-3 list with the level-2 button', () => {
      const navList = buildTwoDeep();
      const lvl3 = navList.querySelector('.level-3-list');
      const btn = navList.querySelector('.level-2-button');
      expect(lvl3.getAttribute('aria-labelledby')).to.equal(btn.id);
      expect(btn.id).to.not.be.empty;
    });

    it('points every label at an id that actually resolves', () => {
      const navList = buildTwoDeep();
      document.body.append(navList);
      const labelled = [...navList.querySelectorAll('[aria-labelledby]')];
      expect(labelled.length).to.be.greaterThan(0);
      expect(labelled.every((el) => document.getElementById(el.getAttribute('aria-labelledby')))).to.be.true;
    });

    it('reuses the level-1 button id the tooltip already relies on', () => {
      const navList = buildTwoDeep();
      const btn = navList.querySelector('.level-1-button');
      expect(btn.id).to.equal('sitenav-level-1-tooltip-web');
      expect(navList.querySelector('.level-2-list').getAttribute('aria-labelledby')).to.equal(btn.id);
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

    it('does not give a nested (depth 2+) button the level-1 tooltip id', () => {
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

      expect(level2Btn.id).to.not.match(/^sitenav-level-1-tooltip-/);
      // It still needs *an* id: its sublist is labelled by it (see the sublist naming
      // tests above), so only the tooltip scheme is level-1's alone.
      expect(level2Btn.id).to.equal('overview-button');
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

    // Authors moved from the short forms ("RSP"/"SWC") to the full product names.
    // Both must resolve to the same URL segment, since the prefix comes from the
    // implementation id rather than the authored text.
    it('marks a Components item that follows a full implementation name', () => {
      const ul = buildImplList('Spectrum Web Components');
      decorateLevel(ul, 2);
      const label = ul.querySelector('.list-item-label[index-based-nav-prefix]');
      expect(label.getAttribute('index-based-nav-prefix')).to.equal('/web/swc');
    });

    it('marks a Components item that follows "React Spectrum" with the rsp prefix', () => {
      const ul = buildImplList('React Spectrum');
      decorateLevel(ul, 2);
      const label = ul.querySelector('.list-item-label[index-based-nav-prefix]');
      expect(label.getAttribute('index-based-nav-prefix')).to.equal('/web/rsp');
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

    // "Figma" is the design-only shortLabel, so it maps to the same prefix.
    it('marks a Components item that follows "Figma" with the design-only prefix', () => {
      const ul = buildImplList('Figma');
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
    // A row with no title would otherwise render <a href="..."></a> — a link with no
    // accessible name (WCAG 2.4.4 / 4.1.2). axe misses it: collapsed flyouts are
    // visibility:hidden when the page is scanned.
    it('skips index entries with no title rather than emitting a nameless link', () => {
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
      decorateIndexBasedNav(navList, [
        { path: '/web/swc/components/button', title: 'Button' },
        { path: '/web/swc/components/patterns/conversational-ai', title: '' },
      ]);

      const links = [...navList.querySelectorAll('.level-3-list a')];
      expect(links.map((a) => a.getAttribute('href'))).to.deep.equal(['/web/swc/components/button']);
      expect(links.every((a) => a.textContent.trim())).to.be.true;
    });

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

      const state = decorateIndexBasedNav(navList, index);
      decorateBadges(state);

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

    describe('parseNavSource', () => {
      it('returns a canonical anonymous-filtered pre-decoration list', async () => {
        const source = await parseNavSource(`
          <main>
            <ul>
              <li><span class="icon icon-home"></span><a href="/public">Public</a></li>
              <li class="audience-private"><a href="/private">Private</a></li>
            </ul>
          </main>
        `, [{ path: '/public', title: 'Public' }], {
          anonymous: true,
          cdnEnv: true,
        });

        expect(source.filteredListHtml).to.include('span class="icon icon-home"');
        expect(source.filteredListHtml).to.not.include('/private');
        expect(source.indexRows).to.deep.equal([{ path: '/public', title: 'Public' }]);
      });

      it('removes the public duplicate for an authenticated visitor', async () => {
        const source = await parseNavSource(`
          <main>
            <ul>
              <li class="audience-public"><a href="/shared">Public</a></li>
              <li class="audience-private"><a href="/shared">Private</a></li>
            </ul>
          </main>
        `, [{ path: '/shared', title: 'Shared' }], {
          anonymous: false,
          cdnEnv: true,
        });

        expect(source.filteredListHtml).to.not.include('>Public<');
        expect(source.filteredListHtml).to.include('>Private<');
      });

      it('removes audience-gated wrappers before selecting the root list', async () => {
        const source = await parseNavSource(`
          <main>
            <div class="audience-public">
              <ul><li><a href="/public">Public</a></li></ul>
            </div>
            <div class="audience-private">
              <ul><li><a href="/private">Private</a></li></ul>
            </div>
          </main>
        `, [{ path: '/public', title: 'Public' }], {
          anonymous: true,
          cdnEnv: true,
        });

        expect(source.filteredListHtml).to.include('>Public<');
        expect(source.filteredListHtml).to.not.include('>Private<');
      });

      it('rejects responses without exactly one usable root list', async () => {
        expect(await parseNavSource('<main><p>No list</p></main>', [], {
          cdnEnv: true,
        })).to.be.null;
        expect(await parseNavSource('<main><ul></ul><ul><li>Two</li></ul></main>', [], {
          cdnEnv: true,
        })).to.be.null;
        expect(await parseNavSource('<main><ul></ul></main>', [], {
          cdnEnv: true,
        })).to.be.null;
      });

      it('uses configured hostnames when filtering canonical source links', async () => {
        const source = await parseNavSource(`
          <main>
            <ul>
              <li><a href="https://spectrum.adobe.com/private">Private</a></li>
              <li><a href="https://example.com/external">External</a></li>
            </ul>
          </main>
        `, [], {
          anonymous: true,
          cdnEnv: true,
          hostnames: ['spectrum.adobe.com'],
        });

        expect(source.filteredListHtml).to.not.include('spectrum.adobe.com/private');
        expect(source.filteredListHtml).to.include('example.com/external');
      });

      it('uses a synthetic main so off-CDN bare markup keeps preview audience behavior', async () => {
        const config = getConfig();
        setConfig({ ...config, cdnEnv: false });
        try {
          const source = await parseNavSource(`
            <ul>
              <li class="audience-public"><a href="/public">Public</a></li>
              <li class="audience-private"><a href="/private">Private</a></li>
              <li><a href="/unknown">Unknown</a></li>
            </ul>
          `, [
            { path: '/public', title: 'Public' },
            { path: '/private', title: 'Private' },
          ], { cdnEnv: false });

          expect(source.filteredListHtml).to.not.include('>Public<');
          expect(source.filteredListHtml).to.include('>Private<');
          expect(source.filteredListHtml).to.not.include('/unknown');
          expect(source.indexRows).to.deep.equal([
            { path: '/public', title: 'Public' },
            { path: '/private', title: 'Private' },
          ]);
        } finally {
          setConfig(config);
        }
      });

      it('normalizes already-converted off-CDN SVG icons to canonical placeholders', async () => {
        const config = getConfig();
        setConfig({ ...config, cdnEnv: false });
        try {
          const source = await parseNavSource(`
            <ul>
              <li>
                <svg class="icon icon-home"><use href="/img/icons/s2-icon-home-20-n.svg#icon"></use></svg>
                <a href="/public">Public</a>
              </li>
            </ul>
          `, [{ path: '/public', title: 'Public' }], { cdnEnv: false });

          expect(source.filteredListHtml).to.include('<span class="icon icon-home"></span>');
          expect(source.filteredListHtml).to.not.include('<svg');
        } finally {
          setConfig(config);
        }
      });

      it('fails open for a null index but filters local leaves for a successful empty index', async () => {
        const html = '<main><ul><li><a href="/unknown">Unknown</a></li></ul></main>';

        const failed = await parseNavSource(html, null, { cdnEnv: true });
        const empty = await parseNavSource(html, [], { cdnEnv: true });

        expect(failed.filteredListHtml).to.include('/unknown');
        expect(failed.indexRows).to.be.null;
        expect(empty.filteredListHtml).to.not.include('/unknown');
        expect(empty.indexRows).to.deep.equal([]);
      });

      it('fetches plain nav text and an authenticated compact index through focused requests', async () => {
        const fetchImpl = sandbox.stub();
        fetchImpl.onFirstCall().resolves(new Response(
          '<main><ul><li><a href="/public">Public</a></li></ul></main>',
          { status: 200 },
        ));
        fetchImpl.onSecondCall().resolves(new Response(JSON.stringify({
          data: [{ path: '/public', title: 'Public' }],
        }), { status: 200 }));

        const source = await fetchNavSource({
          anonymous: false,
          config: { cdnEnv: true, hostnames: [] },
          fetchImpl,
        });

        expect(fetchImpl.firstCall.args).to.deep.equal([
          '/fragments/nav/site-nav.plain.html',
          undefined,
        ]);
        expect(fetchImpl.secondCall.args).to.deep.equal([
          '/query-index.json?compact=true',
          { cache: 'no-store' },
        ]);
        expect(source.indexRows).to.deep.equal([{ path: '/public', title: 'Public' }]);
      });

      it('represents an index request failure as null and keeps authored links', async () => {
        const fetchImpl = sandbox.stub();
        fetchImpl.onFirstCall().resolves(new Response(
          '<main><ul><li><a href="/public">Public</a></li></ul></main>',
          { status: 200 },
        ));
        fetchImpl.onSecondCall().rejects(new Error('index unavailable'));

        const source = await fetchNavSource({
          anonymous: true,
          config: { cdnEnv: true, hostnames: [], log: sandbox.stub() },
          fetchImpl,
        });

        expect(source.indexRows).to.be.null;
        expect(source.filteredListHtml).to.include('/public');
      });

      it('treats a mixed valid and malformed successful index payload as a failed index', async () => {
        const fetchImpl = sandbox.stub();
        fetchImpl.onFirstCall().resolves(new Response(
          '<main><ul><li><a href="/public">Public</a></li></ul></main>',
          { status: 200 },
        ));
        fetchImpl.onSecondCall().resolves(new Response(JSON.stringify({
          data: [
            { path: '/public', title: 'Public' },
            { path: '/malformed', title: null },
          ],
        }), { status: 200 }));

        const source = await fetchNavSource({
          anonymous: true,
          config: { cdnEnv: true, hostnames: [] },
          fetchImpl,
        });

        expect(source.indexRows).to.be.null;
        expect(source.filteredListHtml).to.include('/public');
      });
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

    it('filters same-site and configured-host absolute links but leaves external origins', () => {
      const ul = buildNavList(`
        <ul>
          <li><a href="https://${window.location.hostname}/same-host-private">Same host</a></li>
          <li><a href="https://spectrum.adobe.com/configured-private">Configured</a></li>
          <li><a href="https://example.com/external">External</a></li>
        </ul>
      `);

      filterNavByIndex(ul, [], { hostnames: ['spectrum.adobe.com'] });

      expect(paths(ul)).to.deep.equal(['https://example.com/external']);
    });

    it('leaves document-relative authored links untouched', () => {
      const ul = buildNavList('<ul><li><a href="relative-page">Relative</a></li></ul>');

      filterNavByIndex(ul, []);

      expect(paths(ul)).to.deep.equal(['relative-page']);
    });

    it('is a no-op (fail-open) when the index is missing', () => {
      const ul = buildNavList('<ul><li><a href="/secret">Secret</a></li></ul>');
      filterNavByIndex(ul, null);
      expect(paths(ul)).to.deep.equal(['/secret']);
    });
  });

  describe('buildSitenav', () => {
    const repeatableSource = {
      filteredListHtml: `
        <ul>
          <li>
            <p>Web</p>
            <ul>
              <li><p>SWC</p></li>
              <li>
                <p>Components</p>
                <ul><li>[auto-generated]</li></ul>
              </li>
            </ul>
          </li>
        </ul>
      `,
      indexRows: [{ path: '/web/swc/components/button', title: 'Button' }],
    };

    it('builds the same source twice with independent badge counts and markup', () => {
      const first = buildSitenav(repeatableSource);
      const second = buildSitenav(repeatableSource);

      expect(first.navList.querySelector('.count-badge').textContent).to.equal('1');
      expect(second.navList.querySelector('.count-badge').textContent).to.equal('1');
      expect(second.navList.outerHTML).to.equal(first.navList.outerHTML);
    });

    it('upgrades icon placeholders synchronously and preserves icon-size classes', () => {
      const built = buildSitenav({
        filteredListHtml: `
          <ul>
            <li><a href="/home"><span class="icon icon-home"></span>Home</a></li>
            <li><a href="/sized"><span class="icon icon-size-300"></span>Sized</a></li>
          </ul>
        `,
        indexRows: null,
      });

      const icon = built.navList.querySelector('svg.icon-home');
      expect(icon).to.not.be.null;
      expect(icon.querySelector('use').getAttribute('href')).to.include('s2-icon-home-20-n.svg#icon');
      expect(built.navList.querySelector('span.icon')).to.be.null;
      expect(built.navList.querySelector('a.text-size-300')).to.not.be.null;
    });

    it('creates both controls synchronously without fetching SVG documents', () => {
      const fetchSpy = sandbox.spy(window, 'fetch');

      const built = buildSitenav({
        filteredListHtml: '<ul><li><a href="/public">Public</a></li></ul>',
        indexRows: null,
      });

      expect(built.sitenav.querySelector('.sitenav-expand-btn')).to.not.be.null;
      expect(built.sitenav.querySelector('.sitenav-trigger-btn')).to.not.be.null;
      expect(built.buttons.length).to.equal(2);
      expect(built.buttons[0].querySelector('use').getAttribute('href'))
        .to.include('s2-icon-expandright-20-n.svg#icon');
      expect(built.buttons[1].querySelector('use').getAttribute('href'))
        .to.include('s2-icon-appsall-20-n.svg#icon');
      expect(fetchSpy.called).to.be.false;
    });

    it('does not attach document or window listeners while detached', () => {
      const documentSpy = sandbox.spy(document, 'addEventListener');
      const windowSpy = sandbox.spy(window, 'addEventListener');

      buildSitenav({
        filteredListHtml: '<ul><li><a href="/public">Public</a></li></ul>',
        indexRows: null,
      });

      expect(documentSpy.called).to.be.false;
      expect(windowSpy.called).to.be.false;
    });

    it('computes current-page state independently for each build', () => {
      const originalUrl = window.location.pathname + window.location.search + window.location.hash;
      const source = {
        filteredListHtml: `
          <ul>
            <li><a href="/first">First</a></li>
            <li><a href="/second">Second</a></li>
          </ul>
        `,
        indexRows: null,
      };
      try {
        window.history.pushState({}, '', '/first');
        const first = buildSitenav(source);
        window.history.pushState({}, '', '/second');
        const second = buildSitenav(source);

        expect(first.currentLink.textContent).to.equal('First');
        expect(first.navList.querySelectorAll('[aria-current="page"]').length).to.equal(1);
        expect(second.currentLink.textContent).to.equal('Second');
        expect(second.navList.querySelectorAll('[aria-current="page"]').length).to.equal(1);
      } finally {
        window.history.pushState({}, '', originalUrl);
      }
    });
  });

  describe('removeEmptyMenus', () => {
    it('removes a level-1 parent whose child list was emptied by filtering', () => {
      const ul = buildNavList(`
        <ul>
          <li>
            <p>Support</p>
            <ul><li><a href="/support/faqs">FAQs</a></li></ul>
          </li>
          <li>
            <p>Guides</p>
            <ul><li><a href="/guides/intro">Intro</a></li></ul>
          </li>
        </ul>
      `);
      // Everything under Support is private/unindexed; Guides keeps a child.
      filterNavByIndex(ul, [{ path: '/guides/intro' }]);
      const navList = decorateLevel(ul, 1);

      removeEmptyMenus(navList);

      const labels = [...navList.querySelectorAll(':scope > li > .level-1-button .list-item-label')]
        .map((el) => el.textContent);
      expect(labels).to.deep.equal(['Guides']);
      expect(navList.querySelector('.level-2-menu')).to.not.be.null; // Guides' menu survives
    });

    it('leaves parents with visible children untouched', () => {
      const ul = buildNavList(`
        <ul>
          <li>
            <p>Guides</p>
            <ul><li><a href="/guides/intro">Intro</a></li></ul>
          </li>
        </ul>
      `);
      const navList = decorateLevel(ul, 1);

      removeEmptyMenus(navList);

      expect(navList.querySelector('.level-1')).to.not.be.null;
      expect(navList.querySelector('.level-2-list > li')).to.not.be.null;
    });

    it('keeps a level-1 leaf item that has no child list at all', () => {
      const ul = buildNavList('<ul><li><a href="/overview">Overview</a></li></ul>');
      const navList = decorateLevel(ul, 1);

      removeEmptyMenus(navList);

      expect(navList.querySelector('a[href="/overview"]')).to.not.be.null;
    });

    it('cascades: an empty deep list removes its whole ancestor branch', () => {
      // Section > Group > (only child link) — filtering the deepest link empties
      // the level-3 list, which empties the level-2 list, which drops the level-1 item.
      const ul = buildNavList(`
        <ul>
          <li>
            <p>Section</p>
            <ul>
              <li>
                <p>Group</p>
                <ul><li><a href="/section/group/page">Page</a></li></ul>
              </li>
            </ul>
          </li>
          <li>
            <p>Guides</p>
            <ul><li><a href="/guides/intro">Intro</a></li></ul>
          </li>
        </ul>
      `);
      filterNavByIndex(ul, [{ path: '/guides/intro' }]);
      const navList = decorateLevel(ul, 1);

      removeEmptyMenus(navList);

      const labels = [...navList.querySelectorAll(':scope > li > .level-1-button .list-item-label')]
        .map((el) => el.textContent);
      expect(labels).to.deep.equal(['Guides']);
    });

    it('prunes only the emptied branch, keeping siblings with content', () => {
      const ul = buildNavList(`
        <ul>
          <li>
            <p>Section</p>
            <ul>
              <li>
                <p>Empty group</p>
                <ul><li><a href="/section/empty/page">Page</a></li></ul>
              </li>
              <li>
                <p>Full group</p>
                <ul><li><a href="/section/full/page">Page</a></li></ul>
              </li>
            </ul>
          </li>
        </ul>
      `);
      filterNavByIndex(ul, [{ path: '/section/full/page' }]);
      const navList = decorateLevel(ul, 1);

      removeEmptyMenus(navList);

      // Section survives (still has Full group); Empty group is gone.
      const groupLabels = [...navList.querySelectorAll('.level-2-list > li > .level-2-button .list-item-label')]
        .map((el) => el.textContent);
      expect(groupLabels).to.deep.equal(['Full group']);
      expect(navList.querySelector('a[href="/section/full/page"]')).to.not.be.null;
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
    // The current page is otherwise conveyed by weight and a colour bar only, which
    // WCAG 1.3.1 requires be programmatically determinable too.
    it('marks the current page with aria-current="page", not just a class', () => {
      const ul = buildNavList(`
        <ul>
          <li><p>Web</p>
            <ul>
              <li><a href="${window.location.pathname}">Here</a></li>
              <li><a href="/elsewhere">Elsewhere</a></li>
            </ul>
          </li>
        </ul>`);
      decorateLevel(ul, 1);
      const current = findCurrentPageInNav(ul);
      expect(current.getAttribute('aria-current')).to.equal('page');
      expect(ul.querySelector('a[href="/elsewhere"]').hasAttribute('aria-current')).to.be.false;
    });

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
    it('has an accessible label, aria-controls, and starts collapsed', () => {
      stubMatchMedia(sandbox, false);
      const sitenav = document.createElement('div');
      sitenav.id = 'sitenav';
      document.body.append(sitenav);

      const btn = getExpandButton(sitenav);

      expect(btn.getAttribute('aria-label')).to.equal('Expand navigation');
      expect(btn.getAttribute('aria-expanded')).to.equal('false');
      expect(btn.getAttribute('aria-controls')).to.equal('sitenav');
    });

    it('renders a tooltip mirroring the aria-label, associated by id', () => {
      stubMatchMedia(sandbox, false);
      const sitenav = document.createElement('div');
      sitenav.id = 'sitenav';
      document.body.append(sitenav);

      const btn = getExpandButton(sitenav);

      const tooltip = sitenav.querySelector('swc-tooltip');
      expect(tooltip.getAttribute('for')).to.equal(btn.id);
      expect(tooltip.textContent).to.equal('Expand navigation');
    });

    it('starts expanded when the sitenav already carries is-expanded', () => {
      stubMatchMedia(sandbox, false);
      const sitenav = document.createElement('div');
      sitenav.id = 'sitenav';
      sitenav.setAttribute('is-expanded', '');
      document.body.append(sitenav);

      const btn = getExpandButton(sitenav);

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

    beforeEach(() => {
      stubMatchMedia(sandbox, false);
      sitenav = document.createElement('div');
      sitenav.id = 'sitenav';
      main = document.createElement('main');
      document.body.append(main, sitenav);
      btn = getExpandButton(sitenav);
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

    beforeEach(() => {
      stubMatchMedia(sandbox, true);
      sitenav = document.createElement('div');
      sitenav.id = 'sitenav';
      document.body.append(sitenav);
      trigger = getTriggerButton(sitenav);
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

    beforeEach(() => {
      sitenav = document.createElement('div');
      sitenav.id = 'sitenav';
      document.body.append(sitenav);
      btn = getExpandButton(sitenav);
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

    beforeEach(() => {
      sitenav = document.createElement('div');
      sitenav.id = 'sitenav';
      document.body.append(sitenav);
      btn = getExpandButton(sitenav);
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

  describe('setupRovingTabindex — level-2 flyouts as one tab stop', () => {
    // Collapsed flyouts are hidden with visibility:hidden by sitenav.css, which isn't
    // loaded here; mirror it on the wrapper so the group sees what a real page sees.
    function buildTree() {
      const sitenav = document.createElement('div');
      const navList = buildNavList(`
        <ul>
          <li><p>Web</p>
            <ul>
              <li><a href="/web/one">One</a></li>
              <li><p>Components</p>
                <ul><li><a href="/web/button">Button</a></li></ul>
              </li>
            </ul>
          </li>
          <li><p>Support</p>
            <ul><li><a href="/support/faqs">FAQs</a></li></ul>
          </li>
        </ul>`);
      decorateLevel(navList, 1);
      sitenav.append(navList);
      document.body.append(sitenav);

      // Stand in for the stylesheet: a menu is visible only while its button is open.
      const syncVisibility = () => {
        navList.querySelectorAll('.level-2-menu, .level-3-menu').forEach((menu) => {
          const btn = menu.parentElement.querySelector(':scope > button');
          const open = btn.getAttribute('aria-expanded') === 'true';
          menu.style.visibility = open ? 'visible' : 'hidden';
        });
      };
      syncVisibility();
      sitenav.addEventListener('click', syncVisibility);
      return { sitenav, navList };
    }

    const buttonNamed = (root, name) => [...root.querySelectorAll('button')]
      .find((b) => b.textContent.trim() === name);
    const linkNamed = (root, name) => [...root.querySelectorAll('a')]
      .find((a) => a.textContent.trim() === name);
    const press = (el, key) => el.dispatchEvent(
      new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true }),
    );
    const tabbable = (root) => [...root.querySelectorAll('a, button')]
      .filter((el) => el.checkVisibility({ visibilityProperty: true }) && el.tabIndex > -1);

    const openWeb = (navList) => buttonNamed(navList, 'Web').click();

    describe('level 1 keeps its own tab stops', () => {
      it('leaves level-1 buttons out of the group entirely', () => {
        const { sitenav, navList } = buildTree();
        setupRovingTabindex(sitenav, navList);
        const lvl1 = [...navList.querySelectorAll(':scope > li > button')];
        expect(lvl1.length).to.equal(2);
        expect(lvl1.every((b) => !b.hasAttribute('tabindex'))).to.be.true;
      });

      it('leaves arrow keys on a level-1 button to the browser', () => {
        const { sitenav, navList } = buildTree();
        setupRovingTabindex(sitenav, navList);
        const web = buttonNamed(navList, 'Web');
        const event = new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true, cancelable: true });
        web.dispatchEvent(event);
        expect(event.defaultPrevented).to.be.false;
      });

      it('touches nothing while every flyout is closed', () => {
        const { sitenav, navList } = buildTree();
        setupRovingTabindex(sitenav, navList);
        const withTabindex = [...navList.querySelectorAll('a, button')]
          .filter((el) => el.hasAttribute('tabindex'));
        expect(withTabindex.length).to.equal(0);
      });
    });

    describe('an open flyout is a single tab stop', () => {
      it('leaves exactly one member of the open flyout tabbable', () => {
        const { sitenav, navList } = buildTree();
        setupRovingTabindex(sitenav, navList);
        openWeb(navList);
        const menu = navList.querySelector('.level-2-menu');
        expect(tabbable(menu).length).to.equal(1);
      });

      it('starts on the current page rather than the top of the flyout', () => {
        const { sitenav, navList } = buildTree();
        linkNamed(navList, 'One').classList.add('is-current-page');
        setupRovingTabindex(sitenav, navList);
        openWeb(navList);
        const menu = navList.querySelector('.level-2-menu');
        const stop = tabbable(menu)[0];
        expect(stop === linkNamed(navList, 'One'), `tab stop was "${stop?.textContent.trim()}"`).to.be.true;
      });

      it('walks the flyout with ArrowDown', () => {
        const { sitenav, navList } = buildTree();
        setupRovingTabindex(sitenav, navList);
        openWeb(navList);
        const one = linkNamed(navList, 'One');
        one.focus();
        press(one, 'ArrowDown');
        expectFocus(buttonNamed(navList, 'Components'), 'the Components button');
      });

      it('opens a nested menu with ArrowRight, then steps into it', () => {
        const { sitenav, navList } = buildTree();
        setupRovingTabindex(sitenav, navList);
        openWeb(navList);
        const components = buttonNamed(navList, 'Components');
        components.focus();
        press(components, 'ArrowRight');
        expect(components.getAttribute('aria-expanded')).to.equal('true');
        press(components, 'ArrowRight');
        expectFocus(linkNamed(navList, 'Button'), 'the link inside the Components menu');
      });

      it('collapses a nested menu with ArrowLeft on its button', () => {
        const { sitenav, navList } = buildTree();
        setupRovingTabindex(sitenav, navList);
        openWeb(navList);
        const components = buttonNamed(navList, 'Components');
        components.focus();
        press(components, 'ArrowRight');
        press(components, 'ArrowLeft');
        expect(components.getAttribute('aria-expanded')).to.equal('false');
      });

      // Left at the top of a flyout is the way back out to the rail, which is a plain
      // tab stop rather than a group member.
      it('moves to the level-1 button with ArrowLeft at the top of the flyout', () => {
        const { sitenav, navList } = buildTree();
        setupRovingTabindex(sitenav, navList);
        openWeb(navList);
        const one = linkNamed(navList, 'One');
        one.focus();
        press(one, 'ArrowLeft');
        expectFocus(buttonNamed(navList, 'Web'), 'the Web level-1 button');
      });

      it('re-picks the tab stop when a different flyout opens', () => {
        const { sitenav, navList } = buildTree();
        setupRovingTabindex(sitenav, navList);
        openWeb(navList);
        buttonNamed(navList, 'Support').click();
        const supportMenu = buttonNamed(navList, 'Support').parentElement.querySelector('.level-2-menu');
        expect(tabbable(supportMenu).length).to.equal(1);
      });

      it('clears a canceled level-2 switch before another menu opens', () => {
        const { sitenav, navList } = buildTree();
        setupRovingTabindex(sitenav, navList);
        const web = buttonNamed(navList, 'Web');
        const support = buttonNamed(navList, 'Support');
        openWeb(navList);
        support.click();
        web.click();

        const supportMenu = support.parentElement.querySelector('.level-2-menu');
        supportMenu.firstElementChild.dispatchEvent(new TransitionEvent('transitioncancel', {
          propertyName: 'opacity',
        }));

        expect(navList.classList.contains('is-switching-level-2')).to.be.false;
        expect(supportMenu.classList.contains('is-switching-out')).to.be.false;
        expect(supportMenu.classList.contains('is-hidden-after-switch')).to.be.true;
        expect(web.parentElement.querySelector('.level-2-menu').inert).to.be.false;
      });

      it('clears a level-2 switch when the sitenav closes', () => {
        const { sitenav, navList } = buildTree();
        setupRovingTabindex(sitenav, navList);
        openWeb(navList);
        buttonNamed(navList, 'Support').click();

        closeSitenav(sitenav);

        const webMenu = buttonNamed(navList, 'Web').parentElement.querySelector('.level-2-menu');
        expect(navList.classList.contains('is-switching-level-2')).to.be.false;
        expect(webMenu.classList.contains('is-switching-out')).to.be.false;
        expect(webMenu.classList.contains('is-hidden-after-switch')).to.be.true;
      });
    });
  });

  describe('level-2 scroll memory', () => {
    // A flyout tall enough to scroll: 20 links at 20px in a 100px window.
    function buildScrollingMenu({ currentIndex = 15 } = {}) {
      const sitenav = document.createElement('div');
      const menu = document.createElement('div');
      menu.classList.add('level-2-menu');
      menu.id = 'web';
      menu.style.cssText = 'overflow-y:auto;height:100px;display:block';
      const links = [...Array(20)].map((_, i) => {
        const a = document.createElement('a');
        a.href = `/web/item-${i}`;
        a.textContent = `Item ${i}`;
        a.style.cssText = 'display:block;height:20px';
        return a;
      });
      menu.append(...links);
      sitenav.append(menu);
      document.body.append(sitenav);
      links[currentIndex].classList.add('is-current-page');
      return { sitenav, menu, links, currentLink: links[currentIndex] };
    }

    const save = (id, top) => sessionStorage.setItem('sitenav-scroll', JSON.stringify({ id, top }));
    const saved = () => JSON.parse(sessionStorage.getItem('sitenav-scroll') ?? 'null');

    describe('restoreMenuScroll', () => {
      it('declines when nothing has been saved', () => {
        const { currentLink } = buildScrollingMenu();
        expect(restoreMenuScroll(currentLink)).to.be.false;
      });

      it('declines when the saved position belongs to a different flyout', () => {
        const { menu, currentLink } = buildScrollingMenu();
        save('foundations', 220);
        expect(restoreMenuScroll(currentLink)).to.be.false;
        expect(menu.scrollTop).to.equal(0);
      });

      it('restores the saved offset when the current page is still visible there', () => {
        const { menu, currentLink } = buildScrollingMenu({ currentIndex: 15 });
        // item 15 spans 300-320; a 100px window at 260 shows 260-360
        save('web', 260);
        expect(restoreMenuScroll(currentLink)).to.be.true;
        expect(menu.scrollTop).to.equal(260);
      });

      // Otherwise jumping to a distant page would restore an offset that hides it —
      // strictly worse than starting from the top.
      it('declines when the saved offset would scroll the current page out of view', () => {
        const { currentLink } = buildScrollingMenu({ currentIndex: 15 });
        save('web', 0);
        expect(restoreMenuScroll(currentLink)).to.be.false;
      });

      it('declines when there is no current link at all', () => {
        buildScrollingMenu();
        save('web', 100);
        expect(restoreMenuScroll(null)).to.be.false;
      });

      it('survives sessionStorage throwing, as it does in private mode', () => {
        const { currentLink } = buildScrollingMenu();
        sandbox.stub(sessionStorage, 'getItem').throws(new Error('denied'));
        expect(() => restoreMenuScroll(currentLink)).to.not.throw();
      });
    });

    describe('setupScrollMemory', () => {
      let abortControllers;

      const setupTestScrollMemory = (sitenav) => {
        const abortController = new AbortController();
        abortControllers.push(abortController);
        return {
          abortController,
          memory: setupScrollMemory(sitenav, { signal: abortController.signal }),
        };
      };

      beforeEach(() => {
        abortControllers = [];
      });

      afterEach(() => {
        abortControllers.forEach((controller) => controller.abort());
      });

      it('records the flyout position under its own id', async () => {
        const clock = sandbox.useFakeTimers();
        const { sitenav, menu } = buildScrollingMenu();
        setupTestScrollMemory(sitenav);
        menu.scrollTop = 140;
        menu.dispatchEvent(new Event('scroll'));
        await clock.tickAsync(300);
        expect(saved()).to.deep.equal({ id: 'web', top: 140 });
      });

      // Asserts the trailing edge (nothing written while the burst is still going)
      // rather than a call count: assigning scrollTop also queues a *real* scroll event,
      // which lands at an unpredictable point and makes any count racy.
      it('holds off writing until a burst of scroll events settles', async () => {
        const clock = sandbox.useFakeTimers();
        // Spy the instance, not Storage.prototype — localStorage shares that prototype.
        const spy = sandbox.spy(sessionStorage, 'setItem');
        const { sitenav, menu } = buildScrollingMenu();
        setupTestScrollMemory(sitenav);
        [20, 40, 60].forEach((top) => {
          menu.scrollTop = top;
          menu.dispatchEvent(new Event('scroll'));
        });

        expect(spy.getCalls().filter((c) => c.args[0] === 'sitenav-scroll')).to.be.empty;
        await clock.tickAsync(300);
        expect(saved().top).to.equal(60);
      });

      it('ignores scrolling that is not a level-2 flyout', async () => {
        const clock = sandbox.useFakeTimers();
        const { sitenav } = buildScrollingMenu();
        const other = document.createElement('div');
        sitenav.append(other);
        setupTestScrollMemory(sitenav);
        other.dispatchEvent(new Event('scroll'));
        await clock.tickAsync(300);
        expect(saved()).to.be.null;
      });

      // Scrolling then clicking a link inside the debounce window must not lose the move.
      it('flushes a pending position when the page goes away', () => {
        sandbox.useFakeTimers();
        const { sitenav, menu } = buildScrollingMenu();
        setupTestScrollMemory(sitenav);
        menu.scrollTop = 90;
        menu.dispatchEvent(new Event('scroll'));
        expect(saved()).to.be.null;
        window.dispatchEvent(new Event('pagehide'));
        expect(saved()).to.deep.equal({ id: 'web', top: 90 });
      });

      it('exposes a flush and cancels pending writes when aborted', async () => {
        const clock = sandbox.useFakeTimers({ shouldClearNativeTimers: true });
        const { sitenav, menu } = buildScrollingMenu();
        const { abortController, memory } = setupTestScrollMemory(sitenav);
        menu.scrollTop = 90;
        menu.dispatchEvent(new Event('scroll'));

        memory.flush();
        expect(saved()).to.deep.equal({ id: 'web', top: 90 });

        menu.scrollTop = 180;
        menu.dispatchEvent(new Event('scroll'));
        abortController.abort();
        await clock.tickAsync(300);
        window.dispatchEvent(new Event('pagehide'));
        expect(saved()).to.deep.equal({ id: 'web', top: 90 });
      });

      it('survives sessionStorage throwing on write', async () => {
        const clock = sandbox.useFakeTimers();
        const { sitenav, menu } = buildScrollingMenu();
        sandbox.stub(sessionStorage, 'setItem').throws(new Error('denied'));
        setupTestScrollMemory(sitenav);
        menu.dispatchEvent(new Event('scroll'));
        await clock.tickAsync(300);
        // reaching here without an unhandled throw is the assertion
        expect(true).to.be.true;
      });
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

      const btn = navList.querySelector('.level-1-button[aria-controls="sitenav-menu-foundations"]');
      expect(btn.getAttribute('aria-expanded')).to.equal('true');
    });

    it('does nothing when no level-1 button matches the label', () => {
      document.dispatchEvent(new CustomEvent('sitenav:expand-level1', { detail: { label: 'Nonexistent' } }));

      const anyExpanded = [...navList.querySelectorAll('.level-1-button')]
        .some((btn) => btn.getAttribute('aria-expanded') === 'true');
      expect(anyExpanded).to.be.false;
    });
  });

  describe('createSitenavController', () => {
    const source = ({
      includeCurrent = true,
      includeBranch = true,
      includeChild = true,
    } = {}) => ({
      filteredListHtml: `
        <ul>
          ${includeBranch ? `
            <li><p>Web</p>
              <ul>
                ${includeChild ? `
                  <li><p>Components</p>
                    <ul>
                      ${includeCurrent ? '<li><a href="/current">Current</a></li>' : ''}
                      <li><a href="/survives">Survives</a></li>
                    </ul>
                  </li>
                ` : '<li><a href="/web-overview">Web overview</a></li>'}
              </ul>
            </li>
          ` : ''}
          <li><p>Support</p><ul><li><a href="/support">Support home</a></li></ul></li>
        </ul>
      `,
      indexRows: null,
    });

    const makeController = (options) => {
      stubMatchMedia(sandbox, false);
      const main = document.createElement('main');
      document.body.append(main);
      return {
        main,
        controller: createSitenavController(main),
        built: buildSitenav(source(options)),
      };
    };

    const buttonFor = (built, menuId) => built.navList
      .querySelector(`[aria-controls="${menuId}"]`);
    const settleTooltips = (built) => Promise.all(
      [...built.sitenav.querySelectorAll('swc-tooltip')]
        .map((tooltip) => tooltip.updateComplete),
    );

    it('mounts one active nav and replacement leaves only new global listeners effective', async () => {
      const { controller, built: oldBuilt } = makeController();
      controller.mount(oldBuilt);
      await settleTooltips(oldBuilt);
      const newBuilt = buildSitenav(source());
      controller.replace(newBuilt);

      document.dispatchEvent(new CustomEvent('sitenav:expand-level1', {
        detail: { label: 'Support' },
      }));

      expect(document.querySelectorAll('#sitenav').length).to.equal(1);
      expect(controller.active).to.equal(newBuilt);
      expect(buttonFor(newBuilt, 'sitenav-menu-support').getAttribute('aria-expanded')).to.equal('true');
      expect(buttonFor(oldBuilt, 'sitenav-menu-support').getAttribute('aria-expanded')).to.equal('false');
    });

    it('preserves expanded rail state and synchronized expand control copy', async () => {
      const { controller, built: oldBuilt } = makeController();
      controller.mount(oldBuilt);
      await settleTooltips(oldBuilt);
      oldBuilt.buttons[0].click();
      const newBuilt = buildSitenav(source());

      controller.replace(newBuilt);

      expect(newBuilt.sitenav.hasAttribute('is-expanded')).to.be.true;
      expect(newBuilt.buttons[0].getAttribute('aria-expanded')).to.equal('true');
      expect(newBuilt.buttons[0].getAttribute('aria-label')).to.equal('Collapse navigation');
      expect(newBuilt.sitenav.querySelector(`swc-tooltip[for="${newBuilt.buttons[0].id}"]`).textContent)
        .to.equal('Collapse navigation');
      expect(newBuilt.sitenav.querySelector('.level-1-button + .level-2-menu + swc-tooltip')).to.be.null;
    });

    it('preserves only disclosures that still control non-empty menus', async () => {
      const { controller, built: oldBuilt } = makeController();
      controller.mount(oldBuilt);
      await settleTooltips(oldBuilt);
      oldBuilt.buttons[1].click();
      buttonFor(oldBuilt, 'sitenav-menu-web').click();
      buttonFor(oldBuilt, 'sitenav-menu-components').click();
      const newBuilt = buildSitenav(source({ includeCurrent: false }));

      controller.replace(newBuilt);

      expect(buttonFor(newBuilt, 'sitenav-menu-web').getAttribute('aria-expanded')).to.equal('true');
      expect(buttonFor(newBuilt, 'sitenav-menu-components').getAttribute('aria-expanded')).to.equal('true');
    });

    it('preserves the open mobile overlay and trigger state', async () => {
      const { controller, built: oldBuilt } = makeController();
      controller.mount(oldBuilt);
      await settleTooltips(oldBuilt);
      oldBuilt.buttons[1].click();
      const newBuilt = buildSitenav(source());

      controller.replace(newBuilt);

      expect(newBuilt.sitenav.hasAttribute('is-open')).to.be.true;
      expect(newBuilt.buttons[1].getAttribute('aria-expanded')).to.equal('true');
    });

    it('restores focus to the mobile trigger after replacement', async () => {
      const { controller, built: oldBuilt } = makeController();
      controller.mount(oldBuilt);
      await settleTooltips(oldBuilt);
      oldBuilt.sitenav.querySelector('.sitenav-trigger-btn').focus();
      const newBuilt = buildSitenav(source());

      controller.replace(newBuilt);

      expectFocus(
        newBuilt.sitenav.querySelector('.sitenav-trigger-btn'),
        'the replacement mobile trigger',
      );
      expect(document.activeElement).to.not.equal(
        newBuilt.sitenav.querySelector('.sitenav-expand-btn'),
      );
      expect(document.activeElement).to.not.equal(document.body);
    });

    it('restores focus to a surviving link', async () => {
      const { controller, built: oldBuilt } = makeController();
      controller.mount(oldBuilt);
      await settleTooltips(oldBuilt);
      oldBuilt.buttons[1].click();
      buttonFor(oldBuilt, 'sitenav-menu-web').click();
      buttonFor(oldBuilt, 'sitenav-menu-components').click();
      oldBuilt.navList.querySelector('a[href="/survives"]').focus();
      const newBuilt = buildSitenav(source());

      controller.replace(newBuilt);

      expectFocus(newBuilt.navList.querySelector('a[href="/survives"]'), 'the surviving link');
    });

    it("opens a surviving link's new disclosure path before restoring focus", async () => {
      const { controller, built: oldBuilt } = makeController();
      controller.mount(oldBuilt);
      await settleTooltips(oldBuilt);
      oldBuilt.buttons[1].click();
      buttonFor(oldBuilt, 'sitenav-menu-web').click();
      buttonFor(oldBuilt, 'sitenav-menu-components').click();
      oldBuilt.navList.querySelector('a[href="/survives"]').focus();
      const newBuilt = buildSitenav({
        filteredListHtml: `
          <ul>
            <li><p>Web</p><ul><li><a href="/web-overview">Web overview</a></li></ul></li>
            <li><p>Support</p>
              <ul>
                <li><p>Guides</p>
                  <ul><li><a href="/survives">Survives</a></li></ul>
                </li>
              </ul>
            </li>
          </ul>
        `,
        indexRows: null,
      });

      expectFocus(oldBuilt.navList.querySelector('a[href="/survives"]'), 'the original surviving link');
      controller.replace(newBuilt);

      expect(buttonFor(newBuilt, 'sitenav-menu-web').getAttribute('aria-expanded')).to.equal('false');
      expect(buttonFor(newBuilt, 'sitenav-menu-support').getAttribute('aria-expanded')).to.equal('true');
      expect(buttonFor(newBuilt, 'sitenav-menu-guides').getAttribute('aria-expanded')).to.equal('true');
      expectFocus(newBuilt.navList.querySelector('a[href="/survives"]'), 'the moved surviving link');
    });

    it('falls focus back to the nearest surviving parent disclosure', async () => {
      const { controller, built: oldBuilt } = makeController();
      controller.mount(oldBuilt);
      await settleTooltips(oldBuilt);
      oldBuilt.buttons[1].click();
      buttonFor(oldBuilt, 'sitenav-menu-web').click();
      buttonFor(oldBuilt, 'sitenav-menu-components').click();
      oldBuilt.navList.querySelector('a[href="/current"]').focus();
      const newBuilt = buildSitenav(source({ includeCurrent: false }));

      controller.replace(newBuilt);

      expectFocus(
        buttonFor(newBuilt, 'sitenav-menu-components'),
        'the nearest surviving parent disclosure',
      );
    });

    it('falls focus back to a visible nav control when the branch is removed', async () => {
      const { controller, built: oldBuilt } = makeController();
      controller.mount(oldBuilt);
      await settleTooltips(oldBuilt);
      oldBuilt.buttons[1].click();
      buttonFor(oldBuilt, 'sitenav-menu-web').click();
      buttonFor(oldBuilt, 'sitenav-menu-components').click();
      oldBuilt.navList.querySelector('a[href="/current"]').focus();
      const newBuilt = buildSitenav(source({ includeBranch: false }));

      controller.replace(newBuilt);

      const visibleControl = newBuilt.buttons.find((button) => button.checkVisibility({
        visibilityProperty: true,
      }));
      expectFocus(visibleControl, 'the visible sitenav control');
    });

    it('flushes and boundedly restores pending level-2 scroll before replacement', async () => {
      const originalUrl = window.location.pathname + window.location.search + window.location.hash;
      window.history.pushState({}, '', '/current');
      try {
        const { controller, built: oldBuilt } = makeController();
        controller.mount(oldBuilt);
        await settleTooltips(oldBuilt);
        const oldMenu = oldBuilt.navList.querySelector('#sitenav-menu-web');
        Object.defineProperty(oldMenu, 'scrollTop', { value: 0, writable: true });
        oldMenu.scrollTop = 40;
        oldMenu.dispatchEvent(new Event('scroll'));
        const newBuilt = buildSitenav(source());
        const newMenu = newBuilt.navList.querySelector('#sitenav-menu-web');
        Object.defineProperty(newMenu, 'scrollTop', { value: 0, writable: true });
        const current = newBuilt.currentLink;
        sandbox.stub(newMenu, 'getBoundingClientRect').returns({
          top: 0, bottom: 100, left: 0, right: 100, width: 100, height: 100,
        });
        sandbox.stub(current, 'getBoundingClientRect').returns({
          top: 20, bottom: 40, left: 0, right: 100, width: 100, height: 20,
        });

        controller.replace(newBuilt);

        expect(JSON.parse(sessionStorage.getItem('sitenav-scroll'))).to.deep.equal({
          id: 'sitenav-menu-web',
          top: 40,
        });
        expect(newMenu.scrollTop).to.equal(40);

        window.dispatchEvent(new Event('pagehide'));
        sessionStorage.clear();
        oldMenu.scrollTop = 80;
        oldMenu.dispatchEvent(new Event('scroll'));
        window.dispatchEvent(new Event('pagehide'));
        expect(sessionStorage.getItem('sitenav-scroll')).to.be.null;
      } finally {
        window.history.pushState({}, '', originalUrl);
      }
    });
  });

  describe('initSitenav', () => {
    const navHtml = (href, label = href) => `
      <main><ul><li><a href="${href}">${label}</a></li></ul></main>
    `;
    const source = (href) => ({
      filteredListHtml: `<ul><li><a href="${href}">${href}</a></li></ul>`,
      indexRows: [{ path: href, title: href }],
    });
    const deferred = () => {
      let resolve;
      let reject;
      const promise = new Promise((res, rej) => {
        resolve = res;
        reject = rej;
      });
      return { promise, resolve, reject };
    };
    const makeStorage = (snapshot = null) => ({
      getItem: sandbox.stub().withArgs(CACHE_KEY).returns(
        snapshot ? JSON.stringify(snapshot) : null,
      ),
      setItem: sandbox.stub(),
      removeItem: sandbox.stub(),
    });
    const stubFresh = (fetchImpl, href, index = [{ path: href, title: href }]) => {
      fetchImpl.onFirstCall().resolves(new Response(navHtml(href), { status: 200 }));
      fetchImpl.onSecondCall().resolves(new Response(JSON.stringify({ data: index }), {
        status: 200,
      }));
    };

    beforeEach(() => {
      stubMatchMedia(sandbox, false);
      document.body.innerHTML = '<main></main>';
    });

    it('mounts cached navigation and starts only the fragment while session remains pending', async () => {
      const session = deferred();
      const fragment = deferred();
      const storage = makeStorage({
        version: CACHE_VERSION,
        savedAt: 100,
        ...source('/cached'),
      });
      const fetchImpl = sandbox.stub();
      fetchImpl.onFirstCall().returns(fragment.promise);
      const checkSession = sandbox.stub().returns(session.promise);

      const initialized = initSitenav({
        config: { cdnEnv: true, hostnames: [], log: sandbox.stub() },
        storage,
        fetchImpl,
        checkSession,
        now: 200,
      });
      await Promise.resolve();

      expect(document.querySelector('#sitenav a').getAttribute('href')).to.equal('/cached');
      expect(checkSession.calledOnce).to.equal(true);
      expect(fetchImpl.calledOnceWithExactly(
        '/fragments/nav/site-nav.plain.html',
        undefined,
      )).to.equal(true);

      fetchImpl.onSecondCall().resolves(new Response(JSON.stringify({
        data: [{ path: '/fresh', title: '/fresh' }],
      }), { status: 200 }));
      session.resolve({ anonymous: true });
      fragment.resolve(new Response(navHtml('/fresh'), { status: 200 }));
      await initialized;

      expect(fetchImpl.secondCall.args).to.deep.equal([
        '/query-index.json?compact=true',
        undefined,
      ]);
    });

    it('discards the initial credentialed fragment and anonymously refetches both inputs when IMS rejects', async () => {
      const storage = makeStorage();
      const fetchImpl = sandbox.stub();
      fetchImpl.onFirstCall().resolves(new Response(`
        <main><ul>
          <li><a href="/credentialed-private">Credentialed private label</a></li>
        </ul></main>
      `, { status: 200 }));
      fetchImpl.onSecondCall().resolves(new Response(`
        <main><ul>
          <li class="audience-public"><a href="/shared">Public label</a></li>
          <li class="audience-private"><a href="/shared">Private label</a></li>
        </ul></main>
      `, { status: 200 }));
      fetchImpl.onThirdCall().resolves(new Response(JSON.stringify({
        data: [{ path: '/shared', title: 'Shared' }],
      }), { status: 200 }));
      const imsError = new Error('IMS unavailable');
      const config = { cdnEnv: true, hostnames: [], log: sandbox.stub() };
      const checkSession = sandbox.stub().rejects(imsError);

      await initSitenav({
        config,
        storage,
        fetchImpl,
        checkSession,
        now: 200,
      });

      expect(checkSession.calledOnce).to.equal(true);
      expect(fetchImpl.firstCall.args).to.deep.equal([
        '/fragments/nav/site-nav.plain.html',
        undefined,
      ]);
      expect(fetchImpl.secondCall.args).to.deep.equal([
        '/fragments/nav/site-nav.plain.html',
        { credentials: 'omit', cache: 'no-store' },
      ]);
      expect(fetchImpl.thirdCall.args).to.deep.equal([
        '/query-index.json?compact=true',
        { credentials: 'omit', cache: 'no-store' },
      ]);
      expect(document.querySelector('#sitenav').textContent).to.include('Public label');
      expect(document.querySelector('#sitenav').textContent).to.not.include('Private label');
      expect(document.querySelector('#sitenav').textContent)
        .to.not.include('Credentialed private label');
      expect(storage.setItem.called).to.equal(false);
      expect(config.log.calledWith('Could not check IMS session', imsError)).to.equal(true);
    });

    it('does not render the credentialed fragment when the anonymous retry fails without a cache', async () => {
      const storage = makeStorage();
      const fetchImpl = sandbox.stub();
      fetchImpl.onFirstCall().resolves(new Response(`
        <main><ul>
          <li><a href="/credentialed-private">Credentialed private label</a></li>
        </ul></main>
      `, { status: 200 }));
      fetchImpl.onSecondCall().rejects(new Error('anonymous fragment unavailable'));
      fetchImpl.onThirdCall().rejects(new Error('anonymous index unavailable'));

      await initSitenav({
        config: { cdnEnv: true, hostnames: [], log: sandbox.stub() },
        storage,
        fetchImpl,
        checkSession: sandbox.stub().rejects(new Error('IMS unavailable')),
        now: 200,
      });

      expect(fetchImpl.secondCall.args).to.deep.equal([
        '/fragments/nav/site-nav.plain.html',
        { credentials: 'omit', cache: 'no-store' },
      ]);
      expect(fetchImpl.thirdCall.args).to.deep.equal([
        '/query-index.json?compact=true',
        { credentials: 'omit', cache: 'no-store' },
      ]);
      expect(document.querySelector('#sitenav')).to.equal(null);
      expect(storage.setItem.called).to.equal(false);
    });

    it('retains safe cached navigation when the anonymous retry fails after IMS rejection', async () => {
      const storage = makeStorage({
        version: CACHE_VERSION,
        savedAt: 100,
        ...source('/cached'),
      });
      const fetchImpl = sandbox.stub();
      fetchImpl.onFirstCall().resolves(new Response(
        navHtml('/credentialed-private'),
        { status: 200 },
      ));
      fetchImpl.onSecondCall().rejects(new Error('anonymous fragment unavailable'));
      fetchImpl.onThirdCall().rejects(new Error('anonymous index unavailable'));

      await initSitenav({
        config: { cdnEnv: true, hostnames: [], log: sandbox.stub() },
        storage,
        fetchImpl,
        checkSession: sandbox.stub().rejects(new Error('IMS unavailable')),
        now: 200,
      });

      expect(fetchImpl.secondCall.args).to.deep.equal([
        '/fragments/nav/site-nav.plain.html',
        { credentials: 'omit', cache: 'no-store' },
      ]);
      expect(fetchImpl.thirdCall.args).to.deep.equal([
        '/query-index.json?compact=true',
        { credentials: 'omit', cache: 'no-store' },
      ]);
      expect(document.querySelector('#sitenav a').getAttribute('href')).to.equal('/cached');
      expect(storage.setItem.called).to.equal(false);
    });

    it('does not acquire, read, or write local storage off CDN', async () => {
      const descriptor = Object.getOwnPropertyDescriptor(globalThis, 'localStorage');
      const getter = sandbox.stub().throws(new DOMException('denied', 'SecurityError'));
      Object.defineProperty(globalThis, 'localStorage', { configurable: true, get: getter });
      const fetchImpl = sandbox.stub();
      fetchImpl.onFirstCall().resolves(new Response(navHtml('/preview'), { status: 200 }));
      fetchImpl.onSecondCall().resolves(new Response(JSON.stringify({
        data: [{ path: '/preview', title: '/preview' }],
      }), { status: 200 }));

      try {
        await initSitenav({
          config: { cdnEnv: false, hostnames: [], log: sandbox.stub() },
          fetchImpl,
          checkSession: sandbox.stub().resolves({ anonymous: true }),
          now: 200,
        });
        expect(getter.called).to.equal(false);
        expect(document.querySelector('#sitenav a').getAttribute('href')).to.equal('/preview');
      } finally {
        Object.defineProperty(globalThis, 'localStorage', descriptor);
      }
    });

    it('lets fresh navigation win when a cached build finishes late', async () => {
      const cachedSource = {
        filteredListHtml: '<ul><li><p>Cached</p><ul><li><a href="/cached">Cached</a></li></ul></li></ul>',
        indexRows: [{ path: '/cached', title: 'Cached' }],
      };
      const freshSource = {
        filteredListHtml: '<ul><li><p>Support</p><ul><li><a href="/fresh">Fresh</a></li></ul></li></ul>',
        indexRows: [{ path: '/fresh', title: 'Fresh' }],
      };
      const cachedBuild = deferred();
      const storage = makeStorage({
        version: CACHE_VERSION,
        savedAt: 100,
        ...cachedSource,
      });
      const fetchImpl = sandbox.stub();
      fetchImpl.onFirstCall().resolves(new Response(
        `<main>${freshSource.filteredListHtml}</main>`,
        { status: 200 },
      ));
      fetchImpl.onSecondCall().resolves(new Response(JSON.stringify({
        data: freshSource.indexRows,
      }), { status: 200 }));
      const checkSession = sandbox.stub().resolves({ anonymous: true });
      const build = sandbox.stub().callsFake((candidate) => (
        candidate.filteredListHtml.includes('/cached')
          ? cachedBuild.promise
          : buildSitenav(candidate)
      ));

      const initialized = initSitenav({
        config: { cdnEnv: true, hostnames: [], log: sandbox.stub() },
        storage,
        fetchImpl,
        checkSession,
        now: 200,
        build,
      });
      await Promise.resolve();
      expect(checkSession.calledOnce).to.equal(true);

      while (build.callCount < 2) {
        await new Promise((resolve) => { setTimeout(resolve, 0); });
      }
      const freshNav = document.querySelector('#sitenav');
      expect(freshNav.querySelector('a').getAttribute('href')).to.equal('/fresh');

      const lateCached = buildSitenav(cachedSource);
      cachedBuild.resolve(lateCached);
      await initialized;

      expect(document.querySelector('#sitenav')).to.equal(freshNav);
      expect(document.querySelectorAll('#sitenav').length).to.equal(1);
      expect(lateCached.sitenav.isConnected).to.equal(false);
      document.dispatchEvent(new CustomEvent('sitenav:expand-level1', {
        detail: { label: 'Support' },
      }));
      expect(freshNav.querySelector('.level-1-button').getAttribute('aria-expanded')).to.equal('true');
      expect(lateCached.sitenav.querySelector('.level-1-button').getAttribute('aria-expanded'))
        .to.equal('false');
    });

    it('removes an unbuildable cached snapshot and continues with fresh navigation', async () => {
      const storage = makeStorage({
        version: CACHE_VERSION,
        savedAt: 100,
        filteredListHtml: '<p>not a list</p>',
        indexRows: [],
      });
      const fetchImpl = sandbox.stub();
      stubFresh(fetchImpl, '/fresh');

      await initSitenav({
        config: { cdnEnv: true, hostnames: [], log: sandbox.stub() },
        storage,
        fetchImpl,
        checkSession: sandbox.stub().resolves({ anonymous: true }),
        now: 200,
      });

      expect(storage.removeItem.calledOnceWithExactly(CACHE_KEY)).to.equal(true);
      expect(document.querySelector('#sitenav a').getAttribute('href')).to.equal('/fresh');
    });

    it('retains the cached node and refreshes savedAt for unchanged anonymous source', async () => {
      const storage = makeStorage({
        version: CACHE_VERSION,
        savedAt: 100,
        ...source('/same'),
      });
      const session = deferred();
      const fetchImpl = sandbox.stub();
      stubFresh(fetchImpl, '/same');
      const initialized = initSitenav({
        config: { cdnEnv: true, hostnames: [], log: sandbox.stub() },
        storage,
        fetchImpl,
        checkSession: sandbox.stub().returns(session.promise),
        now: 321,
      });
      await Promise.resolve();
      const cachedNode = document.querySelector('#sitenav');

      session.resolve({ anonymous: true });
      await initialized;

      expect(document.querySelector('#sitenav')).to.equal(cachedNode);
      expect(storage.setItem.calledOnce).to.equal(true);
      const saved = JSON.parse(storage.setItem.firstCall.args[1]);
      expect(Number.isFinite(saved.savedAt)).to.equal(true);
      expect(saved.savedAt).to.equal(321);
    });

    it('replaces changed anonymous navigation once and writes the fresh source', async () => {
      const storage = makeStorage({
        version: CACHE_VERSION,
        savedAt: 100,
        ...source('/cached'),
      });
      const session = deferred();
      const fetchImpl = sandbox.stub();
      stubFresh(fetchImpl, '/fresh');
      const initialized = initSitenav({
        config: { cdnEnv: true, hostnames: [], log: sandbox.stub() },
        storage,
        fetchImpl,
        checkSession: sandbox.stub().returns(session.promise),
        now: 400,
      });
      await Promise.resolve();
      const cachedNode = document.querySelector('#sitenav');
      const replace = sandbox.spy(cachedNode, 'replaceWith');

      session.resolve({ anonymous: true });
      await initialized;

      expect(replace.calledOnce).to.equal(true);
      expect(document.querySelector('#sitenav')).to.not.equal(cachedNode);
      expect(document.querySelectorAll('#sitenav').length).to.equal(1);
      expect(storage.setItem.calledOnce).to.equal(true);
    });

    [
      ['changed', '/cached', '/fresh', true],
      ['unchanged', '/same', '/same', false],
    ].forEach(([description, cachedHref, freshHref, replaces]) => {
      it(`${description} authenticated navigation ${replaces ? 'replaces' : 'retains'} the node without writing`, async () => {
        const storage = makeStorage({
          version: CACHE_VERSION,
          savedAt: 100,
          ...source(cachedHref),
        });
        const session = deferred();
        const fetchImpl = sandbox.stub();
        stubFresh(fetchImpl, freshHref);
        const initialized = initSitenav({
          config: { cdnEnv: true, hostnames: [], log: sandbox.stub() },
          storage,
          fetchImpl,
          checkSession: sandbox.stub().returns(session.promise),
          now: 400,
        });
        await Promise.resolve();
        const cachedNode = document.querySelector('#sitenav');

        session.resolve({ anonymous: false });
        await initialized;

        expect(document.querySelector('#sitenav') === cachedNode).to.equal(!replaces);
        expect(storage.setItem.called).to.equal(false);
      });
    });

    it('keeps cached navigation without overwriting it when the fragment fails', async () => {
      const storage = makeStorage({
        version: CACHE_VERSION,
        savedAt: 100,
        ...source('/cached'),
      });
      const fetchImpl = sandbox.stub();
      fetchImpl.onFirstCall().resolves(new Response('', { status: 404 }));
      fetchImpl.onSecondCall().resolves(new Response(JSON.stringify({ data: [] }), {
        status: 200,
      }));

      await initSitenav({
        config: { cdnEnv: true, hostnames: [], log: sandbox.stub() },
        storage,
        fetchImpl,
        checkSession: sandbox.stub().resolves({ anonymous: true }),
        now: 200,
      });

      expect(document.querySelector('#sitenav a').getAttribute('href')).to.equal('/cached');
      expect(storage.setItem.called).to.equal(false);
    });

    it('keeps cached navigation without overwriting it when the index fails', async () => {
      const storage = makeStorage({
        version: CACHE_VERSION,
        savedAt: 100,
        ...source('/cached'),
      });
      const fetchImpl = sandbox.stub();
      fetchImpl.onFirstCall().resolves(new Response(navHtml('/authored'), { status: 200 }));
      fetchImpl.onSecondCall().rejects(new Error('index unavailable'));

      await initSitenav({
        config: { cdnEnv: true, hostnames: [], log: sandbox.stub() },
        storage,
        fetchImpl,
        checkSession: sandbox.stub().resolves({ anonymous: true }),
        now: 200,
      });

      expect(document.querySelector('#sitenav a').getAttribute('href')).to.equal('/cached');
      expect(storage.setItem.called).to.equal(false);
    });

    it('keeps cached navigation and does not persist a mixed valid and malformed index', async () => {
      const storage = makeStorage({
        version: CACHE_VERSION,
        savedAt: 100,
        ...source('/cached'),
      });
      const fetchImpl = sandbox.stub();
      fetchImpl.onFirstCall().resolves(new Response(navHtml('/fresh'), { status: 200 }));
      fetchImpl.onSecondCall().resolves(new Response(JSON.stringify({
        data: [
          { path: '/fresh', title: 'Fresh' },
          { path: '/malformed', title: null },
        ],
      }), { status: 200 }));

      await initSitenav({
        config: { cdnEnv: true, hostnames: [], log: sandbox.stub() },
        storage,
        fetchImpl,
        checkSession: sandbox.stub().resolves({ anonymous: true }),
        now: 200,
      });

      expect(document.querySelector('#sitenav a').getAttribute('href')).to.equal('/cached');
      expect(storage.setItem.called).to.equal(false);
    });

    it('omits navigation when no cache exists and the fragment fails', async () => {
      const storage = makeStorage();
      const fetchImpl = sandbox.stub();
      fetchImpl.onFirstCall().resolves(new Response('', { status: 404 }));
      fetchImpl.onSecondCall().resolves(new Response(JSON.stringify({ data: [] }), {
        status: 200,
      }));

      await initSitenav({
        config: { cdnEnv: true, hostnames: [], log: sandbox.stub() },
        storage,
        fetchImpl,
        checkSession: sandbox.stub().resolves({ anonymous: true }),
        now: 200,
      });

      expect(document.querySelector('#sitenav')).to.equal(null);
      expect(storage.setItem.called).to.equal(false);
    });

    it('keeps cached navigation when the fragment request rejects', async () => {
      const storage = makeStorage({
        version: CACHE_VERSION,
        savedAt: 100,
        ...source('/cached'),
      });
      const fetchImpl = sandbox.stub();
      fetchImpl.onFirstCall().rejects(new Error('fragment unavailable'));
      fetchImpl.onSecondCall().resolves(new Response(JSON.stringify({ data: [] }), {
        status: 200,
      }));

      await initSitenav({
        config: { cdnEnv: true, hostnames: [], log: sandbox.stub() },
        storage,
        fetchImpl,
        checkSession: sandbox.stub().resolves({ anonymous: true }),
        now: 200,
      });

      expect(document.querySelector('#sitenav a').getAttribute('href')).to.equal('/cached');
      expect(storage.setItem.called).to.equal(false);
    });

    it('renders authored unfiltered navigation without caching when no index is available', async () => {
      const storage = makeStorage();
      const fetchImpl = sandbox.stub();
      fetchImpl.onFirstCall().resolves(new Response(`
        <main><ul>
          <li><a href="/unknown">Unknown authored link</a></li>
          <li><p>SWC</p></li>
          <li><p>Components</p><ul><li>[auto-generated]</li></ul></li>
        </ul></main>
      `, { status: 200 }));
      fetchImpl.onSecondCall().rejects(new Error('index unavailable'));

      await initSitenav({
        config: { cdnEnv: true, hostnames: [], log: sandbox.stub() },
        storage,
        fetchImpl,
        checkSession: sandbox.stub().resolves({ anonymous: true }),
        now: 200,
      });

      expect(document.querySelector('#sitenav a[href="/unknown"]')).to.not.equal(null);
      expect(document.querySelectorAll('#sitenav a').length).to.equal(1);
      expect(storage.setItem.called).to.equal(false);
    });

    it('treats a successful empty index as complete and filters unknown links', async () => {
      const storage = makeStorage();
      const fetchImpl = sandbox.stub();
      fetchImpl.onFirstCall().resolves(new Response(`
        <main><ul>
          <li><a href="/unknown">Unknown</a></li>
          <li><a href="https://example.com/external">External</a></li>
        </ul></main>
      `, { status: 200 }));
      fetchImpl.onSecondCall().resolves(new Response(JSON.stringify({ data: [] }), {
        status: 200,
      }));

      await initSitenav({
        config: { cdnEnv: true, hostnames: [], log: sandbox.stub() },
        storage,
        fetchImpl,
        checkSession: sandbox.stub().resolves({ anonymous: true }),
        now: 200,
      });

      expect(document.querySelector('#sitenav a[href="/unknown"]')).to.equal(null);
      expect(document.querySelector('#sitenav a[href="https://example.com/external"]'))
        .to.not.equal(null);
      expect(storage.setItem.calledOnce).to.equal(true);
    });

    it('does not reject when acquiring local storage throws', async () => {
      const descriptor = Object.getOwnPropertyDescriptor(globalThis, 'localStorage');
      Object.defineProperty(globalThis, 'localStorage', {
        configurable: true,
        get() {
          throw new DOMException('denied', 'SecurityError');
        },
      });
      const fetchImpl = sandbox.stub();
      stubFresh(fetchImpl, '/fresh');

      try {
        await initSitenav({
          config: { cdnEnv: true, hostnames: [], log: sandbox.stub() },
          fetchImpl,
          checkSession: sandbox.stub().resolves({ anonymous: true }),
          now: 200,
        });
        expect(document.querySelector('#sitenav a').getAttribute('href')).to.equal('/fresh');
      } finally {
        Object.defineProperty(globalThis, 'localStorage', descriptor);
      }
    });
  });
});
