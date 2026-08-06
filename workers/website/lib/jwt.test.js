import { describe, it, expect } from 'vitest';
import { decodeJwt } from './jwt.js';

const base64url = (bytes) => btoa(String.fromCharCode(...bytes))
  .replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');

const base64urlJson = (obj) => base64url(new TextEncoder().encode(JSON.stringify(obj)));

// decodeJwt does not check the signature, so a fake one is fine here -
// the signing key lives in handlers/auth.test.js, where it matters.
const fakeToken = (header, payload) => `${base64urlJson(header)}.${base64urlJson(payload)}.fake-signature`;

describe('decodeJwt', () => {
  it('parses the header and payload of a well-formed token', () => {
    const token = fakeToken({ alg: 'RS256', kid: 'test-key' }, { sub: 'user-1' });
    const decoded = decodeJwt(token);
    expect(decoded.header).toEqual({ alg: 'RS256', kid: 'test-key' });
    expect(decoded.payload).toEqual({ sub: 'user-1' });
  });

  it('does not attempt to decode the signature segment', () => {
    const token = fakeToken({ alg: 'RS256' }, { sub: 'user-1' });
    expect(decodeJwt(token)).not.toHaveProperty('signature');
  });

  it('returns null for a non-string input', () => {
    expect(decodeJwt(undefined)).toBe(null);
    expect(decodeJwt(null)).toBe(null);
  });

  it('returns null when the token does not have three segments', () => {
    expect(decodeJwt('two.segments')).toBe(null);
    expect(decodeJwt('a.b.c.d')).toBe(null);
  });

  it('returns null when a segment is not valid base64url JSON', () => {
    expect(decodeJwt('not-base64url!.not-base64url!.sig')).toBe(null);
  });
});
