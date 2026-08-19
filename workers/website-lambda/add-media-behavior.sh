#!/usr/bin/env bash
# Retrofit an existing CloudFront distribution with media offload: a second
# origin pointing at the public AEM origin, plus a "*/media_*" cache behavior
# that serves immutable content-hashed media (media_<sha>.<ext>) straight from
# AEM - bypassing the Lambda Function URL and its 6 MB buffered-response cap.
#
# setup-preview-distribution.sh already bakes this into NEW distributions; this
# script is for ones created before it existed. It is idempotent - safe to
# re-run (it updates the origin/behavior in place rather than duplicating them).
#
# Media stays as "gated" as before: the app already treats every /media_ path as
# public (lib/gate.js isPublicMedia), and the content-hash URL is only revealed
# inside HTML the Lambda still gates.
#
# NOTE: no BYO-CDN onboarding is needed for CloudFront to pull from the AEM
# origin. The one gotcha is the cache policy: the managed "…-QueryStrings" policy
# (QueryStringBehavior=all) makes CloudFront fail the origin connection with a 502
# "can't connect", so this script creates a custom whitelist policy instead. See
# README "Media offload".
#
# Run it yourself (auto mode blocks AWS write calls). Required:
#   DIST_ID           - the CloudFront distribution id (e.g. E3VFWCMFUVXVV)
#   AEM_HOST_SUFFIX   - aem.live (prod) or aem.page (stage)
# Optional:
#   FORWARDED_HOST    - X-Forwarded-Host origin header value (default: this
#                       distribution's own *.cloudfront.net domain)
#   STRIP_FN_NAME     - CloudFront Function name (default spectrum-strip-headers)
# Example:
#   DIST_ID=E2RMZZGQ0O3SJ1 AEM_HOST_SUFFIX=aem.page ./add-media-behavior.sh
#
# REVERT: set REVERT=1 to remove the media origin + "*/media_*" behavior again,
# sending media back through the Lambda (direct CloudFront->aem.live needs the
# site to be onboarded as a Helix/EDS BYO-CDN, which spectrum-hub is not):
#   REVERT=1 DIST_ID=E3VFWCMFUVXVV ./add-media-behavior.sh
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=/dev/null
[ -f "$SCRIPT_DIR/deploy.env" ] && . "$SCRIPT_DIR/deploy.env"

PROFILE="${AWS_PROFILE:-spectrumHub}"
DIST_ID="${DIST_ID:?Set DIST_ID to the CloudFront distribution id}"
AEM_ORG="${AEM_ORG:-adobe}"
AEM_SITE="${AEM_SITE:-spectrum-hub}"
AEM_HOST_SUFFIX="${AEM_HOST_SUFFIX:-aem.live}"
AEM_ORIGIN_DOMAIN="${AEM_ORIGIN_DOMAIN:-main--${AEM_SITE}--${AEM_ORG}.${AEM_HOST_SUFFIX}}"
# Cache policy for the media behavior. We create a CUSTOM policy that keys the
# cache on the image params only (width/height/format/optimize/quality) with a
# long TTL. IMPORTANT: the managed "…-QueryStrings" policy
# (4cc15a8a…, QueryStringBehavior=all) makes CloudFront fail the aem.page origin
# connection with a 502 "can't connect"; a whitelist policy connects fine AND
# caches per variant. Set MEDIA_CACHE_POLICY_ID to pin an existing policy id
# (skips the ensure step, e.g. for A/B testing).
MEDIA_CACHE_POLICY_NAME="${MEDIA_CACHE_POLICY_NAME:-spectrum-media}"
MEDIA_CACHE_POLICY_ID="${MEDIA_CACHE_POLICY_ID:-}"
# X-Forwarded-Host origin header (aem.live BYO-CDN doc requires it). Cosmetic for
# binary media, but kept for doc-compliance and parity with the Lambda, which
# sends x-forwarded-host = the request host (index.js). Defaults to this
# distribution's own CloudFront domain when not overridden.
FORWARDED_HOST="${FORWARDED_HOST:-}"
# CloudFront Function (viewer-response) that strips Age / X-Robots-Tag from the
# direct-from-AEM media responses - the hygiene the Lambda does in handlers/aem.js.
# Account-global; one function is shared across the prod and stage distributions.
STRIP_FN_NAME="${STRIP_FN_NAME:-spectrum-strip-headers}"
STRIP_FN_CODE="$SCRIPT_DIR/cloudfront-functions/strip-headers.js"
REVERT="${REVERT:-}"

if [ -n "$REVERT" ]; then
  echo "Reverting distribution $DIST_ID -> removing media origin + behavior"
else
  echo "Patching distribution $DIST_ID -> media origin $AEM_ORIGIN_DOMAIN"
fi

