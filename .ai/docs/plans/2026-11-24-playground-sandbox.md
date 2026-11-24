# Playground Sandbox Implementation Plan

Updated: November 24, 2026. Tracking ticket: SPDOCS-680.

> **For agentic workers:** REQUIRED SUB-SKILL: Use `subagent-driven-development` or `executing-plans` to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Keep approved playground behavior working while preventing preview code from directly accessing the surrounding site or its browser storage.

**Architecture:** Integrate with the shared preview shell and coordinator from the playground refactor. First restrict executable behavior to repository-owned modules and authenticate the message exchange. Then introduce an iframe with `sandbox="allow-scripts"`, subject to browser and deployment compatibility checks. Use a frame-scoped message channel for ongoing communication.

**Tech Stack:** Native JavaScript modules, iframe sandboxing, `postMessage`, `MessageChannel`, Content Security Policy (CSP), Web Test Runner, Playwright.

---

## Status and scope

Sandbox planning only. No sandbox is implemented on the rollout branches, and
this plan does not authorize commits, branch changes, a rebase, or deployment.
Use `test-driven-development` during implementation and
`verification-before-completion` before claiming completion.

The [incremental rollout design](../specs/2026-11-23-playground-rollout-design.md)
owns release boundaries. Phase 7 enables sandboxing after SWC/image activation
in phase 5 and RSP S2/AI activation in phase 6. Legacy cleanup moves to phase 8.
Sandbox prerequisites belong in phases 3 and 4, not a second preview system.

Current local checkpoints are `pg-tests` at `8c6b284d` and `pg-runtime` at
`7df51138`. The latter includes phase 2 (`c333739c`) and the separate SWC
snippet-state fix (`7df51138`). Neither the new shell nor sandboxing is active
on these branches. Confirm later branch bases before implementation.

The preserved implementation source is `refactor-playground` at
`26ea9c7821026e54ba611008684b40dc8be70cfa`. Its coordinator plan is
`.ai/docs/plans/2026-09-11-playground-coordinator.md`. Reconcile source paths
against each rollout slice rather than transferring the full refactor.

The current legacy helper, `deps/shared/playground/prop-listener.js`, already
checks the parent window and same origin for markup and property updates.
Preserve that protection until its replacement is exercised in the new shell.
The preserved source shell instead accepts an adapter URL from `preview-init`
without the equivalent sender/origin checks. Correct that during phase 3,
before any parent activates the new shell. Moving files does not transfer
the legacy protection.

Conversation-turn and response-status already share state transformations in
`deps/swc/playground/snippet-state.js`. Their preview wiring and script-free,
selected-state copied HTML are committed on `pg-runtime`. These snippets are
not live yet, as confirmed by the user; no inline-script compatibility fallback
is required for that fix. Adapter adoption, observer cleanup, and sandbox
isolation remain planned. Do not duplicate the helper or restore inline scripts.

### Mapping tasks to rollout phases

The task numbers below describe implementation work, not rollout phases.
Complete prerequisites in their owning phase and carry their evidence forward.

| Rollout phase | Work from this plan | Boundary |
| --- | --- | --- |
| 3: unused shell and coordinator | Task 1 contract decisions and Task 4 authenticated bootstrap, local adapter allow-list, message channel, navigation invalidation, and teardown | Required before phase 5 activation; leave production parents on legacy URLs |
| 4: unused adapters | Task 3 reuse of snippet-state, approved behavior, observer cleanup, and copied-code parity; begin Task 2 loading probes as adapters become available | No arbitrary snippet-script activation and no production sandbox |
| 5 and 6: runtime activation | Exercise the prepared connection and adapters with the existing interaction gates | Do not claim opaque-origin isolation yet |
| 7: sandbox activation | Finish Task 2 browser/deployment proof, then Tasks 5 and 6 permissions/policy and Task 7 verification and human review | Enable isolation only when the real runtime, deployment headers, and allowed interactions pass |
| 8: legacy cleanup | Apply the rollout design's cache, open-tab, and rollback gates | Sandbox activation alone does not retire legacy consumers |

### What navigation means

| Interaction | Expected policy |
| --- | --- |
| Main site navigation, outside the iframe | Unchanged. The preview sandbox does not restrict its parent. |
| Hash links inside the preview | Continue navigating within that preview. |
| Preview script attempting to replace the surrounding page | Blocked. Do not grant top-navigation permissions. |
| External documentation or legal links inside a preview | Remain usable through a narrowly validated parent-mediated link action, if approved in Task 1. |
| Links replacing the preview document itself | Sandboxing alone does not generally prevent this. Establish the intended behavior and invalidate the old preview connection on navigation. |
| Forms and file inputs | Input editing/file selection is distinct from form submission or upload. Preserve demonstrated interaction; do not enable submission or upload by default. |

