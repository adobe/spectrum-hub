# Agent instructions

This file is the repository bootstrap. Read it first without exception, then
use **`.ai/`** as the canonical source for project skills, design records, and
related agent guidance.

## Required startup sequence

Before responding to the first repository task, planning work, changing files,
or running repository commands:

1. Read this `AGENTS.md` from the current working tree. Do not rely only on a
copy supplied by an editor or agent host.
2. Read [`.ai/README.md`](./.ai/README.md) from the current working tree.
3. Match the user's request and the files in scope against the skill catalog.
4. Load every matching `.ai/skills/<skill-name>/SKILL.md` before acting. If a
loaded skill requires another skill, load that dependency before continuing.

Do not preload every full skill at startup. Clients discover skill names and
descriptions first, then load the complete instructions when a user invokes a
skill or the current task matches its description.

## Where things live

| What                         | Location                                                                 |
| ---------------------------- | ------------------------------------------------------------------------ |
| Skill catalog and usage      | [`.ai/README.md`](./.ai/README.md)                                       |
| Task workflows and guidance  | [`.ai/skills/`](./.ai/skills/) — each skill is `SKILL.md` in a subfolder |
| Design specs                 | [`.ai/docs/specs/`](./.ai/docs/specs/) — `YYYY-MM-DD-<topic>-design.md`  |
| Implementation plans         | [`.ai/docs/plans/`](./.ai/docs/plans/) — `YYYY-MM-DD-<feature-name>.md`  |

## Skills

Skills are on-demand workflows and references. Use the
[skill registry in `.ai/README.md`](./.ai/README.md#available-skills) to match
the user's request and files in scope. Load each matching skill's `SKILL.md`
before responding or doing the work. A user's explicit `/skill-name` request
always counts as a match.

Unattended agents must not approve their own TDD exceptions. Agents must stop work while a human cannot respond.

## Specs and plans

Design specs and implementation plans live under **`.ai/docs/`**, alongside the rest of the project's agent documentation:

- **Specs** (brainstorming output, design docs): `.ai/docs/specs/YYYY-MM-DD-<topic>-design.md`
- **Plans** (implementation plans): `.ai/docs/plans/YYYY-MM-DD-<feature-name>.md`

This **overrides** the default paths used by the Superpowers plugin skills (`superpowers:brainstorming`, `superpowers:writing-plans`, `superpowers:subagent-driven-development`, `superpowers:executing-plans`, and `superpowers:requesting-code-review`), which write to `docs/superpowers/specs/` and `docs/superpowers/plans/`. When any of those skills instruct you to save to `docs/superpowers/…`, save to the matching `.ai/docs/…` path instead. Do not create a `docs/superpowers/` directory in this repository.

## Accessibility tests

The project runs axe-core WCAG 2.2 AA scans plus a Playwright `toMatchAriaSnapshot()` accessibility-tree check against every block, template, and shared custom element. Tests live in `test/a11y/` and run on every PR via `.github/workflows/a11y.yml`; a background check (`test/a11y/coverage.spec.js`) fails CI if a block or shared custom element has no matching spec file.

- **Creating a new block or template?** The [`create-new-block`](./.ai/skills/create-new-block/SKILL.md) skill's "Accessibility tests" step walks through the fixture + spec files it needs.
- **Changing an existing block, or the test conventions themselves?** See [`test/a11y/README.md`](./test/a11y/README.md) — fixture-markup gotchas, the accessibility-tree snapshot pattern, route-mocking, what to update when a block's behavior changes, and the known-issues list.

## Client-specific folders

The tracked `.github/skills` symbolic link exposes `.ai/skills/` through GitHub
Copilot's project-skill location. It is a discovery adapter, not an additional
source of truth. Continue editing skills only under `.ai/skills/`.

Other client-specific folders, including `.claude/` and `.cursor/`, remain local
and ignored. If instructions conflict, always prefer `.ai/README.md` and the canonical
files under `.ai/skills/`.
