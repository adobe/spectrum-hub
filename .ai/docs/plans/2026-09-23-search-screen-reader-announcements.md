# Search Screen Reader Announcements Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make VoiceOver with Safari announce search instructions, every arrow-selected option, and the level-1 sitenav category expanded through keyboard selection.

**Architecture:** Keep native combobox and disclosure semantics. `se-input` synchronously reflects description and active-descendant element references onto its native input. Because manual VoiceOver and Safari testing proved that WebKit does not announce those cross-shadow-root relationships, `sh-search` also emits Safari-only messages to a light-DOM status region owned by the Search action. Sitenav moves focus to the expanded level-1 button only after keyboard-originated selection.

**Tech Stack:** Lit custom elements, cross-root ARIA element reflection, ARIA live status, DOM custom events, Web Test Runner with Chai/Sinon, Playwright, axe-core, CSS.

**Design spec:** `.ai/docs/specs/2026-09-23-search-screen-reader-announcements-design.md`

---

## VoiceOver and Safari amendment

The original semantic synchronization tasks remain useful and stay in this plan as implementation history. Chromium accessibility trees and unit tests verify those relationships, but they do not prove VoiceOver and Safari speech. Manual testing invalidated the original assumption that cross-shadow-root element reflection was sufficient in WebKit.

The approved follow-up adds these completed tasks:

- [x] Add failing tests for Safari opening and arrow-option announcements.
- [x] Add failing tests for a light-DOM status region owned by the Search action.
- [x] Emit `search:announce` only for Apple WebKit user agents so supporting browsers do not speak duplicate messages.
- [x] Announce the full usage guidance and first navigation area after native-input focus.
- [x] Announce the newly active option after every Arrow Up or Arrow Down interaction.
- [x] Clear, update, and remove the light-DOM status region with the search lifecycle.
- [x] Add a failing regression for Enter immediately after typing and before results arrive.
- [x] Clear stale results, active index, and the native active-descendant reference as soon as input changes.
- [x] Ignore an in-flight response when its captured query no longer matches the current input.
- [x] Select on Enter only when the current item exists; otherwise preserve form submission.
- [ ] Repeat manual VoiceOver and Safari validation at desktop and mobile viewport sizes.

The fallback adds no network or page-load work. It schedules one zero-delay task only when Safari needs a spoken interaction message.

## File map

- Modify `deps/se/se.js`
  - Add a `descriptionElement` property.
  - Reflect its element reference onto the native input.
  - Add `setActiveDescendantElement(element)` to synchronously update both public state and the native input.
- Modify `blocks/search/search.js`
  - Render the hidden usage instruction.
  - Associate it with `se-input`.
  - Use the synchronous active-descendant API.
  - Pass the originating keyboard event through navigation-area selection.
- Modify `blocks/action-button/action-button.js`
  - Own the light-DOM status region and update it from search announcement events.
- Modify `scripts/utils/nav-events.js`
  - Share the search announcement event name without loading either block.
- Modify `blocks/search/search.css`
  - Visually hide the screen-reader instruction inside the search shadow root.
- Modify `blocks/sitenav/sitenav.js`
  - After keyboard-originated search selection, defer focus to the selected expanded level-1 button until search teardown has restored focus.
  - Put level-1 and expand/collapse tooltips in labeling mode so they do not add duplicate accessible descriptions.
- Modify `test/blocks/search.test.js`
  - Cover the native input's accessible description, synchronous first Arrow Down update, Safari announcements, pending-result Enter safety, and keyboard source event.
- Modify `test/blocks/action-button.test.js`
  - Cover light-DOM status creation, updates, and cleanup.
- Modify `test/blocks/sitenav.test.js`
  - Cover keyboard-only focus transfer, pointer focus preservation, repeated selection, and unmatched labels.
- Modify `test/a11y/blocks/search.spec.js`
  - Update the intentional accessibility-tree description.
- Modify `test/a11y/blocks/sitenav.spec.js`
  - Extend the real action-button/search/sitenav flow with active-descendant and focus assertions on desktop and mobile.
- Use existing `test/a11y/fixtures/sitenav-search.html`
  - No fixture change should be needed unless the implementation introduces a new module dependency.

## Task 1: Reflect search guidance and active option onto the native input

**Files:**
- Modify: `deps/se/se.js:61-176`
- Modify: `blocks/search/search.js:60-104, 285-335`
- Modify: `blocks/search/search.css:1-12`
- Test: `test/blocks/search.test.js:70-125`

