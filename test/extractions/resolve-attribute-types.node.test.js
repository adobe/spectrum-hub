import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  needsResolution,
  collectResolutionTargets,
  resolveTargets,
} from '../../deps/swc/resolve-attribute-types.js';
import { cdnUrlsForCanonicalPath, makeCanonicalPath } from '../../deps/swc/cdn-resolve.js';

function makeMockFetch(sourcesByCanonicalPath) {
  const urlToText = new Map();
  for (const [canonicalPath, text] of Object.entries(sourcesByCanonicalPath)) {
    for (const url of cdnUrlsForCanonicalPath(canonicalPath)) {
      urlToText.set(url, text);
    }
  }
  return async (url) => {
    const text = urlToText.get(url);
    return { ok: text !== undefined, status: text !== undefined ? 200 : 404, text: async () => text ?? '' };
  };
}

describe('needsResolution', () => {
  it('is true for a bare named alias', () => {
    assert.equal(needsResolution('ButtonVariant'), true);
  });

  it('is true for a bare named alias unioned with undefined', () => {
    assert.equal(needsResolution('ButtonStaticColor | undefined'), true);
  });

  it('is false for primitives', () => {
    for (const t of ['boolean', 'string', 'number', 'any', 'unknown', 'undefined']) {
      assert.equal(needsResolution(t), false, t);
    }
  });

  it('is false for an already-inline union', () => {
    assert.equal(needsResolution('"fill" | "outline"'), false);
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

describe('resolveTargets', () => {
  // The Button/size regression this session's fix addresses: CEM attributes `size`
  // to SizedMixin's generic ElementSize, but Button's own direct superclass
  // (ButtonBase) narrows it. A target with a superclassName must prefer that
  // narrower override over the mixin file it would otherwise fall back to.
  it('prefers the direct superclass\'s narrower override over the CEM-attributed mixin file', async () => {
    const ownEntryPath = makeCanonicalPath('@adobe/spectrum-wc', '2.0.0-beta.2', 'dist/components/button/Button.d.ts');
    const mixinPath = makeCanonicalPath('@adobe/spectrum-wc-core', '2.0.0-beta.2', 'dist/mixins/sized-mixin.d.ts');
    const basePath = makeCanonicalPath('@adobe/spectrum-wc', '2.0.0-beta.2', 'dist/components/button/Button.base.d.ts');
    const fetchImpl = makeMockFetch({
      [ownEntryPath]: "import './Button.base.js';\nexport declare class Button {}",
      // Reachable transitively from ownEntryPath, exactly like the real crawl.
      [basePath]: [
        'export type ButtonSize = "s" | "m" | "l" | "xl";',
        'export declare class ButtonBase { size: ButtonSize; }',
      ].join('\n'),
      [mixinPath]: [
        'export type ElementSize = "xxs" | "xs" | "s" | "m" | "l" | "xl" | "xxl";',
        'export interface SizedElementInterface { size: ElementSize; }',
      ].join('\n'),
    });
    const targets = [{
      key: 'swc-button::size', memberName: 'size', declaringPath: mixinPath, superclassName: 'ButtonBase', ownEntryPath,
    }];
    const resolved = await resolveTargets(
      targets,
      { fileCache: new Map(), resolutionCache: new Map(), fetchImpl },
    );
    assert.equal(resolved.get('swc-button::size'), '"s" | "m" | "l" | "xl"');
  });

  it('falls back to the mixin file when the direct superclass does not override the member', async () => {
    const ownEntryPath = makeCanonicalPath('@adobe/spectrum-wc', '2.0.0-beta.2', 'dist/components/badge/Badge.d.ts');
    const mixinPath = makeCanonicalPath('@adobe/spectrum-wc-core', '2.0.0-beta.2', 'dist/mixins/sized-mixin.d.ts');
    const basePath = makeCanonicalPath('@adobe/spectrum-wc', '2.0.0-beta.2', 'dist/components/badge/Badge.base.d.ts');
    const fetchImpl = makeMockFetch({
      [ownEntryPath]: "import './Badge.base.js';\nexport declare class Badge {}",
      // BadgeBase exists but doesn't declare `size` itself — no override to prefer.
      [basePath]: 'export declare class BadgeBase { variant: string; }',
      [mixinPath]: [
        'export type ElementSize = "xxs" | "xs" | "s" | "m" | "l" | "xl" | "xxl";',
        'export interface SizedElementInterface { size: ElementSize; }',
      ].join('\n'),
    });
    const targets = [{
      key: 'swc-badge::size', memberName: 'size', declaringPath: mixinPath, superclassName: 'BadgeBase', ownEntryPath,
    }];
    const resolved = await resolveTargets(
      targets,
      { fileCache: new Map(), resolutionCache: new Map(), fetchImpl },
    );
    assert.equal(resolved.get('swc-badge::size'), '"xxs" | "xs" | "s" | "m" | "l" | "xl" | "xxl"');
  });

  it('resolves a target to its real literal union', async () => {
    const declaringPath = makeCanonicalPath('@adobe/spectrum-wc', '2.0.0-beta.2', 'dist/components/button/Button.d.ts');
    const fetchImpl = makeMockFetch({
      [declaringPath]: [
        'declare const enum Unused {}',
        'export declare const BUTTON_VARIANTS: readonly ["primary", "secondary"];',
        'export type ButtonVariant = (typeof BUTTON_VARIANTS)[number];',
        'export declare class Button { variant: ButtonVariant; }',
      ].join('\n'),
    });
    const targets = [{ key: 'swc-button::variant', memberName: 'variant', declaringPath }];
    const resolved = await resolveTargets(
      targets,
      { fileCache: new Map(), resolutionCache: new Map(), fetchImpl },
    );
    assert.equal(resolved.get('swc-button::variant'), '"primary" | "secondary"');
  });

  it('resolves a member declared on a plain interface (mixin shape), not just a class', async () => {
    const declaringPath = makeCanonicalPath('@adobe/spectrum-wc-core', '2.0.0-beta.2', 'dist/mixins/pending-mixin.d.ts');
    const fetchImpl = makeMockFetch({
      [declaringPath]: 'export interface PendingInterface { pending: boolean; pendingLabel?: string; }',
    });
    const targets = [{ key: 'swc-button::pendingLabel', memberName: 'pendingLabel', declaringPath }];
    const resolved = await resolveTargets(
      targets,
      { fileCache: new Map(), resolutionCache: new Map(), fetchImpl },
    );
    assert.equal(resolved.get('swc-button::pendingLabel'), 'string');
  });

  it('does not truncate a long union', async () => {
    const declaringPath = makeCanonicalPath('@adobe/spectrum-wc', '2.0.0-beta.2', 'dist/components/badge/Badge.d.ts');
    const many = Array.from({ length: 25 }, (_, i) => `"v${i}"`).join(' | ');
    const fetchImpl = makeMockFetch({
      [declaringPath]: [
        `export type BadgeVariant = ${many};`,
        'export declare class Badge { variant: BadgeVariant; }',
      ].join('\n'),
    });
    const targets = [{ key: 'swc-badge::variant', memberName: 'variant', declaringPath }];
    const resolved = await resolveTargets(
      targets,
      { fileCache: new Map(), resolutionCache: new Map(), fetchImpl },
    );
    assert.equal(resolved.get('swc-badge::variant'), many);
    assert.ok(!resolved.get('swc-badge::variant').includes('more'));
  });

  it('leaves a target unresolved (absent from the map) when the declaring file fails to fetch', async () => {
    const declaringPath = makeCanonicalPath('@adobe/spectrum-wc', '2.0.0-beta.2', 'dist/components/gone/Gone.d.ts');
    const fetchImpl = makeMockFetch({});
    const messages = [];
    const targets = [{ key: 'swc-gone::variant', memberName: 'variant', declaringPath }];
    const resolved = await resolveTargets(targets, {
      fileCache: new Map(), resolutionCache: new Map(), fetchImpl, onSkip: (m) => messages.push(m),
    });
    assert.equal(resolved.has('swc-gone::variant'), false);
    assert.equal(messages.length, 1);
  });

  it('leaves a target unresolved when the named member is not found in the declaring file', async () => {
    const declaringPath = makeCanonicalPath('@adobe/spectrum-wc', '2.0.0-beta.2', 'dist/components/button/Button.d.ts');
    const fetchImpl = makeMockFetch({ [declaringPath]: 'export declare class Button { fillStyle: string; }' });
    const messages = [];
    const targets = [{ key: 'swc-button::variant', memberName: 'variant', declaringPath }];
    const resolved = await resolveTargets(targets, {
      fileCache: new Map(), resolutionCache: new Map(), fetchImpl, onSkip: (m) => messages.push(m),
    });
    assert.equal(resolved.has('swc-button::variant'), false);
    assert.equal(messages.length, 1);
  });

  it('shares one crawl across multiple targets pointing at the same declaring file', async () => {
    const declaringPath = makeCanonicalPath('@adobe/spectrum-wc', '2.0.0-beta.2', 'dist/components/button/Button.d.ts');
    let fetchCount = 0;
    const baseFetch = makeMockFetch({
      [declaringPath]: [
        'export type ButtonVariant = "primary" | "secondary";',
        'export type ButtonFillStyle = "fill" | "outline";',
        'export declare class Button { variant: ButtonVariant; fillStyle: ButtonFillStyle; }',
      ].join('\n'),
    });
    const fetchImpl = async (url) => {
      fetchCount += 1;
      return baseFetch(url);
    };
    const targets = [
      { key: 'swc-button::variant', memberName: 'variant', declaringPath },
      { key: 'swc-button::fillStyle', memberName: 'fillStyle', declaringPath },
    ];
    const resolved = await resolveTargets(
      targets,
      { fileCache: new Map(), resolutionCache: new Map(), fetchImpl },
    );
    assert.equal(resolved.get('swc-button::variant'), '"primary" | "secondary"');
    assert.equal(resolved.get('swc-button::fillStyle'), '"fill" | "outline"');
    assert.equal(fetchCount, 1, 'the declaring file should only be fetched once for 2 targets pointing at it');
  });

  it('returns an empty map for an empty target list without fetching anything', async () => {
    let called = false;
    const fetchImpl = async () => { called = true; };
    const resolved = await resolveTargets(
      [],
      { fileCache: new Map(), resolutionCache: new Map(), fetchImpl },
    );
    assert.equal(resolved.size, 0);
    assert.equal(called, false);
  });
});
