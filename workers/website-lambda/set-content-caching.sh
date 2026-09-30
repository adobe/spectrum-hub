#!/usr/bin/env bash
# Configure CloudFront routing and caching for an existing distribution.
# Idempotent; safe to re-run. It:
#
#   1. Content (default behavior -> Lambda): HTML and JSON, the only responses
#      that vary by viewer. Uses a custom "spectrum-content" cache policy that
#      honours the Lambda's Cache-Control and keys the cache on the
#      spectrum_session cookie + the query params the Lambda uses (compact, limit,
#      offset, sheet - see formatSearchParams in index.js). Other query strings
#      are still forwarded but don't split the cache.
#   2. Static assets (*.js, *.css, *.svg, ... -> AEM directly): one behavior per
#      extension, cloned from the */media_* behavior (same AEM origin, origin
#      headers, and strip-headers function), so they bypass the Lambda. A
#      "spectrum-assets" cache policy with no cookie and no query strings shares
#      one edge copy across all viewers. Assets skip the Lambda gate, so e.g.
#      /drafts/foo.svg is public; HTML/JSON under /drafts/ still go through it.
#   3. Origin Shield on both origins, so edge locations share one regional cache.
#   4. Cache tags (x-amz-meta-cache-tag), for AEM push invalidation by tag. After
#      first enabling them, invalidate "/*" once: objects cached before that carry
#      no tags, so tag purges can't reach them.
#
# Why the content behavior is safe: the Lambda sends `no-store` on every
# viewer-varying response (authenticated HTML/JSON, gate 404s), so only
# anonymous content caches, and keying on spectrum_session keeps anonymous (no
# cookie) and authenticated entries separate. See README "Content caching".
#
# Run it yourself (auto mode blocks AWS write calls). Required:
#   DIST_ID  - the CloudFront distribution id (e.g. E3VFWCMFUVXVV)
# Optional:
#   NO_CACHE=1                - cache nothing: every behavior (default, assets,
#                               media) on CachingDisabled and Origin Shield off.
#                               For stage, which AEM can't purge (push
#                               invalidation only covers main--*.aem.live).
#   CONTENT_CACHE_POLICY_NAME - default spectrum-content
#   ASSET_CACHE_POLICY_NAME   - default spectrum-assets
#   MEDIA_CACHE_POLICY_NAME   - default spectrum-media (restored if NO_CACHE was used)
#   ASSET_EXTENSIONS          - space-separated list (default below)
#   LAMBDA_SHIELD_REGION      - default us-east-2 (the Lambda's region)
#   AEM_SHIELD_REGION         - default us-east-1
# Examples:
#   DIST_ID=E3VFWCMFUVXVV ./set-content-caching.sh             # prod
#   NO_CACHE=1 DIST_ID=E2RMZZGQ0O3SJ1 ./set-content-caching.sh # stage
#
# REVERT: set REVERT=1 to remove the asset behaviors (assets go back through the
# Lambda) and put the default behavior on CachingDisabled with Lambda Origin
# Shield off. The media behavior is left as-is:
#   REVERT=1 DIST_ID=E3VFWCMFUVXVV ./set-content-caching.sh
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=/dev/null
[ -f "$SCRIPT_DIR/deploy.env" ] && . "$SCRIPT_DIR/deploy.env"

PROFILE="${AWS_PROFILE:-spectrumHub}"
DIST_ID="${DIST_ID:?Set DIST_ID to the CloudFront distribution id}"
CONTENT_CACHE_POLICY_NAME="${CONTENT_CACHE_POLICY_NAME:-spectrum-content}"
ASSET_CACHE_POLICY_NAME="${ASSET_CACHE_POLICY_NAME:-spectrum-assets}"
MEDIA_CACHE_POLICY_NAME="${MEDIA_CACHE_POLICY_NAME:-spectrum-media}"
ASSET_EXTENSIONS="${ASSET_EXTENSIONS:-js mjs css svg ico png jpg jpeg gif webp avif woff woff2 ttf otf xml txt}"
LAMBDA_SHIELD_REGION="${LAMBDA_SHIELD_REGION:-us-east-2}"
AEM_SHIELD_REGION="${AEM_SHIELD_REGION:-us-east-1}"
LAMBDA_ORIGIN_ID="${LAMBDA_ORIGIN_ID:-website-lambda-function-url}"
AEM_ORIGIN_ID="${AEM_ORIGIN_ID:-aem-media-origin}"
MEDIA_PATH_PATTERN="*/media_*"
# Managed CachingDisabled.
CACHING_DISABLED_ID="4135ea2d-6df8-44a3-9df3-4b5a84be39ad"
REVERT="${REVERT:-}"
NO_CACHE="${NO_CACHE:-}"
if [ -n "$REVERT" ] && [ -n "$NO_CACHE" ]; then
  echo "ERROR: set REVERT or NO_CACHE, not both." >&2
  exit 1
fi

