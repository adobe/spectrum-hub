import { describe, it, expect } from 'vitest';
import {
  deriveExpiry, clampExpiry, DEFAULT_MAX_AGE_MS, signToken,
  serializeCookie, createSessionCookies, MAX_COOKIE_BYTES, durationMs,
  DEFAULT_SESSION_COOKIE_NAME, base64urlDecode, verifySignedToken, readSession,
} from './session.js';

const NOW = 1785812270230;

const imsBody = (overrides = {}) => ({
  token: 'header.payload.signature',
  expires_in: '86400000',
  created_at: '1785812270230',
  scope: 'AdobeID,openid',
  ...overrides,
});

describe('deriveExpiry', () => {
  it('adds string expires_in to string created_at', () => {
    expect(deriveExpiry(imsBody())).toBe(1785898670230);
  });

  it('accepts numeric values as well as strings', () => {
    expect(deriveExpiry({ created_at: NOW, expires_in: 1000 })).toBe(NOW + 1000);
  });

  it('returns null when created_at is missing', () => {
    expect(deriveExpiry(imsBody({ created_at: undefined }))).toBe(null);
  });

  it('returns null when expires_in is not a number', () => {
    expect(deriveExpiry(imsBody({ expires_in: 'soon' }))).toBe(null);
  });

  it('returns null for an empty string rather than coercing it to zero', () => {
    expect(deriveExpiry(imsBody({ expires_in: '  ' }))).toBe(null);
  });

  it('returns null when the body is not an object', () => {
    expect(deriveExpiry(null)).toBe(null);
  });
});

describe('clampExpiry', () => {
  it('caps an over-ceiling expiry at now + maxAgeMs', () => {
    expect(clampExpiry(NOW + 999999999999, NOW, DEFAULT_MAX_AGE_MS))
      .toBe(NOW + DEFAULT_MAX_AGE_MS);
  });

  it('leaves an expiry inside the ceiling untouched', () => {
    expect(clampExpiry(NOW + 1000, NOW, DEFAULT_MAX_AGE_MS)).toBe(NOW + 1000);
  });

  it('leaves an expiry exactly at the ceiling untouched', () => {
    expect(clampExpiry(NOW + DEFAULT_MAX_AGE_MS, NOW, DEFAULT_MAX_AGE_MS))
      .toBe(NOW + DEFAULT_MAX_AGE_MS);
  });
});