### Security boundary

The existing fix checks **who may provide markup**. The proposed sandbox also
limits **what accepted code can access**. Approved JavaScript still runs inside
the preview, but cannot directly read the parent's DOM, local storage, or cookies.
Do not grant `allow-same-origin` alongside `allow-scripts` for these same-site frames.

A sandbox does not promise zero network access, prevent every request carrying
cookies, or make arbitrary HTML safe. CSP and a deliberately narrow message API
are separate controls. Repository-approved modules and third-party component
dependencies remain trusted code.

## Target file map

Use the refactored equivalents rather than building a second preview system:

| File | Responsibility |
| --- | --- |
| `blocks/playground/playground.js` | Create the iframe with the selected sandbox permissions. Keep controls, code disclosure, and ordinary site navigation outside it. |
| `blocks/playground/playground-coordinator.js` | Own frame registration, initialization, message-channel ports, navigation/teardown cleanup, errors, and any approved link action. |
| `blocks/playground/preview/index.html` | Authenticate bootstrap, select an approved adapter, and receive initialization once. |
| `deps/swc/playground/swc-preview.js` | Mount SWC, invoke the existing snippet-state helper after definition, and disconnect observers on teardown. |
| `deps/swc/playground/snippet-state.js` (existing) | Share conversation-turn and response-status transformations between preview and copied output. Keep observer ownership in the adapter. |
| `deps/swc/playground/snippets/conversation-turn.html`, `response-status.html` | Preserve authored markup and script-free copied HTML matching the selected controls. |
| `deps/rsp/playground/rsp-preview.js` | Preserve approved S2/AI imports, styles, overlays, and theme behavior under isolation. |
| `blocks/playground/preview/image-preview.js` | Preserve native preview images without site-storage privileges. |
| `test/blocks/playground-coordinator.test.js`, `preview-shell.test.js`, `swc-preview.test.js` | Focused protocol, adapter, and cleanup tests. |
| `test/a11y/blocks/playground-sandbox.spec.js` (new) | Real-browser isolation, loading, navigation, and allowed-behavior checks. |
| `test/a11y/fixtures/playground-sandbox.html` (new) | Real-shell harness following existing fixture conventions. |
| `deps/docs/PLAYGROUND-CONTRACT.md`, `deps/swc/README.md` | Document permissions, approved scripts, and deployment requirements. |

The last security-policy delivery file is intentionally not named yet. Identify
the authoritative deployment configuration in Task 2. Do not assume a repository
HTML file controls CDN response headers.

## Task 1: Record the compatibility contract

- [ ] Read the refactor's coordinator, shell, adapters, runtime manifest, and
  existing interaction fixtures. Inventory script sources, styles, fonts,
  images, import maps, dynamic imports, links, downloads, forms, and file inputs.
- [ ] Confirm the preview and parent origins for localhost, AEM branch previews,
  and production. Do not silently allow every Adobe or AEM subdomain.
- [ ] Agree on external-link behavior before implementing it. Recommended:
  documentation links open separately after an actual user click, without giving
  every preview script unrestricted popup permission. Keep the main page in place.
- [ ] Record representative routes: SWC response-status, conversation-turn,
  prompt-field, message-sources, link/popover/tooltip; RSP S2 and AI examples;
  native image examples; and a page with several playgrounds.
- [ ] Capture their existing keyboard behavior, label updates, copied code,
  theme updates, loading errors, and focus. Record measured request/byte and
  loading baselines before phase 5, repeat them for phases 6 and 7, and agree
  on acceptable limits. No numeric performance budget has been selected yet.

**Gate:** Obtain agreement on any intentional link, form, download, or clipboard
behavior changes. Do not weaken the sandbox to resolve unspecified behavior.

## Task 2: Prove that the opaque-origin sandbox can load the real runtime

- [ ] Add a disposable, uncommitted browser probe or test-only fixture with:

  ```html
  <iframe sandbox="allow-scripts" src="/blocks/playground/preview/index.html"></iframe>
  ```

- [ ] Load actual repository modules, SWC and RSP modules, the S2/AI import map,
  CSS and its nested imports, fonts, snippet data, and images. A mocked blank
  frame is not evidence that these work.
- [ ] Inspect requests from the sandbox. Its effective origin is opaque and
  messages it sends have origin `"null"`. Local module and data requests may
  now require CORS permission, even though their URLs look same-site.
- [ ] Identify the serving layer and verify real production and preview headers.
  Public preview assets may need narrowly scoped CORS headers. Do not open
  authenticated site APIs or globally enable credentialed cross-origin access.
- [ ] Check Chromium, Firefox, and WebKit using installed tooling. Record
  failures by resource type and exact response headers.

