# Cookie consent integration design

## Goal

Add Adobe's standalone Privacy library and OneTrust consent controls to Spectrum Hub.
On a visitor's first production visit, the approved consent prompt opens
automatically. A link in the existing Spectrum Hub footer reopens privacy preferences.

The integration keeps the current fragment-based footer. It does not load FEDS
navigation services or replace or render the footer.

## Prerequisites

Before production launch, Adobe Privacy or the Privacy library owner must confirm:

- The OneTrust domain ID approved for `spectrum.adobe.com`.
- The same OneTrust configuration is approved for Spectrum Hub's AEM stage
  hostnames, or the separate stage domain ID to use.
- Whether the proposed **Cookie preferences** label and
  `https://www.adobe.com/privacy/cookies.html` fallback URL are approved.
- The Adobe and OneTrust origins that the production Content Security Policy must
  allow.

The legacy domain ID, `7a5eb705-95ed-4cc4-a11d-0cc5760e93db`, remains provisional
until that review is complete.

The production allowlist contains only `spectrum.adobe.com`. AEM stage hosts use the
repository's existing stage rule: the host contains `.aem.` and does not end in
`.live`. All other hosts, including local development, exit without loading the real
library.

## Architecture

### Privacy bootstrap

Add a focused privacy bootstrap under `scripts/` and load it from `head.html` before
the main Spectrum Hub application scripts.

The bootstrap:

1. Maps `spectrum.adobe.com` to the Adobe production endpoint and an AEM stage host to
   the Adobe stage endpoint. It exits on every other host.
2. Initializes `window.fedsConfig`.
3. Assigns the environment's approved OneTrust domain ID and the footer selector.
4. Loads `privacy-standalone.js` only after the configuration is ready.

Configuration must exist before `privacy-standalone.js` executes. The legacy Next.js
component does not guarantee this order because its configuration appears after the
external script components.

The bootstrap owns only SDK setup. It does not decorate footer markup or manage
consent state itself.

The consent-only integration omits
`window.fedsConfig.content.experience = 'spectrum-footer'`. That setting selected the
FEDS footer experience and is not part of the standalone Privacy configuration.

### Footer trigger

Add the approved **Cookie preferences** link to the authored `/fragments/nav/footer`
fragment. Authors provide the link label and fallback URL; they do not need to add a
custom HTML attribute.

When the footer block loads the fragment, it finds the exact approved fallback URL and
adds:

```html
data-feds-action="open-adchoices-modal"
```

The proposed link destination is
`https://www.adobe.com/privacy/cookies.html`. The destination remains useful if the
SDK is blocked or fails to load. Adobe Privacy must approve the label and destination
before launch.

### Privacy asset

Production loads:

- `https://www.adobe.com/etc.clientlibs/globalnav/clientlibs/base/privacy-standalone.js`

Spectrum Hub AEM stage hosts load:

- `https://www.stage.adobe.com/etc.clientlibs/globalnav/clientlibs/base/privacy-standalone.js`

The standalone library reads `window.fedsConfig.privacy.otDomainId` and
`window.fedsConfig.privacy.footerLinkSelector`, then loads the required OneTrust
resources. Spectrum Hub does not load `feds.js`, `feds.css`, or the FEDS polyfills.
Protocol-relative URLs are not used.

## Loading and failure behavior

The SDK loads once per page and only in an approved production or stage environment.
The bootstrap prevents a duplicate script element if it is evaluated more than once.

An asset failure must not prevent Spectrum Hub from rendering. The bootstrap reports
the failed asset through the repository's established client-side logging mechanism,
or through an explicit console error if no such mechanism is available. The footer
link continues to use its fallback destination when the preferences modal cannot
open.

The integration loads from `head.html`, not from `lazy.js`, so the required first-visit
prompt is not delayed until after page sections finish loading.

The current client-side telemetry inventory contains sampled Helix RUM from
`deps/rum.js`. It sends same-origin beacon data and does not load until `lazy.js`.
This project does not change or gate RUM unless Adobe Privacy classifies it as
consent-dependent. If Privacy requires that gating, it is a separate prerequisite
because it changes the page lifecycle beyond the FEDS integration.

## Accessibility

The footer link remains a native link with descriptive text and a usable fallback
destination. FEDS and OneTrust own the modal's semantics and focus management, but
Spectrum Hub must verify:

- Keyboard access to the first-visit prompt and footer trigger.
- Visible focus and logical focus movement.
- Focus return after closing the preferences modal.
- Screen-reader labels, headings, controls, and status changes.
- Reflow and operation at mobile viewport sizes and browser zoom.
- No WCAG 2.2 AA violations introduced into the footer.

## Test strategy

### Unit tests

Test the privacy bootstrap with Adobe network requests mocked. Cover:

- No loading outside the approved production hostname.
- Selection of the stage endpoint on an AEM stage hostname.
- Selection of the production endpoint only on `spectrum.adobe.com`.
- Configuration creation before `privacy-standalone.js` execution.
- Duplicate initialization.
- Explicit asset-load failure reporting.
- Continued page operation after an asset failure.

Extend footer tests to confirm that fragment decoration adds the `data-feds-action`
attribute only to the approved preferences URL while preserving its fallback.

### Accessibility tests

Update the footer accessibility fixture and expected accessibility-tree snapshot with
the approved privacy-preferences link. Keep the existing axe-core light- and dark-mode
coverage.

Automated tests must not request assets from Adobe or OneTrust.
Tests exercise production and stage behavior by injecting the hostname and
script-loading boundary. Automated tests do not request the real SDK.

### Production validation

Before launch, verify:

- The prompt appears for a visitor without stored consent.
- Accept, reject, and granular-preference choices persist as intended.
- Returning visitors are not prompted incorrectly.
- The footer link reopens preferences.
- The fallback privacy destination works when scripts are blocked.
- Keyboard, screen-reader, mobile, zoom, and high-contrast behavior.
- The production CSP permits only the required Adobe and OneTrust resources.
- Existing Spectrum Hub functionality and performance remain stable.

## Alternatives considered

### Static tags in `head.html`

Placing the standalone script and configuration directly in `head.html` is closer to
the legacy implementation, but it makes environment gating, deterministic
sequencing, failure handling, and unit testing harder.

### Deferred loading from `lazy.js`

Loading the Privacy library with other noncritical page work would reduce early
requests, but the first-visit prompt could initialize only after the visible page
settles. This is not appropriate for the required experience.

### Full FEDS integration

Using `feds.js` would include the Privacy library, but it would also bring navigation,
profile, geo-location, entitlement, and subscription capabilities that Spectrum Hub
does not need. The standalone library provides the required consent behavior without
that unrelated cost.