describe('signToken', () => {
  const TOKEN = 'header.payload.signature';
  const SECRET = 'test-secret';

  it('returns exactly two dot-separated segments', async () => {
    const signed = await signToken(TOKEN, SECRET);
    expect(signed.split('.')).toHaveLength(2);
  });

  it('base64url-encodes the token so its own dots do not split the value', async () => {
    const [payload] = (await signToken(TOKEN, SECRET)).split('.');
    expect(payload).not.toContain('.');
    const decoded = atob(payload.replace(/-/g, '+').replace(/_/g, '/'));
    expect(decoded).toBe(TOKEN);
  });

  it('emits no base64 padding or url-unsafe characters', async () => {
    const signed = await signToken(TOKEN, SECRET);
    expect(signed).toMatch(/^[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/);
  });

  it('is deterministic for the same token and secret', async () => {
    expect(await signToken(TOKEN, SECRET)).toBe(await signToken(TOKEN, SECRET));
  });

  it('produces a different signature under a different secret', async () => {
    const a = await signToken(TOKEN, SECRET);
    const b = await signToken(TOKEN, 'other-secret');
    expect(a.split('.')[1]).not.toBe(b.split('.')[1]);
  });

  it('produces a different signature when the token is tampered with', async () => {
    const a = await signToken(TOKEN, SECRET);
    const b = await signToken('header.tampered.signature', SECRET);
    expect(a.split('.')[1]).not.toBe(b.split('.')[1]);
  });

  it('handles non-ASCII tokens without corrupting them', async () => {
    const [payload] = (await signToken('tökén', SECRET)).split('.');
    const bytes = Uint8Array.from(
      atob(payload.replace(/-/g, '+').replace(/_/g, '/')),
      (c) => c.charCodeAt(0),
    );
    expect(new TextDecoder().decode(bytes)).toBe('tökén');
  });

  // Golden vector. This pins the wire format of every live cookie: the
  // signature is HMAC-SHA256 over the base64url PAYLOAD, not over the raw
  // token. Changing which bytes are signed invalidates every issued cookie,
  // so it must break this test rather than pass silently.
  it('matches the golden vector for a fixed token and secret', async () => {
    expect(await signToken('header.payload.signature', 'golden-secret'))
      .toBe('aGVhZGVyLnBheWxvYWQuc2lnbmF0dXJl.RNLO47QouZdia7P5fDyLKPtwmfknB5CipfpjjUvzQ9g');
  });

  it('signs the base64url payload rather than the raw token', async () => {
    // HMAC-SHA256('header.payload.signature', 'golden-secret'), base64url.
    const overRawToken = 'zy_Ox-2Jdkj8-tlSuA16aelpg8wqPU0QS2GHjYTduag';
    const [, signature] = (await signToken('header.payload.signature', 'golden-secret')).split('.');
    expect(signature).not.toBe(overRawToken);
    expect(signature).toBe('RNLO47QouZdia7P5fDyLKPtwmfknB5CipfpjjUvzQ9g');
  });
});

// Lives in the lib, not the adapter, so every platform port inherits the
// validation instead of re-deriving it.
describe('durationMs', () => {
  it('accepts a numeric string', () => {
    expect(durationMs('10000', DEFAULT_MAX_AGE_MS)).toBe(10000);
  });

  it('accepts a number', () => {
    expect(durationMs(10000, DEFAULT_MAX_AGE_MS)).toBe(10000);
  });

  it('falls back on a non-numeric value', () => {
    expect(durationMs('1d', DEFAULT_MAX_AGE_MS)).toBe(DEFAULT_MAX_AGE_MS);
  });

  it('falls back on an empty string rather than coercing it to zero', () => {
    expect(durationMs('', DEFAULT_MAX_AGE_MS)).toBe(DEFAULT_MAX_AGE_MS);
  });

  it('falls back on undefined', () => {
    expect(durationMs(undefined, DEFAULT_MAX_AGE_MS)).toBe(DEFAULT_MAX_AGE_MS);
  });

  it('falls back on zero and on negatives', () => {
    expect(durationMs(0, DEFAULT_MAX_AGE_MS)).toBe(DEFAULT_MAX_AGE_MS);
    expect(durationMs(-1, DEFAULT_MAX_AGE_MS)).toBe(DEFAULT_MAX_AGE_MS);
  });

  it('falls back on Infinity', () => {
    expect(durationMs(Infinity, DEFAULT_MAX_AGE_MS)).toBe(DEFAULT_MAX_AGE_MS);
  });
});

const config = (overrides = {}) => ({
  secret: 'test-secret',
  maxAgeMs: DEFAULT_MAX_AGE_MS,
  sessionCookieName: 'spectrum_session',
  secure: true,
  ...overrides,
});

const byName = (cookies, name) => cookies.find((c) => c.startsWith(`${name}=`));
const attr = (cookie, key) => cookie.split('; ').find((p) => p.startsWith(`${key}=`))?.slice(key.length + 1);

describe('serializeCookie', () => {
  it('emits the shared attributes', () => {
    const cookie = serializeCookie('n', 'v', { maxAgeSeconds: 60, secure: true });
    expect(cookie).toBe('n=v; Path=/; SameSite=Lax; Max-Age=60; Secure');
  });

  it('appends HttpOnly only when asked', () => {
    expect(serializeCookie('n', 'v', { maxAgeSeconds: 60, httpOnly: true })).toContain('; HttpOnly');
    expect(serializeCookie('n', 'v', { maxAgeSeconds: 60 })).not.toContain('HttpOnly');
  });

  it('omits Secure when serving over http', () => {
    expect(serializeCookie('n', 'v', { maxAgeSeconds: 60, secure: false })).not.toContain('Secure');
  });
});

describe('createSessionCookies', () => {
  it('returns the session cookie', async () => {
    const { cookies } = await createSessionCookies({ body: imsBody(), now: NOW, config: config() });
    expect(cookies).toHaveLength(1);
    expect(byName(cookies, 'spectrum_session')).toBeDefined();
  });

  it('marks the session cookie HttpOnly', async () => {
    const { cookies } = await createSessionCookies({ body: imsBody(), now: NOW, config: config() });
    expect(byName(cookies, 'spectrum_session')).toContain('HttpOnly');
  });

  it('sets the session cookie value to the signed token', async () => {
    const { cookies } = await createSessionCookies({ body: imsBody(), now: NOW, config: config() });
    const expected = await signToken('header.payload.signature', 'test-secret');
    expect(byName(cookies, 'spectrum_session').split('; ')[0]).toBe(`spectrum_session=${expected}`);
  });

  it('gives the session cookie the derived remaining lifetime in seconds', async () => {
    const { cookies } = await createSessionCookies({ body: imsBody(), now: NOW, config: config() });
    expect(attr(byName(cookies, 'spectrum_session'), 'Max-Age')).toBe('86400');
  });

  it('clamps the session lifetime to maxAgeMs', async () => {
    const body = imsBody({ expires_in: String(10 * 365 * 24 * 60 * 60 * 1000) });
    const { cookies } = await createSessionCookies({ body, now: NOW, config: config() });
    expect(attr(byName(cookies, 'spectrum_session'), 'Max-Age')).toBe('86400');
  });

  it('returns the derived expiresAt alongside the cookie', async () => {
    const result = await createSessionCookies({ body: imsBody(), now: NOW, config: config() });
    expect(result.expiresAt).toBe(1785898670230);
  });

  it('returns the clamped expiresAt, not the token-claimed one, once maxAgeMs caps it', async () => {
    const body = imsBody({ expires_in: String(10 * 365 * 24 * 60 * 60 * 1000) });
    const { expiresAt } = await createSessionCookies({ body, now: NOW, config: config() });
    expect(expiresAt).toBe(NOW + DEFAULT_MAX_AGE_MS);
  });

  it('rejects a missing token', async () => {
    const { error } = await createSessionCookies({
      body: imsBody({ token: undefined }), now: NOW, config: config(),
    });
    expect(error.status).toBe(400);
  });

  it('rejects an unusable created_at', async () => {
    const { error } = await createSessionCookies({
      body: imsBody({ created_at: 'nope' }), now: NOW, config: config(),
    });
    expect(error.status).toBe(400);
  });

  it('rejects an expiry already in the past', async () => {
    const body = imsBody({ created_at: String(NOW - 200000), expires_in: '1000' });
    const { error } = await createSessionCookies({ body, now: NOW, config: config() });
    expect(error.status).toBe(400);
  });

  it('rejects an expiry exactly at now', async () => {
    const body = imsBody({ created_at: String(NOW), expires_in: '0' });
    const { error } = await createSessionCookies({ body, now: NOW, config: config() });
    expect(error.status).toBe(400);
  });

  it('rejects a token too large for the cookie limit with 413', async () => {
    const body = imsBody({ token: 'x'.repeat(MAX_COOKIE_BYTES) });
    const { error } = await createSessionCookies({ body, now: NOW, config: config() });
    expect(error.status).toBe(413);
  });

  it('rejects a remaining lifetime under one second with 400', async () => {
    const body = imsBody({ created_at: String(NOW), expires_in: '500' });
    const { error, cookies } = await createSessionCookies({ body, now: NOW, config: config() });
    expect(error.status).toBe(400);
    expect(cookies).toBeUndefined();
  });

  it('accepts a remaining lifetime of exactly one second', async () => {
    const body = imsBody({ created_at: String(NOW), expires_in: '1000' });
    const { cookies } = await createSessionCookies({ body, now: NOW, config: config() });
    expect(attr(byName(cookies, 'spectrum_session'), 'Max-Age')).toBe('1');
  });

  it('returns no cookies alongside an error', async () => {
    const result = await createSessionCookies({
      body: imsBody({ token: undefined }), now: NOW, config: config(),
    });
    expect(result.cookies).toBeUndefined();
  });
});

// The config contract is policy that must survive the port to Lambda or
// I/O Runtime, so it is enforced here rather than only in the adapter.
describe('createSessionCookies config defaults and guards', () => {
  it('exports the exact cookie name as the default', () => {
    expect(DEFAULT_SESSION_COOKIE_NAME).toBe('spectrum_session');
  });

  it('names the cookie correctly when the config omits it', async () => {
    const { cookies } = await createSessionCookies({
      body: imsBody(),
      now: NOW,
      config: { secret: 'test-secret', secure: true },
    });
    expect(cookies).toHaveLength(1);
    expect(byName(cookies, 'spectrum_session')).toBeDefined();
    for (const cookie of cookies) { expect(cookie).not.toContain('undefined='); }
  });

  it('applies the default duration when the config omits it', async () => {
    const body = imsBody({ expires_in: String(999999999999) });
    const { cookies } = await createSessionCookies({
      body,
      now: NOW,
      config: { secret: 'test-secret', secure: true },
    });
    expect(attr(byName(cookies, 'spectrum_session'), 'Max-Age')).toBe('86400');
  });

  it('ignores an unusable duration override instead of emitting Max-Age=NaN', async () => {
    const { cookies } = await createSessionCookies({
      body: imsBody(),
      now: NOW,
      config: config({ maxAgeMs: '1d' }),
    });
    expect(attr(byName(cookies, 'spectrum_session'), 'Max-Age')).toBe('86400');
  });

  it('returns 500 rather than throwing when the secret is missing', async () => {
    const { error, cookies } = await createSessionCookies({
      body: imsBody(), now: NOW, config: config({ secret: undefined }),
    });
    expect(error.status).toBe(500);
    expect(cookies).toBeUndefined();
  });

  it('returns 500 when the secret is an empty string', async () => {
    const { error } = await createSessionCookies({
      body: imsBody(), now: NOW, config: config({ secret: '' }),
    });
    expect(error.status).toBe(500);
  });

  it('returns 500 when the secret is not a string', async () => {
    const { error } = await createSessionCookies({
      body: imsBody(), now: NOW, config: config({ secret: 12345 }),
    });
    expect(error.status).toBe(500);
  });

  it('returns 500 when no config is supplied at all', async () => {
    const { error } = await createSessionCookies({ body: imsBody(), now: NOW });
    expect(error.status).toBe(500);
  });
});

const SECRET = 'test-secret';

// The claims blob createSession signs into the cookie: a JSON string of
// email/created_at/expires_in, HMACed by signToken.
const claims = (overrides = {}) => JSON.stringify({
  email: 'user@example.com',
  created_at: String(NOW),
  expires_in: '86400000',
  ...overrides,
});

describe('base64urlDecode', () => {
  it('round-trips arbitrary UTF-8 through signToken payloads', async () => {
    const signed = await signToken('héllo.world', SECRET);
    const payload = signed.slice(0, signed.indexOf('.'));
    expect(new TextDecoder().decode(base64urlDecode(payload))).toBe('héllo.world');
  });

  it('throws on input that is not valid base64', () => {
    expect(() => base64urlDecode('@@@not-base64@@@')).toThrow();
  });
});

describe('verifySignedToken', () => {
  it('returns the original string for a signature made with the same secret', async () => {
    const signed = await signToken('the-payload', SECRET);
    expect(await verifySignedToken(signed, SECRET)).toBe('the-payload');
  });

  it('returns null when the secret does not match', async () => {
    const signed = await signToken('the-payload', SECRET);
    expect(await verifySignedToken(signed, 'other-secret')).toBe(null);
  });

  it('returns null when the payload is tampered with but the signature is kept', async () => {
    const signed = await signToken('the-payload', SECRET);
    const tampered = `${await signToken('evil', SECRET)}`.split('.')[0].concat('.', signed.split('.')[1]);
    expect(await verifySignedToken(tampered, SECRET)).toBe(null);
  });

  it('returns null for a value with no dot, or more than one', async () => {
    expect(await verifySignedToken('nodot', SECRET)).toBe(null);
    expect(await verifySignedToken('a.b.c', SECRET)).toBe(null);
  });

  it('returns null for a non-string value or empty secret', async () => {
    const signed = await signToken('x', SECRET);
    expect(await verifySignedToken(null, SECRET)).toBe(null);
    expect(await verifySignedToken(signed, '')).toBe(null);
  });
});

describe('readSession', () => {
  const sign = (overrides) => signToken(claims(overrides), SECRET);

  it('returns the decoded claims for a valid, unexpired cookie', async () => {
    const session = await readSession(await sign(), SECRET, NOW);
    expect(session.email).toBe('user@example.com');
  });

  it('returns null once the cookie is at or past its expiry', async () => {
    const signed = await sign({ created_at: String(NOW), expires_in: '1000' });
    expect(await readSession(signed, SECRET, NOW + 1000)).toBe(null);
    expect(await readSession(signed, SECRET, NOW + 999)).not.toBe(null);
  });

  it('returns null when the signature does not verify', async () => {
    expect(await readSession(await sign(), 'wrong-secret', NOW)).toBe(null);
  });

  it('returns null when the signed payload is not JSON', async () => {
    const signed = await signToken('not-json', SECRET);
    expect(await readSession(signed, SECRET, NOW)).toBe(null);
  });

  it('returns null when the claims carry no usable expiry', async () => {
    const signed = await sign({ expires_in: undefined });
    expect(await readSession(signed, SECRET, NOW)).toBe(null);
  });
});
