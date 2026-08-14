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
