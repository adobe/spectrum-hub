import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  getComponentProps,
  getComponentStatus,
  getSwcComponentStatus,
  isPrereleaseStatus,
  normalizeComponentExtraction,
} from '../../scripts/utils/component-status.js';

describe('normalizeComponentExtraction', () => {
  it('wraps SWC flat arrays as props with no doc status', () => {
    const props = [{ attribute: 'size', type: 'string' }];
    assert.deepEqual(normalizeComponentExtraction(props), {
      props,
      docStatus: null,
    });
  });

  it('reads RSP { props, status } objects', () => {
    assert.deepEqual(
      normalizeComponentExtraction({ status: 'rc', props: [{ property: 'x' }] }),
      { props: [{ property: 'x' }], docStatus: 'rc' },
    );
  });

  it('treats omitted RSP status as null doc status', () => {
    assert.deepEqual(
      normalizeComponentExtraction({ props: [{ property: 'x' }] }),
      { props: [{ property: 'x' }], docStatus: null },
    );
  });
});

describe('getSwcComponentStatus', () => {
  it('returns null when no props have since', () => {
    assert.equal(getSwcComponentStatus([{ attribute: 'size' }]), null);
  });

  it('returns internal when all since-bearing props are internal', () => {
    const props = [
      { attribute: 'a', since: '2.0.0', status: 'internal' },
      { attribute: 'b', since: '2.0.0', status: 'internal' },
    ];
    assert.equal(getSwcComponentStatus(props), 'internal');
  });

  it('returns stable when some released props are public', () => {
    const props = [
      { attribute: 'size', since: '2.0.0' },
      { attribute: 'variant', since: '2.0.0', status: 'internal' },
    ];
    assert.equal(getSwcComponentStatus(props), 'stable');
  });
});

describe('getComponentStatus', () => {
  it('uses RSP top-level doc status when present', () => {
    assert.equal(
      getComponentStatus({ status: 'rc', props: [{ property: 'filter' }] }),
      'rc',
    );
    assert.equal(
      getComponentStatus({ status: 'stable', props: [] }),
      'stable',
    );
  });

  it('does not treat SWC prop-level status as component doc status', () => {
    const swcProps = [{ attribute: 'x', status: 'internal', since: '1.0.0' }];
    assert.equal(getComponentStatus(swcProps), 'internal');
  });

  it('falls back to SWC since logic for flat arrays', () => {
    assert.equal(getComponentStatus([]), null);
    assert.equal(
      getComponentStatus([{ attribute: 'size', since: '2.0.0' }]),
      'stable',
    );
  });

  it('returns null for RSP sub-primitives with no doc page', () => {
    assert.equal(
      getComponentStatus({ props: [{ property: 'children', required: true }] }),
      null,
    );
  });
});

describe('getComponentProps', () => {
  it('returns the props array for both shapes', () => {
    const swc = [{ attribute: 'a' }];
    const rsp = { status: 'stable', props: [{ property: 'b' }] };
    assert.equal(getComponentProps(swc), swc);
    assert.deepEqual(getComponentProps(rsp), [{ property: 'b' }]);
  });
});

describe('isPrereleaseStatus', () => {
  it('identifies doc prerelease labels', () => {
    assert.equal(isPrereleaseStatus('rc'), true);
    assert.equal(isPrereleaseStatus('stable'), false);
    assert.equal(isPrereleaseStatus(null), false);
  });
});

describe('getComponentStatus — extraction data shapes', () => {
  // SWC shape (e.g. swc-button.json): flat array, props carry since fields
  const swcFixture = [
    { attribute: 'variant', property: 'variant', type: 'ButtonVariant', since: '0.0.1' },
    { attribute: 'disabled', property: 'disabled', type: 'boolean', since: '0.0.1', inheritedFrom: 'ButtonBase' },
  ];

  // TODO: remove this old data shape
  // RSP current shape (e.g. ActionButton.json): flat array, no since fields yet
  const rspFlatFixture = [
    { property: 'size', type: "'XS' | 'S' | 'M' | 'L' | 'XL'", inheritedFrom: 'ActionButtonStyleProps' },
    { property: 'children', type: 'ReactNode', required: true },
  ];

  // RSP future shape (after doc-status extraction): object with top-level status
  const rspWithDocStatusFixture = {
    status: 'beta',
    props: [
      { property: 'size', type: "'S' | 'M' | 'L'" },
      { property: 'variant', type: "'primary' | 'secondary'" },
    ],
  };

  it('returns "stable" for a SWC component whose props all have since', () => {
    assert.equal(getComponentStatus(swcFixture), 'stable');
  });

  it('returns null for an RSP component with no since fields (pre-extraction)', () => {
    assert.equal(getComponentStatus(rspFlatFixture), null);
  });

  it('returns the doc status for an RSP component with a top-level status field', () => {
    assert.equal(getComponentStatus(rspWithDocStatusFixture), 'beta');
  });
});