**Gate:** If deployment cannot serve required public assets appropriately, stop
before enabling the sandbox. Consider a dedicated public preview origin as a
separate architecture decision. Do not add `allow-same-origin` as a workaround.

## Task 3: Make executable behavior an explicit choice

Reuse the committed snippet-state helper through explicit adapter wiring,
not a general "execute every script in this HTML" helper or a new behavior
registry. This adapter work belongs in phase 4.

- [ ] Write failing adapter tests proving that arbitrary snippet `<script>`
  elements are not activated, conversation-turn still switches message types,
  and response-status still changes labels for active, complete, and stopped
  states.
- [ ] Invoke `createSnippetStateUpdater(root)` from the SWC adapter after
  custom elements are defined. Reuse its conversation-turn and response-status
  transformations rather than creating a second behavior module. The adapter
  applies initial state, observes `type` and `status` changes where needed,
  and disconnects its observers through `destroy()`.
- [ ] Verify phase 3 kept adapter selection local to the shell:

  ```js
  const ADAPTERS = {
    swc: '/deps/swc/playground/swc-preview.js',
    rsp: '/deps/rsp/playground/rsp-preview.js',
    image: '/blocks/playground/preview/image-preview.js',
  };
  ```

  Resolve these against the verified deployment base from Task 1. This allow-list
  must be enforced before importing anything, not deferred until phase 7.
  Do not import an arbitrary adapter or behavior URL merely because a message
  names it.
- [ ] Keep snippets repository-authored. Stop activating their script tags in
  live previews. Review other executable markup surfaces, including event
  attributes and `javascript:` links; a script-tag filter is not sanitization.
  Do not admit user-authored HTML through this contract.
- [ ] Preserve the committed copied-example contract: conversation-turn and
  response-status serialize their selected state without playground-only
  scripts or private repository imports. Carry their existing helper and
  builder tests forward and compare copied output with the live adapter.
- [ ] Run focused adapter, copied-example, and teardown tests before continuing.

**Trade-off:** Approved state transformations stay in one existing module.
Copied HTML captures the selected state; it does not carry playground observers
for future attribute changes in a standalone application. If a new requirement
needs inline execution, stop and design a maintained script-hash/CSP policy
instead; do not fall back to `unsafe-inline`.

## Task 4: Establish a sandbox-aware message connection

Implement this connection in phase 3 while the new shell is unused. Exercise it
before phase 5 activation, then verify its opaque-origin behavior again in
phase 7. Do not defer sender authentication or adapter restrictions until
sandboxing is enabled.

- [ ] Write failing tests for wrong parent windows, wrong parent origins,
  another preview's frame ID, duplicate initialization, and frame navigation.
- [ ] Before importing anything or applying updates, the shell must verify the
  sender is `window.parent` and has the trusted parent origin established in
  Task 1. Do not take the trusted origin from an incoming message or arbitrary
  referrer. For strictly same-site hosting it can be derived from the shell's
  own document URL; an opaque effective origin does not erase that URL.
- [ ] Resolve the requested implementation through the shell's local adapter
  allow-list before importing it. Reject arbitrary adapter URLs from
  `preview-init`; the map shown in Task 3 is a phase 3 prerequisite.
- [ ] Have the parent bind shell readiness to its registered
  `iframe.contentWindow` and expected frame ID. Origin `"null"` alone proves
  nothing. A frame ID routes messages; it is not a secret or authentication.
- [ ] Transfer a `MessageChannel` port once to the authenticated shell. Use the
  port for initialization, properties, themes, errors, and approved actions.
  A parent-to-opaque-frame transfer requires target origin `"*"`; narrowly
  confine that exception to the registered frame bootstrap.
- [ ] Accept initialization once, validate message shapes, reject unknown
  commands, and never expose generic fetch, evaluation, storage, or navigation
  operations through the parent.
- [ ] Close ports and disconnect observers on teardown. Treat an unexpected
  iframe document load as a new document, invalidate the old session, and do
  not automatically resend initialization to a navigated document.
- [ ] Ensure rejected initialization is observable through the existing
  preview-error UX or a bounded parent-side startup timeout. Do not silently
  leave a permanent loading state.
- [ ] Keep the legacy message contract intact. If a later slice changes an
  already deployed new-shell contract, use distinct URLs or explicit protocol
  versioning so cached parents and frames cannot connect incompatibly.

**Gate:** Do not replace the current same-origin check with an unconditional
`origin === 'null'` exception. The two sides have different validation rules.

## Task 5: Enable sandboxing and preserve intentional interaction

- [ ] Write real-frame tests showing approved behavior runs while parent DOM
  access and site-storage access fail. Set permissions before assigning `src`.
