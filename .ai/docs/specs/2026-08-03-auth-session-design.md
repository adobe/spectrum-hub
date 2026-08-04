# `/auth/session` — session cookie endpoint

**Date:** 2026-08-03
**Status:** Approved design, not yet implemented

## Problem

The Worker at `website/index.js` proxies every request to AEM. `getValidLogin()`
(`website/index.js:79`) is a stub that always returns `true` — the intended hook for
access control, currently inert.

We need a first step toward gating: an endpoint that accepts an Adobe IMS token
response over `POST` and persists it as a cookie. Session state lives entirely in the
cookie. No KV, no external session store.

This pass only sets the cookie. Validating the token against IMS, and reading the
cookie in `getValidLogin()`, are later iterations.

## Constraint: platform portability

This Worker is expected to run later as an AWS Lambda function and possibly an Adobe
I/O Runtime action. Nothing in this feature may depend on Cloudflare-specific
facilities.

Consequences:

- No KV, no `caches.default`, no `cf` request object.
- Crypto uses the Web Crypto API (`crypto.subtle`), which is present and identical in
  Workers, Node 19+ (Lambda), and I/O Runtime. Note the version: `globalThis.crypto`
  was available on Node 18 only behind `--experimental-global-webcrypto`, and was
  unflagged by default in Node 19. A `nodejs18.x` Lambda target therefore needs a
  global shim (`globalThis.crypto = require('node:crypto').webcrypto`) in the adapter
  before the lib is imported. `nodejs20.x` and later need nothing. The lib itself
  never imports `node:crypto`.
- Configuration arrives as a plain object argument, never as a Cloudflare binding, so
  `process.env` serves the other two platforms without code changes.
- Platform-specific code is confined to one adapter file.

## Route

`/auth/session`.

| Method | Behavior |
| --- | --- |
| `POST` | Create session. Body is the IMS token response as JSON. |
| anything else | `405 Method Not Allowed` |

`DELETE` is reserved for logout in a later pass, which is why the route is named for
the resource rather than the action. `/auth/*` does not collide with AEM content paths.

### Request body

The IMS token response. The fields this endpoint reads:

```json
{
  "access_token": "<JWT>",
  "expires_in": "86400000",
  "created_at": "1785812270230",
  "scope": "AdobeID,openid"
}
```

`expires_in` and `created_at` arrive as **strings**, and `expires_in` is a duration in
**milliseconds** — not the seconds that the OAuth spec conventionally uses. Both are
coerced with `Number()` and rejected if the result is `NaN`.

There is no `expire` field. Absolute expiry is derived.

### Responses

| Status | When |
| --- | --- |
| `204` | Session created. Two `Set-Cookie` headers, no body. |
| `400` | Malformed JSON, missing `access_token`, non-numeric `created_at`/`expires_in`, or an expiry in the past or under a second away. |
| `403` | `Origin` header absent or not allowed. |
| `404` | Any other path under `/auth/` — the namespace is never proxied. |
| `405` | Method is not `POST`. |
| `413` | Assembled cookie exceeds the 4096-byte browser limit. |
| `500` | `SESSION_SECRET` is unset, so the cookie cannot be signed. |

All responses carry `cache-control: no-store`. The endpoint mints credentials and
sits behind a CDN.

A remaining lifetime under one second is rejected rather than issued: it would
produce `Max-Age=0` on the session cookie — which the browser deletes on arrival —
while the hint cookie simultaneously claimed the session was live, exactly the
disagreement the hint cookie exists to prevent.

## Cookies

Two cookies, deliberately split by who is allowed to read them.

| | Name | `HttpOnly` | Value | `Max-Age` |
| --- | --- | --- | --- | --- |
| Session | `spectrum_session` | yes | signed `access_token` (see below) | derived, ≤ 24h |
| Hint | `spectrum_session_exp` | **no** | absolute expiry, epoch milliseconds | 365 days |

Both carry `Secure`, `Path=/`, and `SameSite=Lax`. Their lifetimes differ, deliberately
— see below.

- `SameSite=Lax`, not `Strict`: under `Strict` a user arriving from an external link
  would render as logged-out on that first navigation.
- No `Domain` attribute — the cookies are host-only. Add one only if subdomains must
  share the session.

### The hint cookie

`spectrum_session_exp` exists so page JavaScript can distinguish three states without
a network call:

| Cookie | Meaning | Action |
| --- | --- | --- |
| absent | net-new visitor | show login |
| present, value > `now` | session presumed live | proceed |
| present, value ≤ `now` | returning visitor, session lapsed | attempt silent re-auth |

**The hint cookie deliberately outlives the session it describes.** Its `Max-Age` is
`SESSION_HINT_MAX_AGE_MS`, default 365 days — not the session's derived lifetime. If it
expired alongside the session, a lapsed visitor and a first-time visitor would both
present no cookie at all, and the third state above would be unreachable. The value
remains a *hard absolute date*, so a stale cookie still reports exactly when the
session ended.

