#!/usr/bin/env bash
# One-time setup for an isolated CloudFront distribution that fronts the
# Lambda Function URL for testing, with no alias/DNS/cert dependency.
# Uses its default *.cloudfront.net hostname. Does not touch the two
# existing "spectrum.adobe.com" / "s2.spectrum.adobe.com" distributions.
#
# Run the steps below yourself (auto mode blocks AWS write calls from
# being run automatically). Each step prints what the next one needs.
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# Optional local config for account-specific values, kept out of git.
# See deploy.env.example.
# shellcheck source=/dev/null
[ -f "$SCRIPT_DIR/deploy.env" ] && . "$SCRIPT_DIR/deploy.env"

PROFILE="${AWS_PROFILE:-spectrumHub}"
REGION="${AWS_REGION:-us-east-2}"
FUNCTION_NAME="${FUNCTION_NAME:-spectrum-prod-lambda-proxy}"
# The Lambda Function URL host, e.g. xxxxxxxx.lambda-url.us-east-2.on.aws
# (get it with: aws lambda get-function-url-config --function-name "$FUNCTION_NAME").
ORIGIN_DOMAIN="${ORIGIN_DOMAIN:?Set ORIGIN_DOMAIN (e.g. in deploy.env - see deploy.env.example) to the Lambda Function URL host}"
# CloudFront distribution comment (its display name in the console). Override per
# environment, e.g. DIST_COMMENT="Spectrum Stage".
DIST_COMMENT="${DIST_COMMENT:-website-lambda preview (track 1, no DNS)}"

# Media (immutable, content-hashed media_<sha>.<ext>) is public and is served
# straight from the AEM origin on its own behavior, bypassing the Lambda - so
# large image derivatives never hit the Function URL's 6 MB response cap or its
# buffer+base64 path. Mirror the AEM_HOST_SUFFIX the matching Lambda uses:
# aem.live (published) for prod, aem.page (preview) for stage.
AEM_ORG="${AEM_ORG:-adobe}"
AEM_SITE="${AEM_SITE:-spectrum-hub}"
AEM_HOST_SUFFIX="${AEM_HOST_SUFFIX:-aem.live}"
AEM_ORIGIN_DOMAIN="${AEM_ORIGIN_DOMAIN:-main--${AEM_SITE}--${AEM_ORG}.${AEM_HOST_SUFFIX}}"

# 1. Origin Access Control so CloudFront can invoke the (still
#    IAM-authenticated, still non-public) Function URL.
OAC_CONFIG=$(cat <<EOF
{
  "Name": "${FUNCTION_NAME}-oac",
  "Description": "OAC for ${FUNCTION_NAME} Function URL",
  "SigningProtocol": "sigv4",
  "SigningBehavior": "always",
  "OriginAccessControlOriginType": "lambda"
}
EOF
)
OAC_ID=$(aws cloudfront create-origin-access-control --profile "$PROFILE" --region us-east-1 \
  --origin-access-control-config "$OAC_CONFIG" \
  --query 'OriginAccessControl.Id' --output text)
echo "Created OAC: $OAC_ID"

# 1b. Strip-headers CloudFront Function (viewer-response) for the media behavior:
#     drops Age / X-Robots-Tag on media served straight from AEM (the hygiene the
#     Lambda does in handlers/aem.js). Account-global; shared across distributions.
STRIP_FN_NAME="${STRIP_FN_NAME:-spectrum-strip-headers}"
STRIP_FN_CODE="$SCRIPT_DIR/cloudfront-functions/strip-headers.js"
# X-Forwarded-Host origin header (aem.live BYO-CDN doc). For a brand-new
# distribution the *.cloudfront.net domain isn't known yet, so it's optional here
# - set FORWARDED_HOST to inject it now, or run add-media-behavior.sh after
# creation (it derives the value from the distribution's own domain).
FORWARDED_HOST="${FORWARDED_HOST:-}"

