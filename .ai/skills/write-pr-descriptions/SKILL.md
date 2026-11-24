---
name: write-pr-descriptions
description: Use when drafting a GitHub pull request title or description for Spectrum Hub.
---

# GitHub pull request description guidelines

If a ticket (GitHub issue or Jira ticket) is not provided by the prompt, prompt the user to supply one before generating the description or pull request content.

When prompted to create a GitHub pull request description, suggest a PR title. Then output the description results in the chat window in a way that can be copied and pasted into GitHub.

## GitHub markdown formatting rules

Use these syntax rules when writing GitHub PR descriptions:

- `##` through `######` - Headings (use `##` for main, `###` for secondary, etc.)
- `**text**` - Bold text
- `` `code` `` - Inline code
- ` ```language``` ` - Language-specific code blocks
- `[text](url)` - Links
- `-` - Bullet points
- `1.` - Numbered list items
- `>` - Blockquotes for important notes
- `~~text~~` - Strikethrough for deprecated content

## Title format

- Use conventional commit format: `feat(component): brief description of change or issue`
- Keep titles concise but descriptive (under 80 characters)
- Use present tense for the description (e.g., "add" not "added")
- Include the component name in parentheses if applicable

Examples:

- [bug:]
- [bug(component)]:
- [fix]:
- [fix(component)]:
- [docs]:
- [docs(component)]:

## Description structure

- Present title suggestion before description content
- Description format and structure should follow the pull request template in the Templates section below
- Accessibility testing checklist is required. Populate keyboard and screen reader with component-specific numbered steps (Storybook paths, expected focus behavior, what should be announced). For non-interactive components (e.g. static elements, dividers), state that clearly under Keyboard (e.g. no focusable parts; confirm no regressions in surrounding examples) and still document Screen reader checks (roles, structure, labels).
- Include links to related issues, RFCs, or documentation when applicable
- All descriptions must include clear acceptance criteria and expected outcomes
- Provide enough context so anyone can understand the objective

## Severity classification

- SEV1: Critical - System down, data loss, security breach
- SEV2: High - Major feature broken, significant user impact
- SEV3: Medium - Feature partially broken, moderate impact
- SEV4: Low - Minor issues, minimal user impact
- SEV5: Trivial - Cosmetic issues, no functional impact

## Best practices

- Link to relevant issues using the format: `#issue-number`
- Include component name in parentheses in title if applicable: `(button)`
- Attach screenshots or videos for visual changes
- Reference design specs or documentation when available
- Use descriptive commit messages when linking to PRs
- Include reproduction steps for bugs
- Add environment information when relevant

## Validation instructions

- Describe in detail what a reviewer should test and how
- Make criteria specific and testable
- Include edge cases and error scenarios
- Consider accessibility requirements
- Include performance considerations when relevant

## Pull request template

When returning the template, replace all placeholder information in [the template](../../../.github/PULL_REQUEST_TEMPLATE.md) with the relevant information from the branch. If you don't know, ask the user to provide more info before writing the PR description. Each PR description should:

- Provide a draft description
- Identify the type of changes made
- Replace the related issue(s) ticket number with the actual ticket number
- Draft the additional validation steps for human reviewers with concrete steps (leave its checkboxes unchecked)
- Draft the accessibility testing checklist with concrete steps (leave its checkboxes unchecked)

## Visual evidence for the pull request

When preparing the PR description, offer to capture screenshots if the diff
changes what renders: block CSS, `styles/`, block markup or DOM construction,
templates, icons, or fragments. Skip the offer for a diff limited to tests,
documentation, tooling, or generated data.

Screenshot capture is opt-in. Do not start services or create a worktree until
the user explicitly authorizes capture and the required setup.

Capture before-and-after pairs when a previous state exists. A new block has no
before state, so capture the after shot alone and say why. Add a second pair for
each condition the change affects: dark scheme when color changed, mobile
viewport when layout changed.

Pick the route first. Prefer an authored page that renders the changed block.
When no page covers it, the fixtures in `test/a11y/fixtures/` render blocks in
isolation. Ask which page to use when the diff does not point at one.

Serve the working tree, then serve the merge base from a second worktree.
Replace `<confirmed-pr-base>` with the PR's intended base ref; do not assume
`main`.

```bash
npx aem up --port 3001 --no-open
```

```bash
REPO=$(git rev-parse --show-toplevel)
BASE=$(git merge-base <confirmed-pr-base> HEAD)
git worktree add -b review-before "$REPO/.worktrees/review-before" "$BASE"
(cd "$REPO/.worktrees/review-before" && "$REPO/node_modules/.bin/aem" up --port 3002 --no-open)
```

Run both servers in the background. Reuse an `aem up` already listening on 3001
rather than starting a second one.

Create the worktree on a branch, as above, rather than with `--detach`.
`aem up` reads the branch from the worktree's `HEAD` file, and a detached `HEAD`
sends it down a path that does not understand linked worktrees.

Both servers proxy the same content origin,
`https://main--spectrum-hub--adobe.aem.page`, because `aem up` derives the
origin from the `origin` remote and always uses `main`, never the local branch.
The pair therefore differs only in the PR's code changes.

Capture each pair at the same route, viewport, and scheme. A pair that differs
in anything but the change proves nothing:

```bash
npx playwright screenshot --viewport-size "1280,800" --full-page \
  "http://localhost:3002/<route>" .screenshots/<name>-before.png
npx playwright screenshot --viewport-size "1280,800" --full-page \
  "http://localhost:3001/<route>" .screenshots/<name>-after.png
```

Add `--color-scheme dark` for the dark pair and `--device "Pixel 5"` for the
mobile pair.

Then stop both servers and remove the worktree and its branch:

```bash
git worktree remove --force "$REPO/.worktrees/review-before"
git branch -D review-before
```

Constraints for this phase:

- `.worktrees/` and `.screenshots/` are ignored by Git. Never commit the images
  or the worktree.
- Never commit, stash, or reset inside the worktree, and never touch the user's
  checked-out branch. The `review-before` branch exists so the merge base can be
  served, not edited, and it is deleted during cleanup.
- `aem up` proxies the AEM origin, which answers anonymous requests with `401`.
  Icons, `query-index.json`, and authored content render only while the
  developer's `aem-cli` login is valid. When part of the page fails to load, say
  so with the screenshot instead of presenting a broken render as the change.
- The after shot includes uncommitted working-tree changes. State that when the
  PR contains committed changes only.

Report the absolute path of every image so the user can drag it into GitHub.
Populate the existing **Screenshots (if applicable)** section of the current
pull request template without adding or changing its headings:

```markdown
### Screenshots (if applicable)

| Before | After |
| --- | --- |
| <drag `hero-before.png` here> | <drag `hero-after.png` here> |

Route `/products/hero-demo` at 1280x800, light scheme.
```

Add one row per condition and name that condition under the table. The images
stay local until the user uploads them to GitHub. Do not present local paths or
upload placeholders as uploaded screenshots.
