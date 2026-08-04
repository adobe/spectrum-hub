import {
  createSessionCookies,
  durationMs,
  DEFAULT_MAX_AGE_MS,
  DEFAULT_SESSION_COOKIE_NAME,
} from '../lib/session.js';

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

  const result = await createSessionCookies({
    body,
    now: Date.now(),
    config: configFromEnv(env, url),
  });

  if (result.error) {
    return problem(result.error.status, result.error.message);
  }

  const headers = new Headers({ 'cache-control': 'no-store' });
  for (const cookie of result.cookies) { headers.append('set-cookie', cookie); }
  return new Response(null, { status: 204, headers });
};