ensure_strip_fn() {
  local etag
  if aws cloudfront describe-function --name "$STRIP_FN_NAME" --profile "$PROFILE" --region us-east-1 >/dev/null 2>&1; then
    etag="$(aws cloudfront describe-function --name "$STRIP_FN_NAME" --profile "$PROFILE" --region us-east-1 --query ETag --output text)"
    aws cloudfront update-function --name "$STRIP_FN_NAME" --profile "$PROFILE" --region us-east-1 \
      --if-match "$etag" --function-config "Comment=Strip Age/X-Robots-Tag for BYO-CDN media,Runtime=cloudfront-js-2.0" \
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
STRIP_FN_ARN="$(ensure_strip_fn)"
echo "Strip-headers function: $STRIP_FN_ARN"

# 1c. Custom media cache policy - whitelist the image query params. The managed
#     "…-QueryStrings" policy (QueryStringBehavior=all) makes CloudFront fail the
#     aem.page/aem.live origin connection (502 "can't connect"); a whitelist
#     policy connects and still caches per width/format variant.
MEDIA_CACHE_POLICY_NAME="${MEDIA_CACHE_POLICY_NAME:-spectrum-media}"
MEDIA_CACHE_POLICY_ID="${MEDIA_CACHE_POLICY_ID:-}"
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
[ -z "$MEDIA_CACHE_POLICY_ID" ] && MEDIA_CACHE_POLICY_ID="$(ensure_media_cache_policy)"
echo "Media cache policy: $MEDIA_CACHE_POLICY_ID"

# Media origin custom headers (+ optional X-Forwarded-Host) and the media
# behavior's viewer-response function association, injected into the config below.
MEDIA_HEADERS_QTY=2
MEDIA_HEADERS_ITEMS='            { "HeaderName": "X-BYO-CDN-Type", "HeaderValue": "cloudfront" },
            { "HeaderName": "X-Push-Invalidation", "HeaderValue": "enabled" }'
if [ -n "$FORWARDED_HOST" ]; then
  MEDIA_HEADERS_QTY=3
  MEDIA_HEADERS_ITEMS="$MEDIA_HEADERS_ITEMS,
            { \"HeaderName\": \"X-Forwarded-Host\", \"HeaderValue\": \"$FORWARDED_HOST\" }"
fi
MEDIA_FN_ASSOC="\"FunctionAssociations\": { \"Quantity\": 1, \"Items\": [ { \"EventType\": \"viewer-response\", \"FunctionARN\": \"$STRIP_FN_ARN\" } ] },"

# 2. Distribution config, using that OAC, no aliases (default cert only).
CONFIG_FILE=$(mktemp)
cat > "$CONFIG_FILE" <<EOF
{
  "CallerReference": "$FUNCTION_NAME-$(date +%s)",
  "Comment": "$DIST_COMMENT",
  "Enabled": true,
  "Origins": {
    "Quantity": 2,
    "Items": [
      {
        "Id": "website-lambda-function-url",
        "DomainName": "$ORIGIN_DOMAIN",
        "OriginAccessControlId": "$OAC_ID",
        "CustomOriginConfig": {
          "HTTPPort": 80,
          "HTTPSPort": 443,
          "OriginProtocolPolicy": "https-only",
          "OriginSslProtocols": { "Quantity": 1, "Items": ["TLSv1.2"] },
          "OriginReadTimeout": 30,
          "OriginKeepaliveTimeout": 5
        }
      },
      {
        "Id": "aem-media-origin",
        "DomainName": "$AEM_ORIGIN_DOMAIN",
        "CustomHeaders": {
          "Quantity": $MEDIA_HEADERS_QTY,
          "Items": [
$MEDIA_HEADERS_ITEMS
          ]
        },
        "CustomOriginConfig": {
          "HTTPPort": 80,
          "HTTPSPort": 443,
          "OriginProtocolPolicy": "https-only",
          "OriginSslProtocols": { "Quantity": 3, "Items": ["TLSv1", "TLSv1.1", "TLSv1.2"] },
          "OriginReadTimeout": 30,
          "OriginKeepaliveTimeout": 5,
          "IpAddressType": "ipv4"
        },
        "OriginShield": { "Enabled": true, "OriginShieldRegion": "us-east-1" }
      }
    ]
  },
  "DefaultCacheBehavior": {
    "TargetOriginId": "website-lambda-function-url",
    "ViewerProtocolPolicy": "redirect-to-https",
    "AllowedMethods": {
      "Quantity": 7,
      "Items": ["GET", "HEAD", "OPTIONS", "PUT", "PATCH", "POST", "DELETE"],
      "CachedMethods": { "Quantity": 2, "Items": ["GET", "HEAD"] }
    },
    "CachePolicyId": "4135ea2d-6df8-44a3-9df3-4b5a84be39ad",
    "OriginRequestPolicyId": "b689b0a8-53d0-40ab-baf2-68738e2966ac",
    "Compress": true
  },
  "CacheBehaviors": {
    "Quantity": 1,
    "Items": [
      {
        "PathPattern": "*/media_*",
        "TargetOriginId": "aem-media-origin",
        "ViewerProtocolPolicy": "redirect-to-https",
        "AllowedMethods": {
          "Quantity": 2,
          "Items": ["GET", "HEAD"],
          "CachedMethods": { "Quantity": 2, "Items": ["GET", "HEAD"] }
        },
        $MEDIA_FN_ASSOC
        "CachePolicyId": "$MEDIA_CACHE_POLICY_ID",
        "Compress": true
      }
    ]
  },
  "CustomErrorResponses": {
    "Quantity": 1,
    "Items": [
      {
        "ErrorCode": 404,
        "ResponsePagePath": "/404.html",
        "ResponseCode": "404",
        "ErrorCachingMinTTL": 0
      }
    ]
  }
}
EOF

DIST_JSON=$(aws cloudfront create-distribution --profile "$PROFILE" --region us-east-1 \
  --distribution-config "file://$CONFIG_FILE")
rm -f "$CONFIG_FILE"

DIST_ID=$(echo "$DIST_JSON" | grep -m1 '"Id"' | sed -E 's/.*"Id": "([^"]+)".*/\1/')
DIST_ARN=$(echo "$DIST_JSON" | grep -m1 '"ARN"' | sed -E 's/.*"ARN": "([^"]+)".*/\1/')
DIST_DOMAIN=$(echo "$DIST_JSON" | grep -m1 '"DomainName"' | sed -E 's/.*"DomainName": "([^"]+)".*/\1/')
echo "Created distribution: $DIST_ID ($DIST_DOMAIN)"

# 3. Let CloudFront's OAC invoke the Function URL. Scoped to this exact
#    distribution ARN, so it does NOT trip the account's
#    managed-lambda-function-public-access-prohibited auto-remediation.
#    The AWS console's OAC wizard grants three statements; replicate all three -
#    the single conditioned InvokeFunctionUrl alone was observed to still return
#    a 403 (AccessDeniedException) from the Function URL.
aws lambda add-permission --profile "$PROFILE" --region "$REGION" \
  --function-name "$FUNCTION_NAME" \
  --statement-id "AllowCloudFrontServicePrincipal-$DIST_ID" \
  --action lambda:InvokeFunctionUrl \
  --principal cloudfront.amazonaws.com \
  --source-arn "$DIST_ARN" \
  --function-url-auth-type AWS_IAM
aws lambda add-permission --profile "$PROFILE" --region "$REGION" \
  --function-name "$FUNCTION_NAME" \
  --statement-id "AllowCloudFrontInvokeFunctionUrl-$DIST_ID" \
  --action lambda:InvokeFunctionUrl \
  --principal cloudfront.amazonaws.com \
  --source-arn "$DIST_ARN"
aws lambda add-permission --profile "$PROFILE" --region "$REGION" \
  --function-name "$FUNCTION_NAME" \
  --statement-id "AllowCloudFrontInvokeFunction-$DIST_ID" \
  --action lambda:InvokeFunction \
  --principal cloudfront.amazonaws.com \
  --source-arn "$DIST_ARN"

echo ""
echo "Done. Distribution is deploying (takes several minutes)."
echo "Check status:"
echo "  aws cloudfront get-distribution --profile $PROFILE --region us-east-1 --id $DIST_ID --query 'Distribution.Status' --output text"
echo "Once 'Deployed', test at:"
echo "  https://$DIST_DOMAIN"
