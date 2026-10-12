---
name: contributor-onboarding
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

1. When someone identifies as a new contributor and asks a targeted question, answer that target first. Then begin checkpoint 1 of [`core-lifecycle.md`](./core-lifecycle.md).
2. For any other new-contributor, orientation, or setup request, begin `core-lifecycle.md`. Present one checkpoint per response and pause for questions after each; never dump all three checkpoints into one response. Do not inspect prerequisites or provide setup commands until checkpoint 3 is complete.
3. For a returning contributor with a targeted request, answer or clarify directly without forcing the walkthrough.

After checkpoint 3, ask the contributor what they want to contribute. Route
them to the relevant guide, inspect task-specific prerequisites, and suggest
one focused first task with the smallest validation that covers it.

When the contributor selects the indexer, do not inspect prerequisites or
suggest a starter change. Provide
`node tools/indexer/index.js --dry-run`, explain that it writes
`tools/indexer/out/records.json` without publishing, warn that `--limit` alone
can still replace the live index with limited records, and link
[`tools/indexer/README.md`](../../../tools/indexer/README.md). Stop after this
safe handoff.

## Guided routes

After checkpoint 3, offer these tasks. Present only the selected task, one step
at a time, and pause for questions before continuing. Tell the contributor what
to do and what evidence marks the task complete; do not turn the route into a
multiple-choice knowledge check. Explain the owner and safety boundary before
asking to edit files, run commands, contact an external service, or start a
local service.

### Trace lifecycle loading in the browser

Use this task for lifecycle, architecture, or performance questions.

**Task:** Capture the observed order in which the page loader, one block, and
deferred work load.

1. Read [`core-lifecycle.md`](./core-lifecycle.md) and [Architecture](../../../docs/ARCHITECTURE.md), then verify the function names in `scripts/scripts.js`, `scripts/ak.js`, and `scripts/lazy.js`.
2. Ask before opening a page or starting a local service. In browser DevTools, enable Network recording, disable the cache, and reload a page containing a normal block.
3. Use DevTools logpoints in the loaded source at `loadPage()`, `loadArea()`, `loadBlock()`, and the `loadLazy()` wrapper. Log the function name and, for `loadBlock()`, the block's first class. Logpoints provide console output without editing repository files.
4. In the Network panel, locate `scripts.js`, `ak.js`, the selected block's JavaScript and CSS, and `lazy.js`. Record their request order and initiators.

**Done when:** The contributor has an observed sequence showing page setup,
area loading, block loading, and the later `lazy.js` import, plus one sentence
about which lifecycle shelf owns each step.

**Cleanup:** Remove the DevTools logpoints. Do not edit `scripts.js` or `ak.js`
for this exercise. Changes to either file require the
[`eds-performance-review`](../eds-performance-review/SKILL.md) skill and
measured LCP or CLS evidence.

### Author public and private block variants

Use this task for content, metadata, fragments, or audience handling.

**Task:** Build paired public and private variants on a disposable, unpublished
DA page and observe which variant remains.

1. Read [Content authoring](../../../docs/CONTENT_AUTHORING.md), then verify audience behavior in `scripts/ak.js` and `workers/website-lambda/`.
2. Ask before editing DA content. Add two blocks with distinct text: `Columns (audience public)` and `Columns (audience private)`.
3. Preview the unpublished page off-CDN and inspect the DOM. Confirm that the private block remains and the public block is removed.
4. If an appropriate production-like preview and authorized test session are available, compare anonymous and authorized responses without publishing the disposable page.

**Done when:** The contributor can point to the surviving DOM block in each
tested environment and explain why localhost alone cannot validate anonymous
production behavior.

**Cleanup:** Remove the disposable DA content. Do not publish it.

### Create a simple authored block

Use this task when a contributor has a real, approved block to create. Do not
invent a production block only for onboarding.

**Task:** Scaffold the approved block and make one authored example render
through its `init(el)` contract.

1. Read [`create-new-block`](../create-new-block/SKILL.md) and [Blocks](../../../docs/BLOCKS.md), then write down the block name, authored rows and cells, variants, semantic output, and invalid-input behavior.
2. After permission to edit, create matching `blocks/<name>/<name>.js` and `blocks/<name>/<name>.css` files. Keep behavior in `init(el)` and styles under the root class.
3. Add `test/blocks/<name>.test.js`, `test/a11y/fixtures/<name>.html`, and `test/a11y/blocks/<name>.spec.js`.
4. Run the targeted unit and accessibility commands from [Tests](../../../docs/TESTS.md).

**Done when:** The authored fixture renders the intended semantic structure,
the focused unit test passes, and the accessibility spec passes in light,
dark, and accessibility-tree checks.

### Add a vertical banner variant

Use this task for changing an existing block.

**Task:** Add an authored `vertical` variant that keeps the banner content
stacked at every viewport width.

1. Read [Blocks](../../../docs/BLOCKS.md), `blocks/banner/banner.js`, `blocks/banner/banner.css`, and the banner unit and accessibility tests.
2. After permission to edit, add the variant to the banner accessibility fixture and add CSS scoped under `.banner.vertical`. Do not change JavaScript unless the variant requires behavior that CSS cannot provide.
3. Run `npm run lint:css` and `npx playwright test test/a11y/blocks/banner.spec.js`.
4. Inspect the fixture at mobile and desktop widths and confirm the default banner still changes layout while the vertical variant remains stacked.

