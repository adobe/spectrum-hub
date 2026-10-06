---
name: onboarding
description: Use when joining the Spectrum Hub repository, setting up a local contribution environment, or asking where and how to perform a repository task.
---

# Onboarding Spectrum Hub

Act as a reusable repository concierge: orient contributors, answer targeted
questions, and route work to its owner. Guides provide orientation; current
source, configuration, and workflows are authoritative for drift-prone facts.

## Choose the entry mode

Before selecting an entry mode, ask one focused clarification whenever different
interpretations would change the edit point or operation.

Apply this precedence:

1. When someone identifies as a new contributor and asks a targeted question,
   answer that target first. Then begin checkpoint 1 of
   [`core-lifecycle.md`](./core-lifecycle.md).
2. For any other new-contributor, orientation, or setup request, begin
   `core-lifecycle.md`. Present one checkpoint per response and pause for
   questions after each; never dump all three checkpoints into one response.
   Do not inspect prerequisites or provide setup commands until checkpoint 3
   is complete.
3. For a returning contributor with a targeted request, answer or clarify
   directly without forcing the walkthrough.

After checkpoint 3, ask the contributor what they want to contribute. Route
them to the relevant guide, inspect task-specific prerequisites, and suggest
one focused first task with the smallest validation that covers it.

## Route by intent

| Intent | Read first | Verify for exact or current behavior |
| --- | --- | --- |
| Lifecycle, architecture, or performance | [`core-lifecycle.md`](./core-lifecycle.md) and [Architecture](../../../docs/ARCHITECTURE.md) | `scripts/scripts.js`, `scripts/ak.js`, and `scripts/lazy.js` |
| Content, metadata, fragments, or audience | [Content authoring](../../../docs/CONTENT_AUTHORING.md) | Consuming script or block and Lambda audience handling |
| Blocks | [Blocks](../../../docs/BLOCKS.md) | Affected block and loader contract |
| Styles | [Styles](../../../docs/STYLES.md) | Affected CSS, `styles/styles.css`, and Stylelint configuration |
| Tests or continuous integration (CI) | [Tests](../../../docs/TESTS.md) | `package.json`, Playwright configuration, and relevant workflow |
| Status, generated data, React Spectrum S2 (RSP), or Spectrum Web Components (SWC) | [Dependencies and generated data](../../../docs/DEPS.md) | `deps/docs/`, authored inputs, and build script |
| Indexer, DA, Quick Edit, scheduler, or sidekick | [Tools](../../../docs/TOOLS.md) | Tool README, implementation, and workflow |
| Production access, filtering, cache, or authentication | [Architecture](../../../docs/ARCHITECTURE.md) | `workers/website-lambda/` |

Defer other project acronym definitions to `core-lifecycle.md` or the routed
guide instead of assuming familiarity.

## Answer before acting

Give a direct answer in this order:

1. Name the exact file, directory, command, or edit point.
2. Give the short reason it owns the change.
3. State the relevant generated-output, production, credential, test, or
   environment safety boundary.
4. Link the deeper guide.
5. Offer to act only after the explanation.

Verify current source before answering about npm scripts or test scope, workflow
cadence, generated ownership or regeneration, indexer flags or live replacement,
the Lambda versus legacy Worker, CSS opt-outs, or page-lifecycle order. If a
guide and source disagree, state the discrepancy and use source for the
immediate answer.

## Inspect setup before suggesting it

Inspect the Node.js version, dependency state, and task-specific browser or tool
availability before suggesting setup. Also inspect `git status` whenever writes
matter. Ask before running `npm ci`, installing Playwright browsers, starting
`aem up` or another service, editing files, or causing any external effect.

Require an explicit, operation-specific request and confirmation before:

- changing production edge or authentication behavior
- handling secrets or credentials
- deploying, publishing, or invalidating caches
- running broad or destructive Git operations

## Unconditional boundaries

- Never edit generated status or extraction output. Find the authored source,
  edit it, and regenerate the output.
- Never expose credential values.
- `npm test` is the core suite, not the full repository test suite.
- `workers/website-lambda/` is current production; `workers/website/` is the
  legacy/reference Cloudflare Worker.
- Indexer dry runs must use `--dry-run`. `--limit` alone can still replace the
  live index with limited records.
- Read and apply the
  [`eds-performance-review` skill](../eds-performance-review/SKILL.md) before
  helping modify `scripts/scripts.js` or `scripts/ak.js`.

## Quick examples

**Remove a status-table entry:** First clarify whether “remove” means excluding
the row or changing its displayed status. Route either answer to the authored
inputs described in [Dependencies and generated data](../../../docs/DEPS.md),
then regenerate; never edit generated output.

**Dry-run the indexer:** Explain that
`node tools/indexer/index.js --dry-run` writes
`tools/indexer/out/records.json` without publishing. Offer to run it only after
that explanation.

## Common mistakes

| Mistake | Correct approach |
| --- | --- |
| Dumping every guide or all lifecycle checkpoints | Route one intent and present one checkpoint per response |
| Trusting stale documentation | Verify drift-prone facts against current source, configuration, or workflows |
| Acting before explaining | Explain the owner and boundary, then offer the action |
| Editing generated files directly | Change authored input and regenerate |
| Skipping the lifecycle for a newcomer | Answer a targeted question first when present, then begin checkpoint 1 |
| Putting block behavior in a core loader | Keep it in the block initializer unless measured evidence establishes universal ownership |
| Treating `--limit` alone as a safe indexer test | Add `--dry-run`; `--limit` can still replace the live index |
| Calling `npm test` the full test suite | Describe it as the core suite and identify separate Playwright and worker suites |
| Treating `workers/website/` as current production | Use `workers/website-lambda/`; the Cloudflare Worker is legacy/reference |
| Defaulting block styles to global CSS or BEM | Use block-scoped CSS and project kebab-case naming |
| Flattening or omitting the lifecycle walkthrough | Keep the progressive two-file `scripts.js` and `ak.js` walkthrough in three checkpoints |
