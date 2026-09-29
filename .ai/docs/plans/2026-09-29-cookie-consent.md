# Cookie Consent Integration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add Adobe CMP controls through the standalone Privacy library on Spectrum Hub stage and production while preserving the existing footer and navigation.

**Architecture:** A focused `scripts/privacy.js` module maps Spectrum Hub production and AEM stage hosts to Adobe's matching standalone Privacy endpoint, configures `window.fedsConfig.privacy`, and then loads the library. `head.html` starts the bootstrap before the main application modules. The authored footer supplies a native fallback link that the Privacy library upgrades into the preferences trigger.

**Tech Stack:** Native browser ES modules, Adobe Privacy standalone library, OneTrust, Web Test Runner, Chai, Sinon, Playwright, axe-core

---

## Preconditions

- Follow `.ai/skills/test-driven-development/SKILL.md` for every behavior change.
- Adobe Privacy must confirm the OneTrust domain ID before launch. Use the legacy
  `7a5eb705-95ed-4cc4-a11d-0cc5760e93db` value only after confirmation.
- Confirm whether the same OneTrust domain ID covers AEM stage hosts or obtain the
  approved stage-specific domain ID.
- Adobe Privacy must approve the **Cookie preferences** label and
  `https://www.adobe.com/privacy/cookies.html` fallback URL.
- Confirm the production CSP permits the Adobe and OneTrust origins used by the
  standalone library. This repository does not contain the production CSP policy.
- Git commits below are conditional. Run them only if the user explicitly authorizes
  commits.

## File structure

| Path | Responsibility |
| ---- | -------------- |
| `scripts/privacy.js` | Environment-to-endpoint mapping, Privacy configuration, deterministic standalone-library loading, and failure reporting |
| `test/scripts/privacy.test.js` | Host mapping, configuration-order, deduplication, and failure unit tests |
| `head.html` | Starts the privacy bootstrap before Spectrum Hub's application modules |
| `blocks/footer/footer.js` | Converts the authored fallback link into the CMP preferences trigger |
| `test/blocks/footer.test.js` | Proves footer decoration adds the CMP trigger while preserving the fallback URL |
| `test/a11y/mocks.js` | Represents the approved authored footer content |
| `test/a11y/blocks/footer.spec.js` | Verifies the updated footer accessibility tree |
| `/fragments/nav/footer` content source | Supplies the production link; authored and published outside this repository |

### Task 1: Build the standalone Privacy bootstrap

**Files:**
- Create: `scripts/privacy.js`
- Create: `test/scripts/privacy.test.js`
- Reuse: `scripts/utils/script.js`

- [ ] **Step 1: Write failing host-gating and configuration-order tests**

Create `test/scripts/privacy.test.js`:

```js
import { expect } from '@esm-bundle/chai';
import sinon from 'sinon';
import {
  PRIVACY_CONFIGS,
  initPrivacy,
} from '../../scripts/privacy.js';

const PROD_HOST = 'spectrum.adobe.com';
const STAGE_HOST = 'main--spectrum-hub--adobe.aem.page';

const cleanup = () => {
  Object.values(PRIVACY_CONFIGS).forEach(({ src }) => {
    document.head.querySelectorAll(`script[src="${src}"]`)
      .forEach((script) => script.remove());
  });
  delete window.fedsConfig;
};

describe('privacy bootstrap', () => {
  beforeEach(cleanup);

  afterEach(() => {
    cleanup();
    sinon.restore();
  });

  it('does nothing outside approved production and stage hosts', async () => {
    const load = sinon.stub().resolves();

    const loaded = await initPrivacy({ hostname: 'localhost', load });

    expect(loaded).to.be.false;
    expect(load.called).to.be.false;
    expect(window.fedsConfig).to.be.undefined;
  });

  it('sets privacy configuration before loading the production library', async () => {
    const load = sinon.stub().callsFake(async (src) => {
      expect(window.fedsConfig.privacy.otDomainId)
        .to.equal('7a5eb705-95ed-4cc4-a11d-0cc5760e93db');
      expect(window.fedsConfig.privacy.footerLinkSelector)
        .to.equal('[data-feds-action="open-adchoices-modal"]');
      expect(window.fedsConfig.content).to.be.undefined;

      const script = document.createElement('script');
      script.src = src;
      document.head.append(script);
    });

    const loaded = await initPrivacy({ hostname: PROD_HOST, load });

    expect(loaded).to.be.true;
    expect(load.calledOnceWithExactly(PRIVACY_CONFIGS.prod.src)).to.be.true;
  });

  it('uses the Adobe stage library on an AEM stage host', async () => {
    const load = sinon.stub().resolves();

    const loaded = await initPrivacy({ hostname: STAGE_HOST, load });

    expect(loaded).to.be.true;
    expect(load.calledOnceWithExactly(PRIVACY_CONFIGS.stage.src)).to.be.true;
    expect(window.fedsConfig.privacy.otDomainId)
      .to.equal(PRIVACY_CONFIGS.stage.domainId);
  });
});
```

