import {
  describe, it, expect, vi, beforeAll, afterAll, beforeEach, afterEach,
} from 'vitest';
import { signToken } from './lib/session.js';
import { GATE_ETAG_SUFFIX } from './lib/etag.js';

// Routing tests for the head-less page variant gate (.plain.html / .md). The
// global fetch is stubbed with a fake AEM origin keyed by path, so both the
// proxied variant and the canonical-page privacy lookup stay local - no
// network, no real session tokens.

const TEST_ENV = {
  AEM_ORG: 'adobe',
  AEM_SITE: 'spectrum-hub',
  SESSION_SECRET: 'test-secret',
};
let savedEnv;
let handler;

beforeAll(async () => {
  savedEnv = Object.fromEntries(Object.keys(TEST_ENV).map((key) => [key, process.env[key]]));
  Object.assign(process.env, TEST_ENV);
  ({ handler } = await import('./index.js'));
});

afterAll(() => {
  for (const [key, value] of Object.entries(savedEnv)) {
    if (value === undefined) { delete process.env[key]; } else { process.env[key] = value; }
  }
});

const html = (head, main) => `<!doctype html><html><head>${head}</head><body><main>${main}</main></body></html>`;
const PRIVATE_META = '<meta name="audience" content="private">';
const PRIVATE_BLOCK = '<div class="banner audience-private">private banner</div>';
const PUBLIC_BLOCK = '<div class="banner audience-public">public banner</div>';

const mdTable = (header, body) => {
  const width = Math.max(header.length, body.length) + 2;
  const border = `+${'-'.repeat(width)}+`;
  const row = (text) => `| ${text.padEnd(width - 2)} |`;
  return [border, row(header), border, row(body), border].join('\n');
};

const HTML_TYPE = { 'content-type': 'text/html; charset=utf-8' };
const MD_TYPE = { 'content-type': 'text/markdown; charset=utf-8' };

// The fake AEM origin: path -> () => Response.
const PAGES = {
  '/private': () => new Response(html(PRIVATE_META, '<div><p>secret</p></div>'), { headers: HTML_TYPE }),
  '/private.plain.html': () => new Response('<div><p>secret</p></div>', { headers: HTML_TYPE }),
  '/private.md': () => new Response(`# Secret\n\n${mdTable('Metadata', 'audience | private')}\n`, { headers: MD_TYPE }),
  '/': () => new Response(html('', `<div>${PUBLIC_BLOCK}${PRIVATE_BLOCK}</div>`), { headers: HTML_TYPE }),
  '/index.plain.html': () => new Response(`<div>${PUBLIC_BLOCK}${PRIVATE_BLOCK}</div>`, { headers: HTML_TYPE }),
  '/index.md': () => new Response(
    `${mdTable('Banner (audience public)', 'public banner')}\n\n${mdTable('Banner (audience private)', 'private banner')}\n\n# Home\n`,
    { headers: MD_TYPE },
  ),
  '/public': () => new Response(html('', '<div><p>hello</p></div>'), { headers: HTML_TYPE }),
  '/public.plain.html': () => new Response('<div><p>hello</p></div>', { headers: HTML_TYPE }),
  '/moved': () => new Response(null, { status: 301, headers: { location: '/elsewhere' } }),
  '/moved.plain.html': () => new Response('<div><p>moved</p></div>', { headers: HTML_TYPE }),
  '/broken': () => new Response('upstream error', { status: 500 }),
  '/broken.plain.html': () => new Response('<div><p>broken</p></div>', { headers: HTML_TYPE }),
  '/orphan.plain.html': () => new Response('<div><p>orphan</p></div>', { headers: HTML_TYPE }),
};

let fetchMock;

const upstreamPaths = () => fetchMock.mock.calls.map(([req]) => new URL(req.url).pathname);

const sessionCookie = async () => {
  const claims = JSON.stringify({
    email: 'user@example.com',
    created_at: String(Date.now()),
    expires_in: '86400000',
  });
  return `spectrum_session=${await signToken(claims, TEST_ENV.SESSION_SECRET)}`;
};

const invoke = async (path, { method = 'GET', cookies, headers = {} } = {}) => {
  const resp = await handler({
    rawPath: path,
    rawQueryString: '',
    headers: { host: 'example.com', ...headers },
    cookies,
    requestContext: { http: { method } },
  });
  const body = resp.isBase64Encoded ? Buffer.from(resp.body, 'base64').toString('utf8') : resp.body;
  return { ...resp, text: body };
};

