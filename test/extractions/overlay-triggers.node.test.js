import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { OVERLAY_TRIGGERS, overlayShape, propsOwner } from '../../deps/rsp/playground/overlay-triggers.js';

// overlayShape is the single source of truth the live preview (deps/rsp/playground/
// index.html) and the snippet builder (blocks/playground/playground.js) both call — this
// guards that every OVERLAY_TRIGGERS entry resolves to the shape its own shape implies,
// so the two render targets can't silently disagree on which one applies to a route.
describe('overlayShape', () => {
  it('returns "wrap" for every entry that carries a `trigger`', () => {
    const wrapRoutes = Object.entries(OVERLAY_TRIGGERS)
      .filter(([, entry]) => entry.trigger)
      .map(([route]) => route);
    assert.ok(wrapRoutes.length > 0, 'expected at least one wrap-shaped route in OVERLAY_TRIGGERS');
    wrapRoutes.forEach((route) => assert.equal(overlayShape(route), 'wrap'));
  });

  it('returns "sibling" for every entry with no `trigger`', () => {
    const siblingRoutes = Object.entries(OVERLAY_TRIGGERS)
      .filter(([, entry]) => !entry.trigger)
      .map(([route]) => route);
    assert.ok(siblingRoutes.length > 0, 'expected at least one sibling-shaped route in OVERLAY_TRIGGERS');
    siblingRoutes.forEach((route) => assert.equal(overlayShape(route), 'sibling'));
  });

  it('returns "none" for a route with no OVERLAY_TRIGGERS entry', () => {
    assert.equal(overlayShape('action-button'), 'none');
  });

  // Keyed by the authored slug, like every other playground lookup — the RSP export
  // name is resolved only where the export itself is needed.
  it('specifically classifies the documented routes (regression guard)', () => {
    assert.equal(overlayShape('standard-dialog'), 'wrap');
    assert.equal(overlayShape('alert-dialog'), 'wrap');
    assert.equal(overlayShape('custom-dialog'), 'wrap');
    assert.equal(overlayShape('takeover-dialog'), 'wrap');
    assert.equal(overlayShape('popover'), 'wrap');
    assert.equal(overlayShape('tooltip'), 'wrap');
    assert.equal(overlayShape('toast'), 'sibling');
  });
});

// RSP splits Tooltip's API across two exports: `Tooltip` renders the bubble, but every
// controllable prop (placement, trigger, delay, isDisabled, shouldFlip, ...) is declared
// on `TooltipTrigger`. The route is keyed `tooltip`, so without this the playground reads
// Tooltip.json — 6 props, none of them a control — and every authored property is
// rejected by the existence gate. It is the only route where the trigger owns the API;
// the dialogs all declare their own props.
describe('propsOwner', () => {
  it('names the trigger for a route whose props live there', () => {
    assert.equal(propsOwner('tooltip'), 'TooltipTrigger');
  });

  it('returns null for an overlay route that declares its own props', () => {
    ['popover', 'standard-dialog', 'alert-dialog', 'takeover-dialog', 'toast']
      .forEach((route) => assert.equal(propsOwner(route), null, route));
  });

  it('returns null for a route with no overlay at all', () => {
    assert.equal(propsOwner('action-button'), null);
    assert.equal(propsOwner('nonexistent'), null);
  });
});
