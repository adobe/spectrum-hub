#!/usr/bin/env bash
# Redirect alias hosts (s2.spectrum.adobe.com) to spectrum.adobe.com with a 301.
# Creates or updates and publishes the "spectrum-canonical-host" CloudFront
# Function (cloudfront-functions/canonical-host.js), then attaches it as the
# viewer-request function on every behavior of the distribution. Idempotent.
#
# set-content-caching.sh clones its asset, media and RUM behaviors from the
# */media_* behavior, so they keep the association when it's re-run. Behaviors
# added some other way need this script re-run.
#
# Required:
#   DIST_ID - the CloudFront distribution id (prod: E3VFWCMFUVXVV)
# Optional:
#   REMOVE=1 - detach the function from every behavior (the function is kept)
# Examples:
#   DIST_ID=E3VFWCMFUVXVV ./set-canonical-host-redirect.sh
#   REMOVE=1 DIST_ID=E3VFWCMFUVXVV ./set-canonical-host-redirect.sh
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=/dev/null
[ -f "$SCRIPT_DIR/deploy.env" ] && . "$SCRIPT_DIR/deploy.env"

PROFILE="${AWS_PROFILE:-spectrumHub}"
DIST_ID="${DIST_ID:?Set DIST_ID to the CloudFront distribution id}"
FN_NAME="${FN_NAME:-spectrum-canonical-host}"
FN_CODE="$SCRIPT_DIR/cloudfront-functions/canonical-host.js"
FN_CONFIG="Comment=301 alias hosts to spectrum.adobe.com,Runtime=cloudfront-js-2.0"
REMOVE="${REMOVE:-}"
CF=(aws cloudfront --profile "$PROFILE" --region us-east-1)

FN_ARN=""
if [ -z "$REMOVE" ]; then
  if "${CF[@]}" describe-function --name "$FN_NAME" >/dev/null 2>&1; then
    etag="$("${CF[@]}" describe-function --name "$FN_NAME" --query ETag --output text)"
    "${CF[@]}" update-function --name "$FN_NAME" --if-match "$etag" \
      --function-config "$FN_CONFIG" --function-code "fileb://$FN_CODE" >/dev/null
  else
    "${CF[@]}" create-function --name "$FN_NAME" \
      --function-config "$FN_CONFIG" --function-code "fileb://$FN_CODE" >/dev/null
  fi
  etag="$("${CF[@]}" describe-function --name "$FN_NAME" --query ETag --output text)"
  "${CF[@]}" publish-function --name "$FN_NAME" --if-match "$etag" >/dev/null
  FN_ARN="$("${CF[@]}" describe-function --name "$FN_NAME" --stage LIVE \
    --query 'FunctionSummary.FunctionMetadata.FunctionARN' --output text)"
  echo "Published $FN_NAME: $FN_ARN"
fi

WORK="$(mktemp -d)"
trap 'rm -rf "$WORK"' EXIT
"${CF[@]}" get-distribution-config --id "$DIST_ID" > "$WORK/get.json"
ETAG="$(python3 -c "import json;print(json.load(open('$WORK/get.json'))['ETag'])")"

FN_ARN="$FN_ARN" FN_NAME="$FN_NAME" python3 - "$WORK/get.json" "$WORK/cfg.json" <<'PY'
import json, os, sys
cfg = json.load(open(sys.argv[1]))["DistributionConfig"]
arn, name = os.environ["FN_ARN"], os.environ["FN_NAME"]
behaviors = [cfg["DefaultCacheBehavior"]] + (cfg.get("CacheBehaviors", {}).get("Items") or [])
for b in behaviors:
    items = b.get("FunctionAssociations", {}).get("Items") or []
    # Only one viewer-request function is allowed per behavior; refuse to
    # replace someone else's.
    other = [f for f in items if f["EventType"] == "viewer-request"
             and not f["FunctionARN"].endswith(f"/{name}")]
    if other:
        sys.exit(f"{b.get('PathPattern', 'Default')}: already has viewer-request {other[0]['FunctionARN']}")
    items = [f for f in items if f["EventType"] != "viewer-request"]
    if arn:
        items.append({"FunctionARN": arn, "EventType": "viewer-request"})
    b["FunctionAssociations"] = {"Quantity": len(items), "Items": items} if items else {"Quantity": 0}
    print(f"  {b.get('PathPattern', 'Default'):<12} -> {[f['EventType'] for f in items]}")
json.dump(cfg, open(sys.argv[2], "w"))
PY

"${CF[@]}" update-distribution --id "$DIST_ID" --if-match "$ETAG" \
  --distribution-config "file://$WORK/cfg.json" --query 'Distribution.Status' --output text
echo "Done. Distribution is redeploying (a few minutes)."