beforeEach(() => {
  fetchMock = vi.fn(async (req) => {
    const page = PAGES[new URL(req.url).pathname];
    return page ? page() : new Response('Not found', { status: 404, headers: HTML_TYPE });
  });
  vi.stubGlobal('fetch', fetchMock);
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('private page variants (anonymous)', () => {
  it('still 404s the extensionless private page', async () => {
    const resp = await invoke('/private');
    expect(resp.statusCode).toBe(404);
  });

  it('404s the .plain.html of a private page without fetching the variant', async () => {
    const resp = await invoke('/private.plain.html');
    expect(resp.statusCode).toBe(404);
    expect(resp.text).not.toContain('secret');
    expect(resp.headers['cache-control']).toBe('no-store');
    expect(upstreamPaths()).toEqual(['/private']);
  });

  it('404s the .md of a private page', async () => {
    const resp = await invoke('/private.md');
    expect(resp.statusCode).toBe(404);
    expect(resp.text).not.toContain('Secret');
    expect(upstreamPaths()).toEqual(['/private']);
  });

  it('404s a HEAD for a private variant too', async () => {
    const resp = await invoke('/private.plain.html', { method: 'HEAD' });
    expect(resp.statusCode).toBe(404);
  });

  it('checks the canonical page with a plain GET, no conditional headers or cookies', async () => {
    await invoke('/private.plain.html', {
      method: 'HEAD',
      headers: { 'if-none-match': '"abc"', 'if-modified-since': 'Wed, 01 Jan 2025 00:00:00 GMT' },
      cookies: ['other=1'],
    });
    const [[canonicalReq, init]] = fetchMock.mock.calls;
    expect(new URL(canonicalReq.url).pathname).toBe('/private');
    expect(canonicalReq.method).toBe('GET');
    expect(canonicalReq.headers.get('if-none-match')).toBeNull();
    expect(canonicalReq.headers.get('if-modified-since')).toBeNull();
    expect(canonicalReq.headers.get('cookie')).toBeNull();
    expect(new URL(canonicalReq.url).hostname).toBe('main--spectrum-hub--adobe.aem.live');
    expect(init.redirect).toBe('manual');
  });

  it('re-checks the canonical page even when revalidating a gated copy', async () => {
    const resp = await invoke('/private.plain.html', {
      headers: { 'if-none-match': `W/"abc${GATE_ETAG_SUFFIX}"` },
    });
    expect(resp.statusCode).toBe(404);
    expect(upstreamPaths()).toEqual(['/private']);
  });

  it.each([
    ['the canonical page is missing', '/orphan.plain.html'],
    ['the canonical page redirects', '/moved.plain.html'],
    ['the canonical lookup errors upstream', '/broken.plain.html'],
  ])('fails closed when %s', async (_label, path) => {
    const resp = await invoke(path);
    expect(resp.statusCode).toBe(404);
    expect(upstreamPaths()).toHaveLength(1);
  });

  it('fails closed when the canonical fetch throws', async () => {
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    fetchMock.mockImplementationOnce(async () => { throw new Error('network down'); });
    const resp = await invoke('/public.plain.html');
    expect(resp.statusCode).toBe(404);
    errorSpy.mockRestore();
  });
});

describe('public page variants (anonymous)', () => {
  it('serves the .plain.html of a public page after checking the canonical page', async () => {
    const resp = await invoke('/public.plain.html');
    expect(resp.statusCode).toBe(200);
    expect(resp.text).toContain('hello');
    expect(upstreamPaths()).toEqual(['/public', '/public.plain.html']);
  });

  it('maps /index.plain.html to / and strips audience-private blocks', async () => {
    const resp = await invoke('/index.plain.html');
    expect(resp.statusCode).toBe(200);
    expect(upstreamPaths()[0]).toBe('/');
    expect(resp.text).toContain('public banner');
    expect(resp.text).not.toContain('private banner');
  });

  it('maps /index.md to / and strips audience-private block tables', async () => {
    const resp = await invoke('/index.md');
    expect(resp.statusCode).toBe(200);
    expect(upstreamPaths()[0]).toBe('/');
    expect(resp.text).toContain('public banner');
    expect(resp.text).not.toContain('private banner');
    expect(resp.text).toContain('# Home');
  });
});

describe('page variants (authenticated)', () => {
  it('serves a private variant without a canonical lookup', async () => {
    const resp = await invoke('/private.plain.html', { cookies: [await sessionCookie()] });
    expect(resp.statusCode).toBe(200);
    expect(resp.text).toContain('secret');
    expect(resp.headers['cache-control']).toBe('private, no-store');
    expect(upstreamPaths()).toEqual(['/private.plain.html']);
  });

  it('strips audience-public blocks from .plain.html and .md', async () => {
    const cookies = [await sessionCookie()];
    const plain = await invoke('/index.plain.html', { cookies });
    expect(plain.text).toContain('private banner');
    expect(plain.text).not.toContain('public banner');
    const md = await invoke('/index.md', { cookies });
    expect(md.text).toContain('private banner');
    expect(md.text).not.toContain('public banner');
  });
});
