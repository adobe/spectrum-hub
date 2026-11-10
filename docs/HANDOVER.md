# Spectrum Hub maintainer handover

Last reviewed: 2026-11-10.

This is the starting point for a maintainer taking over Spectrum Hub and for
an AI assistant helping them. It maps the system, operational responsibilities,
and safety boundaries. Follow the linked guides for detailed procedures.
Current source, workflow files, and verified service configuration take
precedence over a dated description.

This document is not deployment authorization, an access grant, or a complete
inventory of work in progress. Do not put credentials, session cookies,
private page content, or personal account details in it.

## Start here

Read [the repository overview](../README.md),
[Contributing](../CONTRIBUTING.md), and [Architecture](./ARCHITECTURE.md).
An AI assistant must first read [AGENTS.md](../AGENTS.md) and
[.ai/README.md](../.ai/README.md), then load the skills matching its task.
`.ai/` is the canonical agent guidance; `.github/skills` is a discovery adapter.

For orientation, ask the assistant to use `contributor-onboarding`. It can
explain the core lifecycle one checkpoint at a time without making changes.
For a specific maintenance task, route directly to its subsystem guide.

## What this project runs

Spectrum Hub is the multi-platform documentation and discovery site for
Adobe's Spectrum design system.

| Layer | Responsibility | Source of truth |
| --- | --- | --- |
| Document Authoring (DA) | Page content, metadata, authored block tables, shared fragments | DA workspace; [content guide](./CONTENT_AUTHORING.md) |
| AEM Edge Delivery Services (EDS) | Combines repository code with previewed or published content | AEM configuration and authored documents |
| CloudFront | Public hosts, routing, cache separation, direct media/assets, preview network restriction through WAF | AWS configuration; [edge guide](../workers/website-lambda/README.md) |
| AWS Lambda | Session handling, page access, anonymous content/index/sitemap filtering | `workers/website-lambda/` |
| Browser runtime | Page setup, EDS decoration, blocks, styles, deferred work | `scripts/`, `blocks/`, `styles/` |
| Component data | Combines RSP, SWC, and Figma data with authored mappings | `deps/`; [data guide](./DEPS.md) |
| Search | Builds section-level records and replaces the Algolia index | `tools/indexer/`; [indexer guide](../tools/indexer/README.md) |

These are separate release paths. Publishing a document is not a Lambda
deployment. Merging site code is not a Lambda deployment either: the checked-in
GitHub workflows do not provide an automatic Lambda deployment pipeline.
Use the explicit runbooks below.

`workers/website/` is the legacy Cloudflare Worker, not the current production
implementation. Do not fix live edge behavior there.

## Environments and access

| Environment | Purpose and boundary |
| --- | --- |
| `http://localhost:3000` | Local code through AEM CLI; does not reproduce Lambda access controls or CloudFront caching |
| `<branch>--spectrum-hub--adobe.aem.live` | Published-origin branch-code review; not a substitute for public-host edge checks |
| `<branch>--spectrum-hub--adobe.aem.page` | AEM preview origin; access requires the relevant authoring authorization |
| `preview.spectrum.adobe.com` | CloudFront and stage Lambda over `aem.page`; Adobe VPN required; documented as uncached |
| `spectrum.adobe.com` | Public production host over `aem.live`; viewer-aware filtering and shared anonymous caching |

GitHub, DA editing, EDS publishing, AWS, IMS/service configuration, Algolia,
and Figma access are separate permissions. Have the outgoing maintainer or
service administrator confirm each required access path. Do not assume GitHub
write access grants publishing or production access.

For AWS login, use your organization's approved AWS login portal, then run
`aws login --profile default`. Obtain the portal URL from the team's internal
access instructions; keep internal login URLs out of this public repository.
The deployment runbooks include the macOS browser-opening command and AWS
identity checks. `default` is a local profile name, not proof of the correct
account. Verify its account and role before any service writes.

