---
description: Guidelines for drafting and formatting Jira tickets and GitHub issues
alwaysApply: false
---

# Writing tickets/issues guidelines

When prompted to create a Jira ticket, output the following:

- Title
- Severity
- Description

Output results in the chat window in a way that can be copied and pasted into Jira.

## Jira syntax formatting rules

Use these syntax rules when writing Jira tickets:

- `h2.` through `h6.` - Headings (use `h2.` for main, `h3.` for secondary, etc. - avoid `h1.` in descriptions)
- `*text*` - Bold text
- `{{code}}` - Inline code
- `{code:language}{code}` - Language-specific code blocks, as in `{code:js}{code}` for JavaScript and Typescript code blocks (JIRA doesn't support `{code:typescript}`)
- `[text|url]` - Links
- `-` - Bullet points
- `#` - Numbered list items

## Title format

- Use the format: `[Component] Brief description of change or issue`
- Keep titles concise but descriptive (under 80 characters)
- Use present tense for the description (e.g., "Add" not "Added")

## Description structure

- Present title, labels, and severity before description content
- Include links to GitHub pull requests or RFCs when applicable (prompt if not provided)
- All tickets must include acceptance criteria
- Provide enough context so anyone can understand the objective
- Use prefixes in titles: [Bug], [Fix], [Docs], [Refactor], [Spike], [Test]

Examples:

- [Bug(component)]:
- [bug]:
- [Fix(component)]:
- [fix]:
- [Docs(component)]:
- [docs]:
- [Documentation]:
- [Refactor(component)]:
- [Spike(component)]:
- [discovery]:
- [Test(component)]:

## More specific templates

### General issue/ticket template

```
h2. Overview
(plain language explaining the ticket)

h2. Acceptance criteria
(how we ensure that the work is complete)

h2. Technical notes/resources
(any technical notes/links/etc)

h2. QA
(steps someone will use to be sure that the work fulfills the ticket's request and that everything's working properly)

h2. Design specs
(are there any design specs/files/mock-ups we can include here? Any other design notes?)
```

### Bug reporting template

```
{*}Link to original issue:{*} (Add a link to the original issue if applicable)

h2. Expected behavior
(Description of what the user would expect to happen)

h2. Actual behavior
(The actual behavior observed by the user)

h2. Screenshots
(Screenshots of the problem if applicable)

h2. How can we reproduce the issue?

# Go to '...'
# Click on '....'
# Scroll to '....'
# Check console
# See error
<!-- add more reproduction steps if applicable-->

h2. Sample code or abstract reproduction which illustrates the problem
(are there any design specs/files/mock-ups we can include here? Any other design notes?)

h2. Severity
(The severity of the issue according to the [documentation|https://github.com/adobe/spectrum-web-components/blob/main/CONTRIBUTING.md#issue-severity-classification])
```

## Severity classification

- SEV1: Critical - System down, data loss, security breach
- SEV2: High - Major feature broken, significant user impact
- SEV3: Medium - Feature partially broken, moderate impact
- SEV4: Low - Minor issues, minimal user impact
- SEV5: Trivial - Cosmetic issues, no functional impact

## Best practices

- Link to relevant GitHub issues or pull requests using the format: `GH-{number}`
- Include component name in brackets if applicable: `[sp-button]`
- Add relevant labels for easier filtering
- Attach screenshots or videos for visual changes
- Reference design specs or documentation when available

## Agent criteria for writing tickets/issues

- Write the overviews in plain language as user stories (i.e. "As a user, I want to...")
- Write acceptance criteria in "Given/When/Then" format
- Make acceptance criteria specific and testable
- Include edge cases and error scenarios
- Document accessibility requirements and testing steps

<!-- TODO: define any labels -->
<!-- ## Labels -->

## Issue type

Jira includes the following issue types:

- Bug: For something in the code that needs to be fixed.
- Epic: For tickets that are larger than 8 story points and need to be broken up into multiple issues.
- Story: For tickets that tie to code deliverables. Whether that's research, an RFC, or a pull request, it counts! If you don't know what your issue type should be, this is a safe bet.
- Task: For work that doesn't relate to a code deliverable.
