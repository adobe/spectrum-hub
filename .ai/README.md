# AI and agent documentation

Coding agents should start with [`AGENTS.md`](../AGENTS.md) at the repository
root, then read this file from the current working tree before responding or
acting. It bootstraps the canonical skills and design records in this
directory.

## Why `.ai/`

Repository skills live in **`.ai/skills/`** as tool-agnostic Markdown. Design
specifications and implementation plans live in **`.ai/docs/`**.

The tracked `.github/skills` discovery adapter exposes the canonical skills to
GitHub Copilot. Other tool-specific files remain local and ignored.

## Discovery and loading

Skill discovery and skill loading are separate:

- **Discovery** reads each skill's `name` and `description` so the client can
list skills, match them to a task, and accept explicit skill requests.
- **Loading** adds the complete `SKILL.md` instructions to the agent's context.
Load a skill only when the user invokes it or the current task matches its description.

Agents must use the startup sequence in [`AGENTS.md`](../AGENTS.md): read both
bootstrap files from the current working tree, identify every matching skill,
and load those skills before responding or acting. Do not assume the full skill
content was loaded merely because a client listed the skill.

Users can request a discovered skill by name. Where the client supports direct
skill invocation, use `/skill-name`. In Copilot CLI, include the name in the
prompt, for example `Use the /create-new-block skill`. After adding or changing
project skills during an active session, run `/skills reload`. Some clients
reload silently. Start a new session if the current one still does not discover
the updated skills.

## Available skills

| Skill | Purpose | Invoke when |
| --- | --- | --- |
| [Contributor onboarding](./skills/contributor-onboarding/SKILL.md) | Orient new and returning contributors, including the core page lifecycle and repository ownership boundaries | Joining the repository, setting up locally, or asking where and how to make a change |
| [Code review](./skills/code-review/SKILL.md) | Review local changes and GitHub pull request diffs for actionable defects and concrete maintainability or test risks | Reviewing code before merge or delivery |
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

## Client discovery adapters

The tracked symbolic link points GitHub Copilot's project-skill directory at
the canonical source:

```text
.ai/skills/
└── <skill-name>/SKILL.md

.github/skills/ → ../.ai/skills/
```

Continue editing `.ai/skills/`; do not edit through the adapter. `.claude/` and
`.cursor/` remain ignored local folders.

Some Windows checkouts do not preserve symbolic links. In that case, configure
Copilot to use `.ai/skills/` as an additional skill location using the commands
supported by the installed Copilot version.

## Adding a skill

1. Create `.ai/skills/<skill-name>/SKILL.md`.
2. Use YAML frontmatter with a `name` matching the directory and a
trigger-focused `description`.
3. Register the skill in the table above and in [`AGENTS.md`](../AGENTS.md).
4. Test the skill's behavior before relying on it.

Tools that do not support the tracked adapters can read `.ai/` directly. Start
from [`AGENTS.md`](../AGENTS.md) and load every matching `SKILL.md`.