Branch preview sign-in has a documented IMS host-pattern limitation for branch
segments longer than eight characters. See
[the engineering workflow](../CONTRIBUTING.md#your-first-engineering-change)
before interpreting branch-only sign-in/CORS failures as a code regression.

## Credential and service-ownership handover

Transfer ownership and authorized access, not secret values in this document.
The inventory below describes credentials referenced by the repository;
confirm the actual configuration separately for stage and production.
Do not retrieve secret values simply to complete a handover checklist.

| Credential or configuration | Documented storage and consumers | What the successor needs |
| --- | --- | --- |
| Lambda session-signing secret | Secrets Manager `spectrum-hub/<target>/session-secret`, referenced by `SESSION_SECRET_ID`; signs and validates `spectrum_session` cookies | Authorized management access and the rotation procedure; rotating it invalidates sessions signed with the old key |
| IMS service client secret | Secrets Manager `spectrum-hub/<target>/ims-client-secret`, referenced by `IMS_CLIENT_SECRET_ID`; Lambda service authentication for DA allowlist access | Ownership/access to the corresponding Adobe Developer Console integration, plus coordinated secret replacement |
| AEM origin-auth token, where configured | Secrets Manager `spectrum-hub/<target>/origin-auth`, referenced by `ORIGIN_AUTHENTICATION_ID`; also an `Authorization` custom origin header on the CloudFront direct-media path | Origin-auth administration and a coordinated update of both Lambda and direct-media consumers |
| Algolia indexing credentials | GitHub Actions secrets `ALGOLIA_APP_ID` and `ALGOLIA_WRITE_API_KEY`; local indexer credentials may be in an untracked `.env` | Algolia application/key administration and GitHub secret-management permission; the write key must stay out of browser code |
| Algolia index selection | GitHub repository variable `ALGOLIA_INDEX_NAME`; local indexer configuration | Confirmed production and scratch-index names; an index-name mistake can replace the wrong index |
| Figma API token | GitHub Actions secret `FIGMA_TOKEN`, used by `validate-figma-discovery.yml` | Authorized Figma access and a supported replacement/renewal path, especially if the existing token belongs to a departing account |
| AEM publish-driven CloudFront invalidation credential | The edge guide documents `accessKeyId` and `secretAccessKey` in AEM's `cdn.prod` configuration for IAM user `invalidator` | Confirmed IAM and AEM configuration ownership, approved recovery/rotation process, and identification of all shared consumers |
| AWS operator access | Individual KLAM/federated login and the operator's AWS profile | The successor's own approved account/role access; do not transfer temporary AWS credentials, login caches, or personal credentials files |
| GitHub Actions `GITHUB_TOKEN` | Issued automatically for workflow jobs; extraction workflows use it through `GH_TOKEN` | Repository/workflow administration and appropriate job permissions, not a copied token |
| GitHub, DA/EDS, Adobe Developer Console, Algolia, and Figma administration | Each service's own access controls | The successor's own membership and required role; do not share passwords or browser sessions |

`<target>` is `stage` or `prod`. Secret IDs, IMS client IDs/scopes, public
hosts, distribution IDs, and index names are configuration rather than secret
values. Record the required identifiers in the approved configuration record.
An Algolia application ID is an identifier even though this workflow stores
it as a GitHub secret. Never substitute a privileged indexing key for a
browser-facing search credential.

For each managed credential, record the following in the approved team
vault/service record, linking to it from the handoff record where appropriate:

- Responsible service owner and backup role, plus the access-request path.
- Environment, secret name or vault reference, and every consumer that must
  change together.
- Issuer/admin console, expiry or renewal requirement, and rotation/recovery
  procedure.
- Last verified access/rotation date and non-sensitive evidence that consumers
  work after a change.

GitHub Actions secret values cannot be read back through GitHub. If a value
is not available through an approved vault, arrange replacement with the
service owner instead of trying to extract it from a running job. Do not copy
the outgoing maintainer's `.env`, `deploy.env`, AWS credential files, or browser
storage as a substitute for provisioning the successor.

Use the [Lambda secrets guide](../workers/website-lambda/SECRETS.md) for
rotation and runtime resolution. Granting access, changing IAM, rotating a
secret, changing a CloudFront origin header, or updating AEM configuration
requires explicit approval; an inventory exercise does not authorize them.
Session-key rotation affects signed-in users, and origin-token rotation must
not leave the direct-media path using the old token.

The [edge guide's push-invalidation section](../workers/website-lambda/README.md#push-invalidation)
notes that `invalidator` is also used by `adobe.design`. Coordinate with the
shared credential owner before changing it, and verify a publish produces
the intended CloudFront invalidation afterward. Do not rotate or revoke
shared keys solely because one maintainer is leaving.

## Where to make changes

| Task | Start here | Important boundary |
| --- | --- | --- |
| Copy, metadata, navigation, fragments | [Content authoring](./CONTENT_AUTHORING.md) | Content lives in DA; shared fragments affect multiple pages |
| Block behavior or markup | [Blocks](./BLOCKS.md) | Keep block-specific logic in its `init(el)` implementation |
| Global page lifecycle | [Architecture](./ARCHITECTURE.md) | Avoid adding block behavior to `scripts.js` or `ak.js`; load the lifecycle/performance skill |
| CSS and tokens | [Styles](./STYLES.md) | Use existing tokens, scheme handling, and block scoping |
| Audience rules, auth, cache headers | [Lambda guide](../workers/website-lambda/README.md) | Change the live Lambda source, not the legacy Worker |
| Status data or component links | [Dependencies](./DEPS.md) | Edit the generator or authored mappings, then regenerate |
| Search records or DA tools | [Tools](./TOOLS.md) | A publishing indexer run replaces the entire remote index |
| Test selection | [Tests](./TESTS.md) | Root `npm test` is not the full repository suite |

The browser lifecycle is `scripts/scripts.js` for project setup, then
`scripts/ak.js` for area decoration and section/block loading, then
`scripts/lazy.js` for deferred work. `scripts/postlcp.js` exists but is not
wired into that lifecycle. Read the current source before changing load order.

Never hand-edit generated status/property output to fix a symptom. The
[data guide](./DEPS.md) identifies authored aliases/overrides and the generators
that own each output.

## Common maintenance operations

| Operation | Procedure |
| --- | --- |
| Set up local development | [Contributing setup](../CONTRIBUTING.md#set-up-the-repository); use `.nvmrc` and the package engine constraint |
| Preview or publish content | [Author workflow](../CONTRIBUTING.md#author-workflow) |
| Deploy preview Lambda | [Preview runbook](../workers/website-lambda/DEPLOY-PREVIEW.md) |
| Deploy production Lambda | [Production runbook](../workers/website-lambda/DEPLOY-PROD.md) |
| Manage or rotate secrets | [Secrets guide](../workers/website-lambda/SECRETS.md); separate authorization required |
| Investigate cache/routing/VPN configuration | [Edge guide](../workers/website-lambda/README.md); inspect before running infrastructure scripts |
| Build search records without publishing | `node tools/indexer/index.js --dry-run`; see [indexer guide](../tools/indexer/README.md) |
| Update component mappings/status | [Data guide](./DEPS.md); regenerate and inspect the resulting diff |

The indexer dry run writes `tools/indexer/out/records.json` without publishing.
It still contacts configured services. Get permission before running it through
an assistant. **`--limit` alone is not safe:** without `--dry-run`, a limited
run can replace the full live index with only those records.

For deployment, scripts default to the production target and the `spectrumHub`
profile unless overridden. The runbooks explicitly select the target and
`default` profile, stop on unreviewed local configuration, and preserve existing
Lambda environment variables. Do not bypass these safeguards.

## Validation and scheduled jobs

Use the smallest relevant suite from [Tests](./TESTS.md), plus manual checks
that exercise the changed behavior. New blocks/shared custom elements need
matching accessibility coverage under `test/a11y/`. Semantic or interactive
changes also need keyboard and assistive-technology review.

`npm test` covers the root unit and supporting Node suites. Accessibility,
Pattern Library smoke tests, full link crawls, lint, and Lambda tests are
separate. The Lambda package has no `test` script; follow the
[edge-test instructions](./TESTS.md#edge-tests) rather than assuming root CI
covers edge behavior.

As of the review date, these recurring jobs are configured in
[GitHub Actions](https://github.com/adobe/spectrum-hub/actions):

| Workflow file under `.github/workflows/` | Configured schedule (UTC) |
| --- | --- |
| `index-algolia.yml` | Every 12 hours |
| `extract-rsp-properties.yml` | Daily at 07:00 |
| `extract-swc-properties.yml` | Daily at 06:00 |
| `validate-figma-discovery.yml` | Daily at 08:15 |
| `link-check.yml` | Daily at 06:00 |
| `e2e-deployed.yml` | Daily at 07:00, also on pushes to `main` |

These are configured schedules, not evidence that the latest runs succeeded.
Check the workflow source and recent run results before relying on generated
data or automation. Algolia indexing uses repository secrets
`ALGOLIA_APP_ID` and `ALGOLIA_WRITE_API_KEY`, plus variable
`ALGOLIA_INDEX_NAME`; Figma validation uses `FIGMA_TOKEN`.
Verify configuration and ownership without retrieving or displaying values.

## Critical operational safeguards

Private data must be removed from anonymous responses at the edge, not merely
hidden by browser code. Check document responses, page variants, filtered
indexes, and sitemap behavior on the public-like host. Localhost is not proof
that an anonymous visitor cannot access content.

Production anonymous content can stay in CloudFront for a day. Filtering
changes need the appropriate gate ETag version and, when existing shared
copies must be removed, an approved invalidation. An ETag bump or Lambda
redeploy alone does not clear fresh cached copies. Authenticated responses
must remain private/no-store and must not contaminate the anonymous cache.

Secrets belong in AWS Secrets Manager, referenced by IDs. On cold-start
resolution failure, authorization fails closed; public pages may still work
while sign-in fails. The resolver caches successful values for ten minutes
and may retain a last-known-good value after a later transient failure.
Read [the secrets guide](../workers/website-lambda/SECRETS.md) before rotation.

Some media/static assets bypass Lambda. A non-HTML asset under a private-looking
path is not automatically protected by page audience rules. Preview's origin
token also has a direct-media CloudFront header path; do not rotate only one
side or print distribution origin headers into an AI transcript.

## Troubleshooting entry points

| Symptom | First investigation |
| --- | --- |
| Preview returns `403` | Adobe VPN and WAF, then authoring/origin access; do not disable the gate |
| Public pages load but sign-in fails | IMS/session flow, allowed origins, secret-resolution errors, and execution-role permissions |
| Private data is visible anonymously | Capture the affected URL and response type without sensitive payloads; escalate immediately to the edge/deployment owner |
| Old behavior after a Lambda deployment | Confirm source SHA, target, update status, edge invalidation, and browser TTL |
| One page has incorrect structure | DA metadata/block markup and shared fragments before global loader changes |
| Status or component links are wrong | Authored mappings, upstream extraction, and generated status model |
| Search results are stale or incomplete | Latest indexer run, intended source/index, and full-replacement safeguards |
| A branch alone fails IMS sign-in | Branch host length restriction documented in Contributing |
| Direct media fails while HTML works | CloudFront media behavior and origin authorization; avoid exposing custom header values |

Use GitHub Actions logs for repository jobs and the function's CloudWatch logs
for Lambda failures, subject to access approval. Read-only inspection is not
permission to publish, invalidate, redeploy, rotate secrets, or change IAM.
For a production incident, involve the confirmed incident/deployment owner;
do not improvise a rollback that could restore an older data leak.

## Known gaps and transition checklist

The edge guide documents anonymous browser copies that can persist after
sign-in until their TTL expires, sitemap privacy depending on indexed page
audience data, and unsupported sitemap indexes. These are known constraints,
not instructions to change behavior during handover.

As of 2026-11-10, the open GitHub issue list returned only the
[Dependency Dashboard (#19)](https://github.com/adobe/spectrum-hub/issues/19).
That is not a complete backlog: confirm Jira work, unmerged pull requests,
active branches, incidents, and outstanding decisions with the outgoing
maintainer. No live AWS configuration, access grants, alarm coverage, or
deployment results were verified when writing this document.

Complete these handoff items with the outgoing maintainer; owners and
organization-specific request paths are not established by this repository:

| Confirm before takeover | Evidence to retain in the approved team location |
| --- | --- |
| Primary/backup maintainer and incident escalation | Current role owners and escalation channel |
| GitHub, DA, EDS, AWS, IMS, Algolia, and Figma access | Successful access checks and approved request paths, not credentials |
| Last deployed preview/prod revisions | Source SHA, deployment record, verification results, known-good rollback SHA |
| Operational visibility | Log locations, dashboards, alarms, alert recipients, retention, and a recent successful run |
| Service credential lifecycle | Responsible role, rotation process, expiry reminders, and recovery procedure |
| Work still in progress | Linked issues/PRs/Jira tickets, decisions, dependencies, and release constraints |
| Routine operations | A supervised preview deploy and anonymous/authorized verification by the successor |

Update the review date when these facts are reconfirmed. Prefer links to
maintained service records over copying a credential inventory or temporary
task list into the repository.

## Copyable AI onboarding prompt

> Read `AGENTS.md`, `.ai/README.md`, and `docs/HANDOVER.md` in your assigned
> workspace. I am taking over Spectrum Hub. Use the contributor-onboarding
> skill for orientation, then the task-specific guides and skills. Explain
> content versus repository ownership, the browser lifecycle, and the current
> Lambda/CloudFront request path without changing anything. Treat source and
> verified configuration as authoritative; distinguish documented facts from
> unverified operational state. Never inspect another worktree or discard
> existing changes. Do not retrieve, print, or request secrets or session
> cookies. Ask before installing dependencies, starting services, contacting
> external systems, editing files, or publishing. Require explicit
> operation-specific approval for deployments, invalidations, secret/IAM
> changes, production changes, and rollback. Use the preview/prod runbooks
> rather than inventing deployment commands. Identify missing access,
> ownership, test evidence, and handoff decisions without assuming them.
