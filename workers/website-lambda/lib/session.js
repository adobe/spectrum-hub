/*
 * Pure session logic. No Request, Response, fetch, or platform bindings —
 * this module must run unchanged on Workers, Lambda, and I/O Runtime.
 */

export const DEFAULT_MAX_AGE_MS = 86400000;
export const DEFAULT_SESSION_COOKIE_NAME = 'spectrum_session';

// A non-HttpOnly companion to the session cookie, set and cleared in lockstep
// with it. The real session cookie is HttpOnly, so browser JS cannot observe
// whether it exists; this readable hint lets the client detect the live
// session (and its expiry) without a stale localStorage proxy drifting out of
// sync. It carries only the public clamped expiry - no token, no email - and
// the server never trusts it for gating (that reads the signed cookie only).
export const DEFAULT_SESSION_HINT_COOKIE_NAME = 'spectrum_session_active';

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

// HMACs an arbitrary string so a later gating pass can trust the cookie's
// contents locally, without re-deriving them from wherever they came from.
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

// Inverse of base64urlEncode. atob throws on input that is not valid
// base64, which every caller here treats as a verification failure.
export const base64urlDecode = (value) => {
  const b64 = value.replace(/-/g, '+').replace(/_/g, '/');
  const padded = b64.padEnd(Math.ceil(b64.length / 4) * 4, '=');
  const binary = atob(padded);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) { bytes[i] = binary.charCodeAt(i); }
  return bytes;
};

// The read side of signToken, for the gating pass: recomputes the HMAC over
// the payload and lets crypto.subtle.verify do the constant-time compare.
// Returns the original signed string (the JSON claims blob) on success, or
// null on any failure - wrong shape, bad base64, or a signature that does
// not match the secret. A value is `base64url(token).base64url(hmac)`, so a
// genuine value carries exactly one '.'.
export const verifySignedToken = async (signed, secret) => {
  if (typeof signed !== 'string' || typeof secret !== 'string' || secret === '') { return null; }
  const dot = signed.indexOf('.');
  if (dot < 1 || dot !== signed.lastIndexOf('.')) { return null; }
  const payload = signed.slice(0, dot);
  const encoder = new TextEncoder();
  try {
    const key = await crypto.subtle.importKey(
      'raw',
      encoder.encode(secret),
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['verify'],
    );
    const signature = base64urlDecode(signed.slice(dot + 1));
    const ok = await crypto.subtle.verify('HMAC', key, signature, encoder.encode(payload));
    if (!ok) { return null; }
    return new TextDecoder().decode(base64urlDecode(payload));
  } catch {
    return null;
  }
};

// Verifies a cookie value and confirms it has not outlived the IMS token's
// own expiry, returning the decoded claims ({ email, created_at, expires_in })
// or null. `now` is passed in rather than read here so the module stays pure.
// The browser's own Max-Age already deletes the cookie on schedule; this
// second check bounds replay of a captured value to the token's natural life.
export const readSession = async (signed, secret, now) => {
  const decoded = await verifySignedToken(signed, secret);
  if (decoded === null) { return null; }
  let claims;
  try { claims = JSON.parse(decoded); } catch { return null; }
  const expiresAt = deriveExpiry(claims);
  if (expiresAt === null || now >= expiresAt) { return null; }
  return claims;
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

  // "token" is whatever the caller wants signed into the cookie - a
  // minted claims blob today, an opaque bearer token before that. This
  // module signs strings; it does not know or care what they represent.
  const token = body?.token;
  if (typeof token !== 'string' || token === '') {
    return fail(400, 'token is required');
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

  const maxAgeSeconds = Math.floor((expiresAt - now) / 1000);

  const sessionCookie = serializeCookie(sessionName, signed, {
    maxAgeSeconds,
    httpOnly: true,
    secure: config.secure,
  });

  if (new TextEncoder().encode(sessionCookie).length > MAX_COOKIE_BYTES) {
    return fail(413, 'session cookie exceeds the 4096 byte browser limit');
  }

  // Readable companion, same lifetime and Secure flag but NOT HttpOnly. Its
  // value is the clamped expiry so the client can tell both that a session
  // exists and when to refresh it, all from document.cookie.
  const hintCookie = serializeCookie(DEFAULT_SESSION_HINT_COOKIE_NAME, String(expiresAt), {
    maxAgeSeconds,
    httpOnly: false,
    secure: config.secure,
  });

  // expiresAt is the clamped value, not whatever the token itself claims -
  // it is what the cookie's own Max-Age is actually good for, so a caller
  // that wants to tell the client when to expect sign-out needs this one,
  // not deriveExpiry's unclamped result.
  return { cookies: [sessionCookie, hintCookie], expiresAt };
};
