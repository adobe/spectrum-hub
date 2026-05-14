# AI and agent documentation

Coding agents should start with [`AGENTS.md`](../AGENTS.md) at the repository root. It summarizes how to use this directory as the canonical source for rules and skills.

This directory contains rules, skills, and accumulated memory that coding agents use to enforce consistent formatting and structure in our codebase.

## Why `.ai/`

All rules and skills now live in **`.ai/`** — a tool-agnostic, plain-markdown directory that any agent or tool can read. IDE-specific directories (`.cursor/`, `.claude/`) become thin adapters that point back to `.ai/` via symlinks:

- Edit once in `.ai/` → all tools see the update automatically
- No sync step, no duplication, no drift between tools
- New contributors or tools start from `AGENTS.md` at the repo root, which bootstraps everything

## Rules

Rules can be found in the `rules` directory in `md` format.

### Available rules

#### Writing issues/tickets

- **File**: [`.ai/rules/issue-ticket.md`](./rules/issue-ticket.md)
- **Purpose**: Guidelines for drafting and formatting Jira tickets and/or GitHub issues — title format, severity classification, labels, issue types, and templates for general tickets and bugs.
- **How to invoke**: Ask to create or draft a Jira ticket (e.g. "write a Jira ticket for this bug", "draft a new issue ticket").

#### GitHub pull request descriptions

- **File**: [`.ai/rules/pr-descriptions.md`](./rules/pr-descriptions.md)
- **Purpose**: Generates GitHub pull request titles and body following Spectrum Hub conventions, including description structure, accessibility testing checklist, validation steps, and device review.
- **How to invoke**: Ask to create or draft a PR description (e.g. "write a PR description", "draft a pull request for this branch"). Requires a GitHub issue or Jira ticket number; the agent will prompt if not provided.

#### Writing documentation

- **File**: [`.ai/rules/write-documentation.md`](./rules/write-documentation.md)
- **Purpose**: Follow Adobe content writing standards when writing documentation for Spectrum Hub — including Markdown formatting, voice and tone, and writing for external or internal audiences.
- **How to invoke**: Auto-triggers when editing `*.md` files, or ask explicitly (e.g. "write the docs for this block", "update the README").

### When rules are activated

**Always-applied rules:** Rules use `alwaysApply: true` to activate automatically, or `globs` to activate when matching files are edited.
**On-demand rules:** Rules with `alwaysApply: false` and no globs are on-demand only — invoke by mentioning the rule or asking for the relevant task (e.g. "write a PR description", "draft a Jira ticket").

| Rule                 | Always applied | On-demand | Glob       |
| -------------------- | :------------: | :-------: | ---------- |
| write-issues-tickets |                |     x     | —          |
| pr-descriptions      |                |     x     | —          |
| write-documentation  |                |     x     | `**/*.md`  |

### Usage

1. Rules are on-demand; invoke them by asking for the relevant task (e.g. "write a PR description", "draft a Jira ticket").
2. To invoke a specific rule by name, mention it in chat (e.g. `@pr-descriptions` in Cursor, or "use the pr-descriptions rule" in Claude Code).

### Updating rules

To modify these rules:

1. Edit the appropriate file in the `rules` directory.
2. Try to follow the existing structure and format where possible.
3. Register any new rules in the table above and in [`AGENTS.md`](../AGENTS.md).

## Skills

Skills are used on-demand. When a task matches a skill's purpose, the agent reads the skill file for workflows, patterns, and guidance. Skills live in the `skills` directory; each has a `SKILL.md` and may include references or scripts.

### Available skills

#### Conventional commits

- **File**: [`.ai/skills/conventional-commits/SKILL.md`](./skills/conventional-commits/SKILL.md)
- **Purpose**: Create conventional commit messages following the conventional commits specification.
- **How to invoke**: Ask for a commit message (e.g. "write a commit message for these changes", "suggest a commit message"). Applies when you're about to run `git commit`.

#### Stylesheet conventions

