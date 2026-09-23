# Search screen reader announcements

## Summary

Improve the search-to-sitenav keyboard flow for VoiceOver with Safari. Search should explain that the combobox supports both typing and arrow-key navigation, announce every active option starting with the first Arrow Down change, and announce the expanded sitenav category after selection.

The implementation preserves the existing combobox and disclosure semantics. Because VoiceOver with Safari does not announce cross-shadow-root descriptions or active descendants reliably, search also sends Safari-specific messages to a light-DOM status region. Sitenav tooltips remain visually available but do not repeat button names to assistive technology.

## Problem

The current search interaction has three screen reader gaps:

1. When search opens, VoiceOver announces the combobox and first option but does not explain that the user can type a query or use arrow keys to navigate.
2. The first Arrow Down change is visible and updates `aria-selected`, but VoiceOver does not announce the second option. Later arrow-key changes are announced.
3. Activating a level-1 search option expands the correct sitenav category, but focus returns to the Search action. VoiceOver therefore does not announce which category expanded or its expanded state.
4. Collapsed level-1 and expand/collapse tooltips repeat the exact text already supplied as their trigger buttons' accessible names.

Synchronous element reflection fixes the handoff timing in Chromium, but manual VoiceOver and Safari testing showed that WebKit does not announce either cross-shadow-root relationship. The Safari speech gap therefore requires a light-DOM fallback rather than another timing adjustment inside either shadow root.

Typing also changes search from navigation areas to an initially empty result view. If the previous active index and descendant remain in place until results arrive, Enter can try to select an undefined result and throw while reading its URL.

## Goals

- When search opens, associate this guidance with the native combobox:
  - "Type to search, or use the Up and Down Arrow keys to navigate. Press Enter to select."
- Keep the first navigation area active when search opens.
- Announce the option selected by the first and every subsequent arrow-key press.
- Use a Safari-only light-DOM status fallback without duplicating speech in browsers that announce active descendants correctly.
- Continue to support typing a query in the combobox.
- Clear stale active state immediately when typing switches the displayed item set.
- After keyboard selection, move focus to the expanded level-1 sitenav button so its name, button role, and expanded state are announced.
- Preserve pointer focus behavior.
- Keep sitenav tooltips visually available without announcing their duplicate text.
- Preserve the existing search, profile, and sitenav accessibility-tree semantics except for the intentional combobox description.
- Avoid new page-load work, network requests, or global listeners.

## Non-goals

- Do not add a custom live-region announcement for sitenav expansion.
- Do not replace the combobox's semantic active-descendant relationship with a live region.
- Do not move pointer focus into sitenav.
- Do not remove visual tooltip behavior from pointer or keyboard users.
- Do not restructure search and `se-input` into a single shadow root.
- Do not change search result ranking, filtering, or navigation.
- Do not change the visual instruction footer.

## Design

### Combobox guidance

`sh-search` will render a visually hidden instruction containing:

> Type to search, or use the Up and Down Arrow keys to navigate. Press Enter to select.

Search will give `se-input` a live element reference to this instruction. `se-input` will reflect that reference to the native input through `ariaDescribedByElements`, following the existing element-reference pattern used for `ariaControlsElements` and `ariaActiveDescendantElement`.

The description must apply to the native input, not only the `se-input` host. VoiceOver focus lands on the native input, so that is the element that must expose the accessible description.

### Active-option synchronization

`se-input` will expose an imperative API for synchronously updating the native input's active descendant. The API will accept an `Element` or `null` and update both:

- The custom element's public active-descendant state.
- The native input's `ariaActiveDescendantElement` reference.

After `sh-search` renders an active option, it will use this API instead of waiting for a second `se-input` render. This keeps the native ARIA relationship synchronized with the visible `aria-selected` state in the same search update.

The initial active option remains the first navigation area. The first Arrow Down key press must update the native input's active descendant to the second option before the interaction proceeds.

### Safari announcement fallback

Cross-root ARIA element reflection remains the primary semantic path. Chromium and other supporting browser and screen reader combinations continue to receive the combobox description and active option through that path.

