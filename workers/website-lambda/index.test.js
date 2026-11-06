import {
  describe, it, expect, vi, beforeAll, beforeEach, afterEach,
} from 'vitest';
import { signToken } from './lib/session.js';
import { GATE_ETAG_SUFFIX } from './lib/etag.js';
import { PUBLIC_FILTER_PATHS } from './lib/gate.js';

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

  it('drops an ungated tag and If-Modified-Since for anonymous requests', async () => {
    await handler(event('/', { headers: conditional }));
    const sent = upstream.mock.calls[0][0];
    expect(sent.headers.get('if-none-match')).toBeNull();
    expect(sent.headers.get('if-modified-since')).toBeNull();
  });

  it('forwards a gated tag, unsuffixed, for anonymous requests (cheap edge revalidation)', async () => {
    await handler(event('/', {
      headers: { ...conditional, 'if-none-match': `W/"abc${GATE_ETAG_SUFFIX}"` },
    }));
    const sent = upstream.mock.calls[0][0];
    expect(sent.headers.get('if-none-match')).toBe('W/"abc"');
    expect(sent.headers.get('if-modified-since')).toBeNull();
  });
});

const queryIndexPaths = PUBLIC_FILTER_PATHS.filter((path) => path.endsWith('/query-index.json'));
const cardIndex = {
  total: 2,
  offset: 0,
  limit: 500,
  columns: ['path', 'title', 'audience', 'card-steward', 'card-design-resources', 'card-contact'],
  data: [
    {
      path: '/web/rsp/components/button',
      title: 'Button',
      'card-steward': 'Example team',
      'card-design-resources': 'https://example.test/design',
      'card-contact': '#example-help',
    },
    { path: '/private-page', title: 'Private page', audience: 'private' },
  ],
};

const indexResponse = () => new Response(JSON.stringify(cardIndex), {
  headers: {
    'content-type': 'application/json',
    etag: '"index"',
    'last-modified': 'Mon, 28 Sep 2026 18:36:23 GMT',
  },
});

const responseJson = (resp) => JSON.parse(Buffer.from(resp.body, 'base64').toString('utf8'));

describe.each(queryIndexPaths)('query-index response at %s', (path) => {
  beforeEach(() => {
    upstream.mockImplementation(indexResponse);
  });

  it('strips private rows and columns for an anonymous viewer', async () => {
    const resp = await handler(event(path));

    expect(resp.statusCode).toBe(200);
    expect(responseJson(resp)).toEqual({
      ...cardIndex,
      total: 1,
      columns: ['path', 'title'],
      data: [{ path: '/web/rsp/components/button', title: 'Button' }],
    });
    expect(resp.headers['cache-control']).toBe('public, max-age=300, s-maxage=86400');
    expect(resp.headers.etag).toBe(`"index${GATE_ETAG_SUFFIX}"`);
    expect(resp.headers['last-modified']).toBeUndefined();
  });

  it('preserves the full index for an authenticated viewer without caching it', async () => {
    const resp = await handler(event(path, { cookie: await validCookie() }));

    expect(resp.statusCode).toBe(200);
    expect(responseJson(resp)).toEqual(cardIndex);
    expect(resp.headers['cache-control']).toBe('private, no-store');
  });

  it.each([false, true])('honors compact=true when authenticated=%s', async (authed) => {
    const resp = await handler(event(path, {
      query: 'compact=true',
      cookie: authed ? await validCookie() : undefined,
    }));

    expect(resp.statusCode).toBe(200);
    expect(responseJson(resp).columns).toEqual(['path', 'title']);
    expect(responseJson(resp).data).toEqual(
      (authed ? cardIndex.data : cardIndex.data.slice(0, 1))
        .map(({ path: pagePath, title }) => ({ path: pagePath, title })),
    );
    expect(new URL(upstream.mock.calls[0][0].url).searchParams.has('compact')).toBe(false);
  });

  it('drops raw validators before fetching an anonymous response', async () => {
    await handler(event(path, {
      headers: {
        'if-none-match': '"index"',
        'if-modified-since': 'Mon, 28 Sep 2026 18:36:23 GMT',
      },
    }));

    const sent = upstream.mock.calls[0][0];
    expect(sent.headers.get('if-none-match')).toBeNull();
    expect(sent.headers.get('if-modified-since')).toBeNull();
  });

  it('revalidates only a current gated copy', async () => {
    upstream.mockResolvedValue(new Response(null, { status: 304, headers: { etag: '"index"' } }));

    const resp = await handler(event(path, {
      headers: { 'if-none-match': `"index${GATE_ETAG_SUFFIX}"` },
    }));

    expect(upstream.mock.calls[0][0].headers.get('if-none-match')).toBe('"index"');
    expect(resp.statusCode).toBe(304);
    expect(resp.headers.etag).toBe(`"index${GATE_ETAG_SUFFIX}"`);
  });

  it('rejects an unsolicited 304 instead of confirming an unfiltered copy', async () => {
    upstream.mockResolvedValue(new Response(null, { status: 304 }));

    const resp = await handler(event(path));

    expect(resp.statusCode).toBe(404);
    expect(resp.headers['cache-control']).toBe('no-store');
  });

  it.each([
    ['partial response', () => new Response(JSON.stringify(cardIndex), { status: 206 })],
    ['invalid JSON', () => new Response('not json')],
    ['unrecognized index', () => new Response('{}')],
  ])('fails closed for an anonymous %s', async (_name, makeResponse) => {
    upstream.mockImplementation(makeResponse);

    const resp = await handler(event(path));

    expect(resp.statusCode).toBe(404);
    expect(resp.headers['cache-control']).toBe('no-store');
  });
});

describe('private card filtering cache migration', () => {
  it('refetches an old gate-v2 page and strips private metadata', async () => {
    upstream.mockImplementation(async (request) => (
      request.headers.has('if-none-match')
        ? new Response(null, { status: 304, headers: { etag: '"page"' } })
        : new Response('<html><head><meta name="card-steward" content="Example team"></head><body>Public page</body></html>', {
          headers: { 'content-type': 'text/html', etag: '"page"' },
        })
    ));

    const resp = await handler(event('/web/rsp/components/button', {
      headers: { 'if-none-match': '"page--gate-v2"' },
    }));

    expect(resp.statusCode).toBe(200);
    expect(upstream.mock.calls[0][0].headers.get('if-none-match')).toBeNull();
    expect(Buffer.from(resp.body, 'base64').toString('utf8'))
      .toBe('<html><head></head><body>Public page</body></html>');
    expect(resp.headers.etag).toBe(`"page${GATE_ETAG_SUFFIX}"`);
  });
});
