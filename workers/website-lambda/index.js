/*
 * Copyright 2022 Adobe. All rights reserved.
 * This file is licensed to you under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License. You may obtain a copy
 * of the License at http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software distributed under
 * the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR REPRESENTATIONS
 * OF ANY KIND, either express or implied. See the License for the specific language
 * governing permissions and limitations under the License.
 */

/*
 * AWS Lambda (Function URL) port of the Cloudflare Worker in ../website.
 *
 * The routing, gate, and proxy logic below is the same adapter that lives in
 * the worker's index.js - the only difference is the entry shape. A Worker is
 * handed a Web `Request` and returns a `Response`; a Lambda Function URL is
 * handed an event (payload format 2.0) and returns a plain response object.
 * So this file does exactly two extra things the Worker does not: it builds a
 * `Request` from the event on the way in (toRequest) and serialises the
 * `Response` back to the Lambda shape on the way out (toLambdaResponse).
 *
 * The handlers/ and lib/ modules use only Web-standard globals (fetch, Request,
 * Response, crypto.subtle, btoa/atob, TextEncoder), all of which the nodejs22.x
 * runtime provides, so they run here without modification. Both are local to
 * this folder - this Lambda is fully self-contained, forked from the ../website
 * worker (e.g. lib/gate.js's public homepage policy diverges). The deploy
 * script bundles them alongside this file.
 *
 * env: on Workers this is a bindings object; here it is process.env. The
 * shared modules already treat env as a plain object for exactly this reason.
 */

import { fetchFromAem } from './handlers/aem.js';
import { createSession, deleteSession } from './handlers/auth.js';
import { readSession, DEFAULT_SESSION_COOKIE_NAME } from './lib/session.js';
import { classifyPublicPath, isPrivateHtml, PUBLIC_FILTER_PATHS } from './lib/gate.js';
import { filterAudienceBlocks } from './lib/audience.js';
import { filterPrivateEntries, compactEntries } from './lib/query-index.js';

const env = process.env;

// Anonymous, cacheable content (public HTML and the filtered query index) gets a
// short shared TTL so a publish becomes visible within a few minutes without push
// invalidation; authenticated/private responses stay no-store. Env-overridable
// (ANON_CACHE_MAX_AGE, seconds; default 300).
const ANON_CACHE_MAX_AGE = (() => {
  const n = Number(env.ANON_CACHE_MAX_AGE);
  return Number.isInteger(n) && n > 0 ? n : 300;
})();

// Cache-Control for a post-filter content response: a short shared TTL for
// anonymous (the body is the public, audience-stripped view, and CloudFront's
// cache key includes spectrum_session so it can never reach an authenticated
// viewer), no-store for authenticated/private. The AEM ETag is deliberately left
// in place so CloudFront's post-TTL revalidation is a cheap conditional 304, not
// a full re-fetch + re-filter. NB: the ETag tracks the AEM page, not this
// filtering code - a change to the filtering/gating logic won't bust already
// cached bodies until the page itself changes, so run a manual CloudFront
// invalidation when deploying such a change (see README "Content caching").
const setContentCacheControl = (resp, authed) => {
  resp.headers.set('cache-control', authed ? 'private, no-store' : `public, max-age=${ANON_CACHE_MAX_AGE}`);
  resp.headers.delete('age');
};

// no-store: many 404s here are gate decisions that vary by viewer (a private
// page, a stripped index), so they must never be reused from a shared cache.
const notFound = () => new Response('Not found', {
  status: 404,
  headers: { 'cache-control': 'no-store' },
});

// The whole /auth/ namespace is claimed here so that nothing under it can
// ever reach the AEM proxy, which would attach the origin credential and
// forward the request body - the IMS access token - upstream. A path that
// is not an exact match for a known endpoint is a 404, not a proxy.
// A Map, not an object literal: the key is a request path, and a plain
// object would resolve '/auth/constructor'-shaped lookups off the prototype.
const AUTH_ENDPOINTS = new Map([
  ['/auth/session', { POST: createSession, DELETE: deleteSession }],
]);

const isAuthPath = (path) => path === '/auth' || path.startsWith('/auth/');

