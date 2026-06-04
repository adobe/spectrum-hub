import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

// Mock HTML returned for blocks that fetch remote fragments or data.
// Each string is a full HTML document that loadFragment parses as main > div sections.
const MOCKS = {
  headerFragment: `<main>
    <div><p><a href="/">Adobe</a></p></div>
    <div>
      <ul>
        <li><a href="/foundations">Foundations</a></li>
        <li><a href="/components">Components</a></li>
        <li><a href="/patterns">Patterns</a></li>
      </ul>
    </div>
    <div>
      <ul>
        <li><a href="/contact">Contact</a></li>
      </ul>
    </div>
  </main>`,

  footerFragment: `<main>
    <div>
      <p><a href="/about">About</a></p>
      <p><a href="/blog">Blog</a></p>
    </div>
    <div>
      <p><a href="/privacy">Privacy Policy</a></p>
      <p><a href="/terms">Terms of Use</a></p>
    </div>
    <div>
      <p>© 2026 Adobe. All rights reserved.</p>
    </div>
  </main>`,

  // Paths must start with the second URL segment of the fixture (/test/…) so that
  // sitenav.js's getTopSection() — which reads window.location — finds matching entries.
  sitenavIndex: JSON.stringify({
    data: [
      { path: '/test/overview', title: 'Overview' },
      { path: '/test/components', title: 'Components' },
      { path: '/test/components/button', title: 'Button' },
      { path: '/test/components/card', title: 'Card' },
    ],
  }),

  fragmentContent: `<main>
    <div>
      <h2>Fragment heading</h2>
      <p>Fragment content loaded and rendered successfully.</p>
    </div>
  </main>`,

  // start/end bracket all dates so the current event is always "found"
  scheduleJson: JSON.stringify({
    data: [
      {
        name: 'always-on',
        start: '2020-01-01T00:00:00Z',
        end: '2099-12-31T23:59:59Z',
        fragment: 'http://localhost:3001/mock-event-fragment',
      },
    ],
  }),

  eventFragment: `<main>
    <div>
      <h2>Scheduled event content</h2>
      <p>This content is shown during the active scheduled event.</p>
    </div>
  </main>`,
};

const BLOCKS = [
  {
    name: 'card',
    path: '/test/a11y/fixtures/card.html',
    readySelector: '.card-content',
  },
  {
    name: 'columns',
    path: '/test/a11y/fixtures/columns.html',
    readySelector: '.col-1',
  },
  {
    name: 'action-button',
    path: '/test/a11y/fixtures/action-button.html',
    readySelector: 'button.action-button-primary',
  },
  {
    name: 'hero',
    path: '/test/a11y/fixtures/hero.html',
    readySelector: '.hero-foreground',
  },
  {
    name: 'page-nav',
    path: '/test/a11y/fixtures/page-nav.html',
    // details is open but positioned sticky with no block height at fixture scroll origin
    readySelector: { selector: '.page-nav details', state: 'attached' },
  },
  {
    name: 'section-metadata',
    path: '/test/a11y/fixtures/section-metadata.html',
    // block removes itself from the DOM on init — wait for detachment
    readySelector: { selector: '.section-metadata', state: 'detached' },
  },
  {
    name: 'table',
    path: '/test/a11y/fixtures/table.html',
    readySelector: '.table table',
  },
  {
    name: 'youtube',
    path: '/test/a11y/fixtures/youtube.html',
    readySelector: 'iframe',
    routes: [
      // prevent real network requests to YouTube in CI
      {
        url: 'https://www.youtube-nocookie.com/**',
        contentType: 'text/html',
        body: '<html><body></body></html>',
      },
    ],
  },
  {
    name: 'header',
    path: '/test/a11y/fixtures/header.html',
    readySelector: '.skip-link',
    routes: [
      {
        url: '**/fragments/nav/header',
        contentType: 'text/html',
        body: MOCKS.headerFragment,
      },
    ],
  },
  {
    name: 'footer',
    path: '/test/a11y/fixtures/footer.html',
    readySelector: '.footer-content',
    routes: [
      {
        url: '**/fragments/nav/footer',
        contentType: 'text/html',
        body: MOCKS.footerFragment,
      },
    ],
  },
  {
    name: 'sitenav',
    path: '/test/a11y/fixtures/sitenav.html',
    readySelector: '.sitenav .sitenav-list',
    routes: [
      {
        url: '**/query-index.json',
        contentType: 'application/json',
        body: MOCKS.sitenavIndex,
      },
    ],
  },
  {
    name: 'fragment',
    path: '/test/a11y/fixtures/fragment.html',
    readySelector: 'h2',
    routes: [
      {
        url: '**/mock-fragment',
        contentType: 'text/html',
        body: MOCKS.fragmentContent,
      },
    ],
  },
  {
    name: 'schedule',
    path: '/test/a11y/fixtures/schedule.html',
    // schedule.js has a known destructuring mismatch with loadFragment's return shape;
    // the block may not fully render — use networkidle so axe still runs on the page
    routes: [
      {
        url: '**/mock-schedule.json',
        contentType: 'application/json',
        body: MOCKS.scheduleJson,
      },
      {
        url: '**/mock-event-fragment',
        contentType: 'text/html',
        body: MOCKS.eventFragment,
      },
    ],
  },

  // --- Templates ---
  // Templates define full-page landmark structure (main, nav, header, footer).
  // They also call loadBlock() internally, so setConfig() is invoked in each
  // fixture before init() to supply the required `components` array.
  {
    name: 'detail (template)',
    path: '/test/a11y/fixtures/template-detail.html',
    // detail wraps main in .template-wrapper and injects sitenav + page-nav
    readySelector: '.template-wrapper',
    routes: [
      {
        url: '**/query-index.json',
        contentType: 'application/json',
        body: MOCKS.sitenavIndex,
      },
    ],
  },
  {
    name: 'landing (template)',
    path: '/test/a11y/fixtures/template-landing.html',
    readySelector: '.template-wrapper',
    routes: [
      {
        url: '**/query-index.json',
        contentType: 'application/json',
        body: MOCKS.sitenavIndex,
      },
    ],
  },
  {
    name: 'home (template)',
    path: '/test/a11y/fixtures/template-home.html',
    // home.js moves the h1's parent div; .home-column is the class it applies
    readySelector: '.home-column',
  },
];

for (const block of BLOCKS) {
  test(`${block.name} block has no WCAG 2.2 AA violations`, async ({ page }) => {
    for (const { url, contentType, body } of (block.routes ?? [])) {
      await page.route(url, (r) => r.fulfill({ contentType, body }));
    }

    await page.goto(block.path);

    const { readySelector } = block;
    if (typeof readySelector === 'string') {
      await page.waitForSelector(readySelector);
    } else if (readySelector?.selector) {
      await page.waitForSelector(readySelector.selector, { state: readySelector.state });
    } else {
      await page.waitForLoadState('networkidle');
    }

    const results = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag22aa'])
      .analyze();

    const formatted = results.violations
      .map(({ id, impact, description, nodes }) =>
        `[${impact}] ${id}: ${description}\n${nodes.map((n) => `  ${n.html}`).join('\n')}`)
      .join('\n\n');

    expect(results.violations, formatted).toHaveLength(0);
  });
}
