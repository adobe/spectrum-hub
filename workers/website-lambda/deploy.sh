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
#
# Usage:
#   TARGET=prod  ./deploy.sh   # spectrum-prod-lambda-proxy  + env.json
#   TARGET=stage ./deploy.sh   # spectrum-stage-lambda-proxy + env.stage.json
# TARGET (default prod) selects the function and its matching env file together,
# so the two can't be pointed at different environments by accident. A guard
# still cross-checks any explicit FUNCTION_NAME/ENV_FILE override and aborts on a
# mismatch (override with ALLOW_ENV_MISMATCH=1).
set -euo pipefail

# Send AWS CLI output straight to the console instead of through a pager (less).
export AWS_PAGER=""

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# Optional local config for account-specific values (role ARN, profile, ...),
# kept out of git so nothing account-specific is committed.
# shellcheck source=/dev/null
[ -f "$SCRIPT_DIR/deploy.env" ] && . "$SCRIPT_DIR/deploy.env"

PROFILE="${AWS_PROFILE:-spectrumHub}"
REGION="${AWS_REGION:-us-east-2}"
AUTH_TYPE="${FUNCTION_URL_AUTH_TYPE:-AWS_IAM}"
ROLE_ARN="${LAMBDA_ROLE_ARN:?Set LAMBDA_ROLE_ARN (e.g. in workers/website-lambda/deploy.env - see deploy.env.example) to an existing Lambda execution role ARN}"

# TARGET pairs the function with its matching env file so the two can never be
# pointed at different environments by accident - which is how a stage env file
# (env.stage.json) once landed on the prod function, overwriting prod's env with
# stage values. Usage:  TARGET=prod ./deploy.sh   or   TARGET=stage ./deploy.sh
# FUNCTION_NAME/ENV_FILE can still be overridden explicitly, but the mismatch
# guard below then still applies (override it with ALLOW_ENV_MISMATCH=1).
# ENV_FILE is a Lambda env-vars file in AWS CLI --environment file:// format
# ({ "Variables": { ... } }); gitignored so secrets stay out of the repo.
TARGET="${TARGET:-prod}"
case "$TARGET" in
  prod)
    FUNCTION_NAME="${FUNCTION_NAME:-spectrum-prod-lambda-proxy}"
    ENV_FILE="${ENV_FILE:-$SCRIPT_DIR/env.json}"
    ;;
  stage)
    FUNCTION_NAME="${FUNCTION_NAME:-spectrum-stage-lambda-proxy}"
    ENV_FILE="${ENV_FILE:-$SCRIPT_DIR/env.stage.json}"
    ;;
  *)
    echo "ERROR: TARGET must be 'prod' or 'stage' (got '$TARGET')." >&2
    exit 1
    ;;
esac
# This proxy buffers each upstream response and base64-encodes it, so it needs
# more than Lambda's 128 MB / 3 s defaults: image derivatives (e.g. a 3000px
# webp) can be several MB, and when aem.live/aem.page regenerates one the round
# trip plus encode exceeds 3 s and the Function URL returns a platform 502.
# More memory also buys proportionally more CPU (faster fetch + encode). Timeout
# stays at/under CloudFront's 30 s OriginReadTimeout.
FUNCTION_MEMORY="${FUNCTION_MEMORY:-1024}"
FUNCTION_TIMEOUT="${FUNCTION_TIMEOUT:-30}"