const methodNotAllowed = (methods) => {
  const resp = new Response('Method Not Allowed', { status: 405 });
  resp.headers.set('allow', methods.join(', '));
  return resp;
};

// The per-method dispatch happens here, not inside each handler, so a
// wrong method for this path is answered with every valid method for the
// path - not just the one handler that happened to be looked up.
const handleAuth = (context) => {
  const handlers = AUTH_ENDPOINTS.get(context.url.pathname);
  if (!handlers) { return notFound(); }
  // hasOwnProperty, not a bare lookup: a method like 'constructor' or
  // '__proto__' would otherwise resolve to an Object.prototype member and get
  // called (or crash serialization) instead of answering a clean 405.
  const { method } = context.request;
  const handler = Object.prototype.hasOwnProperty.call(handlers, method)
    ? handlers[method]
    : undefined;
  return handler ? handler(context) : methodNotAllowed(Object.keys(handlers));
};

const ROUTES = [
  // Session cookie endpoint - handled locally, never proxied to AEM
  {
    match: isAuthPath,
    handler: handleAuth,
  },
  // Default AEM handler should be last.
  //
  // cache is false: AEM's edge sends a long CDN-Cache-Control TTL (days)
  // meant to be purged by push-invalidation when content changes. This port
  // does no caching of its own - CloudFront in front of the Function URL is
  // where any edge caching belongs - so it always fetches fresh and lets the
  // CDN policy decide what to store.
  {
    match: () => true,
    handler: fetchFromAem,
    cache: false,
    proxy: true,
  },
];

const getExtension = (path) => {
  const basename = path.split('/').pop();
  const pos = basename.lastIndexOf('.');
  return (basename === '' || pos < 1) ? '' : basename.slice(pos + 1);
};

const isMediaRequest = (url) => /\/media_[0-9a-f]{40,}[/a-zA-Z0-9_-]*\.[0-9a-z]+$/.test(url.pathname);
const isRUMRequest = (url) => /\/\.(rum|optel)\/.*/.test(url.pathname);

const getRUMRequest = (request, url) => {
  if (isRUMRequest(url)) {
    if (!['GET', 'POST', 'OPTIONS'].includes(request.method)) {
      return new Response('Method Not Allowed', { status: 405 });
    }
  }
  return null;
};

const formatSearchParams = (url) => {
  const { search, searchParams } = url;

  if (isMediaRequest(url)) {
    for (const [key] of searchParams.entries()) {
      if (!['format', 'height', 'optimize', 'width'].includes(key)) { searchParams.delete(key); }
    }
  } else if (getExtension(url.pathname) === 'json') {
    for (const [key] of searchParams.entries()) {
      if (!['limit', 'offset', 'sheet'].includes(key)) { searchParams.delete(key); }
    }
  } else {
    url.search = '';
  }
  searchParams.sort();

  // Return original search params
  return search;
};

// Pulls one named value out of the Cookie header. Cookie values here are
// base64url, so a split on the first '=' recovers the value intact.
const readCookie = (request, name) => {
  const header = request.headers.get('cookie');
  if (!header) { return null; }
  for (const part of header.split(';')) {
    const eq = part.indexOf('=');
    if (eq < 0) { continue; }
    if (part.slice(0, eq).trim() === name) { return part.slice(eq + 1).trim(); }
  }
  return null;
};

// A valid session cookie means an authenticated caller. Verification is
// local (HMAC + expiry) - no store, no network - so it is cheap enough to
// run per request.
const isAuthenticated = async (request) => {
  if (!env.SESSION_SECRET) { return false; }
  const cookie = readCookie(request, DEFAULT_SESSION_COOKIE_NAME);
  if (!cookie) { return false; }
  return (await readSession(cookie, env.SESSION_SECRET, Date.now())) !== null;
};