find_cache_policy() {
  local id
  id="$(aws cloudfront list-cache-policies --type custom --profile "$PROFILE" --region us-east-1 \
    --query "CachePolicyList.Items[?CachePolicy.CachePolicyConfig.Name=='$1'].CachePolicy.Id | [0]" --output text 2>/dev/null || true)"
  [ "$id" = "None" ] && id=""
  printf '%s' "$id"
}

# Create-or-update a custom cache policy from a JSON config file, echoing its id.
# Looked up by name, so re-running updates the existing policy in place.
ensure_cache_policy() {
  local name="$1" cfgfile="$2" id etag
  id="$(find_cache_policy "$name")"
  if [ -z "$id" ]; then
    id="$(aws cloudfront create-cache-policy --profile "$PROFILE" --region us-east-1 \
      --cache-policy-config "file://$cfgfile" --query 'CachePolicy.Id' --output text)"
  else
    etag="$(aws cloudfront get-cache-policy --id "$id" --profile "$PROFILE" --region us-east-1 --query ETag --output text)"
    aws cloudfront update-cache-policy --id "$id" --if-match "$etag" --profile "$PROFILE" --region us-east-1 \
      --cache-policy-config "file://$cfgfile" >/dev/null
  fi
  printf '%s' "$id"
}

WORK="$(mktemp -d)"
trap 'rm -rf "$WORK"' EXIT

CONTENT_POLICY_ID=""
ASSET_POLICY_ID=""
MEDIA_POLICY_ID=""
if [ -n "$REVERT" ]; then
  echo "Reverting distribution $DIST_ID: assets back through the Lambda, default on CachingDisabled"
elif [ -n "$NO_CACHE" ]; then
  echo "Distribution $DIST_ID: assets direct to AEM, every behavior on CachingDisabled"
  CONTENT_POLICY_ID="$CACHING_DISABLED_ID"
  ASSET_POLICY_ID="$CACHING_DISABLED_ID"
  MEDIA_POLICY_ID="$CACHING_DISABLED_ID"
else
  # Content: DefaultTTL 0 => nothing caches unless the Lambda says so, so its
  # no-store responses are never cached.
  cat > "$WORK/content.json" <<JSON
{
  "Name": "$CONTENT_CACHE_POLICY_NAME",
  "Comment": "Content: honour origin Cache-Control; key on spectrum_session + origin-used query params",
  "DefaultTTL": 0,
  "MaxTTL": 31536000,
  "MinTTL": 0,
  "ParametersInCacheKeyAndForwardedToOrigin": {
    "EnableAcceptEncodingGzip": true,
    "EnableAcceptEncodingBrotli": true,
    "HeadersConfig": { "HeaderBehavior": "none" },
    "CookiesConfig": { "CookieBehavior": "whitelist", "Cookies": { "Quantity": 1, "Items": ["spectrum_session"] } },
    "QueryStringsConfig": {
      "QueryStringBehavior": "whitelist",
      "QueryStrings": { "Quantity": 4, "Items": ["compact", "limit", "offset", "sheet"] }
    }
  }
}
JSON
  # Assets: no cookie, no query strings. Honours AEM's max-age / s-maxage.
  cat > "$WORK/assets.json" <<JSON
{
  "Name": "$ASSET_CACHE_POLICY_NAME",
  "Comment": "Static assets direct from AEM: shared across viewers (no cookie/query in key), honour origin Cache-Control",
  "DefaultTTL": 0,
  "MaxTTL": 31536000,
  "MinTTL": 0,
  "ParametersInCacheKeyAndForwardedToOrigin": {
    "EnableAcceptEncodingGzip": true,
    "EnableAcceptEncodingBrotli": true,
    "HeadersConfig": { "HeaderBehavior": "none" },
    "CookiesConfig": { "CookieBehavior": "none" },
    "QueryStringsConfig": { "QueryStringBehavior": "none" }
  }
}
JSON
  CONTENT_POLICY_ID="$(ensure_cache_policy "$CONTENT_CACHE_POLICY_NAME" "$WORK/content.json")"
  ASSET_POLICY_ID="$(ensure_cache_policy "$ASSET_CACHE_POLICY_NAME" "$WORK/assets.json")"
  # Media policy is owned by add-media-behavior.sh; only look it up here so a
  # distribution previously set to NO_CACHE gets it back.
  MEDIA_POLICY_ID="$(find_cache_policy "$MEDIA_CACHE_POLICY_NAME")"
  echo "Content cache policy: $CONTENT_POLICY_ID"
  echo "Asset cache policy:   $ASSET_POLICY_ID"
  echo "Media cache policy:   ${MEDIA_POLICY_ID:-<not found; media behavior left as-is>}"
fi

aws cloudfront get-distribution-config --profile "$PROFILE" --region us-east-1 \
  --id "$DIST_ID" > "$WORK/get.json"
ETAG="$(python3 -c "import json;print(json.load(open('$WORK/get.json'))['ETag'])")"

