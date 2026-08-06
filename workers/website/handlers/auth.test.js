import {
  describe, it, expect, vi, beforeEach, afterEach,
} from 'vitest';
import { createSession, deleteSession } from './auth.js';

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

const base64url = (bytes) => btoa(String.fromCharCode(...bytes))
  .replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');

const base64urlJson = (obj) => base64url(new TextEncoder().encode(JSON.stringify(obj)));

// createSession no longer checks a signature - IMS does, via the profile
// call mocked below - so this only needs to look like a JWT, not be a
// genuinely signed one.
const makeToken = (payloadOverrides = {}) => {
  const payload = {
    expires_in: '86400000',
    created_at: String(Date.now()),
    scope: 'AdobeID,openid',
    ...payloadOverrides,
  };
  return `${base64urlJson({ alg: 'RS256', kid: 'test-key' })}.${base64urlJson(payload)}.fake-signature`;
};

const imsBody = (payloadOverrides) => ({ access_token: makeToken(payloadOverrides) });

const TEST_EMAIL = 'user@example.com';

// Stands in for IMS's /ims/profile/v1. Defaults to accepting the token
// and returning an email; tests override status/body to exercise the
// rejection and malformed-response paths.
const mockImsProfile = (status = 200, body = { email: TEST_EMAIL }) => {
  const fetchMock = vi.fn(async () => new Response(JSON.stringify(body), { status }));
  vi.stubGlobal('fetch', fetchMock);
  return fetchMock;
};

beforeEach(() => {
  mockImsProfile();
});

afterEach(() => {
  vi.unstubAllGlobals();
});

const call = (request) => createSession({ url: new URL(request.url), env, request });

const findCookie = (cookies, name) => cookies.find((cookie) => cookie.startsWith(`${name}=`));

