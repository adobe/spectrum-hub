// Mock HTML/JSON returned for blocks that fetch remote fragments or data.
// Each HTML string is a full document that loadFragment parses as main > div sections.
// Shared across test/a11y/blocks/*.spec.js — import only what a given block needs.

export const headerFragment = `<main>
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
</main>`;

export const footerFragment = `<main>
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
</main>`;

// Pairs with navAreasFragment. filterNavByIndex drops any leaf link missing from this
// index and removeEmptyMenus then prunes the parent it emptied, so every link in the
// fragment needs an entry here or the rendered nav comes back empty.
export const sitenavIndex = JSON.stringify({
  data: [
    { path: '/getting-started', title: 'Getting started' },
    { path: '/foundations', title: 'Foundations' },
  ],
});

// Pairs with navAreasFragmentWithLevel3 — filterNavByIndex drops any leaf link whose path
// isn't listed here, so the level-3 fixture's leaf ("Scale") needs its own entry.
export const sitenavIndexWithLevel3 = JSON.stringify({
  data: [
    { path: '/getting-started', title: 'Getting started' },
    { path: '/foundations/spacing/scale', title: 'Scale' },
  ],
});

// start/end bracket all dates so the current event is always "found"
export const scheduleJson = JSON.stringify({
  data: [
    {
      name: 'always-on',
      start: '2020-01-01T00:00:00Z',
      end: '2099-12-31T23:59:59Z',
      fragment: 'http://localhost:3001/mock-event-fragment',
    },
  ],
});

export const eventFragment = `<main>
  <div>
    <h2>Scheduled event content</h2>
    <p>This content is shown during the active scheduled event.</p>
  </div>
</main>`;

// The per-component status slice component-status/page-hero fetch (deps/status/<slug>.json).
export const statusSlice = JSON.stringify({
  web: { swc: { status: 'available' }, figma: { status: 'experimental' } },
  figmaPageId: '9230:3620',
});

// A minimal build-time status index (deps/status-index.json) for status-table.
export const statusIndex = JSON.stringify({
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
});

// A generic icon body for any *.svg fetch (status-table's export-button icon has no
// static file checked in — it's generated at build/deploy time).
export const svgIcon = '<svg xmlns="http://www.w3.org/2000/svg" id="icon" viewBox="0 0 20 20"><path d="M2 2h16v16H2z"/></svg>';

// The site-nav fragment blocks/search's nav-areas.js falls back to fetching when no
// already-decorated #sitenav is present in the document.
export const navAreasFragment = `<body><header></header><main><div><ul>
  <li><p>Getting started</p><ul><li><a href="/getting-started">Getting started</a></li></ul></li>
  <li><p>Foundations</p><ul><li><a href="/foundations">Foundations</a></li></ul></li>
</ul></div></main></body>`;

// A four-level-deep variant of navAreasFragment, used only by sitenav.spec.js's level-3
// expand-behavior coverage — kept separate so search.spec.js's snapshot (which expects
// exactly the two flat navAreasFragment entries) is unaffected.
export const navAreasFragmentWithLevel3 = `<body><header></header><main><div><ul>
  <li><p>Getting started</p><ul><li><a href="/getting-started">Getting started</a></li></ul></li>
  <li><p>Foundations</p>
    <ul>
      <li><p>Layout and structure</p>
        <ul>
          <li><p>Spacing</p>
            <ul><li><a href="/foundations/spacing/scale">Scale</a></li></ul>
          </li>
        </ul>
      </li>
    </ul>
  </li>
</ul></div></main></body>`;

// A no-op stand-in for Adobe's real IMS script — sets window.adobeIMS with no access
// token (anonymous) and fires the onReady callback ims.js's loadIms() already registered.
export const imsScript = `window.adobeIMS = { getAccessToken: () => null, signIn() {}, signOut() {} };
  window.adobeid?.onReady?.();`;

// Signed-in counterpart to imsScript — getAccessToken() returns a token and
// getProfile() resolves profile details, so ims.js's loadIms() resolves with a
// full (non-anonymous) details object instead of { anonymous: true }. Pair with
// ioProfile below (profile.js's init() calls details.getIo(), which fetches the
// IO_ENV[env] host this token is handed to).
export const imsScriptSignedIn = `window.adobeIMS = {
    getAccessToken: () => ({ token: 'fake-access-token' }),
    getProfile: async () => ({ displayName: 'Jane Doe', email: 'jane@example.com' }),
    signIn() {},
    signOut() {},
  };
  window.adobeid?.onReady?.();`;

// Response for the IO profile fetch ims.js's getIoFactory() makes once signed in —
// profile.js reads io.user.avatar to populate the avatar image.
export const ioProfile = JSON.stringify({
  user: { avatar: 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBTAA7' },
});

// Minimal playground data-source responses (see playground-data.js and playground.test.js's
// stubPlaygroundFetch for the shapes these mirror).
export const playgroundComponentsSheet = JSON.stringify({ data: [{ Component: 'Button', Properties: 'isDisabled' }] });
export const playgroundControlsSheet = JSON.stringify({ data: [{ Property: 'isDisabled', control: 'switch' }] });
export const playgroundRspProps = JSON.stringify({ props: [] });
// Mirrors a real deps/swc/data row: `kind` and `values` are what the block builds
// controls from — `type` is display text and nothing branches on it (see
// deps/docs/PLAYGROUND-CONTRACT.md). A row without `kind` yields no control at all,
// so dropping it here silently empties the controls panel.
export const playgroundSwcProps = JSON.stringify([{
  property: 'disabled',
  attribute: 'disabled',
  type: 'boolean',
  kind: 'boolean',
  values: [],
  optional: false,
  default: 'false',
}]);