- [ ] **Step 2: Run the new test and verify the red state**

Run:

```bash
npm run test:file -- test/scripts/privacy.test.js
```

Expected: FAIL because `scripts/privacy.js` does not exist.

- [ ] **Step 3: Implement the smallest bootstrap**

Create `scripts/privacy.js`:

```js
import loadScript from './utils/script.js';

const PROD_HOST = 'spectrum.adobe.com';
const PRIVACY_PATH = '/etc.clientlibs/globalnav/clientlibs/base/privacy-standalone.js';
const PROD_DOMAIN_ID = '7a5eb705-95ed-4cc4-a11d-0cc5760e93db';
const STAGE_DOMAIN_ID = '7a5eb705-95ed-4cc4-a11d-0cc5760e93db';

export const PRIVACY_CONFIGS = {
  prod: {
    domainId: PROD_DOMAIN_ID,
    src: `https://www.adobe.com${PRIVACY_PATH}`,
  },
  stage: {
    domainId: STAGE_DOMAIN_ID,
    src: `https://www.stage.adobe.com${PRIVACY_PATH}`,
  },
};

const getPrivacyConfig = (hostname) => {
  if (hostname === PROD_HOST) return PRIVACY_CONFIGS.prod;
  if (hostname.includes('.aem.') && !hostname.endsWith('.live')) {
    return PRIVACY_CONFIGS.stage;
  }
  return null;
};

const configurePrivacy = (domainId) => {
  window.fedsConfig ??= {};
  window.fedsConfig.privacy ??= {};
  window.fedsConfig.privacy.otDomainId = domainId;
  window.fedsConfig.privacy.footerLinkSelector = '[data-feds-action="open-adchoices-modal"]';
};

