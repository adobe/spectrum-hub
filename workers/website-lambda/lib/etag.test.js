import { describe, it, expect } from 'vitest';
import { GATE_ETAG_SUFFIX, toGatedEtag, toUpstreamIfNoneMatch } from './etag.js';

describe('toGatedEtag', () => {
  it('appends the gate suffix inside the quotes', () => {
    expect(toGatedEtag('"abc"')).toBe(`"abc${GATE_ETAG_SUFFIX}"`);
  });

  it('keeps a weak tag weak', () => {
    expect(toGatedEtag('W/"abc"')).toBe(`W/"abc${GATE_ETAG_SUFFIX}"`);
  });

  it('returns null for a malformed or missing tag', () => {
    expect(toGatedEtag('abc')).toBe(null);
    expect(toGatedEtag('"a", "b"')).toBe(null);
    expect(toGatedEtag(null)).toBe(null);
  });
});

describe('toUpstreamIfNoneMatch', () => {
  it('forwards a tag the gate issued, without the suffix', () => {
    expect(toUpstreamIfNoneMatch(toGatedEtag('"abc"'))).toBe('"abc"');
    expect(toUpstreamIfNoneMatch(toGatedEtag('W/"abc"'))).toBe('W/"abc"');
  });

  it('drops a raw AEM tag (a copy cached before the gate)', () => {
    expect(toUpstreamIfNoneMatch('"abc"')).toBe(null);
  });

  it('drops tags from an older gate version', () => {
    expect(toUpstreamIfNoneMatch('"abc--gate-v0"')).toBe(null);
  });

  it('drops the wildcard', () => {
    expect(toUpstreamIfNoneMatch('*')).toBe(null);
  });

  it('keeps only the gated tags from a list', () => {
    const header = `"raw", ${toGatedEtag('"one"')}, W/"old--gate-v0", ${toGatedEtag('W/"two"')}`;
    expect(toUpstreamIfNoneMatch(header)).toBe('"one", W/"two"');
  });

  it('drops a tag that is only the suffix', () => {
    expect(toUpstreamIfNoneMatch(`"${GATE_ETAG_SUFFIX}"`)).toBe(null);
  });

  it('returns null for a missing or empty header', () => {
    expect(toUpstreamIfNoneMatch(null)).toBe(null);
    expect(toUpstreamIfNoneMatch('')).toBe(null);
  });
});
