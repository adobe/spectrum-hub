import { describe, it, expect } from 'vitest';
import { createSession } from './auth.js';

const ORIGIN = 'https://example.com';
const env = { SESSION_SECRET: 'test-secret' };

const post = (body, { origin = ORIGIN, method = 'POST' } = {}) => {
  const payload = typeof body === 'string' ? body : JSON.stringify(body);
  return new Request(`${ORIGIN}/auth/session`, {
    method,
    headers: origin ? { origin, 'content-type': 'application/json' } : { 'content-type': 'application/json' },
    body: method === 'POST' ? payload : undefined,
  });
};

const imsBody = () => ({
  access_token: 'header.payload.signature',
  expires_in: '86400000',
  created_at: String(Date.now()),
  scope: 'AdobeID,openid',
});

const call = (request) => createSession({ url: new URL(request.url), env, request });

const findCookie = (cookies, name) => cookies.find((cookie) => cookie.startsWith(`${name}=`));

describe('createSession', () => {
  it('returns 204 with a Set-Cookie header on success', async () => {
    const resp = await call(post(imsBody()));
    expect(resp.status).toBe(204);
    expect(resp.headers.getSetCookie()).toHaveLength(1);
  });

  it('returns an empty body on success', async () => {
    const resp = await call(post(imsBody()));
    expect(await resp.text()).toBe('');
  });

  it('rejects non-POST methods with 405', async () => {
    const resp = await call(post(null, { method: 'GET' }));
    expect(resp.status).toBe(405);
  });

  it('advertises the allowed method on 405', async () => {
    const resp = await call(post(null, { method: 'GET' }));
    expect(resp.headers.get('allow')).toBe('POST');
  });

  it('rejects a missing Origin header with 403', async () => {
    const resp = await call(post(imsBody(), { origin: null }));
    expect(resp.status).toBe(403);
  });

  it('rejects a foreign Origin with 403', async () => {
    const resp = await call(post(imsBody(), { origin: 'https://evil.example' }));
    expect(resp.status).toBe(403);
  });

  it('accepts a foreign Origin present in ALLOWED_ORIGINS', async () => {
    const request = post(imsBody(), { origin: 'https://allowed.example' });
    const resp = await createSession({
      url: new URL(request.url),
      env: { ...env, ALLOWED_ORIGINS: 'https://allowed.example, https://other.example' },
      request,
    });
    expect(resp.status).toBe(204);
  });

  it('returns 400 rather than 500 on malformed JSON', async () => {
    const resp = await call(post('{not json'));
    expect(resp.status).toBe(400);
  });

  it('propagates the status from the pure module', async () => {
    const resp = await call(post({ ...imsBody(), access_token: undefined }));
    expect(resp.status).toBe(400);
  });

  it('returns 500 when SESSION_SECRET is unset', async () => {
    const request = post(imsBody());
    const resp = await createSession({ url: new URL(request.url), env: {}, request });
    expect(resp.status).toBe(500);
  });

  it('names the cookie exactly spectrum_session and marks it HttpOnly', async () => {
    const resp = await call(post(imsBody()));
    const cookies = resp.headers.getSetCookie();
    const sessionCookie = findCookie(cookies, 'spectrum_session');
    expect(sessionCookie).toBeDefined();
    expect(sessionCookie).toMatch(/HttpOnly/);
  });

  it('sets Secure on the cookie for an https request URL', async () => {
    const resp = await call(post(imsBody()));
    const cookies = resp.headers.getSetCookie();
    for (const cookie of cookies) { expect(cookie).toMatch(/Secure/); }
  });

  it('omits Secure on the cookie for an http request URL', async () => {
    const request = new Request('http://example.com/auth/session', {
      method: 'POST',
      headers: { origin: 'http://example.com', 'content-type': 'application/json' },
      body: JSON.stringify(imsBody()),
    });
    const resp = await createSession({ url: new URL(request.url), env, request });
    const cookies = resp.headers.getSetCookie();
    expect(cookies).toHaveLength(1);
    for (const cookie of cookies) { expect(cookie).not.toMatch(/Secure/); }
  });

  it('falls back to the default max age when SESSION_MAX_AGE_MS is non-numeric', async () => {
    const request = post({ ...imsBody(), expires_in: String(999999999999) });
    const resp = await createSession({
      url: new URL(request.url),
      env: { ...env, SESSION_MAX_AGE_MS: '1d' },
      request,
    });
    const sessionCookie = findCookie(resp.headers.getSetCookie(), 'spectrum_session');
    expect(sessionCookie).toMatch(/Max-Age=86400(;|$)/);
  });

  it('falls back to the default max age when SESSION_MAX_AGE_MS is an empty string', async () => {
    const request = post({ ...imsBody(), expires_in: String(999999999999) });
    const resp = await createSession({
      url: new URL(request.url),
      env: { ...env, SESSION_MAX_AGE_MS: '' },
      request,
    });
    const sessionCookie = findCookie(resp.headers.getSetCookie(), 'spectrum_session');
    expect(sessionCookie).toMatch(/Max-Age=86400(;|$)/);
  });

  it('honors a valid numeric-string override for SESSION_MAX_AGE_MS', async () => {
    const request = post({ ...imsBody(), expires_in: String(999999999999) });
    const resp = await createSession({
      url: new URL(request.url),
      env: { ...env, SESSION_MAX_AGE_MS: '10000' },
      request,
    });
    const sessionCookie = findCookie(resp.headers.getSetCookie(), 'spectrum_session');
    expect(sessionCookie).toMatch(/Max-Age=10(;|$)/);
  });
});

