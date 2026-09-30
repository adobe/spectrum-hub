#!/usr/bin/env bash
# Route /sitemap.xml through the Lambda on an existing CloudFront distribution.
#
# Some distributions send whole file types straight to the AEM origin with
# extension behaviors ("*.xml", "*.txt", "*.js", ...) that bypass the Lambda.
# "*.xml" catches /sitemap.xml too, so the Lambda never gets to remove private
# pages from it or rewrite its aem.page / aem.live URLs to the public host.
#
# This script adds an exact "/sitemap.xml" behavior that clones the default
# (Lambda) behavior - same origin, cache policy (which keys on spectrum_session),
# origin request policy, and function associations - and places it FIRST.
# CloudFront uses the first behavior whose pattern matches, so it wins over
# "*.xml" while every other .xml file keeps going straight to AEM.
#
# Idempotent: re-running updates the behavior in place and moves it back to the
# front. Distributions built by setup-preview-distribution.sh have no "*.xml"
# behavior and don't need this, but running it there is harmless.
#
# Run it yourself (auto mode blocks AWS write calls). Required:
#   DIST_ID       - the CloudFront distribution id
# Optional:
#   LAMBDA_PATHS  - space-separated exact paths to route through the Lambda
#                   (default "/sitemap.xml")
#   DRY_RUN=1     - print the resulting behavior order without updating
#   REVERT=1      - remove the behaviors this script added
# Examples:
#   DRY_RUN=1 DIST_ID=E2RMZZGQ0O3SJ1 ./add-sitemap-behavior.sh
#   DIST_ID=E2RMZZGQ0O3SJ1 ./add-sitemap-behavior.sh
#   REVERT=1 DIST_ID=E2RMZZGQ0O3SJ1 ./add-sitemap-behavior.sh
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=/dev/null
[ -f "$SCRIPT_DIR/deploy.env" ] && . "$SCRIPT_DIR/deploy.env"

# Send AWS CLI output straight to the console instead of through a pager (less).
export AWS_PAGER=""

PROFILE="${AWS_PROFILE:-spectrumHub}"
DIST_ID="${DIST_ID:?Set DIST_ID to the CloudFront distribution id}"
LAMBDA_PATHS="${LAMBDA_PATHS:-/sitemap.xml}"
DRY_RUN="${DRY_RUN:-}"
REVERT="${REVERT:-}"

if [ -n "$REVERT" ]; then
  echo "Distribution $DIST_ID: removing Lambda behaviors for: $LAMBDA_PATHS"
else
  echo "Distribution $DIST_ID: routing through the Lambda: $LAMBDA_PATHS"
fi

WORK="$(mktemp -d)"
trap 'rm -rf "$WORK"' EXIT

aws cloudfront get-distribution-config --profile "$PROFILE" --region us-east-1 \
  --id "$DIST_ID" > "$WORK/get.json"
ETAG="$(python3 -c "import json,sys;print(json.load(open(sys.argv[1]))['ETag'])" "$WORK/get.json")"

LAMBDA_PATHS="$LAMBDA_PATHS" REVERT="$REVERT" \
python3 - "$WORK/get.json" "$WORK/cfg.json" <<'PY'
import copy, json, os, sys

src, dst = sys.argv[1], sys.argv[2]
cfg = json.load(open(src))["DistributionConfig"]
paths = os.environ["LAMBDA_PATHS"].split()
revert = bool(os.environ.get("REVERT"))

for path in paths:
    if not path.startswith("/") or "*" in path or "?" in path:
        sys.exit(f"ERROR: LAMBDA_PATHS entries must be exact paths starting with '/' (got {path!r}).")

default = cfg["DefaultCacheBehavior"]
# The default behavior is the Lambda path; refuse to clone it if it isn't, so a
# misconfigured distribution can't get a sitemap behavior pointing at AEM.
if default["TargetOriginId"] == "aem-media-origin":
    sys.exit("ERROR: the default behavior targets aem-media-origin, not the Lambda; not cloning it.")

behaviors = cfg.setdefault("CacheBehaviors", {"Quantity": 0, "Items": []})
items = [b for b in behaviors.get("Items", []) if b.get("PathPattern") not in paths]

if not revert:
    added = []
    for path in paths:
        behavior = copy.deepcopy(default)
        behavior["PathPattern"] = path
        # A sitemap is read-only; caching GET/HEAD only keeps the behavior simple.
        behavior["AllowedMethods"] = {
            "Quantity": 2, "Items": ["GET", "HEAD"],
            "CachedMethods": {"Quantity": 2, "Items": ["GET", "HEAD"]},
        }
        added.append(behavior)
    # First match wins, so these go ahead of "*.xml" and every other pattern.
    items = added + items

behaviors["Items"] = items
behaviors["Quantity"] = len(items)
if not items:
    behaviors.pop("Items", None)

json.dump(cfg, open(dst, "w"))

print(f"Default (*) -> {default['TargetOriginId']}")
print("Behaviors, in match order:")
for i, b in enumerate(items, 1):
    print(f"  {i:2}. {b['PathPattern']:<16} -> {b['TargetOriginId']}")
PY

if [ -n "$DRY_RUN" ]; then
  echo "DRY_RUN set: distribution not updated."
  exit 0
fi

aws cloudfront update-distribution --profile "$PROFILE" --region us-east-1 \
  --id "$DIST_ID" --if-match "$ETAG" --distribution-config "file://$WORK/cfg.json" \
  --query 'Distribution.{Id:Id,Status:Status}' --output table

echo "Done. The distribution is redeploying (a few minutes). When it shows Deployed:"
echo "  aws cloudfront wait distribution-deployed --id $DIST_ID --profile $PROFILE"
echo "  aws cloudfront create-invalidation --distribution-id $DIST_ID --profile $PROFILE --paths $LAMBDA_PATHS"
