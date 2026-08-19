import {
  createSessionCookies,
  serializeCookie,
  durationMs,
  DEFAULT_MAX_AGE_MS,
  DEFAULT_SESSION_COOKIE_NAME,
  DEFAULT_SESSION_HINT_COOKIE_NAME,
} from '../lib/session.js';
import { decodeJwt } from '../lib/jwt.js';

// Not a secret - a public OAuth client_id, same one scripts/utils/ims.js
// uses to sign in. IMS's profile endpoint requires it on every call. This
// is distinct from env.IMS_CLIENT_ID, which is the confidential service
// credential used below to mint a client_credentials token for DA.
const IMS_CLIENT_ID = 'spectrumhub';

const IMS_PROFILE_URL = {
  dev: 'https://ims-na1-stg1.adobelogin.com/ims/profile/v1',
  stage: 'https://ims-na1-stg1.adobelogin.com/ims/profile/v1',
  prod: 'https://ims-na1.adobelogin.com/ims/profile/v1',
};

// client_credentials endpoint for the DA service token. dev and stage share
// the stg1 host, matching IMS_PROFILE_URL and scripts/utils/ims.js.
const IMS_TOKEN_URL = {
  dev: 'https://ims-na1-stg1.adobelogin.com/ims/token/v3',
  stage: 'https://ims-na1-stg1.adobelogin.com/ims/token/v3',
  prod: 'https://ims-na1.adobelogin.com/ims/token/v3',
};

// Where the visitor allowlist lives. admin.da.live keys config by org/site,
// the same two values the AEM proxy already uses.
const daConfigUrl = (env) => `https://admin.da.live/config/${env.AEM_ORG}/${env.AEM_SITE}/`;

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

// Lets IMS itself decide whether the token is real, instead of checking a
// signature locally: a 401/403 here means IMS rejected it, which this
// worker has no need to second-guess. Anything else non-2xx is IMS having
// a problem, not proof of a forged token, so it is surfaced separately
// (see the try/catch at the call site) rather than folded into "rejected".
const fetchImsProfile = async (token, imsEnv) => {
  const base = IMS_PROFILE_URL[imsEnv] ?? IMS_PROFILE_URL.prod;
  const resp = await fetch(`${base}?client_id=${IMS_CLIENT_ID}`, {
    headers: { authorization: `Bearer ${token}` },
  });
  if (resp.status === 401 || resp.status === 403) { return { rejected: true }; }
  if (!resp.ok) { throw new Error(`IMS profile request failed with status ${resp.status}`); }
  return { rejected: false, profile: await resp.json() };
};

// A client_credentials token for this worker's own service identity - not
// the visitor's token. It authorizes the DA config read below and is never
// stored or handed back to the client. Scopes may be comma- or
// space-separated in config; IMS wants commas, so whitespace is stripped.
const fetchServiceToken = async (env, imsEnv) => {
  const url = IMS_TOKEN_URL[imsEnv] ?? IMS_TOKEN_URL.prod;
  const resp = await fetch(url, {
    method: 'POST',
    headers: { 'content-type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'client_credentials',
      client_id: env.IMS_CLIENT_ID,
      client_secret: env.IMS_CLIENT_SECRET,
      scope: (env.IMS_SCOPE ?? '').replace(/\s+/g, ''),
    }),
  });
  if (!resp.ok) { throw new Error(`IMS token request failed with status ${resp.status}`); }
  const token = (await resp.json())?.access_token;
  if (typeof token !== 'string' || token === '') {
    throw new Error('IMS token response carried no access_token');
  }
  return token;
};

// Reads the DA config with a freshly minted service token and returns the
// raw visitor rows (visitors.data). A throw here means "could not decide" -
// the caller must fail closed, never mint a cookie on an unresolved check.
const fetchVisitorAllowlist = async (env, imsEnv) => {
  const token = await fetchServiceToken(env, imsEnv);
  const resp = await fetch(daConfigUrl(env), {
    headers: { authorization: `Bearer ${token}` },
  });
  if (!resp.ok) { throw new Error(`DA config request failed with status ${resp.status}`); }
  const rows = (await resp.json())?.visitors?.data;
  return Array.isArray(rows) ? rows : [];
};

