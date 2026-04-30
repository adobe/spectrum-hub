---
description: Generates GitHub pull request title and body following Spectrum Hub conventions.
alwaysApply: false
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

When returning the template, replace all placeholder information with the relevant information from the branch. If you don't know, ask the user to provide more info before writing the PR description. Each PR description should:

- Provide a draft description
- Identify the type of changes made
- Replace the related issue(s) ticket number with the actual ticket number
- Draft the additional validation steps for human reviewers with concrete steps (leave its checkboxes unchecked)
- Draft the accessibility testing checklist with concrete steps (leave its checkboxes unchecked)

```markdown
<!--- Provide a general summary of your changes in the Title above -->

## Description

<!-- Describe your changes in detail. What does this PR do and why? What problem does it solve? -->

### Screenshots (if applicable)

### Type of change

<!--- What types of changes does your code introduce? Put an `x` in all the boxes that apply: -->

- [ ] Bug fix
- [ ] New feature / block
- [ ] Refactor
- [ ] Docs / content
- [ ] Chore (deps, config, tooling)

### Related issue(s)

<!---
    - If suggesting a new feature or change, please discuss it in an issue first.
    - If fixing a bug, include the issue number where the reviewers can find a description of the bug with steps to reproduce.
    - If you are an Adobe employee, add a Jira ticket number but DO NOT LINK directly to Jira.
-->

- fixes [Issue Number]

## Validation steps

<!---
    - For the author, please describe in detail what reviewers should test and validate.
    - Include links, screenshots, and manual steps for how the reviewer should go through to verify your changes.
    - Be sure to include all areas of the codebase that might be affected. Any components that use these changes for a dependency should be cross-checked for regressions.

    Delete anything irrelevant to this PR
-->

- [ ] This PR has visual elements, so it was reviewed by a designer.
- [ ] This PR has code changes, and our linters still pass.
- [ ] This PR affects production code, so it was browser tested (see below).
- [ ] This PR affects existing pages, so automated E2E tests were run (see below).
- [ ] This PR has new code, so new tests were added or updated, and they pass.
- [ ] This PR has copy changes, so copy was proofread and approved.
- [ ] The content of this PR requires documentation, so a detailed description of the component's purpose, requirements, quirks, and instructions for use by designers and developers was added, along with accessibility information if pertinent.
<!-- Add additional validation criteria here -->

### To Validate

URL for testing:
https://<branch-name>--spectrum-hub--adobe.aem.page/

- [ ] Make sure all PR Checks have passed
- [ ] Pull down the branch locally or visit the branch preview
- [ ] Run `npm test` and confirm all tests pass
- [ ] Run `npm run lint` and confirm no linting errors
- [ ] Verified in browser with `aem up`
<!-- Add additional steps here -->

### Accessibility testing checklist
<!-- Manual accessibility testing is required because automated tools cannot catch all issues (e.g. focus order, screen reader announcements, keyboard flow). You must document your keyboard and screen reader testing steps below. Reviewers will use this checklist during review.
-->

- [ ] **Keyboard** 
<!-- What to test for: Focus order is logical; `Tab` reaches the component and all interactive descendants; `Enter`/`Space` activate where appropriate; arrow keys work for tabs, menus, sliders, etc.; no focus traps; `Escape` dismisses when applicable; focus indicator is visible. -->
  1. Go [here](url)
  2. Do this action
  3. Expect this result

- [ ] **Screen reader** 
<!-- _What to test for:_ Role and name are announced correctly; state changes (e.g. expanded, selected) are announced; labels and relationships are clear; no unnecessary or duplicate announcements. -->
  1. Go [here](url)
  2. Do this action
  3. Expect this result

### Device review

<!--- Verify the above manual tests and visual accuracy utilizing an emulator like Polypane browser or on an actual device. -->

- [ ] Did it pass in Desktop?
- [ ] Did it pass in (emulated) Mobile?
- [ ] Did it pass in (emulated) iPad?

## Checklist:

<!--- Go over all the following points, and put an `x` in all the boxes that apply. If you're unsure about any of these, don't hesitate to ask. We're here to help! -->

- [ ] I have signed the [Adobe Open Source CLA](https://opensource.adobe.com/cla.html).
- [ ] My code follows the code style of this project.
- [ ] My change requires a change to the documentation.
- [ ] I have updated the documentation accordingly.
- [ ] I have read the **CONTRIBUTING** document.
- [ ] I have added tests to cover my changes.
- [ ] All new and existing tests passed.
```
