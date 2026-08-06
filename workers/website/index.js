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

import { fetchFromAem } from './handlers/aem.js';
import { createSession, deleteSession } from './handlers/auth.js';

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
  // // Handle drafts
  // {
  //   match: (path) => path.startsWith('/drafts'),
  //   handler: () => new Response('Not found - drafts are denied on production.', { status: 404 }),
  // },
  // Default AEM handler should be last
  //
  // cache is false: AEM's edge sends a long CDN-Cache-Control TTL (days)
  // that's meant to be purged by push-invalidation when content changes,
  // but that purge only reaches Cloudflare zones registered with AEM. This
  // worker isn't bound to one (workers.dev has no zone AEM can purge), so
  // cacheEverything would just serve stale content for the full TTL with
  // no way to invalidate it. Flip back to true once this is on a real
  // domain with push-invalidation wired up on the AEM side.
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

const getPortRedirect = (request, url) => {
  if (url.port && url.hostname !== 'localhost') {
    const redirectTo = new URL(request.url);
    redirectTo.port = '';
    return new Response(`Moved permanently to ${redirectTo.href}`, {
      status: 301,
      headers: { location: redirectTo.href },
    });
  }
  return null;
};

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

const getValidLogin = async (env, request, url) => {
  const { pathname } = url;
  if (pathname.endsWith('.css') || pathname.endsWith('.js')) { return true; }
  return true;
};

const formatRequest = async (env, request, url) => {
  const aemUrl = new URL(url.href);

  // ORIGIN overrides the AEM origin (set in [env.dev] to proxy a local `aem up` server)
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
  req.headers.set('x-forwarded-host', req.headers.get('host'));

  // The remaining headers are aem.live specific
  if (origin) { return req; }

  req.headers.set('x-byo-cdn-type', 'cloudflare');
  if (env.PUSH_INVALIDATION !== 'disabled') {
    req.headers.set('x-push-invalidation', 'enabled');
  }
  const validLogin = await getValidLogin(env, request, url);
  if (validLogin) {
    req.headers.set('authorization', `token ${env.ORIGIN_AUTHENTICATION}`);
  }
  return req;
};

export default {
  async fetch(req, env) {
    const url = new URL(req.url);

    const portResp = getPortRedirect(req, url);
    if (portResp) { return portResp; }

    const rumResp = getRUMRequest(req, url);
    if (rumResp) { return rumResp; }

    const route = ROUTES.find((r) => r.match(url.pathname));
    if (!route) { return notFound(); }

    // Non-proxy routes need the original request, not one rewritten to AEM
    if (!route.proxy) { return route.handler({ url, env, request: req }); }

    const request = await formatRequest(env, req, url);

    const savedSearch = formatSearchParams(url);

    return route.handler({
      url, env, request, cache: route.cache, savedSearch,
    });
  },
};
