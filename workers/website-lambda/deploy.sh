#!/usr/bin/env bash
# Bundles index.js together with its local handlers/ and lib/ modules, creates
# or updates the Lambda function, and ensures it has a Function URL
# (IAM-authenticated by default, matching the existing spectrum-hub Lambda URL
# pattern).
#
# This Lambda is fully self-contained: handlers/ and lib/ live in this folder
# (its own copies, forked from the ../website worker - e.g. lib/gate.js's public
# homepage policy diverges). Pure Web-standard code that runs unchanged on the
# nodejs22.x runtime.
#
# Required: LAMBDA_ROLE_ARN - an existing IAM role ARN with the
# AWSLambdaBasicExecutionRole policy (or equivalent) attached. Not created here
# since IAM changes are account-wide. Set it (and any other account-specific
# overrides) in a local, gitignored deploy.env - see deploy.env.example.
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# Optional local config for account-specific values (role ARN, profile, ...),
# kept out of git so nothing account-specific is committed.
# shellcheck source=/dev/null
[ -f "$SCRIPT_DIR/deploy.env" ] && . "$SCRIPT_DIR/deploy.env"

PROFILE="${AWS_PROFILE:-spectrumHub}"
REGION="${AWS_REGION:-us-east-2}"
FUNCTION_NAME="${FUNCTION_NAME:-website-lambda-hello-world}"
AUTH_TYPE="${FUNCTION_URL_AUTH_TYPE:-AWS_IAM}"
ROLE_ARN="${LAMBDA_ROLE_ARN:?Set LAMBDA_ROLE_ARN (e.g. in workers/website-lambda/deploy.env - see deploy.env.example) to an existing Lambda execution role ARN}"

echo "Deploying with:"
echo "  AWS_PROFILE:    $PROFILE"
echo "  AWS_REGION:     $REGION"
echo "  FUNCTION_NAME:  $FUNCTION_NAME"
echo "  AUTH_TYPE:      $AUTH_TYPE"
echo "  LAMBDA_ROLE_ARN: $ROLE_ARN"
echo

# Assemble the deployment bundle in a throwaway build dir. package.json is
# included so Node loads the .js files as ESM ("type": "module"); handlers/ and
# lib/ keep the same relative layout so index.js's './handlers/...' and
# './lib/...' imports resolve unchanged. Test files are excluded from the
# artifact.
BUILD_DIR="$(mktemp -d)"
ZIP_FILE="$SCRIPT_DIR/function.zip"
trap 'rm -rf "$BUILD_DIR" "$ZIP_FILE"' EXIT

cp "$SCRIPT_DIR/index.js" "$SCRIPT_DIR/package.json" "$BUILD_DIR/"
mkdir -p "$BUILD_DIR/handlers" "$BUILD_DIR/lib"
# handlers/ and lib/ are both local to this folder (self-contained Lambda).
for dir in handlers lib; do
  for f in "$SCRIPT_DIR/$dir"/*.js; do
    case "$f" in *.test.js) continue ;; esac
    cp "$f" "$BUILD_DIR/$dir/"
  done
done

( cd "$BUILD_DIR" && zip -q -r "$ZIP_FILE" index.js package.json handlers lib )

if aws lambda get-function --function-name "$FUNCTION_NAME" --profile "$PROFILE" --region "$REGION" >/dev/null 2>&1; then
  aws lambda update-function-code \
    --function-name "$FUNCTION_NAME" \
    --zip-file "fileb://$ZIP_FILE" \
    --profile "$PROFILE" \
    --region "$REGION"
else
  aws lambda create-function \
    --function-name "$FUNCTION_NAME" \
    --runtime nodejs22.x \
    --handler index.handler \
    --role "$ROLE_ARN" \
    --zip-file "fileb://$ZIP_FILE" \
    --profile "$PROFILE" \
    --region "$REGION"
fi

if ! aws lambda get-function-url-config --function-name "$FUNCTION_NAME" --profile "$PROFILE" --region "$REGION" >/dev/null 2>&1; then
  aws lambda create-function-url-config \
    --function-name "$FUNCTION_NAME" \
    --auth-type "$AUTH_TYPE" \
    --profile "$PROFILE" \
    --region "$REGION"
fi

aws lambda get-function-url-config \
  --function-name "$FUNCTION_NAME" \
  --profile "$PROFILE" \
  --region "$REGION" \
  --query 'FunctionUrl' \
  --output text
