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
