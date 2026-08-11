#!/usr/bin/env bash
# One-time setup for an isolated CloudFront distribution that fronts the
# Lambda Function URL for testing, with no alias/DNS/cert dependency.
# Uses its default *.cloudfront.net hostname. Does not touch the two
# existing "spectrum.adobe.com" / "s2.spectrum.adobe.com" distributions.
#
# Run the steps below yourself (auto mode blocks AWS write calls from
# being run automatically). Each step prints what the next one needs.
set -euo pipefail

PROFILE="${AWS_PROFILE:-spectrumHub}"
REGION="${AWS_REGION:-us-east-2}"
FUNCTION_NAME="${FUNCTION_NAME:-website-lambda-hello-world}"
ORIGIN_DOMAIN="${ORIGIN_DOMAIN:-hlime4kmkskytr3zgg4l6mgguq0hzvet.lambda-url.us-east-2.on.aws}"

# 1. Origin Access Control so CloudFront can invoke the (still
#    IAM-authenticated, still non-public) Function URL.
OAC_ID=$(aws cloudfront create-origin-access-control --profile "$PROFILE" --region us-east-1 \
  --origin-access-control-config '{
    "Name": "website-lambda-hello-world-oac",
    "Description": "OAC for website-lambda-hello-world Function URL",
    "SigningProtocol": "sigv4",
    "SigningBehavior": "always",
    "OriginAccessControlOriginType": "lambda"
  }' \
  --query 'OriginAccessControl.Id' --output text)
echo "Created OAC: $OAC_ID"

# 2. Distribution config, using that OAC, no aliases (default cert only).
CONFIG_FILE=$(mktemp)
cat > "$CONFIG_FILE" <<EOF
{
  "CallerReference": "website-lambda-preview-$(date +%s)",
  "Comment": "website-lambda preview (track 1, no DNS)",
  "Enabled": true,
  "Origins": {
    "Quantity": 1,
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
aws lambda add-permission --profile "$PROFILE" --region "$REGION" \
  --function-name "$FUNCTION_NAME" \
  --statement-id "AllowCloudFrontServicePrincipal-$DIST_ID" \
  --action lambda:InvokeFunctionUrl \
  --principal cloudfront.amazonaws.com \
  --source-arn "$DIST_ARN" \
  --function-url-auth-type AWS_IAM

echo ""
echo "Done. Distribution is deploying (takes several minutes)."
echo "Check status:"
echo "  aws cloudfront get-distribution --profile $PROFILE --region us-east-1 --id $DIST_ID --query 'Distribution.Status' --output text"
echo "Once 'Deployed', test at:"
echo "  https://$DIST_DOMAIN"