- [ ] **Step 1: Add failing tests for the native accessible description**

In `test/blocks/search.test.js`, add a test beside the existing element-reference assertions:

```js
it('describes the native input with search usage instructions', async () => {
  const el = await mountSearch(sandbox);
  const input = realInput(el);
  const instruction = el.shadowRoot.querySelector('#search-instructions');

  expect(instruction.textContent.trim()).to.equal(
    'Type to search, or use the Up and Down Arrow keys to navigate. Press Enter to select.',
  );
  expect(input.ariaDescribedByElements).to.deep.equal([instruction]);
});
```

The assertion must target the native input because that is where VoiceOver focus lands.

- [ ] **Step 2: Add a failing test for the first synchronous Arrow Down update**

Replace the existing outer-`se-input` event dispatch in the active-descendant movement test with a real native-input event. Stub `se-input.requestUpdate()` after initial mount so a nested Lit render cannot make the test pass accidentally:

```js
it('synchronously reflects the first ArrowDown option on the native input', async () => {
  const el = await mountSearch(sandbox);
  const seInput = el.shadowRoot.querySelector('se-input');
  const input = realInput(el);
  sandbox.stub(seInput, 'requestUpdate');

  input.dispatchEvent(new KeyboardEvent('keydown', {
    key: 'ArrowDown',
    bubbles: true,
    composed: true,
  }));
  await el.updateComplete;

  const foundations = el.shadowRoot.querySelector('#result-1');
  expect(foundations.getAttribute('aria-selected')).to.equal('true');
  expect(input.ariaActiveDescendantElement).to.equal(foundations);
});
```

Do not await `se-input.updateComplete`. With `requestUpdate()` blocked, the test proves the native reference changes through the imperative API during the `sh-search` update rather than through a later `se-input` render.

- [ ] **Step 3: Add a form-submission preservation test**

Add a regression test proving Enter still reaches the form when no option is active:

```js
it('submits the search form on Enter when no option is active', async () => {
  const el = await mountSearchWithFailedFetch(sandbox);
  const input = realInput(el);
  const form = el.shadowRoot.querySelector('form');
  const submitSpy = sinon.spy();
  form.addEventListener('submit', (event) => {
    event.preventDefault();
    submitSpy(event);
  });

  expect(input.ariaActiveDescendantElement).to.equal(null);
  input.dispatchEvent(new KeyboardEvent('keydown', {
    key: 'Enter',
    bubbles: true,
    composed: true,
  }));

  expect(submitSpy.calledOnce).to.be.true;
});
```

This is a characterization test and may pass before implementation. It must remain green after the new element-reflection API is introduced.

- [ ] **Step 4: Run the focused tests and verify RED**

Run:

```bash
npm run test:file -- test/blocks/search.test.js
```

Expected:

- The instruction/description test fails because `#search-instructions` and `ariaDescribedByElements` do not exist.
- The active-descendant test fails because blocking `se-input.requestUpdate()` leaves the native input pointing to the previous option.
- The no-active-option form-submission characterization test passes.

- [ ] **Step 5: Add explicit element-reflection APIs to `se-input`**

In `deps/se/se.js`, add the public property:

```js
descriptionElement: { attribute: false },
```

Add an imperative method close to `focus()`:

```js
setActiveDescendantElement(element) {
  this.activeDescendantElement = element;
  if (this.input) {
    this.input.ariaActiveDescendantElement = element;
  }
}
```

Reflect the description onto the native input in `render()`:

```js
.ariaDescribedByElements=${this.descriptionElement ? [this.descriptionElement] : []}
```

Keep the existing `.ariaActiveDescendantElement` binding so initial and unrelated renders remain declarative. Do not add string `aria-describedby` or `aria-activedescendant` ids across shadow roots.

- [ ] **Step 6: Render and associate the search instruction**

In `blocks/search/search.js`, define the instruction once in the rendered shadow DOM:

```js
<p id="search-instructions" class="search-instructions">
  Type to search, or use the Up and Down Arrow keys to navigate. Press Enter to select.
</p>
```

In `firstUpdated()`, associate it before focus is moved:

```js
this._input.descriptionElement = this.shadowRoot.querySelector('#search-instructions');
```

Keep `controlsElement` association and the double-`requestAnimationFrame` focus sequence unchanged.