VoiceOver with Safari needs a separate fallback. The Search action owner creates a visually hidden `role="status"` element in light DOM before inserting `sh-search`. Search emits `search:announce` only when the browser reports an Apple vendor and a Safari user agent:

- After the native input receives focus and navigation areas finish loading, emit the complete guidance followed by the first option: "Type to search, or use the Up and Down Arrow keys to navigate. Press Enter to select. Getting started."
- After every Arrow Up or Arrow Down interaction, emit the newly active option's label.

The action owner clears the status text and writes the new message in the next task. This lets the same message be announced again after wrapping while keeping the region present before its content changes. The status region is removed with search.

The fallback is not emitted in browsers that already announce `ariaActiveDescendantElement`, which avoids duplicate speech. Sitenav expansion continues to be announced by moving keyboard focus to the expanded native button, not through the live region.

### Pending result state

When input changes, search immediately clears the previous results, active index, and native active-descendant reference. A completed request updates results only if its captured query still matches the current input. Enter selects only when the current item array contains an item at the active index. Otherwise, the nested native input retains its form-submission behavior and starts the search safely.

### Selection and sitenav focus

Search will include the originating keyboard event in the existing `sitenav:expand-level1` event detail. Pointer selection will continue to include its originating click event.

Sitenav will continue to:

- Find the level-1 button that matches the selected search label.
- Open the mobile sitenav when needed.
- Expand the matching category without collapsing it on repeated selection.
- Stop the originating pointer event from immediately reaching the outside-click handler.

For keyboard selection only, sitenav will move focus to the selected level-1 button after synchronous search teardown completes. This ordering is required because the action button's existing `clear` listener removes search and first restores focus to the Search action.

Moving focus to the expanded native button lets VoiceOver announce the category through its existing semantics, for example:

> Foundations, expanded, button

No extra expansion message will be sent through a live region.

### Sitenav tooltip semantics

Sitenav creates two kinds of visual `swc-tooltip` elements:

- Level-1 category tooltips while the desktop rail is collapsed.
- The expand/collapse control tooltip.

Both tooltips mirror text that the associated button already exposes as its accessible name. Each generated tooltip will use the component's supported `labeling` mode. When the tooltip opens, `swc-tooltip` removes itself from the trigger's `ariaDescribedByElements` and temporarily supplies the trigger's single accessible name through `ariaLabelledByElements`. When it closes, that relationship is cleared and the button's identical native name remains.

This prevents the tooltip from adding a duplicate accessible description while preserving its existing `for`, placement, delay, text synchronization, hover, and focus behavior. `aria-hidden="true"` alone will not be used because referenced hidden content can still contribute to an accessible name or description.

The associated buttons remain the only source of accessible names:

- Level-1 buttons keep their visible label or existing `aria-label`.
- The expand/collapse button keeps its synchronized `aria-label`.

This change belongs in sitenav's tooltip creation code, not in the vendored shared tooltip implementation, because duplicate semantics are specific to these sitenav usages.

## Interaction sequence

1. The user tabs to the Search action.
2. The user presses Enter or Space.
3. Search opens and focuses the native combobox.
4. Search sends the usage guidance and first active navigation option to the light-DOM status region after focus.
5. The user presses Arrow Down.
6. Search synchronously updates the visible selected state and the native input's active-descendant reference to Foundations.
7. Search sends Foundations to the light-DOM status region, and VoiceOver announces it.
8. The user presses Enter.
9. Search dispatches `sitenav:expand-level1` with the Foundations label and originating keyboard event.
10. Sitenav opens on mobile and expands Foundations at every viewport size.
11. Search closes and its action button briefly restores focus.
12. Sitenav moves focus to the expanded Foundations button.
13. VoiceOver announces the Foundations button and its expanded state.

## Component boundaries

### `se-input`

- Own native-input ARIA reflection.
- Preserve native form submission when no combobox option is active.
- Provide synchronous active-descendant updates for consumers that render options outside its shadow root.
- Reflect an external description element onto the native input.

### `sh-search`