// Post-fetch processing of a proxied HTML page, in two passes that both need
// the body (which lives in the HTML and so can only be inspected after
// proxying):
//   1. Meta gate (anonymous only): a page that opts into privacy with
//      <meta name="audience" content="private"> becomes a 404, indistinguishable
//      from a path that does not exist. Authenticated viewers see it.
//   2. Audience blocks: content blocks the viewer must not see are stripped
//      (audience-private for anonymous, audience-public for authenticated) so
//      private markup never leaves the edge.
// Non-HTML/non-200 responses (assets, redirects, 304, the AEM 404 for a missing
// page) pass through untouched without reading the body. content-length and
// content-encoding are stripped in toLambdaResponse, so re-wrapping the
// already-read body here stays consistent.
const processHtmlResponse = async (resp, authed, pageLike) => {
  const contentType = resp.headers.get('content-type') || '';
  // Revalidation of a cached anonymous page: a 304 carries no body to filter,
  // but its Cache-Control must still be the short anon TTL (not AEM's longer one)
  // so the refreshed edge entry keeps its short lifetime. Only for page-like
  // paths - asset 304s pass through untouched with AEM's own Cache-Control.
  if (resp.status === 304 && pageLike) {
    setContentCacheControl(resp, authed);
    return resp;
  }
  if (resp.status !== 200 || !contentType.includes('text/html')) { return resp; }
  const body = await resp.text();
  if (!authed && isPrivateHtml(body)) { return notFound(); }
  const filtered = filterAudienceBlocks(body, authed);
  const out = new Response(filtered, resp);
  // Filtered per viewer: anonymous gets the public view (short shared TTL),
  // authenticated stays no-store. The cookie-keyed cache keeps them separate.
  setContentCacheControl(out, authed);
  return out;
};

// Post-fetch transform for the query-index JSON: for anonymous visitors strip
// the private rows and the whole `audience` column (so private paths/titles/
// excerpts never reach an anonymous client, and it can't even tell which rows
// were private), and optionally project every row to the columns the site nav
// needs (?compact=true). Fails closed: a non-200, a non-JSON body, or an index
// shape it can't recognize is a 404 for anonymous callers rather than an
// unfiltered index. Authenticated callers see the raw body.
const transformQueryIndex = async (resp, { removePrivate, compact }) => {
  // A 304 (revalidation) has no body to transform; pass it through so CloudFront
  // serves its cached filtered copy. The caller sets Cache-Control.
  if (resp.status === 304) { return resp; }
  if (resp.status !== 200) { return removePrivate ? notFound() : resp; }
  let json;
  try {
    json = await resp.json();
  } catch {
    return removePrivate ? notFound() : resp;
  }
  if (removePrivate) {
    json = filterPrivateEntries(json);
    if (json === null) { return notFound(); }
  }
  if (compact) { json = compactEntries(json); }
  return new Response(JSON.stringify(json), resp);
};

const formatRequest = async (request, url) => {
  const aemUrl = new URL(url.href);

  // ORIGIN overrides the AEM origin (point at a local `aem up` server for dev)
  const origin = env.ORIGIN ? new URL(env.ORIGIN) : null;
  if (origin) {
    aemUrl.protocol = origin.protocol;
    aemUrl.hostname = origin.hostname;
    aemUrl.port = origin.port;
  } else {
    // aem.live (the published tier) by default; set AEM_HOST_SUFFIX=aem.page to
    // proxy the preview tier instead (used by the stage Lambda).
    const aemHostSuffix = env.AEM_HOST_SUFFIX || 'aem.live';
    aemUrl.hostname = `main--${env.AEM_SITE}--${env.AEM_ORG}.${aemHostSuffix}`;
    aemUrl.port = '';
    aemUrl.protocol = 'https:';
  }

  const req = new Request(aemUrl, request);
  // x-forwarded-host tells aem.live the public hostname (for absolute URLs,
  // redirects, sitemaps). Behind CloudFront the request's own Host is the
  // Lambda Function URL, not the public domain, so url.host comes from
  // PUBLIC_HOST (or a CloudFront-set X-Forwarded-Host header) - see toRequest.
  req.headers.set('x-forwarded-host', url.host);

  // The session cookie is the worker's own credential; no upstream (aem.live
  // or a local `aem up`) needs any browser cookie, so drop the whole header
  // rather than leak spectrum_session past the edge.
  req.headers.delete('cookie');

  // The remaining headers are aem.live specific
  if (origin) { return req; }

  // The public CDN in front of this Lambda is CloudFront (the Worker original
  // ran on Cloudflare and sent 'cloudflare'); aem.live keys push-invalidation
  // and forwarded-header handling off this value.
  req.headers.set('x-byo-cdn-type', 'cloudfront');
  if (env.PUSH_INVALIDATION !== 'disabled') {
    req.headers.set('x-push-invalidation', 'enabled');
  }
  // Only allowed requests reach this point (see the gate in route), so the
  // origin credential is attached to what gets proxied upstream. Skip it when
  // unset so a public origin isn't sent a bogus `token undefined` header;
  // set ORIGIN_AUTHENTICATION once the aem.live origin requires it.
  if (env.ORIGIN_AUTHENTICATION) {
    req.headers.set('authorization', `token ${env.ORIGIN_AUTHENTICATION}`);
  }
  return req;
};

