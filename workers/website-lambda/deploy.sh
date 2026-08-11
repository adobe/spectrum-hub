#!/usr/bin/env bash
# Zips index.js, creates or updates the Lambda function, and ensures it
# has a Function URL (IAM-authenticated by default, matching the existing
# spectrum-hub Lambda URL pattern).
#
# Required: LAMBDA_ROLE_ARN - an existing IAM role ARN with the
# AWSLambdaBasicExecutionRole policy (or equivalent) attached.
# Not created here since IAM changes are account-wide.
set -euo pipefail

PROFILE="${AWS_PROFILE:-spectrumHub}"
REGION="${AWS_REGION:-us-east-2}"
FUNCTION_NAME="${FUNCTION_NAME:-website-lambda-hello-world}"
AUTH_TYPE="${FUNCTION_URL_AUTH_TYPE:-AWS_IAM}"
ROLE_ARN="${LAMBDA_ROLE_ARN:?Set LAMBDA_ROLE_ARN to an existing Lambda execution role ARN}"

zip -q -j function.zip index.js
trap 'rm -f function.zip' EXIT

if aws lambda get-function --function-name "$FUNCTION_NAME" --profile "$PROFILE" --region "$REGION" >/dev/null 2>&1; then
  aws lambda update-function-code \
    --function-name "$FUNCTION_NAME" \
    --zip-file fileb://function.zip \
    --profile "$PROFILE" \
    --region "$REGION"
else
  aws lambda create-function \
    --function-name "$FUNCTION_NAME" \
    --runtime nodejs22.x \
    --handler index.handler \
    --role "$ROLE_ARN" \
    --zip-file fileb://function.zip \
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
