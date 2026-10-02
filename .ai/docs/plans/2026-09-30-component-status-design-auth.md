# Component status design-link authentication implementation plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Hide the complete Design status pill from anonymous CDN visitors while preserving it for authenticated and off-CDN visitors.

**Architecture:** Reuse `removeForAudience()` from `scripts/ak.js`, matching page-nav's See in Figma policy. Gate the generated Design pill inside a detached `DocumentFragment` before attaching surviving pills to the block, preventing anonymous visual flash.

**Tech Stack:** Vanilla JavaScript ES modules, Web Test Runner, Sinon

---

### Task 1: Apply audience gating to the Design status pill

**Files:**
- Modify: `blocks/component-status/component-status.js:14-137`
- Modify: `test/blocks/component-status.test.js`

- [ ] **Step 1: Add component initialization test setup**

Update imports in `test/blocks/component-status.test.js`:

```js
import sinon from 'sinon';
import init, { resolveContext, buildPills } from '../../blocks/component-status/component-status.js';
import { setConfig } from '../../scripts/ak.js';
import { resetComponentSliceCacheForTests } from '../../scripts/utils/component-slice.js';
```

Add the same authentication fixtures used by `test/blocks/page-nav.test.js`:

```js
const SAFE_CONFIG = {
  hostnames: ['authorkit.dev'],
  components: [],
  locales: { '': { lang: 'en' } },
};

const setSessionHint = () => {
  document.cookie = `spectrum_session_active=${Date.now() + 2 * 60 * 60 * 1000}; path=/`;
};

const clearSessionHint = () => {
  document.cookie = 'spectrum_session_active=; path=/; max-age=0';
};

function waitFor(predicate, timeout = 2000) {
  return new Promise((resolve, reject) => {
    const start = performance.now();
    const check = () => {
      if (predicate()) {
        resolve();
      } else if (performance.now() - start > timeout) {
        reject(new Error('timed out waiting for condition'));
      } else {
        setTimeout(check, 10);
      }
    };
    check();
  });
}
```

Create an `init()` describe with a Sinon sandbox. Before each test:

- Clear `document.body`.
- Clear the component-slice cache.
- Clear the session hint.
- Set `/web/rsp/components/action-button` as the URL.
- Stub `fetch()` with an available RSP and Figma slice containing `figmaPageId`.

After each test, restore Sinon, clear the session hint, restore the URL, and delete `window.adobeIMS` and `window.adobeid`.

- [ ] **Step 2: Write the failing authentication tests**

Add three focused tests:

```js
it('removes the Design pill for an anonymous CDN visitor', async () => {
  setConfig({ ...SAFE_CONFIG, cdnEnv: true });
  const el = document.createElement('div');
  await init(el);
  expect(el.querySelector('[data-kind="dev"]')).to.exist;
  expect(el.querySelector('[data-kind="design"]')).to.not.exist;
});

it('keeps the Design pill for an authenticated CDN visitor', async () => {
  setConfig({ ...SAFE_CONFIG, cdnEnv: true });
  setSessionHint();
  window.adobeIMS = {
    getAccessToken: () => ({ token: 'test-token' }),
    getProfile: async () => ({ email: 'developer@example.com' }),
  };
  const el = document.createElement('div');
  const initPromise = init(el);
  await waitFor(() => window.adobeid?.onReady);
  await window.adobeid.onReady();
  await initPromise;
  expect(el.querySelector('[data-kind="design"]')).to.exist;
});

it('keeps the Design pill off-CDN without authentication', async () => {
  setConfig({ ...SAFE_CONFIG, cdnEnv: false });
  const el = document.createElement('div');
  await init(el);
  expect(el.querySelector('[data-kind="design"]')).to.exist;
});
```

- [ ] **Step 3: Run the component-status test and verify RED**

Run:

```bash
npm run test:file -- test/blocks/component-status.test.js
```

Expected: the anonymous CDN test fails because the Design pill is still present.

- [ ] **Step 4: Gate the Design pill before rendering**

Import `removeForAudience`:

```js
import { removeForAudience } from '../../scripts/ak.js';
```

After `buildPills()` succeeds, attach pills to a detached fragment, gate the Design pill, and render survivors:

```js
const fragment = document.createDocumentFragment();
fragment.append(...pills);
const designPill = fragment.querySelector('[data-kind="design"]');
await removeForAudience({ privateEl: designPill });
const visiblePills = [...fragment.children];

if (!visiblePills.length) {
  el.remove();
  return;
}

el.setAttribute('role', 'group');
el.setAttribute('aria-label', 'Component status');
el.replaceChildren(...visiblePills);
```

The Code pill remains unchanged. Off-CDN behavior remains controlled by `removeForAudience()`.

- [ ] **Step 5: Run targeted tests and verify GREEN**

Run:

```bash
npm run test:file -- test/blocks/component-status.test.js
```

Expected: all component-status tests pass.

- [ ] **Step 6: Run relevant accessibility and regression checks**

Run:

```bash
npm run test:file -- test/blocks/component-status.test.js test/blocks/page-nav.test.js
npx playwright test test/a11y/blocks/component-status.spec.js --project=chromium
npx eslint blocks/component-status/component-status.js test/blocks/component-status.test.js
git diff --check
```

Expected: all commands pass. The off-CDN accessibility fixture continues to render both status pills, so its accessibility-tree contract remains stable.

- [ ] **Step 7: Review the final diff**

Run:

```bash
git --no-pager diff -- blocks/component-status/component-status.js test/blocks/component-status.test.js
```

Confirm the diff only adds Design-pill audience gating and its tests. Do not commit unless the user explicitly requests it.
