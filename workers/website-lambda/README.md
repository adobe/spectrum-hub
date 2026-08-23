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
- `PUBLIC_HOST` — the site's public hostname (e.g. `d2fh4e6818mjc6.cloudfront.net`). Forwarded to AEM
  as `X-Forwarded-Host`, which AEM stamps into absolute URLs (canonical, `og:url`, redirects). **This
  MUST be a trusted, configured value** — the Lambda never forwards the viewer's own
  `Host`/`X-Forwarded-Host`, because AEM reflects it into the HTML and CloudFront caches the anonymous
  result without keying on it, so trusting the request header would let an attacker poison the shared
  edge cache. Unset ⇒ the header is dropped and AEM falls back to its own origin host (still not
  client-controlled, just a less-correct canonical). Set it to the real public domain once one fronts
  the distribution.
- `ANON_CACHE_MAX_AGE` — TTL (seconds, default 300) for edge-cached anonymous HTML / query-index.
  Bounds how long a publish takes to show up when edge caching is on (see "Content caching").
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

## Content caching (the default/Lambda behavior)

The default behavior (HTML, `/query-index.json`, static assets) proxies the
Lambda. It uses a custom **`spectrum-content`** cache policy (created by
[`set-content-caching.sh`](./set-content-caching.sh) / baked into
`setup-preview-distribution.sh`) instead of `CachingDisabled`. The policy honours
AEM's `Cache-Control` (`DefaultTTL 0` ⇒ nothing caches unless AEM says so) and
**keys the cache on the `spectrum_session` cookie** (+ all query strings). Run
`set-content-caching.sh` on a distribution to enable it; `REVERT=1` puts the
behavior back on `CachingDisabled`.

**What caches, and how it's kept safe.** The `spectrum_session` cache key is what
makes this safe: anonymous requests (no cookie) share one entry; authenticated
requests (unique cookie) get their own, and their viewer-varying responses are
`no-store` so they're never cached at all.

- **Assets** (js/css/svg/fragments — public, path-determined) keep AEM's
  `max-age … must-revalidate` and cache at the edge. An authenticated `/drafts/`
  asset (anon gets a `no-store` 404) caches under the **cookie** key, never
  reaching anon.
- **Anonymous HTML and `/query-index.json`** ([index.js](./index.js)
  `processHtmlResponse` / query-index transform via `setContentCacheControl`) get
  a **short shared TTL** — `public, max-age=<ANON_CACHE_MAX_AGE>` (default 300s,
  env-overridable) — so a publish shows up within a few minutes **without push
  invalidation**. `isPrivateHtml` has already 404'd private pages, so the anon body
  is the public, audience-stripped view.
- **Authenticated HTML / the full query index** stay `private, no-store`, and
  **gate 404s** stay `no-store` (no negative caching).

Assets and anon content keep AEM's **ETag**, so CloudFront's post-TTL revalidation
is a cheap conditional `304` (skips the fetch/filter/re-encode) rather than a full
re-fetch.

> ⚠️ **ETag caveat — invalidate on filtering-logic deploys.** The ETag tracks the
> AEM page, not this Lambda's filtering/gating code. If you change
> `filterAudienceBlocks` / `isPrivateHtml` / the gate without the page content
> changing, already-cached anonymous bodies keep `304`'ing (serving the old
> filtered output) until the page next changes. For a benign change that's fine
> (bounded by the short TTL); for a **security-relevant** change (something that
> should now be stripped/gated) you **must** run a one-off invalidation:
> `aws cloudfront create-invalidation --distribution-id <id> --paths "/*"` — this
> uses your role's permission, not a standing IAM user, so it works in the
> klam-federated account.

> ⚠️ **Leak test before prod (mandatory).** With a real `spectrum_session` cookie:
> an anonymous public page + `/query-index.json` cache (repeat = `X-Cache: Hit`)
> with `audience-private` content stripped; the **authenticated** fetch of the same
> URL is `no-store` and never a `Hit`; a private page is `404` for anon and real
> content for authed, neither served to the other. If any authed request returns a
> `Hit`, or any anon request returns private content, revert
> (`REVERT=1 … ./set-content-caching.sh`).

Future option (not needed with the short TTL): a standing push-invalidation
credential (IAM `cloudfront:CreateInvalidation` + config-service
`POST …/cdn/prod.json`,
[guide](https://www.aem.live/docs/setup-byo-cdn-push-invalidation-for-cloudfront))
would let you raise the TTL and purge instantly on publish — but the
klam-federated account doesn't permit those long-lived keys, and the short TTL
makes them unnecessary. Hardening option: add `Vary: Cookie` to the anonymous
response so cookie-blind browser/proxy caches can't serve it to a signed-in
viewer (CloudFront already keys on the cookie).
