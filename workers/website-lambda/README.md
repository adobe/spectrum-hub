# website-lambda

AWS Lambda (Function URL) port of the `../website` Cloudflare Worker. It sits
behind CloudFront, proxies the AEM/Edge Delivery origin, and enforces per-viewer
access rules: gating private pages, stripping `audience-*` content blocks, and
filtering `query-index.json` and `sitemap.xml`. See [`index.js`](./index.js) for the pipeline and
[`lib/gate.js`](./lib/gate.js) for the access policy.

## Runtime environment

Set these on the Lambda (they are read from `process.env`):

- `SESSION_SECRET` — HMAC key for the session cookie. Unset ⇒ every request is treated as
  anonymous (fails closed). **Do not set this in plaintext env in AWS** — provide it via
  `SESSION_SECRET_ID` instead (see "Secrets" below).
- `AEM_ORG` / `AEM_SITE` — the upstream `main--<site>--<org>.aem.live` origin.
- `IMS_CLIENT_ID` / `IMS_CLIENT_SECRET` / `IMS_SCOPE` — service credential for the DA visitor
  allowlist read (required by `/auth/session`). Like `SESSION_SECRET`, `IMS_CLIENT_SECRET` should
  come from `IMS_CLIENT_SECRET_ID`, not plaintext env.
- `ALLOWED_ORIGINS` — comma-separated origins permitted to call `/auth/session` (CSRF defense).
  **Set this explicitly in production.** When unset the check falls back to the request's own origin
  (derived from the public host), which is only trustworthy behind CloudFront/OAC; a missing value
  is logged once per container.
- `PUBLIC_HOST` — the canonical public host (e.g. `preview.spectrum.adobe.com`), host only, no
  scheme. It overrides the request headers when set, so the worker reports one public origin
  regardless of which URL reached it; it drives the `x-forwarded-host` sent to AEM (absolute URLs,
  redirects, sitemap) and the `ALLOWED_ORIGINS` fallback. Behind CloudFront's AllViewerExceptHostHeader
  origin policy the viewer Host isn't forwarded, so set this (or a CloudFront `X-Forwarded-Host`
  origin header) — otherwise the worker only sees the Function URL host.
- `AEM_HOST_SUFFIX` — the AEM tier to proxy: `aem.live` (published, the default) or `aem.page`
  (preview). The stage Lambda (`spectrum-stage-lambda-proxy`) sets this to `aem.page`; prod leaves it
  unset.
- `ANON_CACHE_MAX_AGE` — browser TTL (`max-age`, seconds, default 300) for anonymous HTML,
  `/query-index.json`, and `/sitemap.xml`. When both this and `ANON_EDGE_MAX_AGE` are `0`,
  anonymous responses are `no-store` — used on stage, which caches nothing.
- `ANON_EDGE_MAX_AGE` — CloudFront TTL (`s-maxage`, seconds) for the same responses. Defaults to
  `ANON_CACHE_MAX_AGE`. Prod sets it to `86400`, since a publish purges the
  CloudFront copy through push invalidation (see "Content caching").
- Optional: `ORIGIN` (dev origin override), `ORIGIN_AUTHENTICATION`, `IMS_ENV`, `SESSION_MAX_AGE_MS`,
  `PUSH_INVALIDATION`.

### Secrets (AWS Secrets Manager)

> Setup, rotation, console steps, and the `set-secrets.sh` helper are in [`SECRETS.md`](./SECRETS.md).

Adobe's **AWS Security Standard §3.5.8.5** prohibits plaintext secrets in Lambda environment
variables. So the secret **values** never live in `env.json`; instead the env carries only a
non-secret *id* and the function fetches the value at runtime from Secrets Manager via its
execution role:

- `SESSION_SECRET_ID` — Secrets Manager name/ARN holding the `SESSION_SECRET` value.
- `IMS_CLIENT_SECRET_ID` — Secrets Manager name/ARN holding the `IMS_CLIENT_SECRET` value.

At the first request on a cold container `handler` calls `resolveSecrets()`, which pulls each
configured id and assigns the value onto `process.env` under the plain name (`SESSION_SECRET` /
`IMS_CLIENT_SECRET`) — so the rest of the code reads it unchanged. Behavior:

- **Bounded TTL cache** (`SECRET_TTL_MS`, 10 min): a rotated secret propagates within that window
  with no redeploy. For an immediate rotation (compromise), redeploy/update the function to force
  fresh cold starts.
