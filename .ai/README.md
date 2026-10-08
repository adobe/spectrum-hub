# AI and agent documentation

Coding agents should start with [`AGENTS.md`](../AGENTS.md) at the repository
root. It bootstraps the canonical skills and design records in this directory.

## Why `.ai/`

Repository skills live in **`.ai/skills/`** as tool-agnostic Markdown. Design
specifications and implementation plans live in **`.ai/docs/`**.

Tool-specific directories such as `.cursor/` and `.claude/` are optional,
gitignored local adapters. They are not part of a fresh clone. `CLAUDE.md` is
the only tracked tool-specific bootstrap file.

## Available skills

| Skill | Purpose | Invoke when |
| --- | --- | --- |
| [Onboarding](./skills/onboarding/SKILL.md) | Orient new and returning contributors and route repository work | Getting started or asking where and how to make a change |
| [Code review](./skills/code-review/SKILL.md) | Review local and GitHub pull request diffs for actionable defects and concrete maintainability or test risks | Reviewing code before merge or delivery |
| [New block workflow](./skills/new-block-workflow/SKILL.md) | Coordinate a new block from authored contract through verified implementation and optional delivery | Building a new block end to end |
| [Create a new block](./skills/create-new-block/SKILL.md) | Apply the EDS block structure, `init(el)` contract, authoring modes, and required tests | Scaffolding or implementing a block |
| [Accessibility compliance](./skills/accessibility-compliance/SKILL.md) | Implement and audit WCAG 2.2 semantics, interaction, focus, motion, and mobile behavior | Building or reviewing accessible interfaces |
| [Stylesheet conventions](./skills/stylesheet-conventions/SKILL.md) | Apply repository CSS organization, tokens, schemes, class naming, and responsive conventions | Adding or changing CSS |
| [Test-driven development](./skills/test-driven-development/SKILL.md) | Use red-green-refactor for features, fixes, refactors, and behavior changes | Before writing implementation code |
| [EDS performance and lifecycle review](./skills/eds-performance-review/SKILL.md) | Review core page-loading changes for ownership, fragility, and unmeasured cost | Changing `scripts.js`, `ak.js`, lifecycle behavior, CLS, or LCP |
| [Conventional commits](./skills/conventional-commits/SKILL.md) | Prepare conventional commit messages while respecting branch and worktree ownership | A commit is explicitly requested |
| [Write documentation](./skills/write-documentation/SKILL.md) | Apply Adobe content standards to repository documentation | Writing or editing Markdown |
| [Write issues and tickets](./skills/write-issues-tickets/SKILL.md) | Draft Jira tickets and GitHub issues using repository conventions | A ticket or issue draft is requested |
| [Write pull request descriptions](./skills/write-pr-descriptions/SKILL.md) | Draft pull request titles and bodies using Spectrum Hub conventions | A pull request description is requested |

Skills are on-demand. Load a skill when the task matches its frontmatter
description. Skills can require other skills for specific phases; follow those
requirements rather than copying their guidance.

## Specs and plans

| Artifact | Location | Filename |
| --- | --- | --- |
| Design specifications | [`docs/specs/`](./docs/specs/) | `YYYY-MM-DD-<topic>-design.md` |
| Implementation plans | [`docs/plans/`](./docs/plans/) | `YYYY-MM-DD-<feature-name>.md` |

This overrides Superpowers defaults under `docs/superpowers/`. Store
repository design work under `.ai/docs/` and do not create a
`docs/superpowers/` directory.

## Local adapters

A locally configured editor can point its skills directory at the canonical
source:

```text
.ai/skills/
└── <skill-name>/SKILL.md

.cursor/skills/ → ../.ai/skills/
.claude/skills/ → ../.ai/skills/
```

Continue editing `.ai/skills/`; do not edit through an adapter.

## Adding a skill

1. Create `.ai/skills/<skill-name>/SKILL.md`.
2. Use YAML frontmatter with `name` and a trigger-focused `description`.
3. Register the skill in the table above and in [`AGENTS.md`](../AGENTS.md).
4. Test the skill's behavior before relying on it.

Tools that do not support adapters can read `.ai/` directly. Start from
[`AGENTS.md`](../AGENTS.md) and load the matching `SKILL.md`.