- [ ] Enable only `sandbox="allow-scripts"` initially. Keep top-navigation,
  forms, downloads, popups, and same-origin permissions absent unless separately
  justified by the compatibility contract.
- [ ] Verify ordinary navigation and hash links outside the iframe still work.
  Verify hash links inside the iframe do not navigate the main page.
- [ ] If Task 1 approved external links, implement only a `preview-link` action
  carrying an allowed destination identifier, not arbitrary URLs or JavaScript.
  Resolve its destination in the parent from approved data. Prefer a real,
  parent-owned link with `target="_blank" rel="noopener noreferrer"` if async
  message delivery loses browser user activation or triggers popup blocking.
- [ ] Test click, keyboard activation, focus, back navigation, and malicious
  link requests. Never accept arbitrary `window.open` or `location` arguments.
- [ ] Preserve RSP overlays inside the frame, SWC popovers, input editing,
  labels, multi-preview isolation, code copying, and light/dark mode.

## Task 6: Restrict network and framing policy separately

- [ ] Inventory actual destinations first. Use explicit script/module,
  stylesheet, font, image, and connection sources, including necessary transitive
  CDN imports. Do not assume `script-src` also constrains `fetch`.
- [ ] Apply preview-specific CSP through the deployment mechanism verified in
  Task 2. Prefer response headers, with reviewed hashes for necessary inline
  bootstrap code rather than `unsafe-inline` or `unsafe-eval`. Confirm import
  maps and approved component dependencies still work.
- [ ] Restrict forms and objects where unused. Use a `frame-ancestors` response
  header to restrict who can embed the shell. That directive cannot be supplied
  through a CSP HTML meta tag.
- [ ] If report-only rollout is supported, inspect reports before enforcement.
  Do not describe a report-only policy as blocking anything.
- [ ] Test public preview-asset CORS and CSP together in deployed preview and
  production. Do not copy production-only headers into local test expectations
  without verifying what the local server actually returns.

**Limit:** CSP is defense in depth, not a guarantee of no data disclosure.
An allowed endpoint or navigation can still be a channel. A compromised parent
site remains outside the iframe's protection.

## Task 7: Verification, documentation, and rollout

- [ ] Add browser regressions for outside-site embedding, wrong-source and
  wrong-origin bootstrap, arbitrary adapter requests, duplicate init,
  unapproved scripts/actions, denied parent access, navigation cleanup, and
  approved response-status behavior.
- [ ] Keep negative tests separate from allowed-interaction tests. Exercise real
  browser boundaries, not only synthetic `MessageEvent` objects.
- [ ] Run focused Web Test Runner suites:

  ```sh
  npm run test:file -- --files test/blocks/playground-coordinator.test.js test/blocks/preview-shell.test.js test/blocks/swc-preview.test.js test/blocks/playground.test.js
  ```

- [ ] Run real-frame browser and accessibility checks:

  ```sh
  npx playwright test test/a11y/blocks/playground-sandbox.spec.js --project=chromium
  npx playwright test test/a11y/blocks/playground.spec.js --project=chromium
  npm run test:e2e -- --project=chromium --project=firefox --project=webkit
  ```

  The new sandbox spec is collected by `playwright.config.js`. Its current
  projects are Chromium variants only. Add a dedicated Firefox/WebKit
  configuration for that spec, or extend the existing smoke setup to run those
  same isolation assertions in both engines; existing smoke routes alone do
  not prove isolation.

- [ ] Expected result: denied actions are denied, allowed examples work, no new
  unexpected page/network errors appear, accessibility remains intact, and
  measured loading stays within the limits agreed from Task 1's baselines.
  Investigate differences rather than masking them with broad error ignores.
- [ ] Update the playground contract with exact permissions, approved behavior
  registration, link policy, origin/channel rules, and deployment requirements.
- [ ] Obtain human review of compatibility evidence and remaining risks before
  deployment. Do not retain an automatic unsandboxed fallback.
- [ ] Record phase 7 evidence separately from phase 8's cache, open-tab
  retirement, and rollback gates. Do not remove legacy contracts during
  sandbox activation.

## Acceptance criteria

- Main site navigation outside previews works unchanged.
- Approved response-status behavior, controls, copied examples, themes, and
  representative SWC/RSP/native previews still work.
- Preview scripts cannot directly read or change the parent document or access
  the site's storage.
- An unrelated website or sibling iframe cannot initialize a preview.
- Initialization cannot choose arbitrary code URLs or unrestricted parent actions.
- Frame navigation and teardown revoke the previous connection.
- Required deployment headers are verified, not assumed.
- Any intentional limitations on links, forms, uploads, downloads, or clipboard
  access are explicit and approved.