# The environment an env file targets is identified by AEM_HOST_SUFFIX: the
# stage env proxies preview (aem.page); prod omits it (defaults to aem.live).
# Empty when the file is absent or the key is unset (i.e. prod).
ENV_SUFFIX=""
[ -f "$ENV_FILE" ] && ENV_SUFFIX="$(sed -nE 's/.*"AEM_HOST_SUFFIX"[[:space:]]*:[[:space:]]*"([^"]*)".*/\1/p' "$ENV_FILE" | head -n1)"

echo "Deploying with:"
echo "  TARGET:         $TARGET"
echo "  AWS_PROFILE:    $PROFILE"
echo "  AWS_REGION:     $REGION"
echo "  FUNCTION_NAME:  $FUNCTION_NAME"
echo "  AUTH_TYPE:      $AUTH_TYPE"
echo "  LAMBDA_ROLE_ARN: $ROLE_ARN"
echo "  ENV_FILE:       $ENV_FILE$([ -f "$ENV_FILE" ] || echo ' (missing - env vars will NOT be pushed)')"
echo "  AEM_HOST_SUFFIX: ${ENV_SUFFIX:-<unset -> aem.live>}"
echo "  MEMORY/TIMEOUT: ${FUNCTION_MEMORY} MB / ${FUNCTION_TIMEOUT} s"
echo

# Refuse to push an env file whose environment does not match the function it is
# going to. This is the guard against the exact footgun that put a stage env on
# prod: a prod-named function must not receive a preview (aem.page) env, and a
# stage-named function must not receive a non-preview env. Skippable with
# ALLOW_ENV_MISMATCH=1 for genuinely non-standard setups.
if [ -f "$ENV_FILE" ] && [ "${ALLOW_ENV_MISMATCH:-0}" != "1" ]; then
  case "$FUNCTION_NAME" in
    *prod*)
      if [ "$ENV_SUFFIX" = "aem.page" ]; then
        echo "ERROR: refusing to push a stage env file (AEM_HOST_SUFFIX=aem.page) to prod function '$FUNCTION_NAME'." >&2
        echo "       Did you mean TARGET=stage? Or set ALLOW_ENV_MISMATCH=1 to override." >&2
        exit 1
      fi
      ;;
    *stage*)
      if [ "$ENV_SUFFIX" != "aem.page" ]; then
        echo "ERROR: refusing to push a non-stage env file (AEM_HOST_SUFFIX='${ENV_SUFFIX:-unset}') to stage function '$FUNCTION_NAME'." >&2
        echo "       Did you mean TARGET=prod? Or set ALLOW_ENV_MISMATCH=1 to override." >&2
        exit 1
      fi
      ;;
  esac
fi

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

# Vendored third-party ESM (node-html-parser) - copied verbatim so the
# self-contained artifact needs no npm install. The zip below recurses lib/.
[ -d "$SCRIPT_DIR/lib/vendor" ] && cp -R "$SCRIPT_DIR/lib/vendor" "$BUILD_DIR/lib/vendor"

( cd "$BUILD_DIR" && zip -q -r "$ZIP_FILE" index.js package.json handlers lib )

if aws lambda get-function --function-name "$FUNCTION_NAME" --profile "$PROFILE" --region "$REGION" >/dev/null 2>&1; then
  aws lambda update-function-code \
    --function-name "$FUNCTION_NAME" \
    --zip-file "fileb://$ZIP_FILE" \
    --profile "$PROFILE" \
    --region "$REGION"

  # update-function-code and update-function-configuration cannot overlap, so
  # wait for the code update to settle before pushing configuration (memory,
  # timeout, and env vars).
  aws lambda wait function-updated \
    --function-name "$FUNCTION_NAME" \
    --profile "$PROFILE" \
    --region "$REGION"
  CONFIG_ARG=(--memory-size "$FUNCTION_MEMORY" --timeout "$FUNCTION_TIMEOUT")
  if [ -f "$ENV_FILE" ]; then
    CONFIG_ARG+=(--environment "file://$ENV_FILE")
  else
    echo "WARNING: $ENV_FILE not found - leaving existing Lambda env vars unchanged." >&2
  fi
  aws lambda update-function-configuration \
    --function-name "$FUNCTION_NAME" \
    "${CONFIG_ARG[@]}" \
    --profile "$PROFILE" \
    --region "$REGION"
else
  ENV_ARG=()
  if [ -f "$ENV_FILE" ]; then
    ENV_ARG=(--environment "file://$ENV_FILE")
  else
    echo "WARNING: $ENV_FILE not found - function created without env vars." >&2
  fi
  aws lambda create-function \
    --function-name "$FUNCTION_NAME" \
    --runtime nodejs22.x \
    --handler index.handler \
    --role "$ROLE_ARN" \
    --memory-size "$FUNCTION_MEMORY" \
    --timeout "$FUNCTION_TIMEOUT" \
    --zip-file "fileb://$ZIP_FILE" \
    "${ENV_ARG[@]+"${ENV_ARG[@]}"}" \
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
