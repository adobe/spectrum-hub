/*
 * Pure session logic. No Request, Response, fetch, or platform bindings —
 * this module must run unchanged on Workers, Lambda, and I/O Runtime.
 */

export const DEFAULT_MAX_AGE_MS = 86400000;
export const DEFAULT_SESSION_COOKIE_NAME = 'spectrum_session';

// A session with under a second left would be issued with Max-Age=0, which
// the browser deletes on arrival. Refuse it rather than emit a cookie that
// is already dead.
export const MIN_LIFETIME_MS = 1000;

// Number(x) on a non-numeric or empty override coerces to NaN, which would
// otherwise slip past the expiry guard (Math.min with NaN, NaN <= now is
// false) and produce a Max-Age=NaN cookie the browser silently discards.
// This lives here rather than in the adapter so every platform port
// inherits the validation instead of re-deriving it.
export const durationMs = (value, fallback) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
};

const cookieName = (value, fallback) => (
  typeof value === 'string' && value !== '' ? value : fallback
);

// Number('') and Number('  ') are 0, which would silently produce a valid
// expiry from an empty field. Reject non-numeric input explicitly instead.
const toNumber = (value) => {
  if (typeof value === 'number') { return value; }
  if (typeof value !== 'string' || value.trim() === '') { return NaN; }
  return Number(value);
};

// IMS sends created_at as epoch ms and expires_in as a duration in ms,
// both as strings. There is no absolute expiry field.
export const deriveExpiry = (body) => {
  if (!body || typeof body !== 'object') { return null; }
  const createdAt = toNumber(body.created_at);
  const expiresIn = toNumber(body.expires_in);
  if (!Number.isFinite(createdAt) || !Number.isFinite(expiresIn)) { return null; }
  return createdAt + expiresIn;
};

export const clampExpiry = (expiresAt, now, maxAgeMs) => Math.min(expiresAt, now + maxAgeMs);

export const base64urlEncode = (bytes) => {
  let binary = '';
  for (const byte of bytes) { binary += String.fromCharCode(byte); }
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
};

// The IMS JWT carries its own signature; this HMAC is a second, independent
// layer so a later gating pass can trust the cookie locally.
export const signToken = async (token, secret) => {
  const encoder = new TextEncoder();
  const payload = base64urlEncode(encoder.encode(token));
  const key = await crypto.subtle.importKey(
    'raw',
    encoder.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  );
  const signature = await crypto.subtle.sign('HMAC', key, encoder.encode(payload));
  return `${payload}.${base64urlEncode(new Uint8Array(signature))}`;
};

// Browsers cap a single cookie at 4096 bytes and silently drop anything
// larger, so an oversized token must be an explicit error instead.
export const MAX_COOKIE_BYTES = 4096;

export const serializeCookie = (name, value, {
  maxAgeSeconds,
  httpOnly = false,
  secure = true,
  sameSite = 'Lax',
  path = '/',
}) => {
  const parts = [`${name}=${value}`, `Path=${path}`, `SameSite=${sameSite}`, `Max-Age=${maxAgeSeconds}`];
  if (secure) { parts.push('Secure'); }
  if (httpOnly) { parts.push('HttpOnly'); }
  return parts.join('; ');
};

const fail = (status, message) => ({ error: { status, message } });

export const createSessionCookies = async ({ body, now, config }) => {
  // Defence in depth for platform ports: an empty secret would otherwise
  // throw DataError out of crypto.subtle.importKey rather than surfacing as
  // a controlled response.
  const secret = config?.secret;
  if (typeof secret !== 'string' || secret === '') {
    return fail(500, 'session signing is not configured');
  }

  const maxAgeMs = durationMs(config?.maxAgeMs, DEFAULT_MAX_AGE_MS);
  const sessionName = cookieName(config?.sessionCookieName, DEFAULT_SESSION_COOKIE_NAME);

  const token = body?.access_token;
  if (typeof token !== 'string' || token === '') {
    return fail(400, 'access_token is required');
  }

  const derived = deriveExpiry(body);
  if (derived === null) {
    return fail(400, 'created_at and expires_in must be numeric');
  }

  const expiresAt = clampExpiry(derived, now, maxAgeMs);
  if (expiresAt - now < MIN_LIFETIME_MS) {
    return fail(400, 'session has already expired or has under a second left');
  }

  const signed = await signToken(token, secret);

  const sessionCookie = serializeCookie(sessionName, signed, {
    maxAgeSeconds: Math.floor((expiresAt - now) / 1000),
    httpOnly: true,
    secure: config.secure,
  });

  if (new TextEncoder().encode(sessionCookie).length > MAX_COOKIE_BYTES) {
    return fail(413, 'session cookie exceeds the 4096 byte browser limit');
  }

  // expiresAt is the clamped value, not whatever the token itself claims -
  // it is what the cookie's own Max-Age is actually good for, so a caller
  // that wants to tell the client when to expect sign-out needs this one,
  // not deriveExpiry's unclamped result.
  return { cookies: [sessionCookie], expiresAt };
};