- [ ] **Step 7: Synchronize the active descendant in the same search update**

In `blocks/search/search.js` `updated(changed)`, replace the property assignment:

```js
this._input.activeDescendantElement = active;
```

with:

```js
this._input.setActiveDescendantElement(active);
```

Keep `active?.scrollIntoView({ block: 'nearest' })` unchanged.

- [ ] **Step 8: Hide the instruction inside the search shadow root**

In `blocks/search/search.css`, add:

```css
.search-instructions {
  clip-path: inset(50%);
  height: 1px;
  overflow: hidden;
  position: absolute;
  white-space: nowrap;
  width: 1px;
}
```

Use a local rule because global `.visually-hidden` styles do not cross into the search shadow root.

- [ ] **Step 9: Run the focused tests and verify GREEN**

Run:

```bash
npm run test:file -- test/blocks/search.test.js
```

Expected: all search unit tests pass, including the new description and first Arrow Down assertions.

- [ ] **Step 10: Commit the semantic synchronization**

```bash
git add deps/se/se.js blocks/search/search.js blocks/search/search.css test/blocks/search.test.js
git commit -m "fix(search): announce combobox guidance and active options"
```

Include the repository-required co-author trailer when committing.

## Task 2: Carry keyboard selection intent into sitenav

**Files:**
- Modify: `blocks/search/search.js:145-205`
- Test: `test/blocks/search.test.js:225-270`

- [ ] **Step 1: Add a failing source-event assertion**

Update the existing Enter-selection test to keep a reference to the real keyboard event:

```js
const enterEvent = new KeyboardEvent('keydown', {
  key: 'Enter',
  bubbles: true,
  composed: true,
});
input.dispatchEvent(enterEvent);

expect(spy.calledOnce).to.be.true;
expect(spy.firstCall.args[0].detail.label).to.equal('Foundations');
expect(spy.firstCall.args[0].detail.sourceEvent).to.equal(enterEvent);
```

Keep the existing pointer tests. They already protect the click source event needed by mobile outside-close handling.

- [ ] **Step 2: Run the selection test and verify RED**

Run:

```bash
npm run test:file -- test/blocks/search.test.js
```

Expected: the new source-event assertion fails because keyboard `_select()` currently drops the event.

- [ ] **Step 3: Thread the event through keyboard selection**

In `blocks/search/search.js`, make the Enter branch pass the event:

```js
this._select(items[this.activeIndex], e);
```

Update `_select`:

```js
_select(item, sourceEvent) {
  if (this._isNavView) {
    this._selectNavArea(item, sourceEvent);
  } else {
    this._selectHit(item);
  }
}
```

Do not change result-hit navigation. The source event is only needed for navigation-area selection.

- [ ] **Step 4: Run the focused tests and verify GREEN**

Run:

```bash
npm run test:file -- test/blocks/search.test.js
```

Expected: all search tests pass, including label and keyboard source-event assertions.

- [ ] **Step 5: Commit keyboard intent propagation**

```bash
git add blocks/search/search.js test/blocks/search.test.js
git commit -m "fix(search): preserve keyboard selection intent"
```

Include the repository-required co-author trailer when committing.

## Task 3: Announce sitenav expansion through keyboard focus

**Files:**
- Modify: `blocks/sitenav/sitenav.js:579-596`
- Test: `test/blocks/sitenav.test.js:1666-1805`

- [ ] **Step 1: Add a failing keyboard-focus test**

Add a test to `setupSearchIntegration` that simulates the action-button clear listener restoring focus synchronously:

```js
it('focuses the expanded level-1 button after keyboard selection', async () => {
  stubMatchMedia(sandbox, false);
  const searchButton = document.createElement('button');
  document.body.append(searchButton);
  const sourceEvent = new KeyboardEvent('keydown', { key: 'Enter' });

  document.addEventListener('sitenav:expand-level1', () => {
    searchButton.focus();
  }, { once: true });
  document.dispatchEvent(new CustomEvent('sitenav:expand-level1', {
    detail: { label: 'Foundations', sourceEvent },
  }));
  await Promise.resolve();

  const foundations = navList.querySelector(
    '.level-1-button[aria-controls="sitenav-menu-foundations"]',
  );
  expect(foundations.getAttribute('aria-expanded')).to.equal('true');
  expectFocus(foundations, 'the expanded Foundations button');
  searchButton.remove();
});
```