REVERT="$REVERT" NO_CACHE="$NO_CACHE" CACHING_DISABLED_ID="$CACHING_DISABLED_ID" \
CONTENT_POLICY_ID="$CONTENT_POLICY_ID" ASSET_POLICY_ID="$ASSET_POLICY_ID" MEDIA_POLICY_ID="$MEDIA_POLICY_ID" \
ASSET_EXTENSIONS="$ASSET_EXTENSIONS" LAMBDA_SHIELD_REGION="$LAMBDA_SHIELD_REGION" AEM_SHIELD_REGION="$AEM_SHIELD_REGION" \
LAMBDA_ORIGIN_ID="$LAMBDA_ORIGIN_ID" AEM_ORIGIN_ID="$AEM_ORIGIN_ID" MEDIA_PATH_PATTERN="$MEDIA_PATH_PATTERN" \
python3 - "$WORK/get.json" "$WORK/cfg.json" <<'PY'
import copy, json, os, re, sys
cfg = json.load(open(sys.argv[1]))["DistributionConfig"]
e = os.environ
revert, no_cache = bool(e["REVERT"]), bool(e["NO_CACHE"])

# 1. Default (content) behavior -> Lambda. The origin-request policy
#    (AllViewerExceptHostHeader, which forwards the cookie + all query strings to
#    the Lambda) is left untouched.
cfg["DefaultCacheBehavior"]["CachePolicyId"] = (
    e["CACHING_DISABLED_ID"] if revert else e["CONTENT_POLICY_ID"])

items = cfg.get("CacheBehaviors", {}).get("Items") or []
media = next((b for b in items if b["PathPattern"] == e["MEDIA_PATH_PATTERN"]), None)
if media is None and not revert:
    sys.exit(f"no {e['MEDIA_PATH_PATTERN']} behavior; run add-media-behavior.sh first")
if media is not None and not revert and e["MEDIA_POLICY_ID"]:
    media["CachePolicyId"] = e["MEDIA_POLICY_ID"]

# 2. Asset behaviors. Drop any "*.<ext>" behaviors this script added before
#    (to either origin), then append the current set after */media_*, so media
#    keeps precedence for media_<sha>.png etc.
ours = re.compile(r"^\*\.[A-Za-z0-9]+$")
origins = {e["LAMBDA_ORIGIN_ID"], e["AEM_ORIGIN_ID"]}
items = [b for b in items if not (b["TargetOriginId"] in origins and ours.match(b["PathPattern"]))]
if not revert:
    for ext in e["ASSET_EXTENSIONS"].split():
        # Clone the media behavior: same AEM origin, origin headers, no
        # origin-request policy (cookie never forwarded), strip-headers function.
        b = copy.deepcopy(media)
        b["PathPattern"] = f"*.{ext}"
        b["CachePolicyId"] = e["ASSET_POLICY_ID"]
        items.append(b)
cfg["CacheBehaviors"] = {"Quantity": len(items), "Items": items} if items else {"Quantity": 0}

# 3. Origin Shield. Off everywhere when nothing is cached (it would only add a
#    hop); REVERT only touches the Lambda origin.
for origin in cfg["Origins"]["Items"]:
    if origin["Id"] == e["LAMBDA_ORIGIN_ID"]:
        origin["OriginShield"] = {"Enabled": False} if (revert or no_cache) else {
            "Enabled": True, "OriginShieldRegion": e["LAMBDA_SHIELD_REGION"]}
    elif origin["Id"] == e["AEM_ORIGIN_ID"] and not revert:
        origin["OriginShield"] = {"Enabled": False} if no_cache else {
            "Enabled": True, "OriginShieldRegion": e["AEM_SHIELD_REGION"]}

# 4. Cache tags, so AEM push invalidation can purge by tag (tagInvalidationEnabled
#    in the AEM cdn.prod config) instead of purging everything. Left untouched on
#    REVERT; not needed when nothing is cached.
if not revert:
    if no_cache:
        cfg.pop("CacheTagConfig", None)
    else:
        cfg["CacheTagConfig"] = {"HeaderName": "x-amz-meta-cache-tag"}

json.dump(cfg, open(sys.argv[2], "w"))
print("default CachePolicyId ->", cfg["DefaultCacheBehavior"]["CachePolicyId"])
print("CacheTagConfig ->", cfg.get("CacheTagConfig"))
for b in items:
    print(f"  {b['PathPattern']:<12} -> {b['TargetOriginId']:<28} {b['CachePolicyId']}")
for o in cfg["Origins"]["Items"]:
    print(f"  origin {o['Id']:<28} shield {o.get('OriginShield')}")
PY

aws cloudfront update-distribution --profile "$PROFILE" --region us-east-1 \
  --id "$DIST_ID" --if-match "$ETAG" --distribution-config "file://$WORK/cfg.json" \
  --query 'Distribution.{Id:Id,Status:Status,DefaultCachePolicy:DistributionConfig.DefaultCacheBehavior.CachePolicyId}' \
  --output table

echo "Done. Distribution is redeploying (a few minutes)."