describe('createSession', () => {
  it('returns 200 with a Set-Cookie header on success', async () => {
    const resp = await call(post(imsBody()));
    expect(resp.status).toBe(200);
    expect(resp.headers.getSetCookie()).toHaveLength(1);
  });

  it('returns the session expiry as JSON on success', async () => {
    const now = Date.now();
    const resp = await call(post(imsBody()));
    const json = await resp.json();
    // 86400000 (the default max age) from roughly now, give or take the
    // time this test itself took to run - not the literal token claim,
    // since SESSION_MAX_AGE_MS may have clamped it.
    expect(json.expiresAt).toBeGreaterThan(now + 86400000 - 5000);
    expect(json.expiresAt).toBeLessThanOrEqual(now + 86400000);
  });

  it('marks the JSON response content-type', async () => {
    const resp = await call(post(imsBody()));
    expect(resp.headers.get('content-type')).toBe('application/json; charset=utf-8');
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
    expect(resp.status).toBe(200);
  });

  it('returns 400 rather than 500 on malformed JSON', async () => {
    const resp = await call(post('{not json'));
    expect(resp.status).toBe(400);
  });

  it('rejects a missing access_token with 400, without requiring anything else', async () => {
    const resp = await call(post({}));
    expect(resp.status).toBe(400);
  });

  it('does not call IMS when access_token is missing', async () => {
    const fetchMock = mockImsProfile();
    await call(post({}));
    expect(fetchMock).not.toHaveBeenCalled();
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

  it('ignores an expires_in the caller puts in the POST body, not the token', async () => {
    // The body only ever carries access_token now, but this also proves a
    // stray extra field cannot influence expiry - only the token's own
    // claim, as read out of the JWT payload, is used.
    const resp = await call(post({ access_token: makeToken(), expires_in: '500' }));
    const sessionCookie = findCookie(resp.headers.getSetCookie(), 'spectrum_session');
    // 86400 or 86399 depending on how many ms elapsed between building the
    // token above and createSessionCookies calling Date.now() - not 0.
    expect(sessionCookie).toMatch(/Max-Age=(86399|86400)(;|$)/);
  });

  it('falls back to the default max age when SESSION_MAX_AGE_MS is non-numeric', async () => {
    const request = post(imsBody({ expires_in: String(999999999999) }));
    const resp = await createSession({
      url: new URL(request.url),
      env: { ...env, SESSION_MAX_AGE_MS: '1d' },
      request,
    });
    const sessionCookie = findCookie(resp.headers.getSetCookie(), 'spectrum_session');
    expect(sessionCookie).toMatch(/Max-Age=86400(;|$)/);
  });

  it('falls back to the default max age when SESSION_MAX_AGE_MS is an empty string', async () => {
    const request = post(imsBody({ expires_in: String(999999999999) }));
    const resp = await createSession({
      url: new URL(request.url),
      env: { ...env, SESSION_MAX_AGE_MS: '' },
      request,
    });
    const sessionCookie = findCookie(resp.headers.getSetCookie(), 'spectrum_session');
    expect(sessionCookie).toMatch(/Max-Age=86400(;|$)/);
  });

  it('honors a valid numeric-string override for SESSION_MAX_AGE_MS', async () => {
    const request = post(imsBody({ expires_in: String(999999999999) }));
    const resp = await createSession({
      url: new URL(request.url),
      env: { ...env, SESSION_MAX_AGE_MS: '10000' },
      request,
    });
    const sessionCookie = findCookie(resp.headers.getSetCookie(), 'spectrum_session');
    expect(sessionCookie).toMatch(/Max-Age=10(;|$)/);
  });
});

describe('createSession IMS verification', () => {
  it('calls the IMS profile endpoint with the token as a bearer credential', async () => {
    const fetchMock = mockImsProfile();
    const token = makeToken();
    await call(post({ access_token: token }));
    const [calledUrl, calledOpts] = fetchMock.mock.calls[0];
    expect(calledUrl).toBe('https://ims-na1.adobelogin.com/ims/profile/v1?client_id=spectrumhub');
    expect(calledOpts.headers.authorization).toBe(`Bearer ${token}`);
  });

  it('routes dev and stage to the shared stg1 profile endpoint', async () => {
    const fetchMock = mockImsProfile();
    await createSession({
      url: new URL(post(imsBody()).url),
      env: { ...env, IMS_ENV: 'stage' },
      request: post(imsBody()),
    });
    expect(fetchMock.mock.calls[0][0]).toBe('https://ims-na1-stg1.adobelogin.com/ims/profile/v1?client_id=spectrumhub');
  });

  it('rejects with 401 when IMS returns 401', async () => {
    mockImsProfile(401, {});
    const resp = await call(post(imsBody()));
    expect(resp.status).toBe(401);
  });

  it('rejects with 401 when IMS returns 403', async () => {
    mockImsProfile(403, {});
    const resp = await call(post(imsBody()));
    expect(resp.status).toBe(401);
  });

  it('returns 502 rather than 500 when IMS itself errors', async () => {
    mockImsProfile(500, {});
    const resp = await call(post(imsBody()));
    expect(resp.status).toBe(502);
  });

  it('returns 502 rather than 500 when the network request to IMS fails', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => { throw new Error('network down'); }));
    const resp = await call(post(imsBody()));
    expect(resp.status).toBe(502);
  });

  it('returns 502 when the profile response has no email', async () => {
    mockImsProfile(200, { userId: 'abc123' });
    const resp = await call(post(imsBody()));
    expect(resp.status).toBe(502);
  });

  it('returns 502 when access_token is accepted by IMS but is not itself a JWT', async () => {
    const resp = await call(post({ access_token: 'not-a-jwt' }));
    expect(resp.status).toBe(502);
  });

  it('marks the 401 no-store', async () => {
    mockImsProfile(401, {});
    const resp = await call(post(imsBody()));
    expect(resp.headers.get('cache-control')).toBe('no-store');
  });
});