// The shared routing/gate/proxy pipeline, identical in spirit to the worker's
// fetch(). Takes a Web Request, returns a Web Response.
const route = async (req) => {
  const url = new URL(req.url);

  const rumResp = getRUMRequest(req, url);
  if (rumResp) { return rumResp; }

  const matched = ROUTES.find((r) => r.match(url.pathname));
  if (!matched) { return notFound(); }

  // Non-proxy routes need the original request, not one rewritten to AEM
  if (!matched.proxy) { return matched.handler({ url, env, request: req }); }

  // Authenticated callers bypass the path gate entirely (verdict 'allow'); auth
  // is computed once here and reused (also by processHtmlResponse). For an
  // anonymous visitor the path verdict decides: 'deny' is a 404 before proxying,
  // so the request never reaches AEM and never gets the origin credential
  // (attached in formatRequest); 'allow'/'gate'/'filter' are proxied and then
  // post-processed below.
  const authed = await isAuthenticated(req);
  const verdict = authed ? 'allow' : classifyPublicPath(url.pathname);
  if (verdict === 'deny') { return notFound(); }

  // Read the compact opt-in before formatSearchParams strips it (it keeps only
  // limit/offset/sheet for JSON) - the query-index transform below reads it.
  const compact = url.searchParams.get('compact') === 'true';

  // Normalize the query string first, then build the upstream request from the
  // normalized url - so the stripping/sorting actually reaches AEM. (formatRequest
  // snapshots url.href, so it must run after formatSearchParams, not before.)
  const savedSearch = formatSearchParams(url);
  const request = await formatRequest(req, url);

  const resp = await matched.handler({
    url, env, request, cache: matched.cache, savedSearch,
  });

  // The query-index JSON is the one 'filter' path: strip audience:private rows
  // (and the audience column) for anonymous visitors and honour ?compact=true
  // for either audience. Authed + non-compact is served untouched (the full
  // index). The anonymous (filtered) response is cacheable with a short shared
  // TTL; the authenticated full index carries private rows and stays no-store.
  if (PUBLIC_FILTER_PATHS.includes(url.pathname)) {
    const out = (!authed || compact)
      ? await transformQueryIndex(resp, { removePrivate: !authed, compact })
      : resp;
    if (out.status === 200 || out.status === 304) {
      setContentCacheControl(out, authed);
    } else {
      // Fail-closed 404 / upstream error: never cache.
      out.headers.set('cache-control', 'no-store');
      out.headers.delete('age');
    }
    return out;
  }

  // Every other proxied HTML page is processed - not just 'gate' pages - so
  // allow-listed content (e.g. the homepage, which carries audience blocks) is
  // filtered too. processHtmlResponse no-ops on non-HTML responses. `pageLike`
  // (anonymous 'gate' verdict) tells it a bodiless 304 is a page revalidation
  // that still needs the short anon TTL, vs an asset 304 (leave AEM's TTL).
  return processHtmlResponse(resp, authed, verdict === 'gate');
};

/*
 * ---- Lambda Function URL (payload format 2.0) adapters ----
 */

