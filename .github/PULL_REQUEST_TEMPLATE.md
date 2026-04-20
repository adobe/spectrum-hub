## Description

<!-- Describe your changes in detail. What does this PR do and why? What problem does it solve? -->

### Screenshots (if applicable)

### Type of change

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
