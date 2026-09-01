import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  needsResolution,
  collectResolutionTargets,
} from '../../deps/swc/resolve-attribute-types.js';
import { makeCanonicalPath } from '../../deps/swc/cdn-resolve.js';

describe('needsResolution', () => {
  it('is true for a bare named alias', () => {
    assert.equal(needsResolution('ButtonVariant'), true);
  });

  it('is true for a bare named alias unioned with undefined', () => {
    assert.equal(needsResolution('ButtonStaticColor | undefined'), true);
  });

  it('is false for primitives that cannot mask a literal union', () => {
    for (const t of ['boolean', 'number', 'any', 'unknown', 'undefined']) {
      assert.equal(needsResolution(t), false, t);
    }
  });

  // The CEM trusts a JSDoc @property annotation over the real TS declaration, so a
  // lazy "@property {string} variant" flattens a real 19-value union to "string"
  // (swc-status-light). "string" is the one primitive that can mask a string-literal
  // union, so it is attempted — a genuinely-string attribute simply resolves back to
  // "string" and is written unchanged.
  it('is true for "string", which can mask a flattened literal union', () => {
    assert.equal(needsResolution('string'), true);
  });

  // An already-inline literal union still needs resolving under Layer 1: `values`
  // must come from the checker, not from re-parsing the string (root cause 1).
  it('is true for an already-inline literal union', () => {
    assert.equal(needsResolution('"fill" | "outline"'), true);
    assert.equal(needsResolution("'positive' | 'negative'"), true);
    assert.equal(needsResolution("'positive' | 'negative' | undefined"), true);
  });

  it('is false for a function type', () => {
    assert.equal(needsResolution('(e: Event) => void'), false);
  });

  it('is false for empty/missing input', () => {
    assert.equal(needsResolution(''), false);
    assert.equal(needsResolution(undefined), false);
    assert.equal(needsResolution(null), false);
  });
});

describe('collectResolutionTargets', () => {
  const wcVersion = '2.0.0-beta.2';
  const corePkgName = '@adobe/spectrum-wc-core';
  const coreVersion = '2.0.0-beta.2';

  const ownEntryPath = makeCanonicalPath('@adobe/spectrum-wc', '2.0.0-beta.2', 'dist/components/button/Button.d.ts');

  it('targets the component\'s own entry file for an own (non-inherited) attribute', () => {
    const rawAttrs = [{ name: 'variant', fieldName: 'variant', type: { text: 'ButtonVariant' } }];
    const targets = collectResolutionTargets(rawAttrs, {
      modPath: 'components/button/Button.ts', wcVersion, corePkgName, coreVersion, keyPrefix: 'swc-button::',
    });
    assert.deepEqual(targets, [{
      key: 'swc-button::variant',
      memberName: 'variant',
      declaringPath: ownEntryPath,
      ownEntryPath,
    }]);
  });

  it('targets the rebased inheritedFrom.module for an inherited attribute, carrying superclassName and ownEntryPath too', () => {
    const rawAttrs = [{
      name: 'size',
      fieldName: 'size',
      type: { text: 'ElementSize' },
      inheritedFrom: { name: 'SizedMixin', module: '../core/mixins/sized-mixin.ts' },
    }];
    const targets = collectResolutionTargets(rawAttrs, {
      modPath: 'components/button/Button.ts',
      wcVersion,
      corePkgName,
      coreVersion,
      superclassName: 'ButtonBase',
      keyPrefix: 'swc-button::',
    });
    assert.deepEqual(targets, [{
      key: 'swc-button::size',
      memberName: 'size',
      declaringPath: makeCanonicalPath(corePkgName, coreVersion, 'dist/mixins/sized-mixin.d.ts'),
      superclassName: 'ButtonBase',
      ownEntryPath,
    }]);
  });

  it('omits superclassName from an inherited target when none was given', () => {
    const rawAttrs = [{
      name: 'size',
      fieldName: 'size',
      type: { text: 'ElementSize' },
      inheritedFrom: { name: 'SizedMixin', module: '../core/mixins/sized-mixin.ts' },
    }];
    const targets = collectResolutionTargets(rawAttrs, {
      modPath: 'components/button/Button.ts', wcVersion, corePkgName, coreVersion, keyPrefix: 'swc-button::',
    });
    assert.equal(targets[0].superclassName, undefined);
  });

  it('skips an attribute whose type does not need resolution', () => {
    const rawAttrs = [{ name: 'disabled', fieldName: 'disabled', type: { text: 'boolean' } }];
    assert.deepEqual(
      collectResolutionTargets(rawAttrs, { modPath: 'components/button/Button.ts', wcVersion, corePkgName, coreVersion }),
      [],
    );
  });

  it('skips (with onSkip) an inheritedFrom.module shape that cannot be rebased', () => {
    const rawAttrs = [{
      name: 'weird',
      fieldName: 'weird',
      type: { text: 'WeirdType' },
      inheritedFrom: { name: 'Weird', module: './local-mixin.ts' },
    }];
    const messages = [];
    const targets = collectResolutionTargets(rawAttrs, {
      modPath: 'components/button/Button.ts', wcVersion, corePkgName, coreVersion, onSkip: (m) => messages.push(m),
    });
    assert.deepEqual(targets, []);
    assert.equal(messages.length, 1);
    assert.match(messages[0], /"weird"/);
  });

  it('treats a plain string inheritedFrom (no .module) as own-file, not inherited', () => {
    const rawAttrs = [{ name: 'variant', fieldName: 'variant', type: { text: 'BadgeVariant' }, inheritedFrom: 'Badge' }];
    const targets = collectResolutionTargets(rawAttrs, {
      modPath: 'components/badge/Badge.ts', wcVersion, corePkgName, coreVersion, keyPrefix: 'swc-badge::',
    });
    assert.equal(targets[0].declaringPath, makeCanonicalPath('@adobe/spectrum-wc', wcVersion, 'dist/components/badge/Badge.d.ts'));
  });
});
