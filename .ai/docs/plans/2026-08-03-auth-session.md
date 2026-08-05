# `/auth/session` Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a `POST /auth/session` endpoint to the Cloudflare Worker that persists an Adobe IMS token response as two cookies — an httpOnly signed session cookie and a client-readable expiry hint cookie.

**Architecture:** All session logic lives in a pure module (`website/lib/session.js`) that takes plain data and returns plain data — no `Request`, no `Response`, no `fetch`, no platform bindings. A thin Workers adapter (`website/handlers/auth.js`) translates HTTP to that module. `website/index.js` is restructured so route matching happens *before* the AEM request rewrite, which is what makes non-proxy routes possible at all.

**Tech Stack:** JavaScript (ESM), Cloudflare Workers / wrangler 4, Web Crypto API (`crypto.subtle`), vitest.

**Spec:** `docs/superpowers/specs/2026-08-03-auth-session-design.md`

## Global Constraints

These apply to every task. Read them before writing any code.

- **Portability is the hard constraint.** This Worker will later run as an AWS Lambda function and possibly an Adobe I/O Runtime action. No Cloudflare-specific APIs anywhere in this feature: no KV, no `caches.default`, no `cf` request object, no Cloudflare bindings.
- **`website/lib/session.js` must stay pure.** No `Request`, `Response`, `fetch`, `URL`, or `env`. It takes plain objects and returns plain objects. This is the file that survives the port unchanged.
- **Crypto is Web Crypto only** — `crypto.subtle`, available identically in Workers, Node 18+, and I/O Runtime. No `node:crypto` imports.
- **Configuration arrives as a plain object argument**, never as a Cloudflare binding, so `process.env` works on the other platforms without code changes.
- **Cookie names:** session `spectrum_session`, hint `spectrum_session_exp`. Exact strings.
- **`expires_in` from IMS is in MILLISECONDS**, not the seconds OAuth conventionally uses. `created_at` and `expires_in` both arrive as **strings**.
- **Defaults:** `SESSION_MAX_AGE_MS` = `86400000` (24h). `SESSION_HINT_MAX_AGE_MS` = `31536000000` (365 days).
- **The Worker must never read the hint cookie.** It is client-writable and therefore untrustworthy. It is written, never consulted.
- Code style follows the existing codebase: 2-space indent, semicolons, arrow-function consts, single-line `if (x) { return y; }` guards.
- Work happens on the existing `feat/auth-session-cookie` branch.

---

## File Structure

| File | Responsibility |
| --- | --- |
| `website/lib/session.js` | **Create.** Pure session logic: expiry derivation, clamping, HMAC signing, cookie serialization, assembly. |
| `website/lib/session.test.js` | **Create.** Tests for the pure module. The bulk of the coverage lives here. |
| `website/handlers/auth.js` | **Create.** Workers adapter: method check, origin check, JSON parse, config from env, `Response` construction. |
| `website/handlers/auth.test.js` | **Create.** Adapter-level tests: method rejection, malformed JSON, origin rejection. |
| `website/index.js` | **Modify.** Move route matching above `formatRequest`; add the `/auth/session` route. |
| `website/package.json` | **Modify.** Add `"type": "module"`, vitest dev dependency, real `test` script. |
| `website/wrangler.toml` | **Modify.** Add session config vars. |

Task order follows the dependency chain: pure helpers, then crypto, then assembly, then the adapter, then wiring.

---

### Task 1: Test harness and expiry derivation

Sets up vitest and implements the two smallest pure functions. The harness is folded in here rather than made its own task because it has no independently reviewable deliverable.

**Files:**
- Modify: `website/package.json`
- Create: `website/lib/session.js`
- Test: `website/lib/session.test.js`

