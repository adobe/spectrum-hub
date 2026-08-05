import {
  describe, it, expect, vi, beforeEach,
} from 'vitest';

// fetchFromAem is stubbed so a routing test never makes a network call.
// Nothing else is mocked: createSession keeps its real behaviour and is
// only wrapped so the test can inspect the request it was handed.
vi.mock('./handlers/aem.js', () => ({
  fetchFromAem: vi.fn(async () => new Response('aem body', { status: 200 })),
}));

vi.mock('./handlers/auth.js', async (importOriginal) => {
  const actual = await importOriginal();
  return { ...actual, createSession: vi.fn(actual.createSession) };
});

const { default: worker } = await import('./index.js');
const { fetchFromAem } = await import('./handlers/aem.js');
const { createSession } = await import('./handlers/auth.js');

const ORIGIN = 'https://example.com';

const env = {
  AEM_ORG: 'adobe',
  AEM_SITE: 'spectrum-hub',
  ORIGIN_AUTHENTICATION: 'origin-secret',
  SESSION_SECRET: 'test-secret',
};

const imsBody = () => JSON.stringify({
  access_token: 'header.payload.signature',
  expires_in: '86400000',
  created_at: String(Date.now()),
  scope: 'AdobeID,openid',
});

const postSession = (path = '/auth/session', origin = ORIGIN) => new Request(`${ORIGIN}${path}`, {
  method: 'POST',
  headers: { origin, 'content-type': 'application/json' },
  body: imsBody(),
});

beforeEach(() => {
  vi.clearAllMocks();
});

describe('routing /auth/session', () => {
  it('reaches the session handler on GET, answering 405 rather than proxying', async () => {
    const resp = await worker.fetch(new Request(`${ORIGIN}/auth/session`, { method: 'GET' }), env);
    expect(resp.status).toBe(405);
    expect(resp.headers.get('allow')).toBe('POST');
    expect(createSession).toHaveBeenCalledTimes(1);
    expect(fetchFromAem).not.toHaveBeenCalled();
  });

  it('reaches the session handler on a foreign Origin, answering 403 rather than proxying', async () => {
    const resp = await worker.fetch(postSession('/auth/session', 'https://evil.com'), {});
    expect(resp.status).toBe(403);
    expect(fetchFromAem).not.toHaveBeenCalled();
  });

  it('creates the session on a well-formed POST', async () => {
    const resp = await worker.fetch(postSession(), env);
    expect(resp.status).toBe(204);
    expect(resp.headers.getSetCookie()).toHaveLength(1);
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
    await worker.fetch(new Request(`${ORIGIN}/`, { method: 'GET' }), env);
    expect(fetchFromAem).toHaveBeenCalledTimes(1);
    const { request } = fetchFromAem.mock.calls[0][0];
    expect(request.headers.get('authorization')).toBe('token origin-secret');
  });
});

describe('routing the /auth/ namespace', () => {
  it('routes / to the proxy handler', async () => {
    const resp = await worker.fetch(new Request(`${ORIGIN}/`, { method: 'GET' }), env);
    expect(resp.status).toBe(200);
    expect(fetchFromAem).toHaveBeenCalledTimes(1);
    expect(createSession).not.toHaveBeenCalled();
    const { request, cache } = fetchFromAem.mock.calls[0][0];
    expect(new URL(request.url).hostname).toBe('main--spectrum-hub--adobe.aem.live');
    expect(cache).toBe(true);
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
    const resp = await worker.fetch(new Request(`${ORIGIN}/authors/index.html`, { method: 'GET' }), env);
    expect(resp.status).toBe(200);
    expect(fetchFromAem).toHaveBeenCalledTimes(1);
  });
});