- **File**: [`.ai/skills/stylesheet-conventions/SKILL.md`](./skills/stylesheet-conventions/SKILL.md)
- **Purpose**: Stylesheet organization, complete design token reference, light/dark mode with `light-dark()`, the `spectrum-edge` CSS layer, global utility classes, and CSS conventions for block stylesheets (nesting, BEM, media query syntax, reduced motion).
- **How to invoke**: Ask about CSS organization, adding styles, tokens, or light/dark mode (e.g. "where do I add shared styles", "what token should I use for this color", "how does dark mode work here").

#### Create a new block

- **File**: [`.ai/skills/create-new-block/SKILL.md`](./skills/create-new-block/SKILL.md)
- **Purpose**: Scaffold and implement a new EDS block — covers file structure, the `init(el)` function contract, template injection, CSS conventions, design tokens, and when to use templates vs per-page authoring vs fragments.
- **How to invoke**: Ask to create or add a new block (e.g. "create a new block", "scaffold a block for X", "add a new block to the detail template").

#### Test-driven development

- **File**: [`.ai/skills/test-driven-development/SKILL.md`](./skills/test-driven-development/SKILL.md)
- **Purpose**: Red–green–refactor TDD for agents — define behavior with a failing test first, implement the smallest change that passes, then refactor with tests green. Covers when TDD applies (features, bug fixes, refactors, behavior changes), exceptions that need human agreement, and the red–green–refactor cycle. Companion reference: [`.ai/skills/test-driven-development/testing-anti-patterns.md`](./skills/test-driven-development/testing-anti-patterns.md) (mock misuse, test-only production hooks, and related smells); load it when adding mocks or heavy test doubles.
- **How to invoke**: Use before writing implementation code for a feature or fix (per the skill frontmatter). Ask explicitly (e.g. "use TDD", "write the failing test first", "red–green–refactor") or mention `@test-driven-development` / the skill path in Cursor.

## Using rules and skills across tools and IDEs

Canonical content lives in **`.ai/`** (this directory). Tool-specific directories (`.cursor/`, `.claude/`) are thin adapters that point back here via symlinks — edit files in `.ai/`, never in the adapter directories.

### Current symlink structure

```text
.ai/rules/
└── *.md                          ← canonical, tool-agnostic source of truth

.ai/skills/
└── <skill-name>/SKILL.md         ← canonical, tool-agnostic source of truth

.cursor/rules/
└── *.mdc → ../../.ai/rules/*.md  (per-file symlinks; Cursor expects .mdc)
.cursor/skills/ → ../.ai/skills/  (directory symlink)

.claude/rules/ → ../.ai/rules/    (directory symlink; Claude Code reads .md)
.claude/skills/ → ../.ai/skills/  (directory symlink)
```

Editing any `.ai/rules/*.md` file immediately updates what both Cursor and Claude Code see — no sync step required.

### Adding a new rule

1. Create `rule-name.md` in `.ai/rules/` with YAML frontmatter (`globs`, `alwaysApply`).
2. Add one per-file symlink for Cursor (required — Cursor needs `.mdc` extension):

   ```sh
   ln -s "../../.ai/rules/rule-name.md" ".cursor/rules/rule-name.mdc"
   ```

   `.claude/rules/` is a directory symlink pointing at `.ai/rules/`, so it picks up the new file automatically — no extra step needed.

3. Register it in the table in this README and in [`AGENTS.md`](../AGENTS.md).

### Adding a new skill

1. Create `.ai/skills/<skill-name>/SKILL.md`.
2. Register it in the skills catalog above and in [`AGENTS.md`](../AGENTS.md).
3. Both `.cursor/skills/` and `.claude/skills/` pick it up automatically via directory symlinks.

### Using rules and skills in other environments

If you use a tool that does not read `.cursor/` or `.claude/`, point it at `.ai/` directly:

- **Start from [`AGENTS.md`](../AGENTS.md)** at the repository root.
- **Reference files when prompting** — for example: "Follow the rules in `.ai/rules/` and load `.ai/skills/<skill-name>/SKILL.md` for this task."
- **Copy or adapt** the markdown content into your tool's own config format as needed.
