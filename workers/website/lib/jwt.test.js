import { describe, it, expect, beforeAll } from 'vitest';
import { decodeJwt, verifyJwt } from './jwt.js';

const base64url = (bytes) => btoa(String.fromCharCode(...bytes))
  .replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');

const base64urlJson = (obj) => base64url(new TextEncoder().encode(JSON.stringify(obj)));

const generateKeyPair = () => crypto.subtle.generateKey(
  { name: 'RSASSA-PKCS1-v1_5', modulusLength: 2048, publicExponent: new Uint8Array([1, 0, 1]), hash: 'SHA-256' },
  true,
  ['sign', 'verify'],
);

let publicJwk;
let sign;

beforeAll(async () => {
  const { publicKey, privateKey } = await generateKeyPair();
  publicJwk = await crypto.subtle.exportKey('jwk', publicKey);

  sign = async (header, payload) => {
    const signingInput = `${base64urlJson(header)}.${base64urlJson(payload)}`;
    const signature = await crypto.subtle.sign(
      'RSASSA-PKCS1-v1_5',
      privateKey,
      new TextEncoder().encode(signingInput),
    );
    return `${signingInput}.${base64url(new Uint8Array(signature))}`;
  };
});

describe('decodeJwt', () => {
  it('parses the header and payload of a well-formed token', async () => {
    const token = await sign({ alg: 'RS256', kid: 'test-key' }, { sub: 'user-1' });
    const decoded = decodeJwt(token);
    expect(decoded.header).toEqual({ alg: 'RS256', kid: 'test-key' });
    expect(decoded.payload).toEqual({ sub: 'user-1' });
  });

  it('carries the exact bytes RS256 signs over as signingInput', async () => {
    const token = await sign({ alg: 'RS256', kid: 'test-key' }, { sub: 'user-1' });
    const [header, payload] = token.split('.');
    expect(decodeJwt(token).signingInput).toBe(`${header}.${payload}`);
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

describe('verifyJwt', () => {
  it('accepts a signature produced by the matching private key', async () => {
    const token = await sign({ alg: 'RS256', kid: 'test-key' }, { sub: 'user-1' });
    expect(await verifyJwt(decodeJwt(token), publicJwk)).toBe(true);
  });

  it('rejects a tampered payload', async () => {
    const token = await sign({ alg: 'RS256', kid: 'test-key' }, { sub: 'user-1' });
    const [header, , signature] = token.split('.');
    const tamperedPayload = base64urlJson({ sub: 'attacker' });
    const tampered = `${header}.${tamperedPayload}.${signature}`;
    expect(await verifyJwt(decodeJwt(tampered), publicJwk)).toBe(false);
  });

  it('rejects a signature produced by a different key', async () => {
    const { publicKey: otherPublicKey } = await generateKeyPair();
    const otherJwk = await crypto.subtle.exportKey('jwk', otherPublicKey);
    const token = await sign({ alg: 'RS256', kid: 'test-key' }, { sub: 'user-1' });
    expect(await verifyJwt(decodeJwt(token), otherJwk)).toBe(false);
  });

  it('rejects a header algorithm other than RS256', async () => {
    const token = await sign({ alg: 'HS256', kid: 'test-key' }, { sub: 'user-1' });
    expect(await verifyJwt(decodeJwt(token), publicJwk)).toBe(false);
  });

  it('rejects a jwk that is not an RSA key', async () => {
    const token = await sign({ alg: 'RS256', kid: 'test-key' }, { sub: 'user-1' });
    expect(await verifyJwt(decodeJwt(token), { ...publicJwk, kty: 'EC' })).toBe(false);
  });

  it('rejects a null decoded token rather than throwing', async () => {
    expect(await verifyJwt(null, publicJwk)).toBe(false);
  });
});
