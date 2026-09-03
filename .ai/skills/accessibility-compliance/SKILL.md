---
name: accessibility-compliance
description: Implement WCAG 2.2 compliant interfaces with mobile accessibility, inclusive design patterns, and assistive technology support. Use when auditing accessibility, implementing ARIA patterns, building for screen readers, or ensuring inclusive user experiences.
---

# Accessibility Compliance

Build inclusive experiences that work for everyone, including users with disabilities. This project ships vanilla-JS EDS blocks (`init(el)`), BEM CSS, and design tokens — the patterns below use plain DOM APIs, not a framework. For deeper reference material, see the files in [`references/`](./references/): [`wcag-guidelines.md`](./references/wcag-guidelines.md), [`aria-patterns.md`](./references/aria-patterns.md), and [`mobile-accessibility.md`](./references/mobile-accessibility.md).

## When to Use This Skill

- Implementing WCAG 2.2 Level AA or AAA compliance
- Building screen reader accessible interfaces
- Adding keyboard navigation to interactive components
- Implementing focus management and focus trapping
- Creating accessible forms with proper labeling
- Supporting reduced motion and high contrast preferences
- Building mobile accessibility features (iOS VoiceOver, Android TalkBack)
- Conducting accessibility audits and fixing violations

## Core Capabilities

### 1. WCAG 2.2 Guidelines

- Perceivable: Content must be presentable in different ways
- Operable: Interface must be navigable with keyboard and assistive tech
- Understandable: Content and operation must be clear
- Robust: Content must work with current and future assistive technologies

### 2. ARIA Patterns

- Roles: Define element purpose (button, dialog, navigation)
- States: Indicate current condition (expanded, selected, disabled)
- Properties: Describe relationships and additional info (labelledby, describedby)
- Live regions: Announce dynamic content changes

### 3. Keyboard Navigation

- Focus order and tab sequence
- Focus indicators and visible focus states
- Keyboard shortcuts and hotkeys
- Focus trapping for modals and dialogs

### 4. Screen Reader Support

- Semantic HTML structure
- Alternative text for images
- Proper heading hierarchy
- Skip links and landmarks

### 5. Mobile Accessibility

- Touch target sizing (44x44dp minimum)
- VoiceOver and TalkBack compatibility
- Gesture alternatives
- Dynamic Type support

## Quick Reference

### WCAG 2.2 Success Criteria Checklist

| Level | Criterion | Description                                          |
| ----- | --------- | ---------------------------------------------------- |
| A     | 1.1.1     | Non-text content has text alternatives               |
| A     | 1.3.1     | Info and relationships programmatically determinable |
| A     | 2.1.1     | All functionality keyboard accessible                |
| A     | 2.4.1     | Skip to main content mechanism                       |
| AA    | 1.4.3     | Contrast ratio 4.5:1 (text), 3:1 (large text)        |
| AA    | 1.4.11    | Non-text contrast 3:1                                |
| AA    | 2.4.7     | Focus visible                                        |
| AA    | 2.5.8     | Target size minimum 24x24px (NEW in 2.2)             |
| AAA   | 1.4.6     | Enhanced contrast 7:1                                |
| AAA   | 2.5.5     | Target size minimum 44x44px                          |

## Key Patterns

These are expressed in the project's idiom: a block's `init(el)` populates `el` with plain DOM. Use the global `.visually-hidden` utility (defined in `styles/styles.css`) for screen-reader-only text rather than a bespoke class.

### Pattern 1: Accessible Button

A native `<button>` is keyboard- and AT-accessible for free. Communicate state with ARIA and keep the target big enough (WCAG 2.5.8 — 24×24px minimum).

```js
const button = document.createElement('button');
button.type = 'button';
button.classList.add('my-block__action');

function setLoading(isLoading) {
  button.disabled = isLoading;
  button.setAttribute('aria-busy', String(isLoading));
  button.replaceChildren();
  if (isLoading) {
    const label = document.createElement('span');
    label.className = 'visually-hidden';
    label.textContent = 'Loading';
    const spinner = document.createElement('span');
    spinner.className = 'my-block__spinner';
    spinner.setAttribute('aria-hidden', 'true');
    button.append(label, spinner);
  } else {
    button.textContent = 'Save';
  }
}
```

```css
.my-block__action {
  min-block-size: 44px;
  min-inline-size: 44px;
}
.my-block__action:focus-visible {
  outline: 2px solid var(--s2-blue-900);
  outline-offset: 2px;
}
```

### Pattern 2: Accessible Modal Dialog

Prefer the native `<dialog>` element — `showModal()` gives focus trapping, `Escape` to close, and inert background handling without hand-rolled logic.

```js
const dialog = document.createElement('dialog');
dialog.setAttribute('aria-labelledby', 'dialog-title');

const heading = document.createElement('h2');
heading.id = 'dialog-title';
heading.textContent = 'Confirm';

const close = document.createElement('button');
close.type = 'button';
close.textContent = 'Close';
close.addEventListener('click', () => dialog.close());

dialog.append(heading, close);
el.append(dialog);

// Opening traps focus and enables Escape-to-close automatically.
dialog.showModal();
```

