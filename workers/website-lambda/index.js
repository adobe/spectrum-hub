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
import { classifyPublicPath } from './lib/gate.js';

const env = process.env;

const notFound = () => new Response('Not found', { status: 404 });

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
  const handler = handlers[context.request.method];
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

// The access gate. Public resources are served to anyone, so their check is
// first and avoids the crypto for the common case (css/js/img/media).
// Everything else requires a valid session; without one it is a 404 -
// deliberately indistinguishable from a path that does not exist.
const isAllowed = async (request, url) => {
  if (classifyPublicPath(url.pathname) === 'allow') { return true; }
  return isAuthenticated(request);
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
    aemUrl.hostname = `main--${env.AEM_SITE}--${env.AEM_ORG}.aem.live`;
    aemUrl.port = '';
    aemUrl.protocol = 'https:';
  }

  const req = new Request(aemUrl, request);
  // x-forwarded-host tells aem.live the public hostname (for absolute URLs,
  // redirects, sitemaps). Behind CloudFront the request's own Host is the
  // Lambda Function URL, not the public domain - url.host already resolves to
  // the CloudFront-sent X-Forwarded-Host when that origin custom header is
  // configured, falling back to the Function URL host otherwise.
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

  // Gate before proxying: a denied request never reaches AEM, and never
  // has the origin credential attached (that happens in formatRequest).
  if (!(await isAllowed(req, url))) { return notFound(); }

  const request = await formatRequest(req, url);
  const savedSearch = formatSearchParams(url);

  return matched.handler({
    url, env, request, cache: matched.cache, savedSearch,
  });
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

  const host = headers.get('x-forwarded-host')
    ?? headers.get('host')
    ?? event.requestContext?.domainName
    ?? 'localhost';
  const proto = headers.get('x-forwarded-proto') ?? 'https';
  const query = event.rawQueryString ? `?${event.rawQueryString}` : '';
  const requestUrl = `${proto}://${host}${event.rawPath ?? '/'}${query}`;

  let body;
  if (event.body != null && method !== 'GET' && method !== 'HEAD') {
    body = event.isBase64Encoded ? Buffer.from(event.body, 'base64') : event.body;
  }

  return new Request(requestUrl, { method, headers, body });
};

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

  return {
    statusCode: response.status,
    headers,
    cookies,
    body: buffer.length ? buffer.toString('base64') : '',
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
