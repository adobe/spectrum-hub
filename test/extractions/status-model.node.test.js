import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  STATUSES,
  getUnifiedStatus,
} from '../../scripts/utils/status-model.js';

const STATUS_IDS = ['available', 'experimental', 'not-available', 'deprecated', 'removed'];

describe('STATUSES', () => {
  it('exposes exactly the five unified statuses', () => {
    assert.deepEqual(Object.keys(STATUSES).sort(), [...STATUS_IDS].sort());
  });

  it('gives every status an id, label, color token, and definition', () => {
    for (const id of STATUS_IDS) {
      const status = STATUSES[id];
      assert.equal(status.id, id);
      assert.equal(typeof status.label, 'string');
      assert.ok(status.label.length > 0, `${id} needs a label`);
      assert.match(status.color, /^--s2-/, `${id} color must be an --s2 token`);
      assert.equal(typeof status.definition, 'string');
      assert.ok(status.definition.length > 0, `${id} needs a definition`);
    }
  });

  it('uses the expected color hue for each status', () => {
    assert.match(STATUSES.available.color, /green/);
    assert.match(STATUSES.experimental.color, /blue/);
    assert.match(STATUSES['not-available'].color, /gray/);
    assert.match(STATUSES.deprecated.color, /orange/);
    assert.match(STATUSES.removed.color, /red/);
  });

  it('has the expected human-readable labels', () => {
    assert.equal(STATUSES.available.label, 'Available');
    assert.equal(STATUSES.experimental.label, 'Experimental');
    assert.equal(STATUSES['not-available'].label, 'Not available');
    assert.equal(STATUSES.deprecated.label, 'Deprecated');
    assert.equal(STATUSES.removed.label, 'Removed');
  });
});

describe('getUnifiedStatus — RSP source', () => {
  it('maps stable to Available with a Stable context', () => {
    const { status, context } = getUnifiedStatus('rsp', 'stable');
    assert.equal(status.id, 'available');
    assert.equal(context, 'Stable');
  });

  it('maps beta to Available with a Beta context', () => {
    const { status, context } = getUnifiedStatus('rsp', 'beta');
    assert.equal(status.id, 'available');
    assert.equal(context, 'Beta');
  });

  it('maps rc to Available with an RC context', () => {
    const { status, context } = getUnifiedStatus('rsp', 'rc');
    assert.equal(status.id, 'available');
    assert.equal(context, 'RC');
  });

  it('maps alpha to Available with an Alpha context', () => {
    const { status, context } = getUnifiedStatus('rsp', 'alpha');
    assert.equal(status.id, 'available');
    assert.equal(context, 'Alpha');
  });

  it('maps a deprecated marker to Deprecated', () => {
    assert.equal(getUnifiedStatus('rsp', 'deprecated').status.id, 'deprecated');
  });

  it('maps null and absent values to Not available', () => {
    assert.equal(getUnifiedStatus('rsp', null).status.id, 'not-available');
    assert.equal(getUnifiedStatus('rsp', undefined).status.id, 'not-available');
  });

  it('maps an unrecognized value to Not available without throwing', () => {
    assert.equal(getUnifiedStatus('rsp', 'bogus').status.id, 'not-available');
  });
});

describe('getUnifiedStatus — SWC source', () => {
  it('maps stable to Available with a Stable context', () => {
    const { status, context } = getUnifiedStatus('swc', 'stable');
    assert.equal(status.id, 'available');
    assert.equal(context, 'Stable');
  });

  it('maps internal to Experimental with no context', () => {
    const { status, context } = getUnifiedStatus('swc', 'internal');
    assert.equal(status.id, 'experimental');
    assert.equal(context, null);
  });

  it('maps a deprecated marker to Deprecated', () => {
    assert.equal(getUnifiedStatus('swc', 'deprecated').status.id, 'deprecated');
  });

  it('maps null and absent values to Not available', () => {
    assert.equal(getUnifiedStatus('swc', null).status.id, 'not-available');
    assert.equal(getUnifiedStatus('swc', undefined).status.id, 'not-available');
  });

  it('maps an unrecognized value to Not available without throwing', () => {
    assert.equal(getUnifiedStatus('swc', 'bogus').status.id, 'not-available');
  });
});

describe('getUnifiedStatus — robustness', () => {
  it('returns Not available for an unknown source without throwing', () => {
    assert.equal(getUnifiedStatus('ios', 'stable').status.id, 'not-available');
  });

  it('never attaches a context to the Not available fallback', () => {
    assert.equal(getUnifiedStatus('rsp', 'bogus').context, null);
    assert.equal(getUnifiedStatus('unknown', 'stable').context, null);
  });
});