**Interfaces:**
- Consumes: nothing.
- Produces:
  - `deriveExpiry(body) -> number | null` — absolute epoch ms, or `null` if `created_at`/`expires_in` are unusable.
  - `clampExpiry(expiresAt, now, maxAgeMs) -> number`
  - `DEFAULT_MAX_AGE_MS`, `DEFAULT_HINT_MAX_AGE_MS` constants.

- [ ] **Step 1: Install vitest**

```bash
cd website && npm install -D vitest
```

- [ ] **Step 2: Configure package.json**

Set `"type": "module"` so vitest parses the existing `import`/`export` syntax as ESM, and replace the stub test script. Edit `website/package.json`:

```json
{
  "name": "website",
  "version": "1.0.0",
  "description": "",
  "main": "index.js",
  "type": "module",
  "scripts": {
    "dev": "wrangler dev --env dev",
    "test": "vitest run",
    "deploy:prod": "wrangler deploy --env=\"\"",
    "deploy:stage": "wrangler deploy --env stage"
  },
  "author": "",
  "license": "Apache-2.0",
  "devDependencies": {
    "vitest": "^3.2.4",
    "wrangler": "^4.40.0"
  }
}
```

- [ ] **Step 3: Write the failing tests**

Create `website/lib/session.test.js`:

```js
import { describe, it, expect } from 'vitest';
import { deriveExpiry, clampExpiry, DEFAULT_MAX_AGE_MS } from './session.js';

const NOW = 1785812270230;

const imsBody = (overrides = {}) => ({
  access_token: 'header.payload.signature',
  expires_in: '86400000',
  created_at: '1785812270230',
  scope: 'AdobeID,openid',
  ...overrides,
});

describe('deriveExpiry', () => {
  it('adds string expires_in to string created_at', () => {
    expect(deriveExpiry(imsBody())).toBe(1785898670230);
  });

  it('accepts numeric values as well as strings', () => {
    expect(deriveExpiry({ created_at: NOW, expires_in: 1000 })).toBe(NOW + 1000);
  });

  it('returns null when created_at is missing', () => {
    expect(deriveExpiry(imsBody({ created_at: undefined }))).toBe(null);
  });

  it('returns null when expires_in is not a number', () => {
    expect(deriveExpiry(imsBody({ expires_in: 'soon' }))).toBe(null);
  });

  it('returns null for an empty string rather than coercing it to zero', () => {
    expect(deriveExpiry(imsBody({ expires_in: '  ' }))).toBe(null);
  });

  it('returns null when the body is not an object', () => {
    expect(deriveExpiry(null)).toBe(null);
  });
});

describe('clampExpiry', () => {
  it('caps an over-ceiling expiry at now + maxAgeMs', () => {
    expect(clampExpiry(NOW + 999999999999, NOW, DEFAULT_MAX_AGE_MS))
      .toBe(NOW + DEFAULT_MAX_AGE_MS);
  });

  it('leaves an expiry inside the ceiling untouched', () => {
    expect(clampExpiry(NOW + 1000, NOW, DEFAULT_MAX_AGE_MS)).toBe(NOW + 1000);
  });

  it('leaves an expiry exactly at the ceiling untouched', () => {
    expect(clampExpiry(NOW + DEFAULT_MAX_AGE_MS, NOW, DEFAULT_MAX_AGE_MS))
      .toBe(NOW + DEFAULT_MAX_AGE_MS);
  });
});
```

- [ ] **Step 4: Run tests to verify they fail**

Run: `cd website && npx vitest run lib/session.test.js`
Expected: FAIL — `Failed to resolve import "./session.js"`.

- [ ] **Step 5: Write the minimal implementation**

Create `website/lib/session.js`:

```js
/*
 * Pure session logic. No Request, Response, fetch, or platform bindings —
 * this module must run unchanged on Workers, Lambda, and I/O Runtime.
 */

export const DEFAULT_MAX_AGE_MS = 86400000;
export const DEFAULT_HINT_MAX_AGE_MS = 31536000000;

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
```

- [ ] **Step 6: Run tests to verify they pass**

