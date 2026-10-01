# Component status design-link authentication

## Problem

The component-status block exposes its Figma destination through the Design status pill to every visitor. The page-nav's See in Figma widget already treats the same destination as authenticated content on the CDN.

## Behavior

Match page-nav behavior:

- On the CDN, remove the complete Design status pill for anonymous visitors.
- On the CDN, display the Design status pill for visitors with an active authenticated session.
- Off-CDN, display the Design status pill without requiring authentication so authoring and preview workflows continue to work.
- Keep the Code status pill unchanged.

The rule applies to the complete Design pill, whether it is a Figma link or a static status.

## Design

Reuse `removeForAudience()` from `scripts/ak.js`, which already implements the CDN/session policy used by page-nav.

Build the status pills into a detached `DocumentFragment`. Pass the Design pill to `removeForAudience({ privateEl })` while it is attached to that fragment, then replace the block contents with the surviving pills. This prevents an anonymous Design pill from flashing before asynchronous authentication completes.

Do not rely only on an `audience-private` class. Component-status creates its pills after the page-level audience decoration and edge response filtering have already run.

## Testing

Add component-status initialization tests that verify:

- An anonymous CDN visitor receives only the Code pill.
- An authenticated CDN visitor receives both Code and Design pills.
- An off-CDN visitor receives both pills without authentication.

Keep existing `buildPills()` tests unchanged so status and destination construction remain independently covered.