If you must build a non-native dialog, set `role="dialog"`, `aria-modal="true"`, `aria-labelledby`, move focus into it on open, trap Tab within it, restore focus to the trigger on close, and handle `Escape`.

### Pattern 3: Accessible Form Field

Associate every control with a `<label>` via `for`/`id`, mark required fields for AT, and wire errors with `aria-describedby` + `aria-invalid`.

```js
const label = document.createElement('label');
label.htmlFor = 'email';
label.textContent = 'Email address';

const input = document.createElement('input');
input.id = 'email';
input.name = 'email';
input.type = 'email';
input.required = true;
input.setAttribute('aria-describedby', 'email-hint');

const hint = document.createElement('p');
hint.id = 'email-hint';
hint.textContent = "We'll never share your email.";

function showError(message) {
  input.setAttribute('aria-invalid', 'true');
  input.setAttribute('aria-describedby', 'email-error');
  const error = document.createElement('p');
  error.id = 'email-error';
  error.setAttribute('role', 'alert'); // announces the error when it appears
  error.textContent = message;
  hint.replaceWith(error);
}

el.append(label, input, hint);
```

### Pattern 4: Skip Navigation Link

Let keyboard users bypass repeated chrome (WCAG 2.4.1). Hide it until focused with `.visually-hidden` plus a focus override.

```html
<a href="#main-content" class="skip-link">Skip to main content</a>
<main id="main-content" tabindex="-1">…</main>
```

```css
.skip-link {
  position: absolute;
  inset-block-start: 0;
  inset-inline-start: var(--s2-spacing-300);
  transform: translateY(-100%);
}
.skip-link:focus-visible {
  transform: translateY(0);
}
```

### Pattern 5: Live Region for Announcements

Announce async updates (search results, save status) without moving focus. Create the region once, then update its text.

```js
const announcer = document.createElement('div');
announcer.setAttribute('role', 'status');
announcer.setAttribute('aria-live', 'polite');
announcer.setAttribute('aria-atomic', 'true');
announcer.className = 'visually-hidden';
el.append(announcer);

function announce(text) {
  announcer.textContent = ''; // clear first so identical text re-announces
  requestAnimationFrame(() => { announcer.textContent = text; });
}

announce(`${results.length} results found`);
```

## Color Contrast Requirements

Use design tokens for color; they resolve for light and dark mode via `light-dark()` (see the `stylesheet-conventions` skill), which keeps contrast consistent across schemes. Meet these ratios:

| Content | AA | AAA |
| --- | --- | --- |
| Normal text (<18pt, or <14pt bold) | 4.5:1 | 7:1 |
| Large text (≥18pt, or ≥14pt bold) | 3:1 | 4.5:1 |
| UI components and graphics | 3:1 | — |

The a11y test suite runs a `color-contrast` axe scan in both light and dark mode for every block (see Testing below), so contrast regressions fail CI.

## Best Practices

1. **Use Semantic HTML**: Prefer native elements over ARIA when possible
2. **Keyboard First**: Design interactions to work without a mouse
3. **Don't Disable Focus Styles**: Style them, don't remove them
4. **Provide Text Alternatives**: All non-text content needs descriptions
5. **Support Zoom**: Content should work at 200% zoom
6. **Announce Changes**: Use live regions for dynamic content
7. **Respect Preferences**: Honor `prefers-reduced-motion` and `prefers-contrast`

## Common Issues

- **Missing alt text**: Images without descriptions
- **Poor color contrast**: Text hard to read against background
- **Keyboard traps**: Focus stuck in component
- **Missing labels**: Form inputs without associated labels
- **Auto-playing media**: Content that plays without user initiation
- **Inaccessible custom controls**: Recreating native functionality poorly
- **Missing skip links**: No way to bypass repetitive content
- **Focus order issues**: Tab order doesn't match visual order

## Testing

This project enforces accessibility in CI: axe-core WCAG 2.2 AA scans (light and dark) plus a Playwright `toMatchAriaSnapshot()` accessibility-tree check run against every block and template, and a coverage check fails CI if a block has no spec. When you build or change a block, add or update its spec — see the [`create-new-block`](../create-new-block/SKILL.md) skill's "Accessibility tests" step and [`test/a11y/README.md`](../../../test/a11y/README.md).

For manual verification beyond what automation catches (focus order, announcements, keyboard flow):

- **Automated**: axe DevTools, WAVE, Lighthouse
- **Manual**: VoiceOver (macOS/iOS), NVDA/JAWS (Windows), TalkBack (Android)
- **Simulators**: NoCoffee (vision), Silktide (various disabilities)

## Resources

- [WCAG 2.2 Guidelines](https://www.w3.org/WAI/WCAG22/quickref/)
- [WAI-ARIA Authoring Practices](https://www.w3.org/WAI/ARIA/apg/)
- [A11y Project Checklist](https://www.a11yproject.com/checklist/)
- [Inclusive Components](https://inclusive-components.design/)
- [Deque University](https://dequeuniversity.com/)