Run: `cd website && npx vitest run lib/session.test.js`
Expected: PASS — 9 tests.

- [ ] **Step 7: Commit**

```bash
git add website/package.json website/package-lock.json website/lib/session.js website/lib/session.test.js
git commit -m "feat: add expiry derivation and clamping for session cookies"
```

---

### Task 2: HMAC signing

The session cookie value is the access token wrapped in an HMAC so a later gating pass can trust it with one local check instead of a remote IMS call per request. Nothing verifies the signature yet — writing it from the first commit avoids a cookie-format migration later.

**Files:**
- Modify: `website/lib/session.js`
- Test: `website/lib/session.test.js`

**Interfaces:**
- Consumes: nothing from Task 1.
- Produces:
  - `base64urlEncode(bytes: Uint8Array) -> string`
  - `signToken(token: string, secret: string) -> Promise<string>` — returns `` `${base64url(token)}.${base64url(hmac)}` ``.

- [ ] **Step 1: Write the failing tests**

Append to `website/lib/session.test.js`. Also add `base64urlEncode` and `signToken` to the existing import at the top of the file.

```js
describe('signToken', () => {
  const TOKEN = 'header.payload.signature';
  const SECRET = 'test-secret';

  it('returns exactly two dot-separated segments', async () => {
    const signed = await signToken(TOKEN, SECRET);
    expect(signed.split('.')).toHaveLength(2);
  });

  it('base64url-encodes the token so its own dots do not split the value', async () => {
    const [payload] = (await signToken(TOKEN, SECRET)).split('.');
    expect(payload).not.toContain('.');
    const decoded = atob(payload.replace(/-/g, '+').replace(/_/g, '/'));
    expect(decoded).toBe(TOKEN);
  });

  it('emits no base64 padding or url-unsafe characters', async () => {
    const signed = await signToken(TOKEN, SECRET);
    expect(signed).toMatch(/^[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/);
  });

  it('is deterministic for the same token and secret', async () => {
    expect(await signToken(TOKEN, SECRET)).toBe(await signToken(TOKEN, SECRET));
  });

  it('produces a different signature under a different secret', async () => {
    const a = await signToken(TOKEN, SECRET);
    const b = await signToken(TOKEN, 'other-secret');
    expect(a.split('.')[1]).not.toBe(b.split('.')[1]);
  });

  it('produces a different signature when the token is tampered with', async () => {
    const a = await signToken(TOKEN, SECRET);
    const b = await signToken('header.tampered.signature', SECRET);
    expect(a.split('.')[1]).not.toBe(b.split('.')[1]);
  });

  it('handles non-ASCII tokens without corrupting them', async () => {
    const [payload] = (await signToken('tökén', SECRET)).split('.');
    const bytes = Uint8Array.from(
      atob(payload.replace(/-/g, '+').replace(/_/g, '/')),
      (c) => c.charCodeAt(0),
    );
    expect(new TextDecoder().decode(bytes)).toBe('tökén');
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd website && npx vitest run lib/session.test.js`
Expected: FAIL — `signToken is not a function`.

- [ ] **Step 3: Write the implementation**

Add to `website/lib/session.js`, after `clampExpiry`:

