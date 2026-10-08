---
name: code-review
description: Use when reviewing local changes or a GitHub pull request for defects, regressions, maintainability risks, or false test confidence.
---

# Code Review

Review the requested change for actionable defects and concrete maintainability
or test-confidence risks. Stay read-only and prioritize evidence over coverage.

## Establish the target

Identify the requested review set before reading details:

- staged and unstaged changes for a working-tree review
- committed branch changes against the intended merge base
- the complete GitHub pull request diff for a PR review

Ask one focused question when different base choices change the diff. Do not
silently review only staged files or guess a pull request's target branch.

## Read-only boundary

Do not change files, install dependencies, update snapshots, run generators,
start services, mutate Git state, or post GitHub comments/reviews. This boundary
overrides mutating steps in every specialist skill loaded during the review.

Non-mutating searches, reads, and targeted checks are allowed.

## Review method

1. Inspect the complete diff, changed-file list, and available request, issue,
   test, or pull request context.
2. Read changed files plus the smallest necessary set of callers, consumers,
   tests, authored inputs, configuration, and generated sources.
3. Trace valid, invalid, empty, and boundary inputs; async ordering and cleanup;
   errors and stale state; repeated initialization; and compatibility with
   existing callers and authored contracts.
4. Check whether tests prove the intended behavior rather than merely execute
   the changed path.
5. Load applicable specialist guidance:

   | Change | Required specialist |
   | --- | --- |
   | Semantic or interactive UI | `accessibility-compliance` |
   | `scripts.js`, `ak.js`, lifecycle behavior, CLS, or LCP | `eds-performance-review` |
   | CSS, tokens, schemes, responsive behavior, or class naming | `stylesheet-conventions` |
   | New block or changed block contract | `create-new-block` |
   | Generated dependency or status data | `deps/README.md` and the owning `deps/docs/` contract |
   | Test or CI scope | `docs/TESTS.md`, `package.json`, and the relevant workflow |

6. Run the smallest non-mutating targeted check needed to confirm a suspected
   issue when practical.
7. Report only issues introduced or exposed by the change.

## Finding threshold

A finding needs an exact changed-file location and a reachable failure scenario
or concrete risk of false confidence or costly future change.

Do not report:

- unrelated pre-existing issues
- personal style preferences
- speculative concerns without a reachable scenario
- broader refactors the change does not require
- missing tests without naming the behavior left unprotected

Use a question or residual risk when evidence is inconclusive.

## Severity and confidence

| Severity | Meaning |
| --- | --- |
| `blocking` | Reachable data loss, exploitable security exposure, or production outage |
| `high` | Likely user-visible failure or major supported-path regression |
| `medium` | Narrower concrete correctness, reliability, accessibility, maintainability, or test-confidence risk |
| `low` | Limited-impact issue supported by concrete evidence |

| Confidence | Meaning |
| --- | --- |
| `high` | Demonstrated by code flow or a targeted check |
| `medium` | Strongly supported but dependent on a stated runtime or input condition |
| `low` | Plausible but incomplete; prefer a question or residual risk if the claim is not yet actionable |

Order findings by severity from `blocking` to `low`, then confidence from `high`
to `low`.

## Output

List findings first. Each finding contains:

```text
[severity, confidence] path/to/file.js:line — concise title

Concrete failure scenario or maintenance/test risk. Explain why the change
causes it and give the smallest useful fix direction.
```

Then, only when applicable, add:

- **Questions** — intent needed to determine correctness
- **Residual risks** — meaningful checks or conditions that could not be
  verified

If no issue qualifies, say `No qualifying findings.` and list only meaningful
residual risks. Do not lead with praise, a diff summary, or style commentary.
