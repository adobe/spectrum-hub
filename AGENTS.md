# Agent instructions

Coding agents working in this repository should treat **`.ai/`** as the canonical location for project AI skills and related configuration. This file is a **bootstrap**: read it first, then follow the detailed catalog and paths below.

## First steps

1. **Read** [`.ai/README.md`](./.ai/README.md) for the full skill catalog and invocation guidance.
2. **Load** a skill when the task matches its purpose: each skill lives under `.ai/skills/<skill-name>/SKILL.md`.

New contributors can load
[`.ai/skills/onboarding/SKILL.md`](./.ai/skills/onboarding/SKILL.md) for a
guided repository orientation. The same skill answers targeted repository
“where” and “how” questions on return visits.

## Where things live

| What                         | Location                                                                                           |
| ---------------------------- | -------------------------------------------------------------------------------------------------- |
| Skill catalog and usage      | [`.ai/README.md`](./.ai/README.md)                                                                 |
| Task workflows and guidance  | [`.ai/skills/`](./.ai/skills/) — each skill is `SKILL.md` in a subfolder                           |
| Design specs                 | [`.ai/docs/specs/`](./.ai/docs/specs/) — `YYYY-MM-DD-<topic>-design.md`                            |
| Implementation plans         | [`.ai/docs/plans/`](./.ai/docs/plans/) — `YYYY-MM-DD-<feature-name>.md`                            |

## Skills

Skills are on-demand workflows and references. When the user's request fits a
skill's description, read that skill's `SKILL.md` before doing the work.

## Skill index

| Task | Skill |
| ---- | ----- |
| Accessibility audits and accessible implementation | [`.ai/skills/accessibility-compliance/SKILL.md`](./.ai/skills/accessibility-compliance/SKILL.md) |
| Reviewing local changes or a GitHub pull request | [`.ai/skills/code-review/SKILL.md`](./.ai/skills/code-review/SKILL.md) |
| Conventional commit messages | [`.ai/skills/conventional-commits/SKILL.md`](./.ai/skills/conventional-commits/SKILL.md) |
| Creating a new EDS block | [`.ai/skills/create-new-block/SKILL.md`](./.ai/skills/create-new-block/SKILL.md) |
| Coordinating a new block from intent through delivery | [`.ai/skills/new-block-workflow/SKILL.md`](./.ai/skills/new-block-workflow/SKILL.md) |
| Reviewing core lifecycle and performance changes | [`.ai/skills/eds-performance-review/SKILL.md`](./.ai/skills/eds-performance-review/SKILL.md) |
| Adding or organizing CSS | [`.ai/skills/stylesheet-conventions/SKILL.md`](./.ai/skills/stylesheet-conventions/SKILL.md) |
| Implementing features and fixes with TDD | [`.ai/skills/test-driven-development/SKILL.md`](./.ai/skills/test-driven-development/SKILL.md) |
| Writing or editing documentation | [`.ai/skills/write-documentation/SKILL.md`](./.ai/skills/write-documentation/SKILL.md) |
| Drafting Jira tickets or GitHub issues | [`.ai/skills/write-issues-tickets/SKILL.md`](./.ai/skills/write-issues-tickets/SKILL.md) |
| Drafting pull request descriptions | [`.ai/skills/write-pr-descriptions/SKILL.md`](./.ai/skills/write-pr-descriptions/SKILL.md) |

Unattended agents must not approve their own TDD exceptions. Follow the
unattended-execution policy in the TDD skill when a human cannot respond.

## Specs and plans

Design specs and implementation plans live under **`.ai/docs/`**, alongside the rest of the project's agent documentation:

- **Specs** (brainstorming output, design docs): `.ai/docs/specs/YYYY-MM-DD-<topic>-design.md`
- **Plans** (implementation plans): `.ai/docs/plans/YYYY-MM-DD-<feature-name>.md`

This **overrides** the default paths used by the Superpowers plugin skills (`superpowers:brainstorming`, `superpowers:writing-plans`, `superpowers:subagent-driven-development`, `superpowers:executing-plans`, and `superpowers:requesting-code-review`), which write to `docs/superpowers/specs/` and `docs/superpowers/plans/`. When any of those skills instruct you to save to `docs/superpowers/…`, save to the matching `.ai/docs/…` path instead. Do not create a `docs/superpowers/` directory in this repository.

## Accessibility tests

The project runs axe-core WCAG 2.2 AA scans plus a Playwright `toMatchAriaSnapshot()` accessibility-tree check against every block, template, and shared custom element. Tests live in `test/a11y/` and run on every PR via `.github/workflows/a11y.yml`; a background check (`test/a11y/coverage.spec.js`) fails CI if a block or shared custom element has no matching spec file.

- **Creating a new block or template?** The [`create-new-block`](./.ai/skills/create-new-block/SKILL.md) skill's "Accessibility tests" step walks through the fixture + spec files it needs.
- **Changing an existing block, or the test conventions themselves?** See [`test/a11y/README.md`](./test/a11y/README.md) — fixture-markup gotchas, the accessibility-tree snapshot pattern, route-mocking, what to update when a block's behavior changes, and the known-issues list.

## IDE-specific folders

Some editors load extra project config from their own directories (for example `.cursor/` and `.claude/`). Those gitignored locations can be configured locally as thin adapters that symlink back to `.ai/`; they are not included in a fresh clone. `CLAUDE.md` is the tracked tool-specific bootstrap file. **`.ai/` remains the portable source of truth** for the skills documented here. If instructions conflict, prefer **`.ai/README.md`** and the files under **`.ai/skills/`**.
