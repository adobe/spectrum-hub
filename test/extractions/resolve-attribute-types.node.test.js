import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  needsResolution,
  collectResolutionTargets,
  resolveTargets,
} from '../../deps/swc/resolve-attribute-types.js';
import { cdnUrlsForCanonicalPath, makeCanonicalPath } from '../../deps/swc/locate-published-files.js';

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

describe('resolveTargets', () => {
  // The Button/size regression this session's fix addresses: CEM attributes `size`
  // to SizedMixin's generic ElementSize, but Button's own direct superclass
  // (ButtonBase) narrows it. A target with a superclassName must prefer that
  // narrower override over the mixin file it would otherwise fall back to.
  // SizedMixin takes each component's real size range as a RUNTIME argument
  // (SizedMixin(base, { validSizes })) and its return type widens `size` straight
  // back to the generic ElementSize — so for a component like ActionButton, neither
  // the CEM (ElementSize, 7 values) nor the superclass's declared `size` (ButtonSize,
  // 4 values) carries the truth (xs/s/m/l/xl, 5 values). The one place it reaches the
  // type system is the static the mixin contract declares for exactly this purpose.
  it("prefers the component's own static VALID_SIZES over both the superclass and the mixin", async () => {
    const ownEntryPath = makeCanonicalPath('@adobe/spectrum-wc', '2.0.0-beta.2', 'dist/components/action-button/ActionButton.d.ts');
    const mixinPath = makeCanonicalPath('@adobe/spectrum-wc-core', '2.0.0-beta.2', 'dist/mixins/sized-mixin.d.ts');
    const basePath = makeCanonicalPath('@adobe/spectrum-wc', '2.0.0-beta.2', 'dist/components/button/Button.base.d.ts');
    const fetchImpl = makeMockFetch({
      [ownEntryPath]: [
        "import './Button.base.js';",
        'export type ActionButtonSize = "xs" | "s" | "m" | "l" | "xl";',
        'export declare class ActionButton { static readonly VALID_SIZES: readonly ActionButtonSize[]; }',
      ].join('\n'),
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
      key: 'swc-action-button::size', memberName: 'size', declaringPath: mixinPath, superclassName: 'ButtonBase', ownEntryPath,
    }];
    const resolved = await resolveTargets(
      targets,
      { fileCache: new Map(), resolutionCache: new Map(), fetchImpl },
    );
    assert.deepEqual(resolved.get('swc-action-button::size').values, ['xs', 's', 'm', 'l', 'xl']);
  });

  // The mixin itself declares `VALID_SIZES: readonly ElementSize[]` (all 7). Only a
  // static declared in the component's OWN class body may win — inheriting the
  // mixin's generic one would be strictly worse than the superclass answer.
  it('ignores an inherited VALID_SIZES and falls back to the superclass override', async () => {
    const ownEntryPath = makeCanonicalPath('@adobe/spectrum-wc', '2.0.0-beta.2', 'dist/components/button/Button.d.ts');
    const mixinPath = makeCanonicalPath('@adobe/spectrum-wc-core', '2.0.0-beta.2', 'dist/mixins/sized-mixin.d.ts');
    const basePath = makeCanonicalPath('@adobe/spectrum-wc', '2.0.0-beta.2', 'dist/components/button/Button.base.d.ts');
    const fetchImpl = makeMockFetch({
      [ownEntryPath]: "import './Button.base.js';\nexport declare class Button {}",
      [basePath]: [
        'export type ButtonSize = "s" | "m" | "l" | "xl";',
        'export declare class ButtonBase { size: ButtonSize; }',
      ].join('\n'),
      [mixinPath]: [
        'export type ElementSize = "xxs" | "xs" | "s" | "m" | "l" | "xl" | "xxl";',
        'export interface SizedElementInterface { size: ElementSize; }',
        'export interface SizedElementConstructor { readonly VALID_SIZES: readonly ElementSize[]; }',
      ].join('\n'),
    });
    const targets = [{
      key: 'swc-button::size', memberName: 'size', declaringPath: mixinPath, superclassName: 'ButtonBase', ownEntryPath,
    }];
    const resolved = await resolveTargets(
      targets,
      { fileCache: new Map(), resolutionCache: new Map(), fetchImpl },
    );
    assert.deepEqual(resolved.get('swc-button::size').values, ['s', 'm', 'l', 'xl']);
  });

  // `fixed?: FixedValues` / `staticColor?: ButtonStaticColor` — an optional attribute
  // can be absent, so its control needs a "none" option. Required ones must not get one.
  it('reports an optional attribute as optional', async () => {
    const ownEntryPath = makeCanonicalPath('@adobe/spectrum-wc', '2.0.0-beta.2', 'dist/components/badge/Badge.d.ts');
    const fetchImpl = makeMockFetch({
      [ownEntryPath]: [
        'export type FixedValues = "block-start" | "block-end";',
        'export declare class Badge { fixed?: FixedValues; variant: "neutral" | "positive"; }',
      ].join('\n'),
    });
    const resolved = await resolveTargets([
      { key: 'swc-badge::fixed', memberName: 'fixed', declaringPath: ownEntryPath, ownEntryPath },
      { key: 'swc-badge::variant', memberName: 'variant', declaringPath: ownEntryPath, ownEntryPath },
    ], { fileCache: new Map(), resolutionCache: new Map(), fetchImpl });

    assert.equal(resolved.get('swc-badge::fixed').optional, true);
    assert.deepEqual(resolved.get('swc-badge::fixed').values, ['block-start', 'block-end']);
    assert.equal(resolved.get('swc-badge::variant').optional, false);
  });

  // Decision A: values are real JSON, so a numeric union stays numeric rather than
  // being stringified the way the old regex parse did.
  it('keeps numeric union values as numbers', async () => {
    const ownEntryPath = makeCanonicalPath('@adobe/spectrum-wc', '2.0.0-beta.2', 'dist/components/avatar/Avatar.d.ts');
    const fetchImpl = makeMockFetch({
      [ownEntryPath]: 'export declare class Avatar { size: 50 | 75 | 100; }',
    });
    const resolved = await resolveTargets(
      [{ key: 'swc-avatar::size', memberName: 'size', declaringPath: ownEntryPath, ownEntryPath }],
      { fileCache: new Map(), resolutionCache: new Map(), fetchImpl },
    );
    assert.deepEqual(resolved.get('swc-avatar::size').values, [50, 75, 100]);
  });

  // Decision B: nullish is dropped, never offered. "None" is a control-layer
  // sentinel (NO_ICON / NONE_OPTION), not a value the component accepts.
  it('drops undefined and null from values', async () => {
    const ownEntryPath = makeCanonicalPath('@adobe/spectrum-wc', '2.0.0-beta.2', 'dist/components/message-feedback/MessageFeedback.d.ts');
    const fetchImpl = makeMockFetch({
      [ownEntryPath]: 'export declare class MessageFeedback { status: "positive" | "negative" | undefined | null; }',
    });
    const resolved = await resolveTargets(
      [{ key: 'swc-message-feedback::status', memberName: 'status', declaringPath: ownEntryPath, ownEntryPath }],
      { fileCache: new Map(), resolutionCache: new Map(), fetchImpl },
    );
    assert.deepEqual(resolved.get('swc-message-feedback::status').values, ['positive', 'negative']);
  });

  // A union mixing literals with an open type has no fixed option set — offering
  // only the literal half would be a plausible-looking, wrong option list.
  it('yields no values for a union that mixes literals with an open type', async () => {
    const ownEntryPath = makeCanonicalPath('@adobe/spectrum-wc', '2.0.0-beta.2', 'dist/components/thing/Thing.d.ts');
    const fetchImpl = makeMockFetch({
      [ownEntryPath]: 'export declare class Thing { label: "a" | "b" | (string & {}); }',
    });
    const resolved = await resolveTargets(
      [{ key: 'swc-thing::label', memberName: 'label', declaringPath: ownEntryPath, ownEntryPath }],
      { fileCache: new Map(), resolutionCache: new Map(), fetchImpl },
    );
    assert.deepEqual(resolved.get('swc-thing::label').values, []);
  });

  it('resolves an own attribute the CEM flattened to "string" into its real union', async () => {
    const ownEntryPath = makeCanonicalPath('@adobe/spectrum-wc', '2.0.0-beta.2', 'dist/components/status-light/StatusLight.d.ts');
    const fetchImpl = makeMockFetch({
      [ownEntryPath]: [
        'export type StatusLightVariant = "neutral" | "info" | "positive";',
        'export declare class StatusLight { variant: StatusLightVariant; }',
      ].join('\n'),
    });
    const targets = [{
      key: 'swc-status-light::variant', memberName: 'variant', declaringPath: ownEntryPath, ownEntryPath,
    }];
    const resolved = await resolveTargets(
      targets,
      { fileCache: new Map(), resolutionCache: new Map(), fetchImpl },
    );
    assert.deepEqual(resolved.get('swc-status-light::variant').values, ['neutral', 'info', 'positive']);
  });

  it('leaves a genuinely-string attribute as "string"', async () => {
    const ownEntryPath = makeCanonicalPath('@adobe/spectrum-wc', '2.0.0-beta.2', 'dist/components/avatar/Avatar.d.ts');
    const fetchImpl = makeMockFetch({
      [ownEntryPath]: 'export declare class Avatar { src: string; }',
    });
    const targets = [{
      key: 'swc-avatar::src', memberName: 'src', declaringPath: ownEntryPath, ownEntryPath,
    }];
    const resolved = await resolveTargets(
      targets,
      { fileCache: new Map(), resolutionCache: new Map(), fetchImpl },
    );
    assert.deepEqual(resolved.get('swc-avatar::src'), { type: 'string', values: [], optional: false });
  });

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
    assert.deepEqual(resolved.get('swc-button::size').values, ['s', 'm', 'l', 'xl']);
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
    assert.deepEqual(resolved.get('swc-badge::size').values, ['xxs', 'xs', 's', 'm', 'l', 'xl', 'xxl']);
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
    assert.deepEqual(resolved.get('swc-button::variant').values, ['primary', 'secondary']);
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
    // pendingLabel? on the fixture interface — optionality survives the mixin path too.
    assert.deepEqual(resolved.get('swc-button::pendingLabel'), { type: 'string', values: [], optional: true });
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
    assert.equal(resolved.get('swc-badge::variant').type, many);
    assert.ok(!resolved.get('swc-badge::variant').type.includes('more'));
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
    assert.deepEqual(resolved.get('swc-button::variant').values, ['primary', 'secondary']);
    assert.deepEqual(resolved.get('swc-button::fillStyle').values, ['fill', 'outline']);
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
