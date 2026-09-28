import {
  describe, it, expect, vi, beforeEach, afterEach,
} from 'vitest';
import { signToken } from './lib/session.js';

// fetchFromAem is stubbed so a routing test never makes a network call.
// createSession/deleteSession keep their real behaviour and are only
// wrapped so tests can inspect the request they were handed.
vi.mock('./handlers/aem.js', () => ({
  fetchFromAem: vi.fn(async () => new Response('aem body', { status: 200 })),
}));

vi.mock('./handlers/auth.js', async (importOriginal) => {
  const actual = await importOriginal();
  return {
    ...actual,
    createSession: vi.fn(actual.createSession),
    deleteSession: vi.fn(actual.deleteSession),
  };
});

const { default: worker } = await import('./index.js');
const { fetchFromAem } = await import('./handlers/aem.js');
const { createSession, deleteSession } = await import('./handlers/auth.js');

const ORIGIN = 'https://example.com';

const env = {
  AEM_ORG: 'adobe',
  AEM_SITE: 'spectrum-hub',
  ORIGIN_AUTHENTICATION: 'origin-secret',
  SESSION_SECRET: 'test-secret',
  IMS_CLIENT_ID: 'service-client',
  IMS_CLIENT_SECRET: 'service-secret',
  IMS_SCOPE: 'openid,AdobeID',
};

const base64url = (bytes) => btoa(String.fromCharCode(...bytes))
  .replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');

const base64urlJson = (obj) => base64url(new TextEncoder().encode(JSON.stringify(obj)));

// createSession no longer verifies a signature - it asks IMS's profile
// endpoint (stubbed via global fetch below), so this only needs to look
// like a JWT for the created_at/expires_in claims it carries.
const accessToken = (() => {
  const payload = {
    expires_in: '86400000',
    created_at: String(Date.now()),
    scope: 'AdobeID,openid',
  };
  return `${base64urlJson({ alg: 'RS256', kid: 'test-key' })}.${base64urlJson(payload)}.fake-signature`;
})();

const imsBody = () => JSON.stringify({ access_token: accessToken });

const postSession = (path = '/auth/session', origin = ORIGIN) => new Request(`${ORIGIN}${path}`, {
  method: 'POST',
  headers: { origin, 'content-type': 'application/json' },
  body: imsBody(),
});

const deleteSessionRequest = (path = '/auth/session', origin = ORIGIN) => new Request(`${ORIGIN}${path}`, {
  method: 'DELETE',
  headers: { origin },
});

// A real, HMAC-valid session cookie for the gate to accept - the same shape
// createSession mints (signed JSON claims), so index.js's readSession
// verifies it against the real lib rather than a stub.
const sessionCookie = async (overrides = {}) => {
  const claims = JSON.stringify({
    email: 'user@example.com',
    created_at: String(Date.now()),
    expires_in: '86400000',
    ...overrides,
  });
  return `${'spectrum_session'}=${await signToken(claims, env.SESSION_SECRET)}`;
};

// GET a path as an authenticated visitor (valid session cookie present).
const authedGet = async (path) => new Request(`${ORIGIN}${path}`, {
  method: 'GET',
  headers: { cookie: await sessionCookie() },
});

