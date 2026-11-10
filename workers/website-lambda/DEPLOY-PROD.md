# Deploy the production Lambda

Use this runbook to deploy the latest `main` Lambda code to
<https://spectrum.adobe.com>. This changes the live site's edge application.
It does not publish AEM content or change CloudFront routing, WAF rules,
authentication configuration, or secrets.

For preview, use the
[preview deployment runbook](https://github.com/adobe/spectrum-hub/blob/main/workers/website-lambda/DEPLOY-PREVIEW.md)
instead. Creating or reading this document does not authorize a deployment.

## Deployment target

| Setting | Value |
| --- | --- |
| Repository | `adobe/spectrum-hub` |
| Source directory | `workers/website-lambda/` |
| Deploy target | `prod` |
| Lambda function | `spectrum-prod-lambda-proxy` |
| AWS region | `us-east-2` |
| AWS CLI profile | `default` |
| CloudFront distribution | `E3VFWCMFUVXVV` |
| Public host | `spectrum.adobe.com` |
| AEM origin tier | `aem.live` |

Set `TARGET=prod` explicitly even though it is the script's default. Pass
`AWS_PROFILE=default` explicitly: the script otherwise uses `spectrumHub`.
Profile names are local, so verify that `default` resolves to the authorized
Spectrum Hub AWS account.

## 1. Confirm source, readiness, and AWS access

You need Git, Bash, `zip`, AWS CLI v2, and authorized AWS credentials. Refresh
the `default` profile through the team's Adobe federated-login process.
Never paste credentials, secret values, or session cookies into chat or
documentation.

From the repository checkout:

```bash
git status --short
git fetch origin main
git rev-parse HEAD
git rev-parse FETCH_HEAD
```

Use a clean checkout whose `HEAD` matches the fetched main SHA. Record the SHA
and confirm that this same revision has been verified on preview. Preview is
behind Adobe VPN and uses `aem.page`, so its content and cache behavior differ
from production.

The script packages local files, including untracked files that match its
packaging rules; it does not fetch `main` for you. If the checkout is dirty or
the SHAs differ, stop and select a clean checkout of the intended revision.
Do not discard changes or switch a shared checkout without its owner's
approval. AI-managed worktrees must follow their assigned workspace boundaries.

For Lambda code changes, obtain the relevant Lambda test results using
[the edge-test instructions](https://github.com/adobe/spectrum-hub/blob/main/docs/TESTS.md#edge-tests).
The root `npm test` command does not cover this Lambda. The documented
`npx vitest run` command may download Vitest; approve any network or install
step separately. Packaging itself needs no npm install or build.

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

Confirm the account and role with the deployment owner. Stop on an unexpected
identity, expired login, or access-denied error.

Before deploying, agree on the source SHA, a known-good rollback revision,
who will verify anonymous and authorized responses, and whether cache
invalidation is required. Obtain explicit production deployment approval.
Obtain separate approval for invalidation when needed.

## 2. Check the existing production function and distribution

```bash
cd workers/website-lambda

aws lambda get-function-configuration \
  --function-name spectrum-prod-lambda-proxy \
  --profile default --region us-east-2 \
  --query '{FunctionName:FunctionName,Role:Role,Runtime:Runtime,MemorySize:MemorySize,Timeout:Timeout,State:State,LastUpdateStatus:LastUpdateStatus,LastModified:LastModified,CodeSha256:CodeSha256,OriginTier:Environment.Variables.AEM_HOST_SUFFIX,PublicHost:Environment.Variables.PUBLIC_HOST,AllowedOrigins:Environment.Variables.ALLOWED_ORIGINS,AnonymousBrowserTTL:Environment.Variables.ANON_CACHE_MAX_AGE,AnonymousEdgeTTL:Environment.Variables.ANON_EDGE_MAX_AGE}' \
  --no-cli-pager

aws cloudfront get-distribution \
  --id E3VFWCMFUVXVV --profile default \
  --query 'Distribution.{Id:Id,Status:Status,Aliases:DistributionConfig.Aliases.Items,Enabled:DistributionConfig.Enabled}' \
  --no-cli-pager
```

Confirm the existing function is the production function. `OriginTier` should
be unset (`null`) or `aem.live`, never `aem.page`; unset defaults to `aem.live`.
Confirm `PublicHost` is `spectrum.adobe.com` and `AllowedOrigins` is explicitly
configured for the intended production origins.

The distribution must be enabled and include `spectrum.adobe.com` in its
aliases. Record the function's pre-deploy code hash and modification time.
If resources are missing, configuration differs from the intended deployment,
or an update is in progress, stop and investigate. Do not turn a redeploy into
first-time infrastructure setup.

Production is documented with an anonymous edge TTL of `86400` seconds.
Inspect the actual values above rather than assuming them. Do not change
cache settings as part of this procedure.

## 3. Preserve environment configuration and deploy

`deploy.sh` sources the gitignored `deploy.env`, which can override shell
settings. Its production environment file, `env.json`, replaces the Lambda's
environment-variable configuration if present. If that file is absent, an
update preserves existing environment variables.

This routine redeploy deliberately stops if either local file exists or
`ENV_FILE` is set. Have a maintainer review any such configuration locally
before choosing another procedure. Do not print complete environment files
or AWS environment-variable responses into AI transcripts. Never copy a
preview environment into production or set `ALLOW_ENV_MISMATCH=1`.

The script reapplies **1024 MB memory** and a **30-second timeout**. If the
values inspected in step 2 differ and must be retained, stop and agree on
the deployment settings first. Do not run simultaneous deployments to this
function.

After explicit production deployment approval, run this whole block from
`workers/website-lambda/`:

```bash
(
  set -euo pipefail
  export AWS_PAGER=""

  if [ -f deploy.env ] || [ -f env.json ] || [ -n "${ENV_FILE:-}" ]; then
    echo "STOP: local deployment configuration requires maintainer review." >&2
    exit 1
  fi

  LAMBDA_ROLE_ARN="$(
    aws lambda get-function-configuration \
      --function-name spectrum-prod-lambda-proxy \
      --profile default --region us-east-2 \
      --query Role --output text
  )"
  if [ -z "$LAMBDA_ROLE_ARN" ] || [ "$LAMBDA_ROLE_ARN" = "None" ]; then
    echo "STOP: could not read the existing production execution role." >&2
    exit 1
  fi
  export LAMBDA_ROLE_ARN

  AWS_PROFILE=default AWS_REGION=us-east-2 \
    TARGET=prod FUNCTION_NAME=spectrum-prod-lambda-proxy \
    FUNCTION_MEMORY=1024 FUNCTION_TIMEOUT=30 \
    ./deploy.sh

  aws lambda wait function-updated \
    --function-name spectrum-prod-lambda-proxy \
    --profile default --region us-east-2

  aws lambda get-function-configuration \
    --function-name spectrum-prod-lambda-proxy \
    --profile default --region us-east-2 \
    --query '{FunctionName:FunctionName,State:State,LastUpdateStatus:LastUpdateStatus,LastModified:LastModified,CodeSha256:CodeSha256,MemorySize:MemorySize,Timeout:Timeout}'
)
```

The existing execution role is read because the script requires its ARN even
for updates. Expect a warning that `env.json` is missing: that is intentional,
so existing environment variables remain unchanged.

The script updates code, waits, then updates configuration. The final waiter
above waits for the configuration update too. Confirm `State` is `Active` and
`LastUpdateStatus` is `Successful` before proceeding. Record the post-deploy
code hash and modification time; identical packaged code may retain its hash.

## 4. Invalidate old shared responses when required

Production caches anonymous content at CloudFront. A Lambda code deployment
does not purge it. AEM publish-driven invalidation is not a substitute for
invalidating responses affected by a Lambda filtering change.

For changes to filtering, access control, or private metadata, confirm that
the source revision has the appropriate `GATE_ETAG_VERSION` bump in
`lib/etag.js`. That bump forces older browser validators to be re-filtered
when they revalidate, but does not evict fresh browser or edge copies.
Do not edit the version ad hoc in the deployment checkout.

The metadata-filtering rollout in
[#209](https://github.com/adobe/spectrum-hub/pull/209) uses gate ETag version 3
and requires invalidating existing shared copies. For that rollout, do not
declare deployment complete until the approved invalidation has finished.

After the function update succeeds and invalidation is explicitly approved:

```bash
aws cloudfront create-invalidation \
  --distribution-id E3VFWCMFUVXVV \
  --paths "/*" --profile default --no-cli-pager
```

Use the returned invalidation ID to wait for completion:

```bash
aws cloudfront wait invalidation-completed \
  --distribution-id E3VFWCMFUVXVV \
  --id <invalidation-id> \
  --profile default --no-cli-pager
```

Replace `<invalidation-id>` before running the command. This invalidates the
production distribution, not preview. A full purge temporarily increases
origin traffic. It does not clear browser caches; use fresh browsing sessions
for verification.

## 5. Verify production behavior

Check <https://spectrum.adobe.com> using separate fresh anonymous and
authorized sessions. Inspect actual document and JSON responses as well as
the decorated DOM. Do not copy session cookies into commands or AI chat.

| Check | Anonymous | Signed in and authorized |
| --- | --- | --- |
| Known public page | Loads without private audience blocks or private card metadata | Retains the intended private content |
| Known private page | Returns `404` | Loads the intended content |
| `/query-index.json` and affected filtered indexes | No private rows or private metadata columns | Retains the intended private data |
| A public page's `.md` variant with private metadata | Private metadata rows are absent | Private metadata rows remain |
| `/sitemap.xml` | No indexed private entries; URLs use the production host | URLs use the production host |

Confirm cache separation with repeat requests: cacheable anonymous pages and
`/query-index.json` should eventually return a CloudFront hit with private data
still absent. Authenticated HTML and filtered JSON must remain
`private, no-store` and never be shared-cache hits. Private-page anonymous
`404` responses must be `no-store`.

Use the same URLs across the two sessions to check that an authorized response
cannot contaminate an anonymous response. A browser may retain anonymous
subresources after sign-in until their browser TTL expires; test with fresh
sessions rather than changing cache behavior to work around that known gap.

Record the source SHA, target, deployment result, invalidation ID and status
if applicable, and verification outcomes. Clearly identify any checks that
could not be completed.

## If deployment or verification fails

Stop and report the failing command or observed behavior without credentials,
cookies, or secret values. Do not keep retrying writes blindly or change
secrets, authentication, WAF, routing, or caching to make a check pass.

If rollback is needed, obtain explicit approval to redeploy the agreed
known-good revision using the production target and preserved environment.
The deploy script does not publish a versioned rollback release or switch an
alias for you. Do not reset a shared checkout. A rollback of filtering logic
can reintroduce a data leak, so involve the deployment owner before proceeding.
Reassess cache invalidation and repeat verification after any approved rollback.

## Instructions for an AI assistant

Copy this prompt into an assistant with access to the repository:

> Read `AGENTS.md`, `.ai/README.md`, and
> `workers/website-lambda/DEPLOY-PROD.md`. Help prepare a production Lambda
> deployment to `spectrum.adobe.com` using AWS profile `default`, region
> `us-east-2`, function `spectrum-prod-lambda-proxy`, and distribution
> `E3VFWCMFUVXVV`. Start with read-only checks in your assigned workspace.
> Confirm a clean latest-main source revision, preview verification of that
> revision, relevant test evidence, the AWS identity, and existing production
> configuration. Identify a known-good rollback revision with the operator.
> Do not treat this prompt as deployment authorization. Ask for explicit
> production deployment approval and separate cache-invalidation approval
> before writes. Ask before installing tools or changing files. Preserve
> deployed environment variables. Never bypass environment guards or change
> secrets, authentication, WAF, or routing. After approved deployment, wait for
> updates and any required approved invalidation, then help verify anonymous
> filtering, authorized access, and cache separation. Report the source SHA,
> target, update result, invalidation status, and verification gaps. Stop and
> report failures; obtain approval before any rollback.

## References

- [Lambda architecture, environment, and caching](https://github.com/adobe/spectrum-hub/blob/main/workers/website-lambda/README.md)
- [Deployment script](https://github.com/adobe/spectrum-hub/blob/main/workers/website-lambda/deploy.sh)
- [Local configuration example](https://github.com/adobe/spectrum-hub/blob/main/workers/website-lambda/deploy.env.example)
- [Secrets management](https://github.com/adobe/spectrum-hub/blob/main/workers/website-lambda/SECRETS.md)