**Done when:** CSS lint and the banner accessibility spec pass, the vertical
fixture stays stacked at both widths, and the default variant is unchanged.

### Change the page background color

Use this task for global styles and design tokens.

**Task:** Temporarily change the global page background token and observe its
effect in both color schemes.

1. Read [Styles](../../../docs/STYLES.md) and [`stylesheet-conventions`](../stylesheet-conventions/SKILL.md), then locate the authored `--se-body-background-color` token after the generated token boundary in `styles/styles.css`.
2. After permission to edit and open a page, change both values in its `light-dark()` declaration to clearly distinguishable existing color tokens. Do not add a second body rule.
3. Run `npm run lint:css`, then inspect a representative page in light and dark modes and use DevTools Computed styles to confirm that `body` resolves the token.

**Done when:** CSS lint passes and the contributor has observed the expected
computed background in both schemes.

**Cleanup:** Restore the original token values unless the color change is an
approved product change.

### Observe an accessibility snapshot failure

Use this task for tests or continuous integration.

**Task:** Produce one intentional breadcrumbs accessibility-tree failure, read
the mismatch, then restore the passing expectation.

1. Read [Tests](../../../docs/TESTS.md) and `test/a11y/README.md`, then inspect `test/a11y/blocks/breadcrumbs.spec.js`.
2. After permission to edit and run Playwright, change one link name in the inline ARIA snapshot and run `npx playwright test test/a11y/blocks/breadcrumbs.spec.js --project=chromium -g "accessibility tree"`.
3. Read the expected-versus-received tree in the failure output. Restore the original snapshot and rerun the same command.

**Done when:** The contributor has seen the targeted semantic failure and the
restored test passes.

**Cleanup:** Confirm the snapshot matches its original content. Do not use
`--update-snapshots` to hide an unexplained difference.

### Regenerate Figma component data

Use this task for status and generated dependency data.

**Task:** Refresh the Figma component roster from its upstream source and
rebuild the combined status data.

1. Read [Dependencies and generated data](../../../docs/DEPS.md) and `deps/figma/fetch-figma-components.js`. Explain that the helper is not a standalone command: the current roster comes from the Figma MCP component sets for the documented S2 Web file.
2. Ask before contacting Figma or writing generated files. Retrieve the component sets, exclude Figma-internal names beginning with `.`, and regenerate `deps/figma/components.json` in the documented `[{ name, figmaPageId }]` shape.
3. Run `node deps/build-status-index.js` and `npm run test:extractions`.
4. Inspect the diff for the expected roster changes and unexpected neighboring status changes.

**Done when:** The extraction tests pass and every generated change can be
traced to an upstream Figma roster difference.

**Safety:** Never expose credentials or hand-edit generated status output.

### Dry-run the indexer

Use this task for the content indexer.

**Task:** Build the local search-record file without publishing to Algolia.

1. Read [Tools](../../../docs/TOOLS.md) and [`tools/indexer/README.md`](../../../tools/indexer/README.md).
2. Provide `node tools/indexer/index.js --dry-run` and explain that it writes `tools/indexer/out/records.json` without publishing.
3. Stop after this safe handoff. Do not inspect prerequisites, invent an indexer change, or run the command without permission.

**Done when:** The contributor knows the output path and the difference between
`--dry-run` and a publishing run.

**Safety:** `--limit` alone can still replace the live index with limited
records.

### Trace production audience filtering

Use this task for production access, filtering, cache, or authentication.

**Task:** Compare the HTML document response for a page with audience variants
as an anonymous visitor and as an authorized visitor.

1. Read [Architecture](../../../docs/ARCHITECTURE.md), then trace `audience-public` and `audience-private` through `workers/website-lambda/lib/audience.js`, its focused tests, and `workers/website-lambda/index.js`.
2. Ask before opening production-like URLs. In a private browsing window, use the Network panel to inspect the document response and record which audience variant is present.
3. Repeat in an authorized session without exposing or copying cookies, credentials, or response headers containing secrets.
4. Compare the responses with the post-load DOM and identify when browser filtering in `scripts/ak.js` acts as defense in depth.

**Done when:** The contributor has response-level evidence showing which
variant each viewer receives and can distinguish edge filtering from browser
filtering.

**Safety:** Keep the task read-only. Require explicit, operation-specific
authorization before changing authentication, production filtering, caching,
secrets, deployment, or invalidation behavior.

Defer other project acronym definitions to `core-lifecycle.md` or the routed
guide instead of assuming familiarity.

## Answer before acting

Give a direct answer in this order:

1. Name the exact file, directory, command, or edit point.
2. Give the short reason it owns the change.
3. State the relevant generated-output, production, credential, test, or environment safety boundary.
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

- Never edit generated status or extraction output. Find the authored source, edit it, and regenerate the output.
- Never expose credential values.
- `npm test` is the core suite, not the full repository test suite.
- `workers/website-lambda/` is current production; `workers/website/` is the legacy/reference Cloudflare Worker.
- Indexer dry runs must use `--dry-run`. `--limit` alone can still replace the live index with limited records.
- Read and apply the [`eds-performance-review` skill](../eds-performance-review/SKILL.md) before helping modify `scripts/scripts.js` or `scripts/ak.js`.

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