// Rebuild a Web Request from the Lambda event. Function URLs carry request
// cookies in event.cookies (not the header map), the method under
// requestContext.http, and a possibly base64-encoded body - each is put back
// where the shared code expects to read it.
const toRequest = (event) => {
  const method = event.requestContext?.http?.method ?? 'GET';

  const headers = new Headers();
  for (const [key, value] of Object.entries(event.headers ?? {})) {
    if (value != null) { headers.set(key, value); }
  }
  // Function URL v2.0 splits Cookie into an array; readCookie / the gate read
  // a single Cookie header, so join it back.
  const cookieHeader = (event.cookies ?? []).join('; ');
  if (cookieHeader) { headers.set('cookie', cookieHeader); }

  // PUBLIC_HOST, when set, is the environment's canonical public host and wins
  // over the request headers - so the worker reports the same public origin no
  // matter which URL reached it (custom domain or the raw *.cloudfront.net one).
  // It drives the x-forwarded-host sent upstream to AEM (absolute URLs,
  // redirects, sitemap) and the CSRF origin-check fallback. A scheme/path is
  // tolerated but stripped; falls back to the forwarded/Host header, then the
  // Function URL host.
  const publicHost = env.PUBLIC_HOST?.replace(/^https?:\/\//, '').replace(/\/.*$/, '');
  const host = publicHost
    || headers.get('x-forwarded-host')
    || headers.get('host')
    || event.requestContext?.domainName
    || 'localhost';
  const proto = headers.get('x-forwarded-proto') ?? 'https';
  const query = event.rawQueryString ? `?${event.rawQueryString}` : '';
  const requestUrl = `${proto}://${host}${event.rawPath ?? '/'}${query}`;

  let body;
  if (event.body != null && method !== 'GET' && method !== 'HEAD') {
    body = event.isBase64Encoded ? Buffer.from(event.body, 'base64') : event.body;
  }

  return new Request(requestUrl, { method, headers, body });
};

// A Lambda Function URL response is buffered, not streamed: the whole body is
// base64'd into a single JSON payload capped at 6 MB. Base64 inflates ~33% and
// the headers/cookies share the budget, so refuse a body whose encoded size
// would blow the cap rather than let the platform truncate it into a corrupt
// reply. Assets this large should be served off a path that does not transit
// this Lambda. Margin left for the response envelope.
const MAX_LAMBDA_BODY_BASE64_BYTES = 6 * 1024 * 1024 - 256 * 1024;

// Hop-by-hop and length/encoding headers describe the upstream transfer, not
// ours: fetch() already decoded any content-encoding when we read the body, so
// re-advertising it (or a now-wrong content-length) would corrupt the reply.
const STRIPPED_RESPONSE_HEADERS = new Set([
  'content-encoding',
  'content-length',
  'transfer-encoding',
  'connection',
  'keep-alive',
]);

// Serialise a Web Response into the Function URL response shape. Set-Cookie
// goes in the dedicated `cookies` array (Function URLs drop set-cookie from
// the header map), and the body is always base64 so binary AEM content
// (images, fonts) survives the JSON round-trip intact.
const toLambdaResponse = async (response) => {
  const headers = {};
  for (const [key, value] of response.headers.entries()) {
    if (key === 'set-cookie') { continue; }
    if (STRIPPED_RESPONSE_HEADERS.has(key)) { continue; }
    headers[key] = value;
  }

  const cookies = typeof response.headers.getSetCookie === 'function'
    ? response.headers.getSetCookie()
    : [];

  const buffer = Buffer.from(await response.arrayBuffer());
  const body = buffer.length ? buffer.toString('base64') : '';

  if (body.length > MAX_LAMBDA_BODY_BASE64_BYTES) {
    console.error(`website-lambda: response body ${buffer.length} bytes exceeds the Function URL payload limit; refusing to truncate`);
    return {
      statusCode: 502,
      headers: { 'content-type': 'text/plain; charset=utf-8', 'cache-control': 'no-store' },
      body: 'Response too large',
      isBase64Encoded: false,
    };
  }

  return {
    statusCode: response.status,
    headers,
    cookies,
    body,
    isBase64Encoded: buffer.length > 0,
  };
};

export const handler = async (event) => {
  try {
    const response = await route(toRequest(event));
    return await toLambdaResponse(response);
  } catch (err) {
    // A throw that escapes the pipeline is a bug or an upstream failure, not
    // a caller error - answer 500 without leaking internals, and log for
    // CloudWatch.
    console.error('Unhandled error in website-lambda handler:', err);
    return {
      statusCode: 500,
      headers: { 'content-type': 'text/plain; charset=utf-8', 'cache-control': 'no-store' },
      body: 'Internal Server Error',
      isBase64Encoded: false,
    };
  }
};
