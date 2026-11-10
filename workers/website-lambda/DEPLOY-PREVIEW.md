# Deploy the preview Lambda

Use this runbook to deploy the latest `main` Lambda code to
<https://preview.spectrum.adobe.com>. It updates an existing Lambda, not the
site's AEM content, CloudFront routing, WAF rules, or secrets.

## Deployment target

| Setting | Value |
| --- | --- |
| Repository | `adobe/spectrum-hub` |
| Source directory | `workers/website-lambda/` |
| Deploy target | `stage` |
| Lambda function | `spectrum-stage-lambda-proxy` |
| AWS region | `us-east-2` |
| AWS CLI profile | `default` |
| CloudFront distribution | `E2RMZZGQ0O3SJ1` |
| AEM origin tier | `aem.page` |

**Always set `TARGET=stage`.** The deploy script defaults to production when
`TARGET` is omitted. It also defaults to the `spectrumHub` AWS profile, so pass
`AWS_PROFILE=default` explicitly. Profile names are local: `default` must
resolve to the authorized Spectrum Hub AWS account, not another account.

## 1. Check prerequisites and source

You need Git, Bash, `zip`, AWS CLI v2, and authorized AWS credentials. Use the
team's Adobe federated-login process to refresh the `default` profile. Do not
paste credentials, secret values, or session cookies into chat or this file.

Connect to Adobe VPN before checking the preview site. Its WAF rejects traffic
outside the corporate network.

From your repository checkout:

```bash
git status --short
git fetch origin main
git rev-parse HEAD
git rev-parse FETCH_HEAD
```

For a latest-main deployment, use a clean checkout whose `HEAD` matches the
fetched main SHA. Record that SHA. The deploy script packages local files, not
an automatically downloaded copy of `main`, and untracked files can enter the
bundle too.

If the checkout is dirty or the SHAs differ, stop and select a clean checkout
of the fetched commit. Do not discard changes or switch a shared checkout
without its owner's approval. An AI-managed worktree must stay within its
assigned workspace and follow its repository instructions.

Before checking AWS access, use your organization's approved AWS login portal
and complete sign-in for the intended Spectrum Hub AWS account. Obtain the
portal URL through the team's internal access instructions, not this public
repository. On macOS, replace the placeholder below with that URL before
running:

```bash
open 'https://<approved-aws-login-host>/'
```

On other operating systems, open the approved portal directly in your browser.
After completing portal sign-in, run:

```bash
aws login --profile default
```

Complete the browser-based AWS login prompts for the intended account and
role. An AI assistant must leave interactive sign-in to the operator and
must not request or capture credentials.

Then check AWS access:

```bash
aws --version
aws sts get-caller-identity --profile default --no-cli-pager
```

Confirm the returned account and role are the intended deployment identity.
Do not proceed on an expired login, unexpected account, or access-denied error.

## 2. Check the existing preview function and local configuration

```bash
cd workers/website-lambda

aws lambda get-function-configuration \
  --function-name spectrum-stage-lambda-proxy \
  --profile default --region us-east-2 \
  --query '{FunctionName:FunctionName,Role:Role,Runtime:Runtime,MemorySize:MemorySize,Timeout:Timeout,State:State,LastUpdateStatus:LastUpdateStatus,LastModified:LastModified,CodeSha256:CodeSha256,OriginTier:Environment.Variables.AEM_HOST_SUFFIX,PublicHost:Environment.Variables.PUBLIC_HOST}' \
  --no-cli-pager
```

Confirm this is the existing preview function, with `OriginTier` set to
`aem.page` and `PublicHost` set to `preview.spectrum.adobe.com`. Record the
pre-deploy code hash and modification time. If the function is missing, the
configuration differs, or an update is in progress, stop and investigate.
Do not let this routine redeployment become first-time infrastructure setup.

Two gitignored local files can affect deployment:

- `deploy.env` is sourced by `deploy.sh` and can override values passed through
  the shell, including profile, function, target, region, and environment file.
- `env.stage.json`, if present, replaces the Lambda's environment-variable
  configuration. If absent, an update preserves the existing variables.

For a routine code redeploy, **leave the deployed environment unchanged**.
The deployment block below deliberately stops if either local file exists, or
if `ENV_FILE` is already set. Have a maintainer review any such configuration
locally before using another deployment procedure. Do not print entire
environment files or AWS environment-variable responses into AI transcripts.
Do not copy configuration from production or set `ALLOW_ENV_MISMATCH=1`.

