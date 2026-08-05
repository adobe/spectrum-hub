import {
  createSessionCookies,
  serializeCookie,
  durationMs,
  DEFAULT_MAX_AGE_MS,
  DEFAULT_SESSION_COOKIE_NAME,
} from '../lib/session.js';
import { decodeJwt, verifyJwt } from '../lib/jwt.js';
import { getJwk } from './jwks.js';

// Config is a plain object, never a Cloudflare binding, so process.env
// serves the Lambda and I/O Runtime ports without code changes. Everything
// here except url.protocol is the lib's own policy, deliberately: URL is
// platform surface and must not leak into the pure module.
const configFromEnv = (env, url) => ({
  secret: env.SESSION_SECRET,
  maxAgeMs: durationMs(env.SESSION_MAX_AGE_MS, DEFAULT_MAX_AGE_MS),
  sessionCookieName: DEFAULT_SESSION_COOKIE_NAME,
  secure: url.protocol === 'https:',
});

// Browsers send a normalized Origin: lowercase, no trailing slash. Match
// that shape on both sides so a hand-written env entry still compares.
const normalizeOrigin = (value) => value.trim().replace(/\/+$/, '').toLowerCase();

// Blunts session fixation, where an attacker makes a victim's browser
// adopt an attacker-controlled session.
const isAllowedOrigin = (request, url, env) => {
  const origin = request.headers.get('origin');
  if (!origin) { return false; }
  const configured = (env.ALLOWED_ORIGINS ?? '')
    .split(',')
    .map(normalizeOrigin)
    .filter((value) => value !== '');
  // An all-whitespace ALLOWED_ORIGINS must mean "unset", not "allow nothing".
  const allowed = configured.length > 0 ? configured : [normalizeOrigin(url.origin)];
  return allowed.includes(normalizeOrigin(origin));
};

// no-store: this endpoint mints credentials and sits behind a CDN.
const problem = (status, message) => new Response(message, {
  status,
  headers: {
    'content-type': 'text/plain; charset=utf-8',
    'cache-control': 'no-store',
  },
});

// Confirms the token was actually issued by IMS rather than just shaped
// like one, and hands back its verified claims. A bad kid or a signature
// that does not match is the same "no" as a token that is not a JWT at
// all - none of these are worth distinguishing to the caller. Returning
// the decoded payload (rather than a boolean) lets the caller trust
// created_at/expires_in straight out of it instead of asking the client
// to repeat them, unverified, alongside the token.
const verifyAccessToken = async (token, imsEnv) => {
  const decoded = decodeJwt(token);
  if (!decoded) { return null; }
  const jwk = await getJwk(imsEnv, decoded.header?.kid);
  if (!jwk) { return null; }
  return (await verifyJwt(decoded, jwk)) ? decoded : null;
};

export const createSession = async ({ url, env, request }) => {
  if (request.method !== 'POST') {
    const resp = problem(405, 'Method Not Allowed');
    resp.headers.set('allow', 'POST');
    return resp;
  }

  if (!isAllowedOrigin(request, url, env)) {
    return problem(403, 'Forbidden');
  }

  if (!env.SESSION_SECRET) {
    return problem(500, 'Session signing is not configured');
  }

  let body;
  try {
    body = await request.json();
  } catch {
    return problem(400, 'Request body must be valid JSON');
  }

  const token = body?.access_token;
  if (typeof token !== 'string' || token === '') {
    return problem(400, 'access_token is required');
  }

  let decoded;
  try {
    decoded = await verifyAccessToken(token, env.IMS_ENV ?? 'prod');
  } catch {
    // A network failure reaching IMS is not the caller's fault, and is not
    // the same as a forged token - a client retry has a real chance of
    // succeeding, so this must not collapse into the 401 case below.
    return problem(502, 'Unable to verify access_token against IMS');
  }
  if (!decoded) {
    return problem(401, 'access_token failed signature verification');
  }

  // created_at/expires_in come from the verified JWT payload, not the
  // request body: IMS embeds them as literal claims, and trusting the
  // client to also state them separately would only be verifying the
  // token while still taking its expiry on faith.
  const result = await createSessionCookies({
    body: { access_token: token, ...decoded.payload },
    now: Date.now(),
    config: configFromEnv(env, url),
  });

  if (result.error) {
    return problem(result.error.status, result.error.message);
  }

  const headers = new Headers({
    'cache-control': 'no-store',
    'content-type': 'application/json; charset=utf-8',
  });
  for (const cookie of result.cookies) { headers.append('set-cookie', cookie); }
  // The cookie's own expiry is unreadable to the client: Set-Cookie is a
  // forbidden response header for fetch, and HttpOnly hides it from
  // document.cookie too. Stating it here is the only way the client
  // learns it - and it is safe to state, unlike the body fields this
  // replaced, because it is read from the verified JWT, not asserted by
  // whoever is calling this endpoint.
  return new Response(JSON.stringify({ expiresAt: result.expiresAt }), { status: 200, headers });
};

// The counterpart to createSession: makes sign-out mean something
// server-side instead of only clearing IMS's own client-side state. This
// clears the cookie in the caller's browser; there is no server-side
// session store, so it does not revoke the underlying credential (see
// SESSION_SECRET in wrangler.toml for the only lever that does).
export const deleteSession = async ({ url, env, request }) => {
  if (request.method !== 'DELETE') {
    const resp = problem(405, 'Method Not Allowed');
    resp.headers.set('allow', 'DELETE');
    return resp;
  }

  if (!isAllowedOrigin(request, url, env)) {
    return problem(403, 'Forbidden');
  }

  // Path and SameSite must match the cookie that createSession set, or the
  // browser treats this as an unrelated cookie and never clears the real one.
  const cookie = serializeCookie(DEFAULT_SESSION_COOKIE_NAME, '', {
    maxAgeSeconds: 0,
    httpOnly: true,
    secure: url.protocol === 'https:',
  });

  const headers = new Headers({ 'cache-control': 'no-store' });
  headers.append('set-cookie', cookie);
  return new Response(null, { status: 204, headers });
};
