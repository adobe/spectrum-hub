#!/usr/bin/env bash
# Restrict a CloudFront distribution (the preview site) to Adobe corporate VPN
# egress, using AWS WAF. Three phases, combinable:
#
#   preview   (default)  extract + print the CIDRs; change nothing
#   APPLY=1              create/refresh the WAF IP set(s) from the CIDRs
#   ENFORCE=1           create/update the Web ACL (default Block + allow-from-set),
#                       associate it with the preview distribution, and disable
#                       IPv6 on that distribution (KEEP_IPV6=1 to keep IPv6 on)
#
# Source of truth for the CIDRs is the IT-Network egress list:
#   https://git.corp.adobe.com/IT-Network/egress/blob/master/nets.json
# Download it (it needs your corp git credentials, so this script does NOT fetch
# it) and pass the path. Extraction is schema-agnostic: every valid IPv4/IPv6
# address or CIDR in the file is pulled out, and bare IPs are normalized to /32
# or /128. A plain text list of CIDRs works too.
#
# WAF for CloudFront is GLOBAL: the API lives in us-east-1 with scope CLOUDFRONT.
# Only the preview distribution is touched; prod is untouched.
#
# Run it yourself (auto mode blocks AWS write calls).
#
# Usage:
#   NETS_FILE=~/Downloads/nets.json ./set-vpn-allowlist.sh                 # preview
#   APPLY=1 NETS_FILE=~/Downloads/nets.json ./set-vpn-allowlist.sh         # write IP set
#   APPLY=1 ENFORCE=1 NETS_FILE=~/Downloads/nets.json ./set-vpn-allowlist.sh  # full setup
#   ENFORCE=1 ./set-vpn-allowlist.sh                                       # (re)apply Web ACL only
#
# Overrides: IPSET_NAME (default adobe-vpn-egress), WEB_ACL_NAME (preview-vpn-only),
#   DIST_DOMAIN (d92hudyyqakb6.cloudfront.net), KEEP_IPV6=1.
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=/dev/null
[ -f "$SCRIPT_DIR/deploy.env" ] && . "$SCRIPT_DIR/deploy.env"
export AWS_PAGER=""

PROFILE="${AWS_PROFILE:-default}"
REGION="us-east-1"      # required for scope CLOUDFRONT (global WAF)
SCOPE="CLOUDFRONT"
IPSET_NAME="${IPSET_NAME:-adobe-vpn-egress}"
WEB_ACL_NAME="${WEB_ACL_NAME:-preview-vpn-only}"
DIST_DOMAIN="${DIST_DOMAIN:-d92hudyyqakb6.cloudfront.net}"
APPLY="${APPLY:-0}"
ENFORCE="${ENFORCE:-0}"
KEEP_IPV6="${KEEP_IPV6:-0}"

aws_waf() { aws wafv2 "$@" --scope "$SCOPE" --region "$REGION" --profile "$PROFILE"; }

# CIDR extraction is only needed to preview or to (re)write the IP set. Enforcing
# the Web ACL alone reuses the IP set that's already there.
NEED_EXTRACT=1
[ "$ENFORCE" = 1 ] && [ "$APPLY" != 1 ] && NEED_EXTRACT=0

V4=""; V6=""; n4=0; n6=0
if [ "$NEED_EXTRACT" = 1 ]; then
  NETS_FILE="${NETS_FILE:-${1:-}}"
  if [ -z "$NETS_FILE" ] || [ ! -f "$NETS_FILE" ]; then
    echo "ERROR: provide the egress list file via NETS_FILE=<path> (or as an argument)." >&2
    echo "       Download it from https://git.corp.adobe.com/IT-Network/egress/blob/master/nets.json" >&2
    exit 1
  fi

  # Extract + normalize CIDRs for the requested version (4 or 6), one per line.
  extract() {
    python3 - "$NETS_FILE" "$1" <<'PY'
import re, sys, ipaddress
text = open(sys.argv[1], encoding="utf-8", errors="replace").read()
want = int(sys.argv[2])
out = set()
for tok in re.findall(r'[0-9A-Fa-f:.]+(?:/\d{1,3})?', text):
    tok = tok.strip(".,;\"'()[]{}")
    if '.' not in tok and ':' not in tok:
        continue
    try:
        if '/' in tok:
            net = ipaddress.ip_network(tok, strict=False)
        else:
            ip = ipaddress.ip_address(tok)
            net = ipaddress.ip_network(f"{ip}/{32 if ip.version == 4 else 128}")
    except ValueError:
        continue
    if net.version == want:
        out.add(str(net))
for c in sorted(out, key=ipaddress.ip_network):
    print(c)
PY
  }

  V4="$(extract 4)"
  V6="$(extract 6)"
  n4=$(printf '%s\n' "$V4" | grep -c . || true)
  n6=$(printf '%s\n' "$V6" | grep -c . || true)

  echo "Extracted from $NETS_FILE:  IPv4=$n4  IPv6=$n6"
  [ "$n4" -gt 0 ] && { echo "--- IPv4 CIDRs ---"; printf '%s\n' "$V4"; }
  [ "$n6" -gt 0 ] && { echo "--- IPv6 CIDRs ---"; printf '%s\n' "$V6"; }
  if [ "$n4" = 0 ] && [ "$n6" = 0 ]; then
    echo "ERROR: no valid CIDRs found in $NETS_FILE." >&2
    exit 1
  fi