// An entry is either a full address (exact match) or a leading-'@' domain
// wildcard, e.g. "@adobe.com" allows anyone at adobe.com. All comparison is
// case-insensitive. An empty or malformed row never matches, so a config
// with no usable rows denies everyone - fail closed by construction.
const isVisitorAllowed = (email, rows) => {
  const normalized = email.trim().toLowerCase();
  const at = normalized.lastIndexOf('@');
  const domain = at >= 0 ? normalized.slice(at) : '';
  return rows.some((row) => {
    const entry = typeof row?.email === 'string' ? row.email.trim().toLowerCase() : '';
    if (entry === '') { return false; }
    return entry.startsWith('@') ? entry === domain : entry === normalized;
  });
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

  // The service credential is required to read the visitor allowlist. A
  // missing one is a deploy mistake, not a caller error - surface it as 500
  // rather than letting it collapse into the 502 "DA unreachable" path.
  if (!env.IMS_CLIENT_ID || !env.IMS_CLIENT_SECRET || !env.IMS_SCOPE) {
    return problem(500, 'Visitor authorization is not configured');
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

  // Verify the caller's token against IMS first, before spending a service
  // token on the DA lookup. The DA read is deliberately gated behind a
  // successful profile call so IMS acts as the rate limiter: an invalid or
  // spoofed token never reaches DA, no matter how often it is retried.
  const imsEnv = env.IMS_ENV ?? 'prod';
  let outcome;
  try {
    outcome = await fetchImsProfile(token, imsEnv);
  } catch {
    // A network failure or an IMS 5xx is not the caller's fault, and is not
    // the same as a forged token - a client retry has a real chance of
    // succeeding, so this must not collapse into the 401 case below.
    return problem(502, 'Unable to verify access_token against IMS');
  }
  if (outcome.rejected) {
    return problem(401, 'access_token was rejected by IMS');
  }

  // created_at/expires_in are the JWT's own claims, read without checking
  // a signature - safe here specifically because IMS's 200 above already
  // vouched for this exact token. email comes from the profile response:
  // the one thing the JWT never carries, and the reason this worker asks
  // IMS at all rather than just decoding the token itself.
  const email = outcome.profile?.email;
  const decoded = decodeJwt(token);
  if (typeof email !== 'string' || email === '' || !decoded) {
    return problem(502, 'IMS returned a token or profile this worker could not use');
  }

  // Authorization, distinct from the authentication above: IMS proved who
  // this is, DA decides whether they may in. Only reached once the token is
  // known good. Fail closed - a cookie is only ever minted for an email (or
  // its domain) present in the allowlist, and an unreachable DA is a 502,
  // never an admit.
  let allowlist;
  try {
    allowlist = await fetchVisitorAllowlist(env, imsEnv);
  } catch {
    return problem(502, 'Unable to verify access against DA');
  }
  if (!isVisitorAllowed(email, allowlist)) {
    return problem(403, 'Not authorized');
  }

  const claims = {
    email,
    created_at: decoded.payload?.created_at,
    expires_in: decoded.payload?.expires_in,
  };

  const result = await createSessionCookies({
    body: { token: JSON.stringify(claims), ...claims },
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
  // learns it - and it is safe to state, unlike a client-asserted value
  // would be, because it is read from a token IMS just vouched for, not
  // asserted by whoever is calling this endpoint.
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
  const secure = url.protocol === 'https:';
  const cookie = serializeCookie(DEFAULT_SESSION_COOKIE_NAME, '', {
    maxAgeSeconds: 0,
    httpOnly: true,
    secure,
  });
  // Clear the readable companion in lockstep so the client stops believing a
  // session exists.
  const hintCookie = serializeCookie(DEFAULT_SESSION_HINT_COOKIE_NAME, '', {
    maxAgeSeconds: 0,
    httpOnly: false,
    secure,
  });

  const headers = new Headers({ 'cache-control': 'no-store' });
  headers.append('set-cookie', cookie);
  headers.append('set-cookie', hintCookie);
  return new Response(null, { status: 204, headers });
};