365 days sits comfortably under the platform ceiling: RFC 6265bis caps cookie lifetime
at 400 days, and Chrome, Firefox and Safari all enforce it by silently truncating
anything longer. Safari's 7-day cap applies only to cookies written via
`document.cookie`; this one is server-set through `Set-Cookie`, so it is not subject to
that limit.

Each successful `POST` overwrites the hint cookie, refreshing both its value and its
365-day window.

**The Worker must never read this cookie.** It is client-writable, so it cannot be
allowed to influence any gate. It is advisory only. That constraint, plus the differing
lifetimes, is why the expiry is duplicated rather than read out of the session cookie.

The value is a bare timestamp — no user identifier — so a 365-day lifetime carries
little privacy weight. Worth re-checking if the payload ever grows.

### Session cookie value

```
base64url(access_token) + "." + base64url(HMAC-SHA256(base64url(access_token), SESSION_SECRET))
```

The `access_token` is base64url-encoded first because a JWT contains `.` characters,
which would otherwise make the signature delimiter ambiguous.

The IMS JWT already carries its own signature, so this HMAC is a second, independent
layer. It exists so that once set-time IMS validation lands, `getValidLogin()` can
trust the cookie by checking one local HMAC rather than verifying the JWT against
remote IMS keys on every request.

`SESSION_SECRET` comes from the injected env object. On Cloudflare it is set with
`wrangler secret put SESSION_SECRET`; on Lambda and I/O Runtime it is an ordinary
environment variable. The signing code itself is identical across all three.

Nothing verifies this signature yet — verification arrives with the gating iteration.
Writing the signature from the first commit means there is no cookie-format migration
later.

**What the HMAC does and does not prove.** It proves only *this Worker signed this
value*. It never proves *IMS issued this token*. Until set-time IMS validation lands,
anyone who can present an allowed `Origin` header can `POST {"access_token": "anything"}`
and receive a validly-signed session cookie good for up to 24 hours. The signature is
a tamper seal on a claim nobody has checked yet. Do not read it as an authentication
guarantee, and do not gate anything on the cookie before validation lands.

## Expiry

```
expiresAt = Number(created_at) + Number(expires_in)
```

Clamped:

- Ceiling of `SESSION_MAX_AGE_MS`, default `86400000` (24h, matching the current IMS
  value). An expiry beyond the ceiling is reduced to `now + SESSION_MAX_AGE_MS`.
- An `expiresAt` less than 1000ms after `now` — including one at or before it — is a
  `400`.

The clamp matters because until IMS validation lands, nothing stops a caller posting
an `expires_in` of ten years. It stays useful afterward as a backstop keeping the
cookie from outliving the IMS token it was minted from.

The session cookie's `Max-Age` is `Math.floor((expiresAt - now) / 1000)`. The hint
cookie's `Max-Age` is fixed at `SESSION_HINT_MAX_AGE_MS` and is unaffected by the
clamp; only its *value* reflects the clamped `expiresAt`.

## Structure

Two files, split exactly on the platform boundary.

### `website/lib/session.js` — pure

No `Request`, no `Response`, no `fetch`, no env bindings. Takes plain data, returns
plain data. Survives every platform port unchanged, and is where the tests point.

```
createSessionCookies({ body, now, config }) -> { cookies: string[] } | { error: { status, message } }
```

`config` is
`{ secret, maxAgeMs, hintMaxAgeMs, sessionCookieName, hintCookieName, secure }`.

Only `secret` is required. **The lib owns the config contract, not the adapter** —
everything else defaults inside `createSessionCookies` (`DEFAULT_SESSION_COOKIE_NAME`,
`DEFAULT_HINT_COOKIE_NAME`, `DEFAULT_MAX_AGE_MS`, `DEFAULT_HINT_MAX_AGE_MS`), and a
missing, empty, or non-string `secret` returns a `500` rather than throwing
`DataError` out of `crypto.subtle.importKey`. This is deliberate: the adapter is the
file each platform port rewrites, so any policy left there is policy the next port
has to rediscover. A port that forgot `sessionCookieName` would otherwise mint a
cookie literally named `undefined` and return `204`.

Internal helpers: `deriveExpiry`, `clampExpiry`, `signToken`, `serializeCookie`.
`durationMs` (numeric-env-var validation) also lives here, for the same reason; the
adapter calls it rather than defining its own.

`signToken` is async — `crypto.subtle` returns promises — so `createSessionCookies` is
async too.

### `website/handlers/auth.js` — Workers adapter

Parses the request, calls the lib, builds a `Response`. Porting to Lambda means adding
a sibling adapter that maps an API Gateway event to the same lib call. This file is the
only thing that gets rewritten.

## Change to `website/index.js`

`formatRequest` runs at line 127, rewriting the request to target AEM, *before* route
matching at line 131. Every route therefore receives an AEM-bound request, and
`/auth/session` needs the original one to read its body.

