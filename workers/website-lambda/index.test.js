import {
  describe, it, expect, vi, beforeAll, beforeEach, afterEach,
} from 'vitest';
import { signToken } from './lib/session.js';

const SECRET = 'test-secret';
let handler;
let upstream;

const event = (path, { cookie, headers = {}, query = '' } = {}) => ({
  rawPath: path,
  rawQueryString: query,
  headers: { host: 'example.test', ...headers },
  cookies: cookie ? [`spectrum_session=${cookie}`] : [],
  requestContext: { http: { method: 'GET' } },
});

const validCookie = () => signToken(
  JSON.stringify({ created_at: String(Date.now()), expires_in: '3600000' }),
  SECRET,
);

beforeAll(async () => {
  process.env.SESSION_SECRET = SECRET;
  process.env.AEM_ORG = 'adobe';
  process.env.AEM_SITE = 'spectrum-hub';
  process.env.ANON_CACHE_MAX_AGE = '300';
  process.env.ANON_EDGE_MAX_AGE = '86400';
  ({ handler } = await import('./index.js'));
});

beforeEach(() => {
  upstream = vi.fn(async () => new Response('<html><head></head><body>hi</body></html>', {
    status: 200,
    headers: { 'content-type': 'text/html', 'cache-control': 'max-age=7200, must-revalidate' },
  }));
  vi.stubGlobal('fetch', upstream);
});

afterEach(() => { vi.unstubAllGlobals(); });

describe('content Cache-Control', () => {
  it('gives anonymous HTML a browser max-age and a separate edge s-maxage', async () => {
    const resp = await handler(event('/'));
    expect(resp.headers['cache-control']).toBe('public, max-age=300, s-maxage=86400');
  });

  it('keeps authenticated HTML no-store', async () => {
    const resp = await handler(event('/', { cookie: await validCookie() }));
    expect(resp.headers['cache-control']).toBe('private, no-store');
  });
});

describe('conditional request headers', () => {
  const conditional = {
    'if-none-match': 'W/"abc"',
    'if-modified-since': 'Mon, 28 Sep 2026 18:36:23 GMT',
  };

  it('strips them for authenticated requests so AEM cannot answer 304', async () => {
    await handler(event('/', { cookie: await validCookie(), headers: conditional }));
    const sent = upstream.mock.calls[0][0];
    expect(sent.headers.get('if-none-match')).toBeNull();
    expect(sent.headers.get('if-modified-since')).toBeNull();
  });

  it('forwards them for anonymous requests (cheap edge revalidation)', async () => {
    await handler(event('/', { headers: conditional }));
    const sent = upstream.mock.calls[0][0];
    expect(sent.headers.get('if-none-match')).toBe('W/"abc"');
    expect(sent.headers.get('if-modified-since')).toBe(conditional['if-modified-since']);
  });
});
