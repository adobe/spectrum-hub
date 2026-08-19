# website-lambda

AWS Lambda (Function URL) port of the `../website` Cloudflare Worker. It sits
behind CloudFront, proxies the AEM/Edge Delivery origin, and enforces per-viewer
access rules: gating private pages, stripping `audience-*` content blocks, and
filtering `query-index.json`. See [`index.js`](./index.js) for the pipeline and
[`lib/gate.js`](./lib/gate.js) for the access policy.

## Runtime environment

Set these on the Lambda (they are read from `process.env`):

- `SESSION_SECRET` — HMAC key for the session cookie. Unset ⇒ every request is treated as
  anonymous (fails closed).
- `AEM_ORG` / `AEM_SITE` — the upstream `main--<site>--<org>.aem.live` origin.
- `IMS_CLIENT_ID` / `IMS_CLIENT_SECRET` / `IMS_SCOPE` — service credential for the DA visitor
  allowlist read (required by `/auth/session`).
- `ALLOWED_ORIGINS` — comma-separated origins permitted to call `/auth/session` (CSRF defense).
  **Set this explicitly in production.** When unset the check falls back to the request's own origin
  (derived from `x-forwarded-host`), which is only trustworthy behind CloudFront/OAC; a missing value
  is logged once per container.
- `AEM_HOST_SUFFIX` — the AEM tier to proxy: `aem.live` (published, the default) or `aem.page`
  (preview). The stage Lambda (`spectrum-stage-lambda-proxy`) sets this to `aem.page`; prod leaves it
  unset.
- Optional: `ORIGIN` (dev origin override), `ORIGIN_AUTHENTICATION`, `IMS_ENV`, `SESSION_MAX_AGE_MS`,
  `PUSH_INVALIDATION`.

## CloudFront caching — responses vary by viewer

Most responses this Lambda returns depend on **who is asking** (the
`spectrum_session` cookie) and, for the query index, on a **query string**:

- Private pages → `404` for anonymous, served for authenticated.
- `audience-public` / `audience-private` blocks → stripped per audience.
- `/query-index.json` → `audience: private` rows removed for anonymous; the
  `?compact=true` variant projects each row to `path`/`title` only.

So the same URL legitimately returns different bodies. If CloudFront ever caches
these responses, its **cache key must distinguish them**, or it can serve one
viewer's response to another — e.g. an authenticated (unfiltered) body to an
anonymous visitor, which is a content leak.

### Current setup: caching disabled (nothing to do)

[`setup-preview-distribution.sh`](./setup-preview-distribution.sh) attaches two
AWS managed policies to the behavior:

- Cache policy `4135ea2d-6df8-44a3-9df3-4b5a84be39ad` = **`CachingDisabled`** —
  CloudFront caches nothing, so there is no cache key to get wrong.
- Origin request policy `b689b0a8-53d0-40ab-baf2-68738e2966ac` =
  **`AllViewerExceptHostHeader`** — forwards all query strings and cookies (so
  the Lambda receives both `compact` and `spectrum_session`).

Under this configuration every request runs the Lambda fresh and there is
nothing to configure. **Verify the production distribution mirrors it.**

### If you enable edge caching on this behavior

Swapping in a cache policy with a TTL means the **cache key must include**:

1. Cookie **`spectrum_session`** — separates anonymous from authenticated
   responses (required for every filtered path, not just the query index).
2. Query string **`compact`** — separates `/query-index.json` from
   `/query-index.json?compact=true`.

Keep the origin-request policy forwarding both to the Lambda (the worker reads
`compact` from the incoming request and the cookie for auth). Given the whole
purpose of this Lambda is per-viewer filtering, prefer leaving **`CachingDisabled`**
here and let AEM's own edge/TTL cache genuinely public, cacheable assets.

## Media offload (hybrid BYO-CDN)

Immutable, content-hashed media (`media_<sha>.<ext>`) is public, so it is served
straight from the AEM origin on its own `*/media_*` CloudFront behavior,
bypassing the Lambda (and its 6 MB buffered-response cap + memory/CPU cost).
Gated HTML/JSON stays on the Lambda. [`add-media-behavior.sh`](./add-media-behavior.sh)
retrofits an existing distribution; [`setup-preview-distribution.sh`](./setup-preview-distribution.sh)
bakes it into new ones. Both are idempotent; `REVERT=1 ./add-media-behavior.sh`
sends media back through the Lambda. Modelled on Adobe's
[BYO-CDN CloudFront guide](https://www.aem.live/docs/byo-cdn-cloudfront-setup):

- Origin headers `X-BYO-CDN-Type: cloudfront`, `X-Push-Invalidation: enabled`, and
  `X-Forwarded-Host` (value from `FORWARDED_HOST`, defaulting to the distribution's
  own `*.cloudfront.net` domain).
- Origin TLS `TLSv1/1.1/1.2`, `IpAddressType: ipv4`, Origin Shield `us-east-1` —
  matching a known-good CloudFront→aem.live origin.
- A shared, account-global CloudFront Function `spectrum-strip-headers`
  ([`cloudfront-functions/strip-headers.js`](./cloudfront-functions/strip-headers.js))
  attached **viewer-response** on the media behavior, replicating the Lambda's
  `Age`/`X-Robots-Tag` stripping (`handlers/aem.js`) for the direct path.
- A **custom** cache policy `spectrum-media` (created idempotently) that whitelists
  the image query params (`width`/`height`/`format`/`optimize`/`quality`) with a
  long TTL.

> ⚠️ **Cache-policy gotcha (the thing that cost us a day):** the managed
> `UseOriginCacheControlHeaders-QueryStrings` policy (`4cc15a8a…`,
> `QueryStringBehavior=all`) makes CloudFront **fail the origin connection** to
> aem.live/aem.page with a `502 "can't connect"` — not a caching bug, a hard
> connectivity failure. A **whitelist** query-string policy (what `spectrum-media`
> is) connects fine and still caches per variant. Do not switch the media behavior
> to the `…-QueryStrings` managed policy. (Direct CloudFront→aem.live needs **no**
> BYO-CDN onboarding, contrary to an earlier assumption — a plain distribution
> pulls from the origin once the cache policy is right.)

Deliberate choices: **no** origin-request policy on the media behavior (so
`spectrum_session` is never forwarded to the public origin), and **no** cache-tag
push invalidation (immutable media never needs it). If the site ever enables
token-based origin auth, set `ORIGIN_AUTHENTICATION` (Lambda path) and add an
`Authorization: token hlx_…` header to the media origin.
