# Extraction PR resilience

## Problem

The SWC and RSP scheduled extraction workflows validate changed output before
they push the bot branch or create a pull request. This protects the default
branch, but it also hides useful release data when validation finds an expected
manual follow-up.

The October 15 SWC run discovered new `menu` and `thumbnail` components. The
extraction tests correctly reported that their playground snippets were
missing, but the workflow stopped before opening a pull request. Reviewers
therefore received a failed scheduled run without the generated release diff
that explains what changed.

## Goals

- Open or update an extraction pull request whenever a published release
  changes the generated SWC or RSP output.
- Keep the pull request reviewable rather than converting it to a draft.
- Show validation failures prominently in the pull request body and the Actions
  job summary.
- Keep the workflow conclusion failed when lint or extraction tests fail.
- Apply the same lifecycle to the SWC and RSP workflows.
- Preserve the existing unchanged-output cleanup behavior.

## Non-goals

- Automatically generate playground snippets.
- Allow a failed extraction pull request to merge automatically.
- Change extraction logic, component discovery, or generated data contracts.
- Add labels or require repository-specific label configuration.

## Design

### Workflow lifecycle

The extraction, status-index build, and staging steps remain unchanged. When
staging finds no differences, the workflow continues to close any stale
extraction pull request and remove the bot branch.

When staging finds changed output:

1. Run JavaScript lint and extraction tests as separate named steps.
2. Set `continue-on-error: true` on those validation steps so their outcomes are
   available to later steps.
3. Capture each command's output in a temporary log while preserving its exit
   status.
4. Build the pull request body from the existing roster delta plus a validation
   section.
5. Commit and force-push the bot-owned branch.
6. Create or update the normal reviewable pull request.
7. Run a final validation guard after pull request reconciliation. The guard
   exits nonzero when either validation step failed.

This ordering makes the generated release diff persistent and reviewable while
retaining a failed Actions conclusion for alerting.

### Reviewer notification

If validation succeeds, the pull request body states that both commands passed,
as it does today.

If validation fails, the pull request body starts its validation section with a
prominent warning. It names each failed command, links to the Actions run, and
includes concise assertion output from the captured logs. For a missing SWC
snippet, the reviewer should see details such as:

```text
mapped components without a shell: menu, thumbnail
```

The workflow writes the same validation warning to `$GITHUB_STEP_SUMMARY` so
the failure is visible from the Actions run without searching the full log.

The pull request remains reviewable. Its failed workflow result and body
warning communicate that manual follow-up is required before merge.

### Failure behavior

Validation failures do not suppress changed extraction output. Any generated
change that would normally trigger an extraction pull request still triggers
one.

The final guard preserves failure semantics:

- Lint failure: publish the changed output, report lint failure, then fail.
- Extraction test failure: publish the changed output, report the failed
  assertions, then fail.
- Pull request publication failure: fail normally because the release diff was
  not persisted.
- Successful validation and publication: finish successfully.

### Shared behavior

The SWC and RSP workflow files use the same step IDs, outcome checks, validation
report structure, and final failure guard. Their extraction commands, generated
paths, titles, and roster-delta inputs remain implementation-specific.

The design avoids a second job or artifact transfer. The existing single job
already has the changed files, temporary logs, git credentials, and pull
request context needed to complete the lifecycle.

## Tests

Update `test/extractions/workflows.node.test.js` to assert the lifecycle for
both extraction workflows:

- Changed-output validation steps use `continue-on-error: true`.
- Lint and extraction tests run before the bot branch is pushed.
- Pull request body generation references validation step outcomes.
- The bot branch push and pull request reconciliation are not gated on
  validation success.
- A final guard appears after pull request reconciliation.
- The final guard fails when either validation outcome is not successful.
- Existing default-branch, concurrency, pull request update/create, and
  unchanged-output cleanup assertions continue to pass.

The targeted validation command is:

```sh
npm run test:extractions
```