export async function initPrivacy({
  hostname = window.location.hostname,
  load = loadScript,
} = {}) {
  const config = getPrivacyConfig(hostname);
  if (!config) return false;

  configurePrivacy(config.domainId);
  if (!document.head.querySelector(`script[src="${config.src}"]`)) {
    await load(config.src);
  }
  return true;
}
```

Do not load `feds.js`, `feds.css`, FEDS polyfills, or set
`fedsConfig.content.experience`. The standalone library supplies only the CMP behavior
needed by Spectrum Hub and injects its OneTrust dependencies.

- [ ] **Step 4: Run the focused tests**

Run:

```bash
npm run test:file -- test/scripts/privacy.test.js
```

Expected: all tests PASS without requesting Adobe or OneTrust assets.

- [ ] **Step 5: Add a failing duplicate-initialization test**

Append inside the `describe` block:

```js
it('does not load the standalone library twice', async () => {
  const load = sinon.stub().callsFake(async (src) => {
    const script = document.createElement('script');
    script.src = src;
    document.head.append(script);
  });

  await initPrivacy({ hostname: PROD_HOST, load });
  await initPrivacy({ hostname: PROD_HOST, load });

  expect(load.calledOnceWithExactly(PRIVACY_CONFIGS.prod.src)).to.be.true;
  expect(document.head.querySelectorAll(`script[src="${PRIVACY_CONFIGS.prod.src}"]`))
    .to.have.length(1);
});
```

- [ ] **Step 6: Run the test and verify deduplication**

Run:

```bash
npm run test:file -- test/scripts/privacy.test.js
```

Expected: PASS. If it fails, fix the DOM asset-presence guard; do not add test-only
state-reset hooks.

- [ ] **Step 7: Add failing error-boundary coverage**

Extend the import with `startPrivacy`, then append:

```js
it('reports a library-load failure without rejecting', async () => {
  const error = new Error('blocked');
  const report = sinon.stub();
  const load = sinon.stub().rejects(error);

  const loaded = await startPrivacy({ hostname: PROD_HOST, load, report });

  expect(loaded).to.be.false;
  expect(report.calledOnceWithExactly(
    'Failed to load Adobe privacy controls.',
    error,
  )).to.be.true;
});
```

- [ ] **Step 8: Run the test and verify the red state**

Run:

```bash
npm run test:file -- test/scripts/privacy.test.js
```

Expected: FAIL because `startPrivacy` is not exported.

- [ ] **Step 9: Implement explicit failure reporting and module startup**

Append to `scripts/privacy.js`:

```js
export async function startPrivacy({
  report = console.error,
  ...options
} = {}) {
  try {
    return await initPrivacy(options);
  } catch (error) {
    report('Failed to load Adobe privacy controls.', error);
    return false;
  }
}

startPrivacy();
```

The top-level call exits without loading on Web Test Runner's nonproduction hostname.

- [ ] **Step 10: Run the complete bootstrap test**

Run:

```bash
npm run test:file -- test/scripts/privacy.test.js
```

Expected: all tests PASS.

- [ ] **Step 11: Commit if authorized**

```bash
git add scripts/privacy.js test/scripts/privacy.test.js
git commit -m "feat(privacy): add standalone consent bootstrap"
```

### Task 2: Start privacy initialization from the page head

**Files:**
- Modify: `head.html:1-16`
- Test: `test/scripts/privacy.test.js`

- [ ] **Step 1: Replace the copied legacy FEDS integration**

After the import map and before `ak.js`, add:

```html
<script src="/scripts/privacy.js" type="module"></script>
```

Remove the copied `polyfills.js`, `feds.js`, and inline `fedsConfig` tags. Do not add
`privacy-standalone.js` directly to `head.html`; the bootstrap loads it only on the
approved hostname and only after configuration.

The relevant order becomes:

```html
<script nonce="aem" type="importmap">
  { "imports": { "lit": "/deps/lit/dist/index.js" } }
</script>
<script src="/scripts/privacy.js" type="module"></script>
<script src="/scripts/ak.js" type="module"></script>
<script src="/scripts/scripts.js" type="module"></script>
```

- [ ] **Step 2: Run the focused test and JavaScript lint**

Run:

```bash
npm run test:file -- test/scripts/privacy.test.js
npm run lint:js -- --quiet
```

Expected: both commands PASS.

- [ ] **Step 3: Inspect the final loader set**

Run:

```bash
grep -nE 'privacy|feds|polyfills|scripts/(ak|scripts)' head.html
```

Expected:

- One `/scripts/privacy.js` module before the application modules.
- No direct external privacy or FEDS script.
- No inline `fedsConfig`.

- [ ] **Step 4: Commit if authorized**

```bash
git add head.html
git commit -m "feat(privacy): initialize consent from page head"
```

### Task 3: Author and verify the footer preferences trigger

**Files:**
- Modify outside repository: `/fragments/nav/footer` content source
- Modify: `blocks/footer/footer.js`
- Modify: `test/blocks/footer.test.js`

- [ ] **Step 1: Add a failing footer-decoration test**

Add this test inside `when using the fragments for content`, whose tests do not use
the initialized-fragment `beforeEach` from the later structure suite:

```js
it('decorates the cookie preferences fallback link for the Privacy library', async () => {
  stubFetch(sandbox, `
    <!DOCTYPE html><html><body><main>
      <div>General footer content</div>
      <div>
        <p>
          <a href="https://www.adobe.com/privacy/cookies.html">
            Cookie preferences
          </a>
        </p>
      </div>
      <div>Copyright &copy; 2026 Adobe</div>
    </main></body></html>
  `);

  await init(el);

  const link = el.querySelector('a[href="https://www.adobe.com/privacy/cookies.html"]');
  expect(link.dataset.fedsAction).to.equal('open-adchoices-modal');
});
```

- [ ] **Step 2: Run the footer test and verify the red state**

Run:

```bash
npm run test:file -- test/blocks/footer.test.js
```

Expected: FAIL because the authored link has no `data-feds-action`.

- [ ] **Step 3: Add focused footer decoration**

In `blocks/footer/footer.js`, add:

```js
const PRIVACY_URL = 'https://www.adobe.com/privacy/cookies.html';
const PRIVACY_ACTION = 'open-adchoices-modal';