```js
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
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `cd website && npx vitest run lib/session.test.js`
Expected: PASS — 16 tests.

- [ ] **Step 5: Commit**

```bash
git add website/lib/session.js website/lib/session.test.js
git commit -m "feat: sign session cookie payload with HMAC-SHA256"
```

---

### Task 3: Cookie serialization and assembly

Assembles both cookies, applies the size guard, and returns either cookies or a typed error. This is the whole public surface of the pure module.

**Files:**
- Modify: `website/lib/session.js`
- Test: `website/lib/session.test.js`

**Interfaces:**
- Consumes: `deriveExpiry`, `clampExpiry`, `signToken` from Tasks 1–2.
- Produces:
  - `serializeCookie(name, value, options) -> string` where options is `{ maxAgeSeconds, httpOnly, secure, sameSite, path }`.
  - `createSessionCookies({ body, now, config }) -> Promise<{ cookies: string[] } | { error: { status, message } }>` where config is `{ secret, maxAgeMs, hintMaxAgeMs, sessionCookieName, hintCookieName, secure }`.
  - `MAX_COOKIE_BYTES` constant.

- [ ] **Step 1: Write the failing tests**

Append to `website/lib/session.test.js`, adding `serializeCookie`, `createSessionCookies`, `MAX_COOKIE_BYTES` and `DEFAULT_HINT_MAX_AGE_MS` to the import at the top.

```js
const config = (overrides = {}) => ({
  secret: 'test-secret',
  maxAgeMs: DEFAULT_MAX_AGE_MS,
  hintMaxAgeMs: DEFAULT_HINT_MAX_AGE_MS,
  sessionCookieName: 'spectrum_session',
  hintCookieName: 'spectrum_session_exp',
  secure: true,
  ...overrides,
});

const byName = (cookies, name) => cookies.find((c) => c.startsWith(`${name}=`));
const attr = (cookie, key) => cookie.split('; ').find((p) => p.startsWith(`${key}=`))?.slice(key.length + 1);

describe('serializeCookie', () => {
  it('emits the shared attributes', () => {
    const cookie = serializeCookie('n', 'v', { maxAgeSeconds: 60, secure: true });
    expect(cookie).toBe('n=v; Path=/; SameSite=Lax; Max-Age=60; Secure');
  });

  it('appends HttpOnly only when asked', () => {
    expect(serializeCookie('n', 'v', { maxAgeSeconds: 60, httpOnly: true })).toContain('; HttpOnly');
    expect(serializeCookie('n', 'v', { maxAgeSeconds: 60 })).not.toContain('HttpOnly');
  });

  it('omits Secure when serving over http', () => {
    expect(serializeCookie('n', 'v', { maxAgeSeconds: 60, secure: false })).not.toContain('Secure');
  });
});