# Create-or-update + publish the strip-headers CloudFront Function, echoing its
# (stage-independent) ARN. Idempotent - safe to re-run.
ensure_strip_fn() {
  local etag
  if aws cloudfront describe-function --name "$STRIP_FN_NAME" --profile "$PROFILE" --region us-east-1 >/dev/null 2>&1; then
    etag="$(aws cloudfront describe-function --name "$STRIP_FN_NAME" --profile "$PROFILE" --region us-east-1 --query ETag --output text)"
    aws cloudfront update-function --name "$STRIP_FN_NAME" --profile "$PROFILE" --region us-east-1 \
      --if-match "$etag" \
      --function-config "Comment=Strip Age/X-Robots-Tag for BYO-CDN media,Runtime=cloudfront-js-2.0" \
      --function-code "fileb://$STRIP_FN_CODE" >/dev/null
  else
    aws cloudfront create-function --name "$STRIP_FN_NAME" --profile "$PROFILE" --region us-east-1 \
      --function-config "Comment=Strip Age/X-Robots-Tag for BYO-CDN media,Runtime=cloudfront-js-2.0" \
      --function-code "fileb://$STRIP_FN_CODE" >/dev/null
  fi
  etag="$(aws cloudfront describe-function --name "$STRIP_FN_NAME" --profile "$PROFILE" --region us-east-1 --query ETag --output text)"
  aws cloudfront publish-function --name "$STRIP_FN_NAME" --profile "$PROFILE" --region us-east-1 --if-match "$etag" >/dev/null
  aws cloudfront describe-function --name "$STRIP_FN_NAME" --profile "$PROFILE" --region us-east-1 \
    --query 'FunctionSummary.FunctionMetadata.FunctionARN' --output text
}