const decoratePrivacyLink = (fragment) => {
  const link = fragment.querySelector(`a[href="${PRIVACY_URL}"]`);
  if (link) link.dataset.fedsAction = PRIVACY_ACTION;
};
```

Call `decoratePrivacyLink(fragment)` after confirming the fragment exists and before
appending it to the footer. Do not match by visible link text; the URL remains stable
if the label is localized.

- [ ] **Step 4: Run the footer unit test**

Run:

```bash
npm run test:file -- test/blocks/footer.test.js
```

Expected: PASS, proving the footer adds the action while preserving the native link.

- [ ] **Step 5: Author the production footer link**

Through the normal Spectrum Hub content-authoring workflow, add **Cookie preferences**
to `/fragments/nav/footer` with this URL:

- URL: `https://www.adobe.com/privacy/cookies.html`

Preserve the fragment's existing legal-link structure. Authors do not need to add a
custom attribute; the footer block does that after loading the fragment.

- [ ] **Step 6: Verify the published fragment**

On AEM preview, confirm the authored fragment contains the text and absolute fallback
URL. After the footer block initializes, confirm the rendered link has
`data-feds-action="open-adchoices-modal"`. With JavaScript disabled, following the
link must reach the Adobe cookie information page.

- [ ] **Step 7: Commit the footer change and test if authorized**

```bash
git add blocks/footer/footer.js test/blocks/footer.test.js
git commit -m "feat(footer): decorate cookie preferences trigger"
```

The authored fragment is published separately and is not part of the Git commit.

### Task 4: Update footer accessibility coverage

**Files:**
- Modify: `test/a11y/mocks.js:19-30`
- Modify: `test/a11y/blocks/footer.spec.js:35-52`

- [ ] **Step 1: Add the link to `footerFragment`**

Add this paragraph to the legal-links section:

```html
<p>
  <a href="https://www.adobe.com/privacy/cookies.html">Cookie preferences</a>
</p>
```

The accessibility fixture represents authored content. The footer block adds the
`data-feds-action` attribute at runtime.

- [ ] **Step 2: Run the accessibility-tree test and verify the red state**

Run:

```bash
npx playwright test test/a11y/blocks/footer.spec.js --project=chromium \
  --grep "matches its expected accessibility tree"
```

Expected: FAIL because the expected tree lacks the new link.

- [ ] **Step 3: Update the expected ARIA snapshot**

After **Terms of Use**, add:

```yaml
- paragraph:
  - link "Cookie preferences":
    - /url: https://www.adobe.com/privacy/cookies.html
```

- [ ] **Step 4: Run all footer accessibility tests**

Run:

```bash
npx playwright test test/a11y/blocks/footer.spec.js
```

Expected: the axe-core light- and dark-mode checks and the Chromium accessibility-tree
check all PASS.

- [ ] **Step 5: Commit if authorized**

```bash
git add test/a11y/mocks.js test/a11y/blocks/footer.spec.js
git commit -m "test(a11y): cover cookie preferences link"
```

### Task 5: Complete integrated verification and launch checks