- **Fail-closed:** if the fetch fails on a cold container the secret stays unset, so
  `isAuthenticated` returns false (everyone anonymous) and `/auth/session` returns 500 — public
  pages still serve; nothing degrades open. A transient failure *after* a good fetch keeps the
  last-known-good value and retries after a short backoff (`SECRET_FAILURE_BACKOFF_MS`).
- **Migration-safe:** if a `*_SECRET_ID` is unset the resolver leaves any existing plaintext
  `env[name]` in place, so the code can ship before the AWS-side secrets are created.

The SDK (`@aws-sdk/client-secrets-manager`) is a **devDependency** only and is imported
dynamically — the `nodejs22.x` runtime provides AWS SDK v3, so it is not bundled. If a runtime
ever lacks it, the dynamic import degrades to fail-closed instead of crashing init; the fallback is
to `npm i` it and include `node_modules` in the deploy zip.

## Page variants (`.plain.html` and `.md`)

AEM serves every page in two head-less variants as well: `<page>.plain.html`
(body markup only) and `<page>.md` (Markdown). Neither includes the page's
`<head>`, so the `<meta name="audience" content="private">` check can't run on
the variant itself. For anonymous visitors the Lambda handles them as follows:

1. [`lib/gate.js`](./lib/gate.js) `getCanonicalPagePath` maps the variant to its
   page (`/a/b.plain.html` → `/a/b`, `/index.md` → `/`, `/a/index.md` → `/a/`).
2. Before proxying the variant, [`index.js`](./index.js) `isPublicCanonicalPage`
   fetches that page from AEM and runs `isPrivateHtml` on it. The lookup fails
   closed: a private page, a non-`200` or redirect, a non-HTML response, or a
   fetch error returns `404`, and the variant is never fetched.
3. A public variant is then served with its audience blocks stripped:
   `filterAudienceBlocks` handles `.plain.html` markup (no `<main>` wrapper), and
   `filterAudienceMarkdown` removes `Name (audience private)` block tables from
   `.md`.

Authenticated requests skip the canonical lookup. For anonymous requests it
adds one origin fetch per variant request that reaches the Lambda; the result is
cached like any other anonymous page (see "Content caching"). Both variants fall
under the default CloudFront behavior, so they always reach the Lambda.

## CloudFront routing

Only HTML, Markdown (`.md`), and JSON vary by viewer, so only they go through the Lambda. Everything
else goes straight from CloudFront to AEM.

| Behavior (in order) | Origin | Cache policy (prod) | Cache policy (stage) |
| --- | --- | --- | --- |
| `/.rum/*`, `/.optel/*` (all methods) | AEM | `CachingDisabled` + `spectrum-rum` | `CachingDisabled` + `spectrum-rum` |
| `*/media_*`, `/media_*` | AEM | `spectrum-media` | `CachingDisabled` + `spectrum-media-query` |
| `*.js`, `*.mjs`, `*.css`, `*.svg`, `*.ico`, `*.png`, `*.jpg`, `*.jpeg`, `*.gif`, `*.webp`, `*.avif`, `*.woff`, `*.woff2`, `*.ttf`, `*.otf`, `*.xml`, `*.txt` | AEM | `spectrum-assets` | `CachingDisabled` |
| Default (HTML, JSON, anything else) | Lambda | `spectrum-content` | `CachingDisabled` |