# Create-or-update the custom media cache policy, echoing its id. Idempotent
# (looks it up by name first). Whitelists the image query params so aem.page
# still receives width/format/etc. and each variant caches separately.
ensure_media_cache_policy() {
  local id cfgfile etag
  cfgfile="$(mktemp)"
  cat > "$cfgfile" <<JSON
{
  "Name": "$MEDIA_CACHE_POLICY_NAME",
  "Comment": "BYO-CDN media: cache key on image params, honour origin TTL",
  "DefaultTTL": 86400,
  "MaxTTL": 31536000,
  "MinTTL": 0,
  "ParametersInCacheKeyAndForwardedToOrigin": {
    "EnableAcceptEncodingGzip": true,
    "EnableAcceptEncodingBrotli": true,
    "HeadersConfig": { "HeaderBehavior": "none" },
    "CookiesConfig": { "CookieBehavior": "none" },
    "QueryStringsConfig": {
      "QueryStringBehavior": "whitelist",
      "QueryStrings": { "Quantity": 5, "Items": ["width", "height", "format", "optimize", "quality"] }
    }
  }
}
JSON
  id="$(aws cloudfront list-cache-policies --type custom --profile "$PROFILE" --region us-east-1 \
    --query "CachePolicyList.Items[?CachePolicy.CachePolicyConfig.Name=='$MEDIA_CACHE_POLICY_NAME'].CachePolicy.Id | [0]" --output text 2>/dev/null || true)"
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

STRIP_FN_ARN=""
if [ -z "$REVERT" ]; then
  if [ -z "$FORWARDED_HOST" ]; then
    FORWARDED_HOST="$(aws cloudfront get-distribution --id "$DIST_ID" --profile "$PROFILE" --region us-east-1 --query 'Distribution.DomainName' --output text)"
  fi
  [ -z "$MEDIA_CACHE_POLICY_ID" ] && MEDIA_CACHE_POLICY_ID="$(ensure_media_cache_policy)"
  STRIP_FN_ARN="$(ensure_strip_fn)"
  echo "  X-Forwarded-Host: $FORWARDED_HOST"
  echo "  media cachepolicy: $MEDIA_CACHE_POLICY_ID"
  echo "  strip-headers fn: $STRIP_FN_ARN"
fi

WORK="$(mktemp -d)"
trap 'rm -rf "$WORK"' EXIT

aws cloudfront get-distribution-config --profile "$PROFILE" --region us-east-1 \
  --id "$DIST_ID" > "$WORK/get.json"
ETAG="$(python3 -c "import json;print(json.load(open('$WORK/get.json'))['ETag'])")"

REVERT="$REVERT" AEM_ORIGIN_DOMAIN="$AEM_ORIGIN_DOMAIN" MEDIA_CACHE_POLICY_ID="$MEDIA_CACHE_POLICY_ID" \
FORWARDED_HOST="$FORWARDED_HOST" STRIP_FN_ARN="$STRIP_FN_ARN" \
python3 - "$WORK/get.json" "$WORK/cfg.json" <<'PY'
import copy, json, os, sys

src, dst = sys.argv[1], sys.argv[2]
cfg = json.load(open(src))["DistributionConfig"]
domain = os.environ["AEM_ORIGIN_DOMAIN"]
policy = os.environ["MEDIA_CACHE_POLICY_ID"]
fwd_host = os.environ.get("FORWARDED_HOST", "").strip()
strip_fn = os.environ.get("STRIP_FN_ARN", "").strip()

ORIGIN_ID = "aem-media-origin"
PATTERN = "*/media_*"

# REVERT: strip the media origin + behavior and send media back through the
# Lambda default behavior. Idempotent - a no-op if they're already absent.
if os.environ.get("REVERT"):
    origins = cfg.setdefault("Origins", {"Quantity": 0, "Items": []})
    origins["Items"] = [o for o in origins.get("Items", []) if o.get("Id") != ORIGIN_ID]
    origins["Quantity"] = len(origins["Items"])
    behaviors = cfg.setdefault("CacheBehaviors", {"Quantity": 0, "Items": []})
    behaviors["Items"] = [b for b in behaviors.get("Items", []) if b.get("PathPattern") != PATTERN]
    behaviors["Quantity"] = len(behaviors["Items"])
    if behaviors["Quantity"] == 0:
        behaviors.pop("Items", None)
    json.dump(cfg, open(dst, "w"))
    print(f"reverted: origins={origins['Quantity']} behaviors={behaviors['Quantity']}")
    sys.exit(0)

origins = cfg.setdefault("Origins", {"Quantity": 0, "Items": []})
items = origins.setdefault("Items", [])

# Media origin, modelled on a known-good CloudFront->aem.live origin (do NOT
# clone the Lambda's Function-URL origin - its TLSv1.2-only / no-IpAddressType
# config makes CloudFront fail the origin connection to aem.live/Fastly with a
# 502 "can't connect"). aem.live needs the broader TLS list and explicit ipv4.
# BYO-CDN headers mirror what the Lambda already sends upstream.
media_headers = [
    {"HeaderName": "X-BYO-CDN-Type", "HeaderValue": "cloudfront"},
    {"HeaderName": "X-Push-Invalidation", "HeaderValue": "enabled"},
]
if fwd_host:
    media_headers.append({"HeaderName": "X-Forwarded-Host", "HeaderValue": fwd_host})

origin = {
    "Id": ORIGIN_ID,
    "DomainName": domain,
    "OriginPath": "",
    "CustomHeaders": {"Quantity": len(media_headers), "Items": media_headers},
    "CustomOriginConfig": {
        "HTTPPort": 80, "HTTPSPort": 443, "OriginProtocolPolicy": "https-only",
        "OriginSslProtocols": {"Quantity": 3, "Items": ["TLSv1", "TLSv1.1", "TLSv1.2"]},
        "OriginReadTimeout": 30, "OriginKeepaliveTimeout": 5,
        "IpAddressType": "ipv4",
    },
    "ConnectionAttempts": 3,
    "ConnectionTimeout": 10,
    # Origin Shield (us-east-1) is required here: without it CloudFront's edge
    # POPs fail the origin connection to aem.live/Fastly (502 "can't connect");
    # the known-good adobe.design->aem.live distribution routes origin fetches
    # through the us-east-1 regional cache the same way. Also improves cache hit
    # ratio for the immutable media.
    "OriginShield": {"Enabled": True, "OriginShieldRegion": "us-east-1"},
    "OriginAccessControlId": "",  # AEM is a public origin - no OAC
}

# Upsert the origin (idempotent: update in place if it already exists).
for i, o in enumerate(items):
    if o.get("Id") == ORIGIN_ID:
        items[i] = origin
        break
else:
    items.append(origin)
origins["Quantity"] = len(items)

# Media behavior: clone the default behavior, then override routing/policy, cache
# only GET/HEAD, and drop the origin-request policy so the session cookie is
# never forwarded to the public AEM origin.
behavior = copy.deepcopy(cfg["DefaultCacheBehavior"])
behavior["PathPattern"] = PATTERN
behavior["TargetOriginId"] = ORIGIN_ID
behavior["CachePolicyId"] = policy
behavior.pop("OriginRequestPolicyId", None)
behavior["Compress"] = True
behavior["AllowedMethods"] = {
    "Quantity": 2, "Items": ["GET", "HEAD"],
    "CachedMethods": {"Quantity": 2, "Items": ["GET", "HEAD"]},
}
# Strip Age / X-Robots-Tag on the direct media responses (the Lambda does this
# for gated content; media bypasses it). Only when the function ARN is provided.
if strip_fn:
    behavior["FunctionAssociations"] = {"Quantity": 1, "Items": [
        {"EventType": "viewer-response", "FunctionARN": strip_fn},
    ]}

# Upsert the "*/media_*" behavior; it must precede the default (ordered list).
behaviors = cfg.setdefault("CacheBehaviors", {"Quantity": 0, "Items": []})
bitems = behaviors.setdefault("Items", [])
for i, b in enumerate(bitems):
    if b.get("PathPattern") == PATTERN:
        bitems[i] = behavior
        break
else:
    bitems.insert(0, behavior)
behaviors["Quantity"] = len(bitems)

json.dump(cfg, open(dst, "w"))
print(f"origins={origins['Quantity']} behaviors={behaviors['Quantity']}")
PY

aws cloudfront update-distribution --profile "$PROFILE" --region us-east-1 \
  --id "$DIST_ID" --if-match "$ETAG" --distribution-config "file://$WORK/cfg.json" \
  --query 'Distribution.{Id:Id,Status:Status,Origins:DistributionConfig.Origins.Items[].DomainName,Media:DistributionConfig.CacheBehaviors.Items[?PathPattern==`*/media_*`].TargetOriginId|[0]}' \
  --output table

echo "Done. Distribution is redeploying (a few minutes)."