// This endpoint mints credentials and sits behind a CDN.
describe('createSession caching', () => {
  it('marks the 200 no-store', async () => {
    const resp = await call(post(imsBody()));
    expect(resp.status).toBe(200);
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
    expect((await withOrigins('  ', ORIGIN)).status).toBe(200);
  });

  it('falls back to the request origin when ALLOWED_ORIGINS is only separators', async () => {
    expect((await withOrigins(',,', ORIGIN)).status).toBe(200);
  });

  it('still rejects a foreign origin when ALLOWED_ORIGINS is empty', async () => {
    expect((await withOrigins('  ', 'https://evil.example')).status).toBe(403);
  });

  it('ignores empty entries between commas', async () => {
    expect((await withOrigins('https://a.example,,https://example.com', ORIGIN)).status).toBe(200);
  });

  it('matches a configured entry carrying a trailing slash', async () => {
    expect((await withOrigins('https://example.com/', ORIGIN)).status).toBe(200);
  });

  it('matches a configured entry with an uppercase host', async () => {
    expect((await withOrigins('https://EXAMPLE.com', ORIGIN)).status).toBe(200);
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
    expect(resp.status).toBe(200);
  });

  it('does not let normalization widen the allowlist to a different host', async () => {
    expect((await withOrigins('https://example.com', 'https://example.com.evil.example')).status)
      .toBe(403);
  });
});

describe('deleteSession', () => {
  const del = (origin = ORIGIN) => new Request(`${ORIGIN}/auth/session`, {
    method: 'DELETE',
    headers: origin ? { origin } : {},
  });

  it('returns 204 with a single Set-Cookie header', async () => {
    const request = del();
    const resp = await deleteSession({ url: new URL(request.url), env, request });
    expect(resp.status).toBe(204);
    expect(resp.headers.getSetCookie()).toHaveLength(1);
  });

  it('clears the spectrum_session cookie: empty value, Max-Age=0, HttpOnly', async () => {
    const request = del();
    const resp = await deleteSession({ url: new URL(request.url), env, request });
    const cookie = findCookie(resp.headers.getSetCookie(), 'spectrum_session');
    expect(cookie).toBeDefined();
    expect(cookie.split('; ')[0]).toBe('spectrum_session=');
    expect(cookie).toMatch(/Max-Age=0(;|$)/);
    expect(cookie).toMatch(/HttpOnly/);
  });

  it('rejects non-DELETE methods with 405', async () => {
    const request = new Request(`${ORIGIN}/auth/session`, { method: 'GET', headers: { origin: ORIGIN } });
    const resp = await deleteSession({ url: new URL(request.url), env, request });
    expect(resp.status).toBe(405);
    expect(resp.headers.get('allow')).toBe('DELETE');
  });

  it('rejects a missing Origin header with 403', async () => {
    const request = del(null);
    const resp = await deleteSession({ url: new URL(request.url), env, request });
    expect(resp.status).toBe(403);
  });

  it('rejects a foreign Origin with 403', async () => {
    const request = del('https://evil.example');
    const resp = await deleteSession({ url: new URL(request.url), env, request });
    expect(resp.status).toBe(403);
  });

  it('does not require SESSION_SECRET', async () => {
    const request = del();
    const resp = await deleteSession({ url: new URL(request.url), env: {}, request });
    expect(resp.status).toBe(204);
  });

  it('sets Secure for an https request URL and omits it for http', async () => {
    const httpsRequest = del();
    const httpsUrl = new URL(httpsRequest.url);
    const httpsResp = await deleteSession({ url: httpsUrl, env, request: httpsRequest });
    expect(findCookie(httpsResp.headers.getSetCookie(), 'spectrum_session')).toMatch(/Secure/);

    const httpRequest = new Request('http://example.com/auth/session', {
      method: 'DELETE',
      headers: { origin: 'http://example.com' },
    });
    const httpUrl = new URL(httpRequest.url);
    const httpResp = await deleteSession({ url: httpUrl, env, request: httpRequest });
    expect(findCookie(httpResp.headers.getSetCookie(), 'spectrum_session')).not.toMatch(/Secure/);
  });

  it('marks the response no-store', async () => {
    const request = del();
    const resp = await deleteSession({ url: new URL(request.url), env, request });
    expect(resp.headers.get('cache-control')).toBe('no-store');
  });
});