**Files:**
- Verify: `scripts/privacy.js`
- Verify: `head.html`
- Verify: `blocks/footer/footer.js`
- Verify: `test/scripts/privacy.test.js`
- Verify: `test/blocks/footer.test.js`
- Verify: `test/a11y/mocks.js`
- Verify: `test/a11y/blocks/footer.spec.js`
- Verify outside repository: published `/fragments/nav/footer`

- [ ] **Step 1: Run focused unit coverage**

Run:

```bash
npm run test:file -- \
  test/scripts/privacy.test.js \
  test/blocks/footer.test.js
```

Expected: all focused tests PASS.

- [ ] **Step 2: Run JavaScript lint**

Run:

```bash
npm run lint:js -- --quiet
```

Expected: PASS.

- [ ] **Step 3: Run footer accessibility coverage**

Run:

```bash
npx playwright test test/a11y/blocks/footer.spec.js
```

Expected: all configured browser and viewport runs PASS.

- [ ] **Step 4: Confirm launch approvals**

Record confirmation for:

- OneTrust domain ID and `spectrum.adobe.com` registration.
- Footer label and fallback URL.
- CSP origins required by `privacy-standalone.js` and OneTrust.
- Whether sampled same-origin Helix RUM in `deps/rum.js` is consent-dependent.

If RUM requires gating, stop and create a separate lifecycle design. Do not attach an
unreviewed telemetry change to this implementation.

If stage and production require different OneTrust domain IDs, update
`STAGE_DOMAIN_ID` and `PROD_DOMAIN_ID` independently and keep an assertion for each
environment in `test/scripts/privacy.test.js`.

- [ ] **Step 5: Validate on AEM stage with a clean browser profile**

Verify:

1. The first-visit prompt opens.
2. Accept, reject, and granular choices persist across navigation and reload.
3. Returning visitors are not prompted incorrectly.
4. **Cookie preferences** reopens preferences.
5. Closing preferences returns focus to the trigger.
6. Keyboard and screen-reader controls expose meaningful labels and states.
7. The UI works at mobile widths and 200% browser zoom.
8. Blocking Adobe scripts leaves the page usable and the fallback link navigable.
9. The console has no CSP violations or duplicate standalone-library requests.
10. `feds.js`, FEDS navigation CSS, and FEDS polyfills are not loaded.
11. The standalone script comes from `www.stage.adobe.com`.

- [ ] **Step 6: Repeat the launch-critical checks on production**

On `https://spectrum.adobe.com`, repeat the first-visit, persistence, preferences,
fallback, accessibility, and CSP checks. Confirm the standalone script comes from
`www.adobe.com`, not the stage origin.

- [ ] **Step 7: Run the broader unit regression suite**

Run:

```bash
npm test
```

Expected: all unit, extraction, indexer, and link-unit suites PASS.

- [ ] **Step 8: Compare page-load impact on AEM stage**

Capture a Lighthouse run and the browser network waterfall before and after enabling
the integration on the same representative page and clean profile. Confirm:

- No `feds.js`, FEDS CSS, or FEDS polyfills are downloaded.
- Only the standalone Privacy and required OneTrust resources are added.
- The consent UI does not create unexpected layout shift.
- Any measured LCP or total-blocking-time regression is documented and reviewed before
  production launch.

- [ ] **Step 9: Review the final diff**

Run:

```bash
git --no-pager diff --check
git --no-pager diff --stat
git --no-pager diff -- \
  head.html \
  scripts/privacy.js \
  blocks/footer/footer.js \
  test/scripts/privacy.test.js \
  test/blocks/footer.test.js \
  test/a11y/mocks.js \
  test/a11y/blocks/footer.spec.js
```

Expected: no whitespace errors and only the planned standalone consent changes.

- [ ] **Step 10: Commit any approved configuration correction if authorized**

Normally the earlier task commits contain all repository changes. If external approval
required a configuration correction, commit only that correction:

```bash
git add head.html scripts/privacy.js blocks/footer/footer.js test/scripts/privacy.test.js \
  test/blocks/footer.test.js test/a11y/mocks.js test/a11y/blocks/footer.spec.js
git commit -m "fix(privacy): apply approved consent configuration"
```
