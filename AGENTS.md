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

## Rules vs skills

- **Rules** enforce consistency (documentation shape, CSS conventions, branch naming guidance, and similar). Prefer the always-applied and glob-triggered rules from [`.ai/README.md`](./.ai/README.md) when editing matching paths.
- **Skills** are **on-demand** playbooks (for example explain-code, test-driven development, session handoff). When the user’s request fits a skill’s description, **read that skill’s `SKILL.md`** before doing the work.

## Rule index

When a task matches one of the following, read and apply the corresponding rule file before responding:

| Task | Rule file |
| ---- | --------- |
| Writing or editing `.md` files | [`.ai/rules/write-documentation.md`](./.ai/rules/write-documentation.md) |
| Drafting a PR description | [`.ai/rules/pr-descriptions.md`](./.ai/rules/pr-descriptions.md) |
| Drafting a Jira ticket or GitHub issue | [`.ai/rules/issue-ticket.md`](./.ai/rules/issue-ticket.md) |

## IDE-specific folders

Some editors load extra project config from their own directories (for example `.cursor/` and `.claude/`). Those locations are thin adapters that symlink back to `.ai/`. **`.ai/` remains the portable source of truth** for rules and skills documented here. If instructions conflict, prefer **`.ai/README.md`** and the files under **`.ai/rules/`** and **`.ai/skills/`**.