beforeEach(() => {
  vi.clearAllMocks();
  // createSession fans out to IMS profile, the IMS token endpoint, and the
  // DA visitor allowlist; route by URL so each leg answers plausibly and the
  // configured user is admitted by the '@example.com' wildcard.
  vi.stubGlobal('fetch', vi.fn(async (url) => {
    const u = String(url);
    if (u.includes('/ims/token/')) {
      return new Response(JSON.stringify({ access_token: 'service-token' }), { status: 200 });
    }
    if (u.includes('admin.da.live/config/')) {
      return new Response(JSON.stringify({ visitors: { data: [{ email: '@example.com' }] } }), { status: 200 });
    }
    return new Response(JSON.stringify({ email: 'user@example.com' }), { status: 200 });
  }));
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('routing /auth/session', () => {
  it('answers 405 with every method this path supports, without invoking either handler', async () => {
    const resp = await worker.fetch(new Request(`${ORIGIN}/auth/session`, { method: 'GET' }), env);
    expect(resp.status).toBe(405);
    expect(resp.headers.get('allow')).toBe('POST, DELETE');
    expect(createSession).not.toHaveBeenCalled();
    expect(deleteSession).not.toHaveBeenCalled();
    expect(fetchFromAem).not.toHaveBeenCalled();
  });

  it('reaches the session handler on a foreign Origin, answering 403 rather than proxying', async () => {
    const resp = await worker.fetch(postSession('/auth/session', 'https://evil.com'), {});
    expect(resp.status).toBe(403);
    expect(fetchFromAem).not.toHaveBeenCalled();
  });

  it('creates the session on a well-formed POST', async () => {
    const resp = await worker.fetch(postSession(), env);
    expect(resp.status).toBe(200);
    expect(resp.headers.getSetCookie()).toHaveLength(1);
    expect(fetchFromAem).not.toHaveBeenCalled();
  });

  it('deletes the session on a well-formed DELETE', async () => {
    const resp = await worker.fetch(deleteSessionRequest(), env);
    expect(resp.status).toBe(204);
    expect(resp.headers.getSetCookie()).toHaveLength(1);
    expect(deleteSession).toHaveBeenCalledTimes(1);
    expect(fetchFromAem).not.toHaveBeenCalled();
  });

  it('reaches the delete handler on a foreign Origin, answering 403 rather than proxying', async () => {
    const resp = await worker.fetch(deleteSessionRequest('/auth/session', 'https://evil.com'), {});
    expect(resp.status).toBe(403);
    expect(fetchFromAem).not.toHaveBeenCalled();
  });

  // THE invariant. Route matching must happen before formatRequest, so the
  // session handler never receives an AEM-bound request carrying the origin
  // credential. Moving formatRequest back above ROUTES.find would leak
  // ORIGIN_AUTHENTICATION into a handler that echoes nothing but is one
  // refactor away from doing so, and would point the request at aem.live.
  it('hands the session handler the original request, with no authorization header', async () => {
    await worker.fetch(postSession(), env);
    expect(createSession).toHaveBeenCalledTimes(1);
    const { request } = createSession.mock.calls[0][0];
    expect(request.headers.get('authorization')).toBe(null);
    expect(request.headers.get('x-forwarded-host')).toBe(null);
    expect(request.headers.get('x-byo-cdn-type')).toBe(null);
    expect(new URL(request.url).hostname).toBe('example.com');
  });

  it('still attaches the origin credential on the proxy route', async () => {
    // Proves the assertion above is not vacuous: this env really does
    // produce an authorization header on the path that is meant to have one.
    await worker.fetch(await authedGet('/'), env);
    expect(fetchFromAem).toHaveBeenCalledTimes(1);
    const { request } = fetchFromAem.mock.calls[0][0];
    expect(request.headers.get('authorization')).toBe('token origin-secret');
  });
});

describe('routing the /auth/ namespace', () => {
  it('routes / to the proxy handler', async () => {
    const resp = await worker.fetch(await authedGet('/'), env);
    expect(resp.status).toBe(200);
    expect(fetchFromAem).toHaveBeenCalledTimes(1);
    expect(createSession).not.toHaveBeenCalled();
    const { request, cache } = fetchFromAem.mock.calls[0][0];
    expect(new URL(request.url).hostname).toBe('main--spectrum-hub--adobe.aem.live');
    expect(cache).toBe(false);
  });

  // A trailing slash used to fall through to the AEM proxy, which attaches
  // the origin credential and forwards the body - the IMS access token -
  // upstream to aem.live.
  it('never proxies a trailing-slash variant of the session path', async () => {
    const resp = await worker.fetch(postSession('/auth/session/'), env);
    expect(resp.status).toBe(404);
    expect(fetchFromAem).not.toHaveBeenCalled();
  });

  it('never proxies a deeper variant of the session path', async () => {
    const resp = await worker.fetch(postSession('/auth/session/extra'), env);
    expect(resp.status).toBe(404);
    expect(fetchFromAem).not.toHaveBeenCalled();
  });

  it('404s an unknown /auth/ path without proxying it', async () => {
    const resp = await worker.fetch(new Request(`${ORIGIN}/auth/token`, { method: 'GET' }), env);
    expect(resp.status).toBe(404);
    expect(fetchFromAem).not.toHaveBeenCalled();
  });

  it('404s the bare /auth path without proxying it', async () => {
    const resp = await worker.fetch(new Request(`${ORIGIN}/auth`, { method: 'GET' }), env);
    expect(resp.status).toBe(404);
    expect(fetchFromAem).not.toHaveBeenCalled();
  });

  it('leaves a lookalike path outside the namespace on the proxy route', async () => {
    const resp = await worker.fetch(await authedGet('/authors/index.html'), env);
    expect(resp.status).toBe(200);
    expect(fetchFromAem).toHaveBeenCalledTimes(1);
  });
});

describe('access gate', () => {
  const anonGet = (path) => new Request(`${ORIGIN}${path}`, { method: 'GET' });

  it('serves public prefixes to an anonymous visitor', async () => {
    const resp = await worker.fetch(anonGet('/styles/styles.css'), env);
    expect(resp.status).toBe(200);
    expect(fetchFromAem).toHaveBeenCalledTimes(1);
    // Public assets are still proxied with the origin credential attached.
    const { request } = fetchFromAem.mock.calls[0][0];
    expect(request.headers.get('authorization')).toBe('token origin-secret');
  });

  it('serves a /media_ path to an anonymous visitor', async () => {
    const resp = await worker.fetch(anonGet('/content/page/media_deadbeef.png'), env);
    expect(resp.status).toBe(200);
    expect(fetchFromAem).toHaveBeenCalledTimes(1);
  });

  it('serves telemetry (RUM/OpTel) to an anonymous visitor', async () => {
    expect((await worker.fetch(anonGet('/.rum/web-vitals.js'), env)).status).toBe(200);
    expect((await worker.fetch(anonGet('/.optel/optel.js'), env)).status).toBe(200);
    expect(fetchFromAem).toHaveBeenCalledTimes(2);
  });

  it('strips the session cookie from the request it proxies upstream', async () => {
    await worker.fetch(await authedGet('/some/gated/page'), env);
    expect(fetchFromAem).toHaveBeenCalledTimes(1);
    const { request } = fetchFromAem.mock.calls[0][0];
    expect(request.headers.get('cookie')).toBe(null);
  });

  it('404s the site root for an anonymous visitor, without proxying', async () => {
    const resp = await worker.fetch(anonGet('/'), env);
    expect(resp.status).toBe(404);
    expect(fetchFromAem).not.toHaveBeenCalled();
  });

  it('404s a content page for an anonymous visitor', async () => {
    const resp = await worker.fetch(anonGet('/some/gated/page'), env);
    expect(resp.status).toBe(404);
    expect(fetchFromAem).not.toHaveBeenCalled();
  });

  it('404s /query-index.json (filter category, punted) for an anonymous visitor', async () => {
    const resp = await worker.fetch(anonGet('/query-index.json'), env);
    expect(resp.status).toBe(404);
    expect(fetchFromAem).not.toHaveBeenCalled();
  });

  it('serves a gated page to an authenticated visitor', async () => {
    const resp = await worker.fetch(await authedGet('/some/gated/page'), env);
    expect(resp.status).toBe(200);
    expect(fetchFromAem).toHaveBeenCalledTimes(1);
  });

  it('treats a tampered / wrong-secret cookie as anonymous (404 on a gated path)', async () => {
    const badCookie = `spectrum_session=${await signToken('{"email":"x"}', 'wrong-secret')}`;
    const resp = await worker.fetch(new Request(`${ORIGIN}/some/gated/page`, {
      method: 'GET', headers: { cookie: badCookie },
    }), env);
    expect(resp.status).toBe(404);
    expect(fetchFromAem).not.toHaveBeenCalled();
  });

  it('treats an expired session as anonymous (404 on a gated path)', async () => {
    const expired = `spectrum_session=${await signToken(JSON.stringify({
      email: 'user@example.com', created_at: '1000', expires_in: '1000',
    }), env.SESSION_SECRET)}`;
    const resp = await worker.fetch(new Request(`${ORIGIN}/some/gated/page`, {
      method: 'GET', headers: { cookie: expired },
    }), env);
    expect(resp.status).toBe(404);
    expect(fetchFromAem).not.toHaveBeenCalled();
  });
});
