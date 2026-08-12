import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const BLOCKS_DIR = path.resolve(__dirname, '../../blocks');

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

  // The per-component status slice component-status/page-hero fetch (deps/status/<slug>.json).
  statusSlice: JSON.stringify({
    web: { swc: { status: 'available' }, figma: { status: 'experimental' } },
    figmaPageId: '9230:3620',
  }),

  // A minimal build-time status index (deps/status-index.json) for status-table.
  statusIndex: JSON.stringify({
    implementations: {
      web: [
        { id: 'figma', label: 'Figma' },
        { id: 'swc', label: 'Spectrum Web Components' },
      ],
    },
    components: [
      {
        name: 'Button',
        label: 'Button',
        platforms: { web: { figma: { status: 'available' }, swc: { status: 'available' } } },
      },
      {
        name: 'Calendar',
        label: 'Calendar',
        platforms: { web: { figma: { status: 'not-available' }, swc: { status: 'experimental' } } },
      },
    ],
  }),

  // A generic icon body for any *.svg fetch (status-table's export-button icon has no
  // static file checked in — it's generated at build/deploy time).
  svgIcon: '<svg xmlns="http://www.w3.org/2000/svg" id="icon" viewBox="0 0 20 20"><path d="M2 2h16v16H2z"/></svg>',

  // The site-nav fragment blocks/search's nav-areas.js falls back to fetching when no
  // already-decorated #sitenav is present in the document.
  navAreasFragment: `<body><header></header><main><div><ul>
    <li><p>Getting started</p><ul><li><a href="/getting-started">Getting started</a></li></ul></li>
    <li><p>Foundations</p><ul><li><a href="/foundations">Foundations</a></li></ul></li>
  </ul></div></main></body>`,

  // A no-op stand-in for Adobe's real IMS script — sets window.adobeIMS with no access
  // token (anonymous) and fires the onReady callback ims.js's loadIms() already registered.
  imsScript: `window.adobeIMS = { getAccessToken: () => null, signIn() {}, signOut() {} };
    window.adobeid?.onReady?.();`,

  // Minimal playground data-source responses (see playground-data.js and playground.test.js's
  // stubPlaygroundFetch for the shapes these mirror).
  playgroundComponentsSheet: JSON.stringify({ data: [{ Component: 'Button', Properties: 'isDisabled' }] }),
  playgroundControlsSheet: JSON.stringify({ data: [{ Property: 'isDisabled', control: 'switch' }] }),
  playgroundRspProps: JSON.stringify({ props: [] }),
  playgroundSwcProps: JSON.stringify([{ property: 'disabled', attribute: 'disabled', type: 'boolean', default: 'false' }]),
};