- Own the instruction copy.
- Own the active option and visible selected state.
- Synchronize the active option with the native input after rendering.
- Emit Safari-only opening and arrow-navigation announcement events.
- Clear stale result selection immediately when the query changes.
- Pass the originating keyboard event when a navigation area is selected.

### Search action

- Create the light-DOM polite status region before inserting search.
- Refresh its text when search emits an announcement.
- Remove the status region when search closes.

### Sitenav

- Own category lookup, mobile opening, disclosure expansion, and keyboard focus placement.
- Move focus only for keyboard-originated search selection.
- Keep pointer behavior unchanged.
- Put generated level-1 and expand/collapse tooltips in `labeling` mode so they replace, rather than duplicate, the trigger's accessible name while open.

## Error and edge-case behavior

- If search has no options, the native input has no active descendant and Enter retains its form-submission behavior.
- If a user presses Enter after typing but before results arrive, search submits instead of selecting a stale or undefined option.
- If the selected label does not match a sitenav category, sitenav does not open or move focus.
- If the selected category is already expanded, it remains expanded and receives focus after keyboard selection.
- If the selected category is expanded on desktop, focus still moves to its level-1 button.
- If the selected category is expanded on mobile, the overlay opens before focus moves into it.
- If search closes through Escape or an outside click, focus restoration remains unchanged.
- Tooltip text continues to update visually when the rail expansion state changes, but does not add an accessible description or duplicate announcement.

## Testing

### Unit tests

- Verify `se-input` reflects the instruction element to the native input.
- Verify synchronous active-descendant updates reach the native input without waiting for another `se-input` render.
- Verify Safari receives the combined opening guidance and first option after focus.
- Verify Safari receives every newly active arrow-key option.
- Verify other browsers do not receive duplicate live announcements.
- Verify the Search action owns, updates, and removes a light-DOM status region.
- Verify Enter still submits when no option is active.
- Verify Enter submits safely after typing and before results arrive.
- Verify an older in-flight response cannot replace results for a newer query.
- Verify search passes the originating keyboard event with the selected category.
- Verify pointer selection continues to pass the originating click event.
- Verify sitenav moves focus after keyboard selection but not pointer selection.
- Verify every generated level-1 and expand/collapse tooltip uses `labeling` mode.
- Verify an open tooltip is absent from the trigger's `ariaDescribedByElements`, present once in `ariaLabelledByElements`, and leaves the button's accessible name and state intact.

### Browser and accessibility tests

- Open search from the action button with Enter and Space.
- Assert that the native combobox has the expected accessible description.
- Assert that the first option is active when search opens.
- Press Arrow Down once and assert that Foundations is both selected and the native input's active descendant.
- Press Enter and assert that:
  - Getting started is collapsed.
  - Foundations is expanded.
  - Foundations has focus.
  - Mobile sitenav is open at mobile viewport sizes.
- Run desktop and Mobile Chrome interaction coverage.
- Update the search accessibility-tree snapshot to include the intentional description.
- Confirm the sitenav and profile accessibility-tree snapshots remain unchanged and contain no duplicate tooltip announcements.
- Open or focus the visual sitenav tooltips and confirm the trigger has no tooltip-derived accessible description and only one accessible name.
- Run the related axe-core WCAG 2.2 AA scans.

### Manual VoiceOver and Safari validation

1. Tab to the Search action.
2. Open search with Enter, then repeat with Space.
3. Confirm VoiceOver announces the Search combobox, the usage guidance, and the first active option.
4. Press Arrow Down once and confirm VoiceOver announces Foundations.
5. Continue through the remaining options and confirm each option is announced once.
6. Press Enter on Foundations.
7. Confirm VoiceOver announces Foundations as an expanded button.
8. Repeat at desktop and mobile viewport sizes.
9. Confirm pointer selection does not move focus into sitenav.
10. Focus collapsed level-1 and expand/collapse buttons and confirm visual tooltips still appear without a second spoken label.
11. Type a query and immediately press Enter. Confirm search does not close or throw while results are pending.

## Performance

The change adds no network requests, observers, or page-load listeners. ARIA element references update only when search opens, its item set changes, or its active option changes. Safari announcements add one zero-delay task per interaction, and focus moves only after a keyboard selection.