describe('createSessionCookies', () => {
  it('returns both cookies', async () => {
    const { cookies } = await createSessionCookies({ body: imsBody(), now: NOW, config: config() });
    expect(cookies).toHaveLength(2);
    expect(byName(cookies, 'spectrum_session')).toBeDefined();
    expect(byName(cookies, 'spectrum_session_exp')).toBeDefined();
  });

  it('marks the session cookie HttpOnly and the hint cookie not', async () => {
    const { cookies } = await createSessionCookies({ body: imsBody(), now: NOW, config: config() });
    expect(byName(cookies, 'spectrum_session')).toContain('HttpOnly');
    expect(byName(cookies, 'spectrum_session_exp')).not.toContain('HttpOnly');
  });

  it('sets the session cookie value to the signed token', async () => {
    const { cookies } = await createSessionCookies({ body: imsBody(), now: NOW, config: config() });
    const expected = await signToken('header.payload.signature', 'test-secret');
    expect(byName(cookies, 'spectrum_session').split('; ')[0]).toBe(`spectrum_session=${expected}`);
  });

  it('gives the session cookie the derived remaining lifetime in seconds', async () => {
    const { cookies } = await createSessionCookies({ body: imsBody(), now: NOW, config: config() });
    expect(attr(byName(cookies, 'spectrum_session'), 'Max-Age')).toBe('86400');
  });

  it('gives the hint cookie the 365-day constant, not the session lifetime', async () => {
    const { cookies } = await createSessionCookies({ body: imsBody(), now: NOW, config: config() });
    expect(attr(byName(cookies, 'spectrum_session_exp'), 'Max-Age')).toBe('31536000');
  });

  it('sets the hint cookie value to the absolute expiry', async () => {
    const { cookies } = await createSessionCookies({ body: imsBody(), now: NOW, config: config() });
    expect(byName(cookies, 'spectrum_session_exp').split('; ')[0])
      .toBe('spectrum_session_exp=1785898670230');
  });

  it('clamps the session lifetime but still reports the clamped date in the hint', async () => {
    const body = imsBody({ expires_in: String(10 * 365 * 24 * 60 * 60 * 1000) });
    const { cookies } = await createSessionCookies({ body, now: NOW, config: config() });
    expect(attr(byName(cookies, 'spectrum_session'), 'Max-Age')).toBe('86400');
    expect(byName(cookies, 'spectrum_session_exp').split('; ')[0])
      .toBe(`spectrum_session_exp=${NOW + DEFAULT_MAX_AGE_MS}`);
  });

  it('keeps the hint cookie at 365 days even when the session is clamped', async () => {
    const body = imsBody({ expires_in: String(10 * 365 * 24 * 60 * 60 * 1000) });
    const { cookies } = await createSessionCookies({ body, now: NOW, config: config() });
    expect(attr(byName(cookies, 'spectrum_session_exp'), 'Max-Age')).toBe('31536000');
  });

  it('rejects a missing access_token', async () => {
    const { error } = await createSessionCookies({
      body: imsBody({ access_token: undefined }), now: NOW, config: config(),
    });
    expect(error.status).toBe(400);
  });

  it('rejects an unusable created_at', async () => {
    const { error } = await createSessionCookies({
      body: imsBody({ created_at: 'nope' }), now: NOW, config: config(),
    });
    expect(error.status).toBe(400);
  });

  it('rejects an expiry already in the past', async () => {
    const body = imsBody({ created_at: String(NOW - 200000), expires_in: '1000' });
    const { error } = await createSessionCookies({ body, now: NOW, config: config() });
    expect(error.status).toBe(400);
  });

  it('rejects an expiry exactly at now', async () => {
    const body = imsBody({ created_at: String(NOW), expires_in: '0' });
    const { error } = await createSessionCookies({ body, now: NOW, config: config() });
    expect(error.status).toBe(400);
  });

  it('rejects a token too large for the cookie limit with 413', async () => {
    const body = imsBody({ access_token: 'x'.repeat(MAX_COOKIE_BYTES) });
    const { error } = await createSessionCookies({ body, now: NOW, config: config() });
    expect(error.status).toBe(413);
  });

  it('returns no cookies alongside an error', async () => {
    const result = await createSessionCookies({
      body: imsBody({ access_token: undefined }), now: NOW, config: config(),
    });
    expect(result.cookies).toBeUndefined();
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd website && npx vitest run lib/session.test.js`
Expected: FAIL — `serializeCookie is not a function`.

- [ ] **Step 3: Write the implementation**

Add to `website/lib/session.js`:

```js
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
  const token = body?.access_token;
  if (typeof token !== 'string' || token === '') {
    return fail(400, 'access_token is required');
  }

  const derived = deriveExpiry(body);
  if (derived === null) {
    return fail(400, 'created_at and expires_in must be numeric');
  }

  const expiresAt = clampExpiry(derived, now, config.maxAgeMs);
  if (expiresAt <= now) {
    return fail(400, 'session has already expired');
  }

  const signed = await signToken(token, config.secret);

  const sessionCookie = serializeCookie(config.sessionCookieName, signed, {
    maxAgeSeconds: Math.floor((expiresAt - now) / 1000),
    httpOnly: true,
    secure: config.secure,
  });

  if (new TextEncoder().encode(sessionCookie).length > MAX_COOKIE_BYTES) {
    return fail(413, 'session cookie exceeds the 4096 byte browser limit');
  }

  // The hint cookie deliberately outlives the session it describes: if it
  // expired alongside it, a lapsed visitor and a first-time visitor would
  // both present no cookie and be indistinguishable.
  const hintCookie = serializeCookie(config.hintCookieName, String(expiresAt), {
    maxAgeSeconds: Math.floor(config.hintMaxAgeMs / 1000),
    httpOnly: false,
    secure: config.secure,
  });

  return { cookies: [sessionCookie, hintCookie] };
};
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `cd website && npx vitest run lib/session.test.js`
Expected: PASS — all tests green.

- [ ] **Step 5: Commit**

```bash
git add website/lib/session.js website/lib/session.test.js
git commit -m "feat: assemble session and hint cookies with size guard"
```

---

### Task 4: Workers adapter

Translates HTTP to the pure module. This is the only file that gets rewritten when porting to Lambda.

**Files:**
- Create: `website/handlers/auth.js`
- Test: `website/handlers/auth.test.js`

**Interfaces:**
- Consumes: `createSessionCookies`, `DEFAULT_MAX_AGE_MS`, `DEFAULT_HINT_MAX_AGE_MS` from Task 3.
- Produces: `createSession({ url, env, request }) -> Promise<Response>` — matches the handler signature `website/index.js` uses.

- [ ] **Step 1: Write the failing tests**

Create `website/handlers/auth.test.js`:

```js
import { describe, it, expect } from 'vitest';
import { createSession } from './auth.js';

const ORIGIN = 'https://example.com';
const env = { SESSION_SECRET: 'test-secret' };

const post = (body, { origin = ORIGIN, method = 'POST' } = {}) => new Request(`${ORIGIN}/auth/session`, {
  method,
  headers: origin ? { origin, 'content-type': 'application/json' } : { 'content-type': 'application/json' },
  body: method === 'POST' ? (typeof body === 'string' ? body : JSON.stringify(body)) : undefined,
});

const imsBody = () => ({
  access_token: 'header.payload.signature',
  expires_in: '86400000',
  created_at: String(Date.now()),
  scope: 'AdobeID,openid',
});

const call = (request) => createSession({ url: new URL(request.url), env, request });

describe('createSession', () => {
  it('returns 204 with two Set-Cookie headers on success', async () => {
    const resp = await call(post(imsBody()));
    expect(resp.status).toBe(204);
    expect(resp.headers.getSetCookie()).toHaveLength(2);
  });

  it('returns an empty body on success', async () => {
    const resp = await call(post(imsBody()));
    expect(await resp.text()).toBe('');
  });

  it('rejects non-POST methods with 405', async () => {
    const resp = await call(post(null, { method: 'GET' }));
    expect(resp.status).toBe(405);
  });

  it('advertises the allowed method on 405', async () => {
    const resp = await call(post(null, { method: 'GET' }));
    expect(resp.headers.get('allow')).toBe('POST');
  });

  it('rejects a missing Origin header with 403', async () => {
    const resp = await call(post(imsBody(), { origin: null }));
    expect(resp.status).toBe(403);
  });

  it('rejects a foreign Origin with 403', async () => {
    const resp = await call(post(imsBody(), { origin: 'https://evil.example' }));
    expect(resp.status).toBe(403);
  });

  it('accepts a foreign Origin present in ALLOWED_ORIGINS', async () => {
    const request = post(imsBody(), { origin: 'https://allowed.example' });
    const resp = await createSession({
      url: new URL(request.url),
      env: { ...env, ALLOWED_ORIGINS: 'https://allowed.example, https://other.example' },
      request,
    });
    expect(resp.status).toBe(204);
  });

  it('returns 400 rather than 500 on malformed JSON', async () => {
    const resp = await call(post('{not json'));
    expect(resp.status).toBe(400);
  });

  it('propagates the status from the pure module', async () => {
    const resp = await call(post({ ...imsBody(), access_token: undefined }));
    expect(resp.status).toBe(400);
  });

  it('returns 500 when SESSION_SECRET is unset', async () => {
    const request = post(imsBody());
    const resp = await createSession({ url: new URL(request.url), env: {}, request });
    expect(resp.status).toBe(500);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd website && npx vitest run handlers/auth.test.js`
Expected: FAIL — `Failed to resolve import "./auth.js"`.

- [ ] **Step 3: Write the implementation**

Create `website/handlers/auth.js`:

```js
import {
  createSessionCookies,
  DEFAULT_MAX_AGE_MS,
  DEFAULT_HINT_MAX_AGE_MS,
} from '../lib/session.js';

const SESSION_COOKIE = 'spectrum_session';
const HINT_COOKIE = 'spectrum_session_exp';

// Config is a plain object, never a Cloudflare binding, so process.env
// serves the Lambda and I/O Runtime ports without code changes.
const configFromEnv = (env, url) => ({
  secret: env.SESSION_SECRET,
  maxAgeMs: Number(env.SESSION_MAX_AGE_MS ?? DEFAULT_MAX_AGE_MS),
  hintMaxAgeMs: Number(env.SESSION_HINT_MAX_AGE_MS ?? DEFAULT_HINT_MAX_AGE_MS),
  sessionCookieName: SESSION_COOKIE,
  hintCookieName: HINT_COOKIE,
  secure: url.protocol === 'https:',
});

// Blunts session fixation, where an attacker makes a victim's browser
// adopt an attacker-controlled session.
const isAllowedOrigin = (request, url, env) => {
  const origin = request.headers.get('origin');
  if (!origin) { return false; }
  const allowed = env.ALLOWED_ORIGINS
    ? env.ALLOWED_ORIGINS.split(',').map((value) => value.trim())
    : [url.origin];
  return allowed.includes(origin);
};

const problem = (status, message) => new Response(message, {
  status,
  headers: { 'content-type': 'text/plain; charset=utf-8' },
});

export const createSession = async ({ url, env, request }) => {
  if (request.method !== 'POST') {
    return new Response('Method Not Allowed', { status: 405, headers: { allow: 'POST' } });
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

  const headers = new Headers();
  for (const cookie of result.cookies) { headers.append('set-cookie', cookie); }
  return new Response(null, { status: 204, headers });
};
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `cd website && npx vitest run`
Expected: PASS — both test files green.

- [ ] **Step 5: Commit**

```bash
git add website/handlers/auth.js website/handlers/auth.test.js
git commit -m "feat: add Workers adapter for POST /auth/session"
```

---

### Task 5: Route wiring and configuration

`website/index.js` currently calls `formatRequest` at line 127 — which rewrites the request to target AEM — *before* route matching at line 131. Every route therefore receives an AEM-bound request. `/auth/session` needs the original one to read its body, so route matching moves above the rewrite and only routes flagged `proxy: true` get rewritten.

**Files:**
- Modify: `website/index.js`
- Modify: `website/wrangler.toml`

**Interfaces:**
- Consumes: `createSession` from Task 4.
- Produces: nothing downstream.

- [ ] **Step 1: Import the handler**

In `website/index.js`, add below the existing `fetchFromAem` import:

```js
import { fetchFromAem } from './handlers/aem.js';
import { createSession } from './handlers/auth.js';
```

- [ ] **Step 2: Add the route**

Replace the `ROUTES` array. The AEM fallback gains `proxy: true`; the new route is matched before it and is not proxied.

```js
const ROUTES = [
  // Session cookie endpoint - handled locally, never proxied to AEM
  {
    match: (path) => path === '/auth/session',
    handler: createSession,
  },
  // // Handle drafts
  // {
  //   match: (path) => path.startsWith('/drafts'),
  //   handler: () => new Response('Not found - drafts are denied on production.', { status: 404 }),
  // },
  // Default AEM handler should be last
  {
    match: () => true,
    handler: fetchFromAem,
    cache: true,
    proxy: true,
  },
];
```

- [ ] **Step 3: Restructure the fetch handler**

Replace the whole `export default` block at the bottom of `website/index.js`:

```js
export default {
  async fetch(req, env) {
    const url = new URL(req.url);

    const portResp = getPortRedirect(req, url);
    if (portResp) { return portResp; }

    const rumResp = getRUMRequest(req, url);
    if (rumResp) { return rumResp; }

    const route = ROUTES.find((r) => r.match(url.pathname));

    // Non-proxy routes need the original request, not one rewritten to AEM
    if (!route.proxy) { return route.handler({ url, env, request: req }); }

    const request = await formatRequest(env, req, url);

    const savedSearch = formatSearchParams(url);

    return route.handler({
      url, env, request, cache: route.cache, savedSearch,
    });
  },
};
```

- [ ] **Step 4: Add configuration**

Replace the `vars` lines in `website/wrangler.toml`. Values are strings because wrangler `vars` are strings; the adapter coerces them with `Number()`.

```toml
name = "spectrum-hub-website"
main = "index.js"
compatibility_date = "2025-02-14"
keep_vars = true

vars = { AEM_ORG = "adobe", AEM_SITE = "spectrum-hub", SESSION_MAX_AGE_MS = "86400000", SESSION_HINT_MAX_AGE_MS = "31536000000" }

[env.dev]
vars = { AEM_ORG = "adobe", AEM_SITE = "spectrum-hub", ORIGIN = "http://localhost:3000", SESSION_MAX_AGE_MS = "86400000", SESSION_HINT_MAX_AGE_MS = "31536000000" }
```

`SESSION_SECRET` is deliberately absent — it is a secret, not a var. Set it with `npx wrangler secret put SESSION_SECRET` per environment. For local dev, create `website/.dev.vars` containing `SESSION_SECRET="local-dev-secret"` and confirm it is git-ignored.

- [ ] **Step 5: Run the full test suite**

Run: `cd website && npm test`
Expected: PASS — all tests across both files.

- [ ] **Step 6: Verify the route end to end**

Start the dev server:

```bash
cd website && npm run dev
```

In a second terminal:

```bash
curl -i -X POST http://localhost:8787/auth/session \
  -H 'content-type: application/json' \
  -H 'origin: http://localhost:8787' \
  -d "{\"access_token\":\"header.payload.signature\",\"expires_in\":\"86400000\",\"created_at\":\"$(date +%s000)\",\"scope\":\"AdobeID,openid\"}"
```

Expected: `HTTP/1.1 204`, one `set-cookie` for `spectrum_session` carrying `HttpOnly` and `Max-Age=86400`, and one for `spectrum_session_exp` carrying `Max-Age=31536000` and no `HttpOnly`.

Then confirm the AEM proxy still works and the restructure broke nothing:

```bash
curl -s -o /dev/null -w '%{http_code}\n' http://localhost:8787/
```

Expected: `200`.

- [ ] **Step 7: Commit**

```bash
git add website/index.js website/wrangler.toml
git commit -m "feat: route POST /auth/session ahead of the AEM proxy"
```

---

## Self-Review Notes

Checked against `docs/superpowers/specs/2026-08-03-auth-session-design.md`:

- Route, methods, and all six response codes — Tasks 3 and 4.
- Both cookies, their attributes and differing lifetimes — Task 3.
- Hint cookie outliving the session, value as hard absolute date — Task 3, three dedicated tests.
- Expiry derivation from string `created_at` + ms `expires_in`, clamping, past-expiry rejection — Tasks 1 and 3.
- HMAC wrapper with base64url payload — Task 2.
- Pure lib / adapter split and the `env`-as-plain-object rule — Tasks 3 and 4.
- `index.js` restructure — Task 5.
- Size, origin, and JSON guards — Tasks 3 and 4.
- vitest, plain rather than `@cloudflare/vitest-pool-workers` — Task 1.

Out of scope per the spec and absent by design: IMS token validation, any read of the cookie in `getValidLogin()`, `DELETE`/logout, refresh tokens.
