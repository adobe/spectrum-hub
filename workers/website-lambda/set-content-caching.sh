#!/usr/bin/env bash
# Enable edge-caching on the content (default) CloudFront behavior of an existing
# distribution, safely. Swaps the default behavior's cache policy from
# CachingDisabled to a custom "spectrum-content" policy that honours AEM's
# Cache-Control and keys the cache on the spectrum_session cookie + query strings.
#
# Why this is safe: the Lambda already sends `no-store` on every viewer-varying
# response (filtered HTML, query-index, gate 404s), so only AEM-cacheable public
# assets cache. Keying on spectrum_session keeps anonymous (no cookie, shared) and
# authenticated (unique cookie) entries separate, so an authenticated /drafts/
# asset can never be served to an anonymous visitor. See README "Content caching".
#
# Phase 2 (caching anonymous HTML/query-index) additionally needs the index.js
# Cache-Control change deployed; this script only flips the CloudFront policy.
#
# Run it yourself (auto mode blocks AWS write calls). Required:
#   DIST_ID  - the CloudFront distribution id (e.g. E3VFWCMFUVXVV)
# Optional:
#   CONTENT_CACHE_POLICY_ID   - pin an existing policy id (skips the ensure step)
#   CONTENT_CACHE_POLICY_NAME - custom policy name (default spectrum-content)
# Example:
#   DIST_ID=E2RMZZGQ0O3SJ1 ./set-content-caching.sh
#
# REVERT: set REVERT=1 to put the default behavior back on CachingDisabled:
#   REVERT=1 DIST_ID=E3VFWCMFUVXVV ./set-content-caching.sh
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=/dev/null
[ -f "$SCRIPT_DIR/deploy.env" ] && . "$SCRIPT_DIR/deploy.env"

PROFILE="${AWS_PROFILE:-spectrumHub}"
DIST_ID="${DIST_ID:?Set DIST_ID to the CloudFront distribution id}"
CONTENT_CACHE_POLICY_NAME="${CONTENT_CACHE_POLICY_NAME:-spectrum-content}"
CONTENT_CACHE_POLICY_ID="${CONTENT_CACHE_POLICY_ID:-}"
# Managed CachingDisabled - the revert target and the current default.
CACHING_DISABLED_ID="4135ea2d-6df8-44a3-9df3-4b5a84be39ad"
REVERT="${REVERT:-}"

# Create-or-update the custom content cache policy, echoing its id. Idempotent
# (looks it up by name first). Honours the origin's Cache-Control (DefaultTTL 0 =>
# nothing cached unless AEM says so, so the Lambda's no-store responses are never
# cached) and keys on the spectrum_session cookie + all query strings.
ensure_content_cache_policy() {
  local id cfgfile etag
  cfgfile="$(mktemp)"
  cat > "$cfgfile" <<JSON
{
  "Name": "$CONTENT_CACHE_POLICY_NAME",
  "Comment": "Content: honour AEM Cache-Control; key on spectrum_session + query strings",
  "DefaultTTL": 0,
  "MaxTTL": 31536000,
  "MinTTL": 0,
  "ParametersInCacheKeyAndForwardedToOrigin": {
    "EnableAcceptEncodingGzip": true,
    "EnableAcceptEncodingBrotli": true,
    "HeadersConfig": { "HeaderBehavior": "none" },
    "CookiesConfig": { "CookieBehavior": "whitelist", "Cookies": { "Quantity": 1, "Items": ["spectrum_session"] } },
    "QueryStringsConfig": { "QueryStringBehavior": "all" }
  }
}
JSON
  id="$(aws cloudfront list-cache-policies --type custom --profile "$PROFILE" --region us-east-1 \
    --query "CachePolicyList.Items[?CachePolicy.CachePolicyConfig.Name=='$CONTENT_CACHE_POLICY_NAME'].CachePolicy.Id | [0]" --output text 2>/dev/null || true)"
  if [ -z "$id" ] || [ "$id" = "None" ]; then
    id="$(aws cloudfront create-cache-policy --profile "$PROFILE" --region us-east-1 \
      --cache-policy-config "file://$cfgfile" --query 'CachePolicy.Id' --output text)"
  else
    etag="$(aws cloudfront get-cache-policy --id "$id" --profile "$PROFILE" --region us-east-1 --query ETag --output text)"
    aws cloudfront update-cache-policy --id "$id" --if-match "$etag" --profile "$PROFILE" --region us-east-1 \
      --cache-policy-config "file://$cfgfile" >/dev/null
  fi
  rm -f "$cfgfile"
  printf '%s' "$id"
}

if [ -n "$REVERT" ]; then
  TARGET_POLICY="$CACHING_DISABLED_ID"
  echo "Reverting distribution $DIST_ID default behavior -> CachingDisabled"
else
  [ -z "$CONTENT_CACHE_POLICY_ID" ] && CONTENT_CACHE_POLICY_ID="$(ensure_content_cache_policy)"
  TARGET_POLICY="$CONTENT_CACHE_POLICY_ID"
  echo "Setting distribution $DIST_ID default behavior -> content cache policy $TARGET_POLICY"
fi

WORK="$(mktemp -d)"
trap 'rm -rf "$WORK"' EXIT

aws cloudfront get-distribution-config --profile "$PROFILE" --region us-east-1 \
  --id "$DIST_ID" > "$WORK/get.json"
ETAG="$(python3 -c "import json;print(json.load(open('$WORK/get.json'))['ETag'])")"

TARGET_POLICY="$TARGET_POLICY" python3 - "$WORK/get.json" "$WORK/cfg.json" <<'PY'
import json, os, sys
cfg = json.load(open(sys.argv[1]))["DistributionConfig"]
# Only the default (content) behavior changes; the */media_* behavior and the
# origin-request policy (AllViewerExceptHostHeader, which still forwards the
# cookie + query strings to the Lambda) are left untouched.
cfg["DefaultCacheBehavior"]["CachePolicyId"] = os.environ["TARGET_POLICY"]
json.dump(cfg, open(sys.argv[2], "w"))
print("default CachePolicyId ->", cfg["DefaultCacheBehavior"]["CachePolicyId"])
PY

aws cloudfront update-distribution --profile "$PROFILE" --region us-east-1 \
  --id "$DIST_ID" --if-match "$ETAG" --distribution-config "file://$WORK/cfg.json" \
  --query 'Distribution.{Id:Id,Status:Status,DefaultCachePolicy:DistributionConfig.DefaultCacheBehavior.CachePolicyId}' \
  --output table

echo "Done. Distribution is redeploying (a few minutes)."