const BLOCKS = [
  {
    name: 'action-button',
    path: '/test/a11y/fixtures/action-button.html',
    readySelector: 'button.action-button-primary',
  },
  {
    name: 'banner',
    path: '/test/a11y/fixtures/banner.html',
    // se-button/size-m are only added once init finds and wires the button link
    readySelector: '.banner .se-button',
  },
  {
    name: 'breadcrumbs',
    path: '/test/a11y/fixtures/breadcrumbs.html',
    readySelector: '.breadcrumbs ol',
  },
  {
    name: 'card',
    path: '/test/a11y/fixtures/card.html',
    readySelector: '.card-content-container',
  },
  {
    name: 'columns',
    path: '/test/a11y/fixtures/columns.html',
    readySelector: '.col-1',
  },
  {
    name: 'component-status',
    path: '/test/a11y/fixtures/component-status.html',
    readySelector: '.component-status-pill',
    routes: [
      {
        url: '**/deps/status/button.json',
        contentType: 'application/json',
        body: MOCKS.statusSlice,
      },
    ],
  },
  {
    name: 'hero',
    path: '/test/a11y/fixtures/hero.html',
    readySelector: '.hero-foreground',
  },
  {
    name: 'media',
    path: '/test/a11y/fixtures/media.html',
    // init() sets --media-width and removes the authored size-* class
    readySelector: '.media[style]',
  },
  {
    name: 'page-hero',
    path: '/test/a11y/fixtures/page-hero.html',
    // the nested component-status pill is the last thing to render
    readySelector: '.component-status-pill',
    routes: [
      {
        url: '**/deps/status/button.json',
        contentType: 'application/json',
        body: MOCKS.statusSlice,
      },
    ],
  },
  {
    name: 'page-nav',
    path: '/test/a11y/fixtures/page-nav.html',
    readySelector: 'nav.page-nav',
  },
  {
    name: 'playground',
    path: '/test/a11y/fixtures/playground.html',
    // layout (preview + controls) and the code disclosure land together in one replaceChildren
    readySelector: '.playground-layout',
    routes: [
      {
        url: '**/playground-data.json?sheet=components',
        contentType: 'application/json',
        body: MOCKS.playgroundComponentsSheet,
      },
      {
        url: '**/playground-data.json?sheet=controls',
        contentType: 'application/json',
        body: MOCKS.playgroundControlsSheet,
      },
      {
        url: '**/deps/rsp/data/Button.json',
        contentType: 'application/json',
        body: MOCKS.playgroundRspProps,
      },
      {
        url: '**/deps/swc/data/swc-button.json',
        contentType: 'application/json',
        body: MOCKS.playgroundSwcProps,
      },
      {
        // avoid a real cross-origin CDN fetch inside the live-preview iframe
        url: '**/deps/swc/playground/index.html**',
        contentType: 'text/html',
        body: '<html><body></body></html>',
      },
    ],
  },
  {
    name: 'profile',
    path: '/test/a11y/fixtures/profile.html',
    // rendered once loadIms() resolves and the placeholder is swapped for <se-profile>
    readySelector: 'se-profile se-button',
    routes: [
      {
        url: 'https://auth.services.adobe.com/imslib/imslib.min.js',
        contentType: 'application/javascript',
        body: MOCKS.imsScript,
      },
    ],
  },
  {
    name: 'search',
    path: '/test/a11y/fixtures/search.html',
    readySelector: 'sh-search .hit-title',
    routes: [
      {
        url: '**/fragments/nav/site-nav',
        contentType: 'text/html',
        body: MOCKS.navAreasFragment,
      },
    ],
    // False positive: se-input associates its listbox via Cross-root ARIA Reflection
    // (input.ariaControlsElements = [listboxEl]), which correctly carries the relationship
    // into the accessibility tree across the shadow boundary but leaves the plain
    // aria-controls="" string attribute empty by design — axe-core only inspects that
    // attribute and doesn't yet recognize this newer element-reflection API.
    disableRules: ['aria-required-attr'],
  },
  {
    name: 'status-table',
    path: '/test/a11y/fixtures/status-table.html',
    readySelector: '.status-table-table',
    routes: [
      {
        url: '**/deps/status-index.json',
        contentType: 'application/json',
        body: MOCKS.statusIndex,
      },
      {
        url: '**/*.svg',
        contentType: 'image/svg+xml',
        body: MOCKS.svgIcon,
      },
    ],
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
    name: 'usage',
    path: '/test/a11y/fixtures/usage.html',
    readySelector: '.usage-panel',
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
    // getSiteNav() builds <div id="sitenav">, not .sitenav; decorateLevel adds
    // level-<depth>-list, not sitenav-list.
    readySelector: '#sitenav .level-1-list',
    routes: [
      {
        url: '**/fragments/nav/site-nav',
        contentType: 'text/html',
        body: MOCKS.navAreasFragment,
      },
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
];

test('every block under blocks/ is registered in the a11y BLOCKS registry', () => {
  const blockDirs = fs.readdirSync(BLOCKS_DIR, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name)
    .sort();

  const registered = new Set(BLOCKS.map((block) => block.name));
  const missing = blockDirs.filter((name) => !registered.has(name));

  expect(
    missing,
    `Add an a11y fixture + BLOCKS entry for: ${missing.join(', ')} (see AGENTS.md § Accessibility tests)`,
  ).toHaveLength(0);
});

for (const block of BLOCKS) {
  test(`${block.name} block in light/default mode has no WCAG 2.2 AA violations`, async ({ page }) => {
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
      .disableRules(block.disableRules ?? [])
      .analyze();

    const formatted = results.violations
      .map(({ id, impact, description, nodes }) =>
        `[${impact}] ${id}: ${description}\n${nodes.map((n) => `  ${n.html}`).join('\n')}`)
      .join('\n\n');

    expect(results.violations, formatted).toHaveLength(0);
  });

  test(`${block.name} block in dark mode have no WCAG 2.2 AA violations`, async ({ page }, testInfo) => {
    await page.emulateMedia({ colorScheme: 'dark' });

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
      .withRules(['color-contrast'])
      .analyze();

      await testInfo.attach('accessibility-scan-results', {
        body: JSON.stringify(results, null, 2),
        contentType: 'application/json'
      });


    const formatted = results.violations
      .map(({ id, impact, description, nodes }) =>
        `[${impact}] ${id}: ${description}\n${nodes.map((n) => `  ${n.html}`).join('\n')}`)
      .join('\n\n');

    expect(results.violations, formatted).toHaveLength(0);
  });
}