`*.xml` also matches `/sitemap.xml`, which must reach the Lambda to be filtered.
Add an exact `/sitemap.xml` behavior ahead of `*.xml` with
[`add-sitemap-behavior.sh`](./add-sitemap-behavior.sh) (see "Keep `/sitemap.xml`
on the Lambda").

[`set-content-caching.sh`](./set-content-caching.sh) manages all of this. It's
idempotent, so rerun it after changing the extension list or a policy:

```bash
# prod
DIST_ID=E3VFWCMFUVXVV ./set-content-caching.sh
# stage: cache nothing (AEM push invalidation only covers main--*.aem.live)
NO_CACHE=1 DIST_ID=E2RMZZGQ0O3SJ1 ./set-content-caching.sh
# undo: assets back through the Lambda, default behavior on CachingDisabled
REVERT=1 DIST_ID=<id> ./set-content-caching.sh
```

The asset behaviors are cloned from the `*/media_*` behavior, so they share its
AEM origin headers (including `Authorization`) and the `spectrum-strip-headers`
function. Run [`add-media-behavior.sh`](./add-media-behavior.sh) first on a new
distribution.

CloudFront doesn't match root-level images (`/media_<sha>.png`) to `*/media_*`,
so the script adds a `/media_*` copy before the asset behaviors. Without it,
`*.png` would catch them, drop `width` and `format`, and serve the full-size
original. On stage, `CachingDisabled` forwards no query strings, so both media
behaviors also use the `spectrum-media-query` origin request policy, which
forwards only the image parameters.

RUM beacons (`/.rum/*`, `/.optel/*`) go straight to AEM too, uncached and with
POST allowed. Through the Lambda they'd fail with a 403: the function URL
rejects POSTs without an `x-amz-content-sha256` body hash, and `sendBeacon`
can't send one. The `spectrum-rum` origin request policy forwards
`content-type`, `user-agent`, `referer`, `origin` and the query string, but no
cookies.

Assets skip the Lambda gate. A non-HTML file under `/drafts/` (for example,
`/drafts/diagram.svg`) is public. HTML and JSON under `/drafts/` still go through
the Lambda and stay private.

The script also turns on Origin Shield for both origins (off with `NO_CACHE=1`),
so CloudFront edge locations share one regional cache in front of each origin.

### Alias host redirect

Prod also answers on `s2.spectrum.adobe.com`. A viewer-request CloudFront
Function ([`cloudfront-functions/canonical-host.js`](./cloudfront-functions/canonical-host.js))
301s it to `https://spectrum.adobe.com`, keeping the path and query string. It
runs before the cache, so these requests never reach the Lambda or AEM.
[`set-canonical-host-redirect.sh`](./set-canonical-host-redirect.sh) publishes
the function and attaches it to every behavior:

```bash
DIST_ID=E3VFWCMFUVXVV ./set-canonical-host-redirect.sh
# undo: detach it everywhere
REMOVE=1 DIST_ID=E3VFWCMFUVXVV ./set-canonical-host-redirect.sh
```

`set-content-caching.sh` clones its behaviors from `*/media_*`, so they keep the
function when it's re-run. Re-run this script after adding behaviors any other
way.

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
push invalidation (immutable media never needs it). Because media bypasses the
Lambda, token-based origin auth needs the token in **both** places: the Lambda
path resolves `ORIGIN_AUTHENTICATION` from Secrets Manager
(`ORIGIN_AUTHENTICATION_ID` in the env file — see [`SECRETS.md`](./SECRETS.md)),
and the media behavior carries a literal `Authorization: token hlx_…` origin
header. Pass the token to `add-media-behavior.sh` to add it:
`ORIGIN_AUTHENTICATION=hlx_… DIST_ID=<stage-dist> AEM_HOST_SUFFIX=aem.page ./add-media-behavior.sh`
(CloudFront origin custom headers can't reference Secrets Manager, so this value
lives in the distribution config).

### Keep `/sitemap.xml` on the Lambda

A distribution that also sends whole file types straight to AEM (extension
behaviors such as `*.xml`, `*.txt`, or `*.js` targeting `aem-media-origin`)
catches `/sitemap.xml` with `*.xml`. The sitemap then skips the Lambda: private
pages stay listed and preview URLs keep their `main--…aem.page` host.
[`add-sitemap-behavior.sh`](./add-sitemap-behavior.sh) fixes this by adding an
exact `/sitemap.xml` behavior, cloned from the default (Lambda) behavior, ahead
of every other pattern. CloudFront uses the first matching behavior, so other
`.xml` files still go straight to AEM. The script is idempotent and supports
`DRY_RUN=1` and `REVERT=1`:

```bash
DRY_RUN=1 DIST_ID=<dist-id> ./add-sitemap-behavior.sh   # preview the behavior order
DIST_ID=<dist-id> ./add-sitemap-behavior.sh
```

Once the distribution is deployed, invalidate `/sitemap.xml`.
[`set-content-caching.sh`](./set-content-caching.sh) adds a `*.xml` behavior, so
run this script after it. The behavior copies the default behavior's cache
policy at the time it runs, so rerun it whenever `set-content-caching.sh`
changes that policy (for example, switching between `NO_CACHE=1` and cached).
A distribution with no extension behaviors doesn't need this.

## Content caching (the default/Lambda behavior)

HTML and JSON can differ by viewer: private pages, `audience-*` blocks, the
private rows of `/query-index.json`, and the private entries of `/sitemap.xml`.
The `spectrum-content` policy keeps them apart:

- **Cache key:** the `spectrum_session` cookie, plus the query params the Lambda
  uses (`compact`, `limit`, `offset`, `sheet`). Anonymous viewers (no cookie)
  share one entry. Other query strings are still forwarded but don't create new
  entries.
- **TTL:** the policy follows the Lambda's `Cache-Control` (`DefaultTTL 0`), so a
  response caches only when the Lambda allows it.

`/sitemap.xml` URLs in `<loc>` and alternate links are rewritten from AEM
origins to the environment's public origin for all viewers. For anonymous
viewers, `<url>` entries are also removed when the query index marks the path
`audience: private` or the gate denies it (`PRIVATE_DENY_*`). The sitemap
carries no audience data, so the Lambda reads the full query index from AEM for
each anonymous sitemap request. A private page that isn't in the query index
can't be detected and stays listed (the page itself still 404s). Fails closed:
if the index can't be read, or the sitemap isn't a `<urlset>`, anonymous callers
get a `404`. A sitemap index (`<sitemapindex>`) is not supported; its child
sitemaps would need their own entries in `PUBLIC_FILTER_PATHS`.

What the Lambda sends:

| Response | `Cache-Control` | Cached by CloudFront |
| --- | --- | --- |
| Anonymous HTML, `/query-index.json`, and `/sitemap.xml` | `public, max-age=<ANON_CACHE_MAX_AGE>, s-maxage=<ANON_EDGE_MAX_AGE>` | Yes, one shared copy |
| Authenticated HTML, JSON, and `/sitemap.xml` | `private, no-store` | No |
| Gate 404s and failed query-index or sitemap filtering | `no-store` | No |
| Redirects that carry the viewer's query string | `no-store` | No |

For authenticated requests the Lambda removes `If-None-Match` and
`If-Modified-Since` before calling AEM. A browser can still hold the anonymous
copy of a page from before sign-in; without this, AEM could answer `304` and the
browser would keep showing that copy.

Assets keep AEM's **ETag**, so CloudFront's post-TTL revalidation is a cheap
conditional `304`. Anonymous pages and the anonymous `/query-index.json` get a
**gated ETag** instead ([lib/etag.js](./lib/etag.js)): AEM's tag with a
`--gate-v<N>` suffix, and no `Last-Modified`. On revalidation the Lambda forwards
only tags carrying the current suffix (suffix stripped) and never
`If-Modified-Since`, so a `304` only ever confirms a copy this gate version
produced. Any other conditional — a copy cached before the gate existed, under an
older gate version, or an existence probe for a private page — is dropped, AEM
returns a full `200`, and the gate runs again. An anonymous `304` that arrives
without a gated tag being forwarded is turned into a `404` (fail closed).
`Range`/`If-Range` are stripped for pages and the filtered paths, and an
anonymous page answered with any other 2xx (e.g. a `206` slice) is a `404`: only
a whole `200` body can be gated.
Revalidation stays cheap for current copies. The filtered anonymous sitemap drops
its `ETag` and `Last-Modified` entirely and always fetches a full `200`, because
its validators track the sitemap alone, not the query index that decides which
entries are removed.

> ⚠️ **Bump `GATE_ETAG_VERSION` on filtering-logic deploys.** AEM's ETag tracks
> the page, not this Lambda's filtering/gating code. When you change
> `filterAudienceBlocks` / `isPrivateHtml` / the gate / the query-index filter,
> increment `GATE_ETAG_VERSION` in [lib/etag.js](./lib/etag.js). Every cached
> anonymous copy then fails revalidation and is re-fetched and re-filtered, with
> no CloudFront invalidation needed. Clients and edges that still hold a fresh
> copy keep it until its TTL expires (`s-maxage` at the edge — a day on prod);
> for a security-relevant fix, also run
> `aws cloudfront create-invalidation --distribution-id <id> --paths "/*"` (this
> uses your role's permission, so it works in the klam-federated account).

> ⚠️ **Test for leaks before changing prod.** With a real `spectrum_session`
> cookie, confirm that anonymous pages and `/query-index.json` return
> `X-Cache: Hit` on repeat with private content removed, that authenticated
> requests are never a `Hit`, and that a private page is a `404` for anonymous
> viewers and real content for authenticated ones.

### Known gaps

- **Browser copies after sign-in.** Anonymous responses have a browser
  `max-age`. After sign-in, the page reloads and is fetched fresh, but
  subresources the page fetches (such as `/query-index.json`) can come from the
  browser's anonymous copy until it expires. Sending `max-age=0` to browsers
  (with `s-maxage` for CloudFront) and `Vary: Cookie` would close this.
- **Authenticated HTML and JSON aren't cached.** Sharing one cached copy across
  signed-in viewers would need CloudFront to verify the session cookie, which
  means storing `SESSION_SECRET` outside Secrets Manager.

### Push invalidation

With [AEM push invalidation](https://www.aem.live/docs/setup-byo-cdn-push-invalidation-for-cloudfront),
a publish purges CloudFront, so `ANON_EDGE_MAX_AGE` can be raised well above the
default. It only covers `main--*.aem.live`, so it doesn't apply to stage. Prod
(`E3VFWCMFUVXVV`) has it set up:

- Cache tags are on (`CacheTagConfig`, header `x-amz-meta-cache-tag`), set by
  `set-content-caching.sh`, so AEM can purge by tag instead of purging
  everything. Both the Lambda and AEM asset responses carry the header.
- AEM calls CloudFront as the IAM user `invalidator` (group `Invalidator`),
  which `adobe.design` also uses. To check that publishes reach CloudFront,
  look in CloudTrail for `CreateInvalidation` events from `invalidator`.
- The `cdn.prod` config (`host`, `type: cloudfront`, `distributionId`,
  `accessKeyId`, `secretAccessKey`, `tagInvalidationEnabled: true`) is posted
  to the AEM config service.

## Access allowlist (Adobe VPN only)

The preview distribution is restricted to Adobe corporate VPN traffic with AWS
WAF. This is a network gate in front of the app's own IMS/DA auth: a request from
any other IP gets a `403` before it reaches the Lambda.

[`set-vpn-allowlist.sh`](./set-vpn-allowlist.sh) manages the whole setup and is
safe to re-run. It has three phases:

- **Preview (default):** extract and print the CIDRs; change nothing.
- **`APPLY=1`:** create or refresh the WAF **IP set** (`adobe-vpn-egress`, plus
  `adobe-vpn-egress-v6` when the source has IPv6) from the CIDRs.
- **`ENFORCE=1`:** create or update the **Web ACL** (`preview-vpn-only`, default
  action **Block**, one rule that **allows** the IP set), associate it with the
  preview distribution, and **disable IPv6** on that distribution
  (`KEEP_IPV6=1` keeps IPv6 on).

The CIDRs come from the IT-Network egress list,
`git.corp.adobe.com/IT-Network/egress/blob/master/nets.json` — the source of
truth for Adobe corporate egress. Download it (corp git needs your credentials,
so the script does not fetch it) and pass the path. Extraction is
schema-agnostic: every valid IPv4/IPv6 address or CIDR in the file is used, and
bare IPs become `/32` or `/128`.

```bash
# preview only
NETS_FILE=~/Downloads/nets.json ./set-vpn-allowlist.sh
# first-time setup: write the IP set, create + associate the Web ACL, turn IPv6 off
APPLY=1 ENFORCE=1 NETS_FILE=~/Downloads/nets.json ./set-vpn-allowlist.sh
# later: refresh the CIDRs only (the Web ACL keeps pointing at the same IP set)
APPLY=1 NETS_FILE=~/Downloads/nets.json ./set-vpn-allowlist.sh
```

Notes:

- **WAF for CloudFront is global** — the script uses `--scope CLOUDFRONT --region
  us-east-1`. Only the preview distribution is changed; prod is untouched.
- **IPv6 is disabled** so every viewer presents an IPv4 address the allowlist can
  match. The egress list is IPv4, so leaving IPv6 on would `403` anyone arriving
  over it. Use `KEEP_IPV6=1` (with IPv6 ranges in the source) to keep it on.
- **True client IP:** WAF matches the viewer's source IP — the VPN egress IP for
  your users — so no forwarded-header setup is needed.
- **Overrides:** `IPSET_NAME`, `WEB_ACL_NAME`, `DIST_DOMAIN`, `KEEP_IPV6`.
- **To lift the restriction:** clear the distribution's `WebACLId` (and re-enable
  IPv6 if you turned it off).
- **Cost:** about $5/month per Web ACL, plus $1/rule and per-request charges.