Move `ROUTES.find` above `formatRequest`, and mark the AEM fallback route
`proxy: true`. Only routes flagged `proxy: true` get rewritten; others receive the
original request. This is what makes non-proxy routes possible at all, and it is the
minimum change that does so.

The new route is matched before the AEM fallback, and claims the whole `/auth/`
namespace rather than the single literal path:

```js
{ match: (path) => path === '/auth' || path.startsWith('/auth/'), handler: handleAuth },
```

`handleAuth` dispatches on an exact-match table (`{ '/auth/session': createSession }`)
and returns `404` for anything else in the namespace. Matching only the literal
`/auth/session` would let `/auth/session/` fall through to the AEM proxy, which
attaches the origin credential and forwards the request body — containing the IMS
access token — upstream. Claiming the namespace also reserves it for the planned
`DELETE`.

`getPortRedirect` and the RUM check continue to run first, unchanged.

## Guards

- **Size.** The assembled cookie is measured against 4096 bytes before being sent. The
  base64url wrapper adds ~33% to the token and the signature adds ~43 characters, so
  a large IMS token could approach the limit. Exceeding it returns `413` rather than
  letting the browser silently drop the cookie.
- **Origin.** The `Origin` header is checked against `ALLOWED_ORIGINS` (comma-separated
  env var). When unset — or set to something that normalizes to nothing, such as
  whitespace or bare commas — `Origin` must match the request's own host. Both sides
  are normalized before comparison (trimmed, trailing slash stripped, lowercased) so
  a hand-written entry still matches the shape a browser actually sends. Blunts
  session fixation, where an attacker causes a victim's browser to adopt an
  attacker-controlled session.
- **JSON.** A malformed body returns `400`, never a `500`.

## Testing

No test framework exists yet (`npm test` is a stub). Add `vitest` — plain vitest, not
`@cloudflare/vitest-pool-workers`, since the logic under test is platform-free by
design.

Tests target `website/lib/session.js` with a fixed injected `now`:

- Derives expiry from `created_at + expires_in` with string inputs.
- Clamps an over-ceiling `expires_in` to the ceiling.
- Rejects an already-past expiry, a `NaN` `created_at`, a missing `access_token`.
- Signature verifies against the secret; a tampered token fails verification.
- Session cookie carries `HttpOnly`; hint cookie does not.
- Hint cookie's `Max-Age` is the 365-day constant, **not** the session's — it outlives
  the session by design.
- Hint cookie's *value* equals the clamped `expiresAt`, so a clamped session still
  reports its true end date.
- Oversized token produces the size error.
- A config omitting the cookie names still produces correctly-named cookies; a config
  with no usable `secret` returns `500` instead of throwing.
- A golden vector pins the cookie wire format: fixed token + fixed secret → a
  hardcoded string, proving the HMAC covers the base64url payload rather than the raw
  token. Changing which bytes are signed invalidates every issued cookie, so it has to
  break a test rather than pass quietly.

Adapter-level tests cover method rejection, malformed JSON, origin rejection and
normalization, and `cache-control: no-store`.

`website/index.test.js` pins the routing invariants, with no network calls: that
`/auth/session` reaches `createSession` rather than the AEM proxy, that nothing else
under `/auth/` is proxied, and — the load-bearing one — that the session handler
receives the *original* request, carrying no `authorization` header. Moving
`formatRequest` back above `ROUTES.find` fails that assertion and only that one.

## Out of scope

- IMS token validation at set time — the next iteration.
- Any read of the cookie in `getValidLogin()`.
- `DELETE /auth/session` (logout). When it lands it should clear `spectrum_session` but
  *retain* `spectrum_session_exp` with a past-dated value, so a logged-out returning
  visitor stays distinguishable from a net-new one.
- Refresh tokens and re-issue.

## Required at the IMS-validation cutover

**`SESSION_SECRET` MUST be rotated as part of the commit that lands IMS validation.**

Every cookie minted before that point was signed without anyone checking the token
was real (see "What the HMAC does and does not prove" above). The new gate verifies
the HMAC — so unless the signing key changes, the gate honors those unvalidated
cookies for the remainder of their 24-hour lifetime, which is precisely the window
the gate exists to close.

The cookie value carries **no version byte and no provenance marker** — it is
`base64url(token).base64url(hmac)` and nothing else — so `getValidLogin()` has no way
to tell a pre-validation cookie from a post-validation one. Rotating the secret is the
only available distinction: it invalidates the entire pre-cutover population at once.
Users are signed out and must re-authenticate, which is the intended outcome.

If that forced sign-out is unacceptable, the alternative is to add a version marker to
the cookie value *before* the cutover, so the two populations are separable. That is a
cookie-format change and needs its own pass; it is not the plan of record.

Rotate with `wrangler secret put SESSION_SECRET` in every environment.
