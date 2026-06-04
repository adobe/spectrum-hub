# Agent instructions

Coding agents working in this repository should treat **`.ai/`** as the canonical location for project AI rules, skills, and related configuration. This file is a **bootstrap**: read it first, then follow the detailed catalog and paths below.

## First steps

1. **Read** [`.ai/README.md`](./.ai/README.md) for the full list of rules, skills, when they apply, and how to invoke skills.
2. **Apply** the rules that match the files and tasks you touch (see globs and activation notes in that README).
3. **Load** a skill when the task matches its purpose: each skill lives under `.ai/skills/<skill-name>/SKILL.md`.

## Where things live

| What                         | Location                                                                                           |
| ---------------------------- | -------------------------------------------------------------------------------------------------- |
| Rule catalog and usage       | [`.ai/README.md`](./.ai/README.md)                                                                 |
| Rule files (`.md`)           | [`.ai/rules/`](./.ai/rules/)                                                                       |
| Task workflows (skills)      | [`.ai/skills/`](./.ai/skills/) — each skill is typically `SKILL.md` in a subfolder                 |
| Design specs                 | [`.ai/docs/specs/`](./.ai/docs/specs/) — `YYYY-MM-DD-<topic>-design.md`                            |
| Implementation plans         | [`.ai/docs/plans/`](./.ai/docs/plans/) — `YYYY-MM-DD-<feature-name>.md`                            |

## Rules vs skills

- **Rules** enforce consistency (documentation shape, CSS conventions, branch naming guidance, and similar). Prefer the always-applied and glob-triggered rules from [`.ai/README.md`](./.ai/README.md) when editing matching paths.
- **Skills** are **on-demand** playbooks (for example explain-code, test-driven development, session handoff). When the user’s request fits a skill’s description, **read that skill’s `SKILL.md`** before doing the work.

## Specs and plans

Design specs and implementation plans live under **`.ai/docs/`**, alongside the rest of the project's agent documentation:

- **Specs** (brainstorming output, design docs): `.ai/docs/specs/YYYY-MM-DD-<topic>-design.md`
- **Plans** (implementation plans): `.ai/docs/plans/YYYY-MM-DD-<feature-name>.md`

This **overrides** the default paths used by the Superpowers plugin skills (`superpowers:brainstorming`, `superpowers:writing-plans`, `superpowers:subagent-driven-development`, `superpowers:executing-plans`, and `superpowers:requesting-code-review`), which write to `docs/superpowers/specs/` and `docs/superpowers/plans/`. When any of those skills instruct you to save to `docs/superpowers/…`, save to the matching `.ai/docs/…` path instead. Do not create a `docs/superpowers/` directory in this repository.

## Rule index

When a task matches one of the following, read and apply the corresponding rule file before responding:

| Task | Rule file |
| ---- | --------- |
| Writing or editing `.md` files | [`.ai/rules/write-documentation.md`](./.ai/rules/write-documentation.md) |
| Drafting a PR description | [`.ai/rules/pr-descriptions.md`](./.ai/rules/pr-descriptions.md) |
| Drafting a Jira ticket or GitHub issue | [`.ai/rules/issue-ticket.md`](./.ai/rules/issue-ticket.md) |

## Accessibility tests

The project runs axe-core WCAG 2.2 AA scans against every block and template via Playwright. Tests live in `test/a11y/` and run on every PR via `.github/workflows/a11y.yml`.

### When you add a block or template

1. Create an HTML fixture in `test/a11y/fixtures/<name>.html` that initializes the block in isolation. Fixtures are served as static files by `serve .` — load block CSS and JS directly with `<link>` and `<script type="module">`.
2. Add an entry to the `BLOCKS` array in `test/a11y/accessibility.spec.js` with a `name`, `path`, and `readySelector` (a CSS selector that appears in the DOM once the block has finished initializing).

For blocks that fetch remote data at runtime (header, footer, sitenav, fragment, schedule), add a `routes` array to the entry. Each route intercepts a network request with `page.route()` and returns mock HTML or JSON so the test runs without a live server.

For templates, call `setConfig({ components: [], hostnames: [], linkBlocks: [] })` before `init()` in the fixture script — templates use `loadBlock()` internally, which requires `components` to be defined.

### When you change a block or template

| What changed | What to update |
| --- | --- |
| A WCAG violation is introduced | Fix the accessibility issue in the block |
| The init-produced DOM structure changes | Update `readySelector` in the `BLOCKS` entry |
| A fetch URL or response format changes | Update the `routes` mock in the `BLOCKS` entry |

### File locations

| What | Path |
| --- | --- |
| Test spec and `BLOCKS` registry | `test/a11y/accessibility.spec.js` |
| HTML fixtures (one per block/template) | `test/a11y/fixtures/` |
| GitHub Actions workflow | `.github/workflows/a11y.yml` |

## IDE-specific folders

Some editors load extra project config from their own directories (for example `.cursor/` and `.claude/`). Those locations are thin adapters that symlink back to `.ai/`. **`.ai/` remains the portable source of truth** for rules and skills documented here. If instructions conflict, prefer **`.ai/README.md`** and the files under **`.ai/rules/`** and **`.ai/skills/`**.