If listener ordering makes this synthetic clear listener run before sitenav, instead attach it before `setupSearchIntegration()` in a narrowly scoped setup for this test. The essential contract is that the focus assertion occurs after a microtask.

- [ ] **Step 2: Add a failing pointer-focus preservation test**

```js
it('does not move focus into sitenav after pointer selection', async () => {
  stubMatchMedia(sandbox, false);
  const searchButton = document.createElement('button');
  document.body.append(searchButton);
  searchButton.focus();
  const sourceEvent = new MouseEvent('click');

  document.dispatchEvent(new CustomEvent('sitenav:expand-level1', {
    detail: { label: 'Foundations', sourceEvent },
  }));
  await Promise.resolve();

  expectFocus(searchButton, 'the existing pointer focus target');
  searchButton.remove();
});
```

This test protects the approved keyboard-only focus behavior.

- [ ] **Step 3: Run the focused tests and verify RED**

Run:

```bash
npm run test:file -- test/blocks/sitenav.test.js
```

Expected: keyboard focus remains outside sitenav; pointer test should already pass.

- [ ] **Step 4: Defer focus for keyboard-originated selection**

In `setupSearchIntegration()`, after opening mobile sitenav and before/after the idempotent click as appropriate, detect keyboard origin:

```js
const isKeyboardSelection = e.detail.sourceEvent instanceof KeyboardEvent;
```

After ensuring the button is expanded, schedule:

```js
if (isKeyboardSelection) {
  queueMicrotask(() => button.focus());
}
```

The microtask must run after the synchronous `clear` event removes search and restores focus to the Search action. Do not focus for pointer events. Do not require a mobile viewport; keyboard selection should announce the expanded category at every viewport size.

- [ ] **Step 5: Extend edge-case assertions**

Update or add focused assertions proving:

- An already-expanded matching category still receives keyboard focus and remains expanded.
- An unmatched label neither opens sitenav nor moves focus.
- Mobile opening and trigger `aria-expanded="true"` behavior remains unchanged.
- The pointer source event is still stopped before the outside-click handler closes mobile sitenav.

- [ ] **Step 6: Run the focused tests and verify GREEN**

Run:

```bash
npm run test:file -- test/blocks/sitenav.test.js
```

Expected: all sitenav unit tests pass, including keyboard-only focus transfer and existing mobile behavior.

- [ ] **Step 7: Commit sitenav announcement behavior**

```bash
git add blocks/sitenav/sitenav.js test/blocks/sitenav.test.js
git commit -m "fix(sitenav): announce keyboard-expanded category"
```

Include the repository-required co-author trailer when committing.

## Task 4: Remove duplicate sitenav tooltip announcements

**Files:**
- Modify: `blocks/sitenav/sitenav.js:472-530`
- Test: `test/blocks/sitenav.test.js:390-510, 950-1035`
- Test: `test/a11y/blocks/sitenav.spec.js`

- [ ] **Step 1: Add characterization assertions for the existing tooltip exploration**

In the existing level-1 tooltip creation test, add:

```js
expect(tooltip.hasAttribute('labeling')).to.be.true;
expect(btn.textContent.trim()).to.equal('Foundations');
```

In the expand/collapse tooltip test, add:

```js
expect(tooltip.hasAttribute('labeling')).to.be.true;
expect(btn.getAttribute('aria-label')).to.equal('Expand navigation');
```

Keep the existing assertions for `for`, placement, delay, text content, and synchronized expand/collapse copy. Those protect the visual tooltip behavior. The branch already contains exploratory `labeling` attributes in both tooltip creation paths, so this task validates and completes that work rather than reverting it solely to manufacture a RED state.

- [ ] **Step 2: Run the sitenav unit tests and verify the exploration**

Run:

```bash
npm run test:file -- test/blocks/sitenav.test.js
```

Expected: the new `labeling` assertions pass if both exploratory production changes are present. If either fails, restore the missing `labeling` attribute before continuing.

- [ ] **Step 3: Confirm both generated tooltips are configured as labels**

Confirm `syncLevel1Tooltips()` creates each level-1 tooltip with:

```js
tooltip.setAttribute('labeling', '');
```

Confirm `getExpandButton()` adds the same attribute to the expand/collapse tooltip.

Do not combine `labeling` with `aria-hidden`. Referenced hidden content can still participate in accessible naming, and hiding the tooltip while making it the active label creates conflicting semantics.