// This endpoint mints credentials and sits behind a CDN.
describe('createSession caching', () => {
  it('marks the 204 no-store', async () => {
    const resp = await call(post(imsBody()));
    expect(resp.status).toBe(204);
    expect(resp.headers.get('cache-control')).toBe('no-store');
  });

  it('marks the 403 no-store', async () => {
    const resp = await call(post(imsBody(), { origin: 'https://evil.example' }));
    expect(resp.headers.get('cache-control')).toBe('no-store');
  });

  it('marks the 400 no-store', async () => {
    const resp = await call(post('{not json'));
    expect(resp.headers.get('cache-control')).toBe('no-store');
  });

  it('marks the 405 no-store while keeping the allow header', async () => {
    const resp = await call(post(null, { method: 'GET' }));
    expect(resp.status).toBe(405);
    expect(resp.headers.get('cache-control')).toBe('no-store');
    expect(resp.headers.get('allow')).toBe('POST');
    expect(resp.headers.get('content-type')).toBe('text/plain; charset=utf-8');
  });
});

describe('ALLOWED_ORIGINS parsing', () => {
  const withOrigins = (allowedOrigins, origin) => {
    const request = post(imsBody(), { origin });
    return createSession({
      url: new URL(request.url),
      env: { ...env, ALLOWED_ORIGINS: allowedOrigins },
      request,
    });
  };

  it('falls back to the request origin when ALLOWED_ORIGINS is only whitespace', async () => {
    expect((await withOrigins('  ', ORIGIN)).status).toBe(204);
  });

  it('falls back to the request origin when ALLOWED_ORIGINS is only separators', async () => {
    expect((await withOrigins(',,', ORIGIN)).status).toBe(204);
  });

  it('still rejects a foreign origin when ALLOWED_ORIGINS is empty', async () => {
    expect((await withOrigins('  ', 'https://evil.example')).status).toBe(403);
  });

  it('ignores empty entries between commas', async () => {
    expect((await withOrigins('https://a.example,,https://example.com', ORIGIN)).status).toBe(204);
  });

  it('matches a configured entry carrying a trailing slash', async () => {
    expect((await withOrigins('https://example.com/', ORIGIN)).status).toBe(204);
  });

  it('matches a configured entry with an uppercase host', async () => {
    expect((await withOrigins('https://EXAMPLE.com', ORIGIN)).status).toBe(204);
  });

  it('matches an uppercase Origin header against a lowercase entry', async () => {
    const request = new Request(`${ORIGIN}/auth/session`, {
      method: 'POST',
      headers: { origin: 'HTTPS://EXAMPLE.COM', 'content-type': 'application/json' },
      body: JSON.stringify(imsBody()),
    });
    const resp = await createSession({
      url: new URL(request.url),
      env: { ...env, ALLOWED_ORIGINS: 'https://example.com' },
      request,
    });
    expect(resp.status).toBe(204);
  });

  it('does not let normalization widen the allowlist to a different host', async () => {
    expect((await withOrigins('https://example.com', 'https://example.com.evil.example')).status)
      .toBe(403);
  });
});