fi

if [ "$APPLY" != 1 ] && [ "$ENFORCE" != 1 ]; then
  echo
  echo "Preview only - nothing changed. Re-run with APPLY=1 (write IP set) and/or ENFORCE=1 (Web ACL)."
  exit 0
fi

# --- APPLY: create/refresh the IP set(s) --------------------------------------

# Create the IP set if absent, else replace its addresses (refresh). Prints ARN.
upsert_ipset() {
  local name="$1" version="$2" list="$3" id lock arn
  local addrs=()
  while IFS= read -r line; do [ -n "$line" ] && addrs+=("$line"); done <<< "$list"

  id="$(aws_waf list-ip-sets --query "IPSets[?Name=='$name'].Id | [0]" --output text)"
  if [ -z "$id" ] || [ "$id" = "None" ]; then
    arn="$(aws_waf create-ip-set --name "$name" --ip-address-version "$version" \
      --description "Adobe corporate VPN egress allowlist from IT-Network/egress nets.json" \
      --addresses "${addrs[@]}" --query 'Summary.ARN' --output text)"
    echo "  created $name (${#addrs[@]} entries) -> $arn"
  else
    lock="$(aws_waf get-ip-set --name "$name" --id "$id" --query 'LockToken' --output text)"
    aws_waf update-ip-set --name "$name" --id "$id" --lock-token "$lock" \
      --addresses "${addrs[@]}" >/dev/null
    arn="$(aws_waf get-ip-set --name "$name" --id "$id" --query 'IPSet.ARN' --output text)"
    echo "  updated $name (${#addrs[@]} entries) -> $arn"
  fi
}

if [ "$APPLY" = 1 ]; then
  echo
  echo "Applying IP set(s) to WAF (scope $SCOPE, $REGION) ..."
  [ "$n4" -gt 0 ] && upsert_ipset "$IPSET_NAME" IPV4 "$V4"
  [ "$n6" -gt 0 ] && upsert_ipset "${IPSET_NAME}-v6" IPV6 "$V6"
fi

# --- ENFORCE: Web ACL + association + IPv6 toggle -----------------------------