Do not remove the tooltip, change its text, remove its `for` association, or modify the vendored `swc-tooltip` component. When closed, the trigger buttons remain the accessible-name source. When open, the tooltip supplies the same single accessible name through the component's supported labeling relationship.

- [ ] **Step 4: Add an accessibility-tree regression**

In `test/a11y/blocks/sitenav.spec.js`, add or extend a Chromium-only test that:

1. Loads the sitenav fixture with the desktop rail collapsed.
2. Focuses a level-1 button so its visual tooltip opens.
3. Waits for the tooltip to open and its Lit update to complete.
4. Asserts the trigger's `ariaDescribedByElements` does not contain the tooltip.
5. Asserts the trigger's `ariaLabelledByElements` contains the tooltip exactly once.
6. Asserts the button remains named "Foundations":

```js
const relationships = await page.evaluate(() => {
  const button = document.querySelector(
    '.level-1-button[aria-controls="sitenav-menu-foundations"]',
  );
  const tooltip = button.closest('li').querySelector('swc-tooltip');
  return {
    described: button.ariaDescribedByElements.includes(tooltip),
    labelCount: button.ariaLabelledByElements.filter((element) => element === tooltip).length,
  };
});
expect(relationships).toEqual({ described: false, labelCount: 1 });
await expect(page.getByRole('button', { name: 'Foundations', exact: true })).toBeFocused();
```

Repeat the relationship and accessible-name assertions for the expand/collapse button tooltip. Confirm the overall sitenav accessibility snapshot contains each button name only once.

- [ ] **Step 5: Run tooltip unit and accessibility tests**

Run:

```bash
npm run test:file -- test/blocks/sitenav.test.js
npx playwright test test/a11y/blocks/sitenav.spec.js --project=chromium
```

Expected:

- Both tooltip hosts use labeling mode.
- Visual tooltip configuration and synchronized text tests still pass.
- Button names and disclosure states remain exposed.
- Open tooltips label their triggers once and do not add accessible descriptions.

- [ ] **Step 6: Commit tooltip semantics**

```bash
git add blocks/sitenav/sitenav.js test/blocks/sitenav.test.js test/a11y/blocks/sitenav.spec.js
git commit -m "fix(sitenav): hide duplicate tooltip announcements"
```

Include the repository-required co-author trailer when committing.

## Task 5: Lock the complete accessibility flow into browser coverage

**Files:**
- Modify: `test/a11y/blocks/search.spec.js:1-75`
- Modify: `test/a11y/blocks/sitenav.spec.js:125-160`
- Verify: `test/a11y/fixtures/sitenav-search.html`

- [ ] **Step 1: Update the search accessibility-tree expectation**

Run the current snapshot first:

```bash
npx playwright test test/a11y/blocks/search.spec.js \
  --project=chromium \
  -g "accessibility tree"
```

Expected: FAIL because the combobox now has the intentional usage description.

Update the inline snapshot to include the exact description associated with the focused native combobox. Review the generated tree rather than blindly accepting output; it must retain:

- The Search combobox name and expanded state.
- Navigation areas listbox.
- Getting started selected initially.
- The exact usage guidance.

- [ ] **Step 2: Extend the sitenav integration test before production verification**

In each Enter/Space activation case in `test/a11y/blocks/sitenav.spec.js`, after the first Arrow Down assert:

```js
await expect(page.getByRole('option', { name: /Foundations/ }))
  .toHaveAttribute('aria-selected', 'true');

const activeDescendantMatchesFoundations = await searchInput.evaluate((input) => {
  const [active] = input.ariaActiveDescendantElements ?? [];
  return active?.id === 'result-1';
});
expect(activeDescendantMatchesFoundations).toBe(true);
```

Use the actual browser-supported singular/plural reflection property verified during implementation. Prefer `input.ariaActiveDescendantElement === foundationsElement` if Playwright can return the boolean directly.

After Enter selection assert:

```js
const foundations = page.getByRole('button', { name: 'Foundations', exact: true });
await expect(foundations).toHaveAttribute('aria-expanded', 'true');
await expect(foundations).toBeFocused();
```

Keep the existing desktop/mobile category and mobile `is-open` assertions.

- [ ] **Step 3: Run the complete browser interaction and snapshot tests**

Run:

```bash
npx playwright test \
  test/a11y/blocks/search.spec.js \
  test/a11y/blocks/sitenav.spec.js \
  test/a11y/blocks/profile.spec.js
```

Expected:

- Enter and Space flows pass in desktop Chromium and Mobile Chrome.
- The first Arrow Down points the native input to Foundations.
- Foundations is expanded and focused.
- Search, sitenav, signed-out profile, and signed-in profile snapshots pass.
- All related axe scans pass.
- Only documented project/viewport skips remain.

- [ ] **Step 4: Run related unit coverage**

Run:

```bash
npm run test:file -- \
  test/blocks/search.test.js \
  test/blocks/sitenav.test.js \
  test/blocks/action-button.test.js
```

Expected: all related unit tests pass.

- [ ] **Step 5: Run lint and formatting checks**

Run:

```bash
npx eslint \
  blocks/search/search.js \
  blocks/sitenav/sitenav.js \
  test/blocks/search.test.js \
  test/blocks/sitenav.test.js \
  test/a11y/blocks/search.spec.js \
  test/a11y/blocks/sitenav.spec.js
npx stylelint blocks/search/search.css
git diff --check
```

Expected: all commands exit successfully. `deps/se/se.js` is ignored by the repository ESLint configuration, so validate it through the browser/unit suites and `git diff --check`.

- [ ] **Step 6: Perform manual VoiceOver with Safari validation**

Using `https://search-bugs--spectrum-hub--adobe.aem.page/` after the branch is published:

1. Tab to Search.
2. Open it with Enter.
3. Confirm VoiceOver announces Search as an expanded combobox, the exact usage guidance, and Getting started as the first active option.
4. Press Arrow Down once and confirm VoiceOver announces Foundations.
5. Continue through remaining options and confirm each is announced once.
6. Press Enter on Foundations and confirm VoiceOver announces "Foundations, expanded, button."
7. Repeat with Space to open search.
8. Repeat at desktop and mobile viewport sizes.
9. Select Foundations with a pointer and confirm focus does not move into sitenav.

Record any browser-specific phrasing differences, but require equivalent name, role, active option, instruction, and expanded state.

- [ ] **Step 7: Commit browser coverage**

```bash
git add \
  test/a11y/blocks/search.spec.js \
  test/a11y/blocks/sitenav.spec.js
git commit -m "test(search): cover screen reader navigation flow"
```

Include the repository-required co-author trailer when committing.

## Task 6: Final branch verification

**Files:**
- Verify all files changed by Tasks 1-4.
- Preserve unrelated working-tree edits in `.github/workflows/a11y.yml`, `deps/se/se.css`, and `styles/styles.css`.

- [ ] **Step 1: Confirm branch scope**

Run:

```bash
git status --short
git diff --stat origin/main...HEAD
git diff --check
```

Expected:

- Only intended search/sitenav/screen-reader implementation and test changes are included in the task commits.
- Pre-existing unrelated working-tree edits remain uncommitted and unchanged.
- No whitespace errors are reported.

- [ ] **Step 2: Re-run the related verification commands**

Run:

```bash
npm run test:file -- \
  test/blocks/search.test.js \
  test/blocks/sitenav.test.js \
  test/blocks/action-button.test.js
npx playwright test \
  test/a11y/blocks/search.spec.js \
  test/a11y/blocks/sitenav.spec.js \
  test/a11y/blocks/profile.spec.js
npx stylelint blocks/search/search.css
```

Expected: all selected tests and lint checks pass with only documented Playwright skips.

- [ ] **Step 3: Review performance impact**

Confirm the final diff adds:

- No changes to `scripts.js`, `ak.js`, `lazy.js`, or `postlcp.js`.
- No network requests, timers, observers, or global listeners.
- Only element-reference updates while search is open or its active option changes.
- Only one deferred focus microtask after keyboard navigation-area selection.

- [ ] **Step 4: Update the PR description**

Add the VoiceOver/Safari behavior and validation results:

- Search announces typing and arrow-key choices.
- The first Arrow Down is announced.
- Keyboard selection announces the expanded category through native button focus.
- Pointer focus remains unchanged.

- [ ] **Step 5: Commit any final test-only adjustments**

If final verification required snapshot or test corrections:

```bash
git add <only-the-final-test-files>
git commit -m "test(search): finalize screen reader coverage"
```

Skip this commit when no final adjustments are needed.