No npm install or build is needed to package this Lambda: `deploy.sh` includes
the source and vendored modules. For Lambda code changes, use the separate
Lambda suite described in
[Tests](https://github.com/adobe/spectrum-hub/blob/main/docs/TESTS.md#edge-tests);
the root `npm test` command does not cover it. Running `npx vitest run` in this
directory can download Vitest, so approve that network/install step separately.

## 3. Deploy

This step changes AWS resources. Obtain explicit deployment approval before
running it through an AI assistant. Do not run simultaneous deployments to
the same function.

From `workers/website-lambda/`, run the whole block:

```bash
(
  set -euo pipefail
  export AWS_PAGER=""

  if [ -f deploy.env ] || [ -f env.stage.json ] || [ -n "${ENV_FILE:-}" ]; then
    echo "STOP: local deployment configuration requires maintainer review." >&2
    exit 1
  fi

  export LAMBDA_ROLE_ARN="$(
    aws lambda get-function-configuration \
      --function-name spectrum-stage-lambda-proxy \
      --profile default --region us-east-2 \
      --query Role --output text
  )"
  if [ -z "$LAMBDA_ROLE_ARN" ] || [ "$LAMBDA_ROLE_ARN" = "None" ]; then
    echo "STOP: could not read the existing preview execution role." >&2
    exit 1
  fi

  AWS_PROFILE=default AWS_REGION=us-east-2 \
    TARGET=stage FUNCTION_NAME=spectrum-stage-lambda-proxy \
    FUNCTION_MEMORY=1024 FUNCTION_TIMEOUT=30 \
    ./deploy.sh

  aws lambda wait function-updated \
    --function-name spectrum-stage-lambda-proxy \
    --profile default --region us-east-2

  aws lambda get-function-configuration \
    --function-name spectrum-stage-lambda-proxy \
    --profile default --region us-east-2 \
    --query '{FunctionName:FunctionName,State:State,LastUpdateStatus:LastUpdateStatus,LastModified:LastModified,CodeSha256:CodeSha256,MemorySize:MemorySize,Timeout:Timeout}'
)
```

The script requires the role ARN even for updates; this reads the existing
role rather than inventing a new one. It packages the code, updates the
function, waits for the code update, and then updates memory and timeout.
The final waiter above also waits for that configuration update.

Expect a warning that `env.stage.json` is missing. In this procedure that is
intentional: the existing environment variables are preserved. The displayed
`AEM_HOST_SUFFIX: <unset -> aem.live>` describes the absent local file, not the
deployed environment; the read-only check in step 2 establishes the actual tier.

The script sets memory to **1024 MB** and timeout to **30 seconds**. If step 2
shows different values that must be retained, stop and agree on those values
before deploying.

## 4. Remove old shared cached responses when required

Preview is documented as uncached. A routine redeploy may not need a cache
purge, but filtering or access-control changes must not leave older shared
responses available if caching was enabled.

The metadata-filtering rollout in
[#209](https://github.com/adobe/spectrum-hub/pull/209) uses gate ETag version 3
and explicitly calls for invalidating existing shared copies. An ETag version
bump does not evict fresh cached responses.

After the Lambda update succeeds, obtain separate approval for invalidation,
then run:

```bash
aws cloudfront create-invalidation \
  --distribution-id E2RMZZGQ0O3SJ1 \
  --paths "/*" --profile default --no-cli-pager
```

Use the returned invalidation ID to wait for completion:

```bash
aws cloudfront wait invalidation-completed \
  --distribution-id E2RMZZGQ0O3SJ1 \
  --id <invalidation-id> \
  --profile default --no-cli-pager
```

Replace `<invalidation-id>` before running the command. Do not use the
production distribution ID. CloudFront invalidation does not clear browser
caches; use a fresh browsing session for verification.

## 5. Verify the deployment

Confirm `State` is `Active` and `LastUpdateStatus` is `Successful`, and record
the post-deploy modification time and code hash. If a redeploy packages
identical code, the hash may remain unchanged.

On Adobe VPN, check <https://preview.spectrum.adobe.com> in a fresh anonymous
session and a signed-in session. Inspect document and JSON responses, not just
the decorated DOM:

| Check | Anonymous | Signed in and authorized |
| --- | --- | --- |
| Known public page | Loads without private audience blocks or private card metadata | Retains the intended private content |
| Known private page | Returns `404` | Loads the intended content |
| `/query-index.json` and affected filtered indexes | No private rows or private metadata columns | Retains the intended private data |
| A public page's `.md` variant with private metadata | Private metadata rows are absent | Private metadata rows remain |
| `/sitemap.xml` | No indexed private entries; URLs use the preview host | URLs use the preview host |

Authenticated responses must remain `private, no-store` and must not be served
as shared-cache hits. Preview responses should follow its no-cache configuration.

If validation fails, stop and report the source SHA, target, update status, and
observed behavior without cookies or secrets. Do not change routing, WAF,
authentication, secrets, or production settings to make the check pass.
Agree on a known-good source revision and obtain approval before any rollback
redeployment; the deploy script does not create a rollback release for you.

## Instructions for an AI assistant

Copy this prompt into an assistant with access to the repository:

> Read `AGENTS.md`, `.ai/README.md`, and
> `workers/website-lambda/DEPLOY-PREVIEW.md`. Help deploy the latest fetched
> `main` Lambda code to `preview.spectrum.adobe.com` using AWS profile `default`,
> region `us-east-2`, and function `spectrum-stage-lambda-proxy`. Start with
> read-only checks in your assigned workspace. Confirm a clean latest-main
> source revision, the AWS identity, and the existing preview configuration.
> Explain any local configuration overrides without revealing their contents.
> Ask for explicit approval before deploying, invalidating caches, installing
> tools, or changing files. Preserve deployed environment variables. Never
> default to production, bypass an environment guard, or change secrets,
> authentication, WAF, or routing. After approved deployment, wait for updates
> to finish and help verify anonymous and authorized behavior. Report the source
> SHA, target, update result, any approved invalidation, and verification gaps.

## References

- [Lambda architecture, environment, and caching](https://github.com/adobe/spectrum-hub/blob/main/workers/website-lambda/README.md)
- [Deployment script](https://github.com/adobe/spectrum-hub/blob/main/workers/website-lambda/deploy.sh)
- [Local configuration example](https://github.com/adobe/spectrum-hub/blob/main/workers/website-lambda/deploy.env.example)
- [Secrets management](https://github.com/adobe/spectrum-hub/blob/main/workers/website-lambda/SECRETS.md)