enforce_webacl() {
  local v4_arn v6_arn acl_id acl_arn lock rules_file vis
  v4_arn="$(aws_waf list-ip-sets --query "IPSets[?Name=='$IPSET_NAME'].ARN | [0]" --output text)"
  if [ -z "$v4_arn" ] || [ "$v4_arn" = "None" ]; then
    echo "ERROR: IP set '$IPSET_NAME' not found. Run APPLY=1 (with NETS_FILE) first." >&2
    exit 1
  fi
  v6_arn="$(aws_waf list-ip-sets --query "IPSets[?Name=='${IPSET_NAME}-v6'].ARN | [0]" --output text)"

  # Allow from the IPv4 set; include the IPv6 set only when IPv6 stays enabled
  # (with IPv6 off, every viewer arrives over IPv4, so a v6 rule is dead weight).
  rules_file="$(mktemp)"
  {
    printf '['
    printf '{"Name":"allow-adobe-vpn-ipv4","Priority":0,"Action":{"Allow":{}},"Statement":{"IPSetReferenceStatement":{"ARN":"%s"}},"VisibilityConfig":{"SampledRequestsEnabled":true,"CloudWatchMetricsEnabled":true,"MetricName":"allow-adobe-vpn-ipv4"}}' "$v4_arn"
    if [ "$KEEP_IPV6" = 1 ] && [ -n "$v6_arn" ] && [ "$v6_arn" != "None" ]; then
      printf ',{"Name":"allow-adobe-vpn-ipv6","Priority":1,"Action":{"Allow":{}},"Statement":{"IPSetReferenceStatement":{"ARN":"%s"}},"VisibilityConfig":{"SampledRequestsEnabled":true,"CloudWatchMetricsEnabled":true,"MetricName":"allow-adobe-vpn-ipv6"}}' "$v6_arn"
    fi
    printf ']'
  } > "$rules_file"

  vis="SampledRequestsEnabled=true,CloudWatchMetricsEnabled=true,MetricName=$WEB_ACL_NAME"
  acl_id="$(aws_waf list-web-acls --query "WebACLs[?Name=='$WEB_ACL_NAME'].Id | [0]" --output text)"
  if [ -z "$acl_id" ] || [ "$acl_id" = "None" ]; then
    acl_arn="$(aws_waf create-web-acl --name "$WEB_ACL_NAME" \
      --description "Allow only Adobe corporate VPN egress to the preview site" \
      --default-action Block={} --rules "file://$rules_file" --visibility-config "$vis" \
      --query 'Summary.ARN' --output text)"
    echo "  created web ACL $WEB_ACL_NAME -> $acl_arn"
  else
    lock="$(aws_waf get-web-acl --name "$WEB_ACL_NAME" --id "$acl_id" --query 'LockToken' --output text)"
    aws_waf update-web-acl --name "$WEB_ACL_NAME" --id "$acl_id" --lock-token "$lock" \
      --default-action Block={} --rules "file://$rules_file" --visibility-config "$vis" >/dev/null
    acl_arn="$(aws_waf list-web-acls --query "WebACLs[?Name=='$WEB_ACL_NAME'].ARN | [0]" --output text)"
    echo "  updated web ACL $WEB_ACL_NAME -> $acl_arn"
  fi
  rm -f "$rules_file"

  # Associate with the preview distribution and (by default) disable IPv6 - both
  # are one distribution-config update.
  local dist_id cfg out etag
  dist_id="$(aws cloudfront list-distributions --profile "$PROFILE" \
    --query "DistributionList.Items[?DomainName=='$DIST_DOMAIN'].Id | [0]" --output text)"
  if [ -z "$dist_id" ] || [ "$dist_id" = "None" ]; then
    echo "ERROR: no CloudFront distribution found with domain $DIST_DOMAIN." >&2
    exit 1
  fi
  cfg="$(mktemp)"; out="$(mktemp)"
  aws cloudfront get-distribution-config --id "$dist_id" --profile "$PROFILE" > "$cfg"
  etag="$(python3 -c "import json;print(json.load(open('$cfg'))['ETag'])")"
  WEB_ACL_ARN="$acl_arn" KEEP_IPV6="$KEEP_IPV6" python3 - "$cfg" "$out" <<'PY'
import json, os, sys
d = json.load(open(sys.argv[1]))['DistributionConfig']
d['WebACLId'] = os.environ['WEB_ACL_ARN']
if os.environ.get('KEEP_IPV6') != '1':
    d['IsIPV6Enabled'] = False
json.dump(d, open(sys.argv[2], 'w'))
PY
  aws cloudfront update-distribution --id "$dist_id" --if-match "$etag" \
    --distribution-config "file://$out" --profile "$PROFILE" \
    --query 'Distribution.Status' --output text >/dev/null
  rm -f "$cfg" "$out"
  echo "  associated $WEB_ACL_NAME with $DIST_DOMAIN ($dist_id); IPv6 $([ "$KEEP_IPV6" = 1 ] && echo kept || echo disabled)"
  echo "  distribution is redeploying (a few minutes)."
}

if [ "$ENFORCE" = 1 ]; then
  echo
  echo "Enforcing allowlist ..."
  enforce_webacl
fi

echo
echo "Done. Refresh the CIDRs any time with APPLY=1 (the Web ACL keeps pointing at"
echo "the same IP set). To lift the restriction later, clear the distribution's"
echo "WebACLId (and re-enable IPv6 if you disabled it)."
