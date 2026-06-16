---
name: stylesheet-conventions
description: Stylesheet organization, design token usage, light/dark mode, and CSS conventions for Spectrum Hub. Use when adding global styles, creating block CSS, or structuring new stylesheet files.
---

# Stylesheet Conventions

Use this skill when writing CSS for any part of Spectrum Hub — global styles, block stylesheets, or shared component styles.

## How this skill relates to `create-new-block`

These two skills cover complementary halves of the same task:

| Skill | Owns |
| --- | --- |
| [`create-new-block`](../create-new-block/SKILL.md) | File structure, `init(el)` contract, how `loadBlock` resolves and loads the CSS file, template injection, block authoring conventions (div soup, object syntax, BEM class names) |
| `stylesheet-conventions` *(this file)* | What goes inside the CSS file — tokens, light/dark mode, layer cascade, nesting, media queries, shared stylesheets |

**When creating a new block, use both.** Start with `create-new-block` to set up the files and wire the JS. Then use this skill to write the block's CSS correctly.

## Stylesheet structure

Spectrum Hub uses a layered stylesheet approach inspired by ITCSS. Styles are separated by responsibility so that more specific rules always override more general ones without specificity hacks.

| File | Purpose |
| --- | --- |
| `styles/styles.css` | Fonts, design tokens (CSS custom properties), base element styles, layout objects, utilities, and the `spectrum-edge` layer |
| `blocks/<name>/<name>.css` | Styles scoped to a single block — loaded as a module only when that block appears on the page |
| `global-blocks.css` *(aspirational)* | Shared component styles used across multiple blocks (e.g. card patterns, list items) — avoids loading redundant stylesheets per block |

### What goes where

- **`styles.css`** — anything that applies site-wide: tokens, element resets, typography scale, utility classes, grid variables. Do not add block-specific styles here.
- **Block CSS** — styles scoped to `.block-name { }`. Loaded automatically by `loadBlock` unless the block is in the `components` array in `scripts.js`.
- **`global-blocks.css`** — styles for UI patterns shared by multiple blocks. Prefer this over duplicating styles across block stylesheets.

## Design tokens

All tokens are defined as CSS custom properties in `styles/styles.css` under `:root`. They are generated from the Spectrum 2 token library — **do not edit the generated section**.

### Token reference

#### Color — gray scale
```
--s2-gray-25   --s2-gray-50   --s2-gray-75   --s2-gray-100
--s2-gray-200  --s2-gray-300  --s2-gray-400  --s2-gray-500
--s2-gray-600  --s2-gray-700  --s2-gray-800  --s2-gray-900
--s2-gray-1000
```

#### Color — blue
```
--s2-blue-100  through  --s2-blue-1200
```

Other color scales follow the same pattern: `--s2-red-*`, `--s2-orange-*`, `--s2-yellow-*`, `--s2-green-*`, `--s2-seafoam-*`, `--s2-cyan-*`, `--s2-pink-*`.

#### Spacing
```
--s2-spacing-50   (2px)    --s2-spacing-75   (4px)
--s2-spacing-100  (8px)    --s2-spacing-200  (12px)
--s2-spacing-300  (16px)   --s2-spacing-400  (24px)
--s2-spacing-500  (32px)   --s2-spacing-600  (40px)
--s2-spacing-700  (48px)   --s2-spacing-800  (64px)
--s2-spacing-900  (80px)   --s2-spacing-1000 (96px)
```

#### Corner radius
```
--s2-corner-radius-75   (3px)   --s2-corner-radius-100  (4px)
--s2-corner-radius-200  (5px)   --s2-corner-radius-300  (6px)
--s2-corner-radius-400  (7px)   --s2-corner-radius-500  (8px)
--s2-corner-radius-600  (9px)   --s2-corner-radius-700  (10px)
--s2-corner-radius-800  (16px)
```

#### Typography — body
```
--s2-body-size-xxs (11px)  --s2-body-size-xs (12px)
--s2-body-size-s   (14px)  --s2-body-size-m  (16px)
--s2-body-size-l   (18px)  --s2-body-size-xl (20px)
--s2-body-size-xxl (22px)  --s2-body-size-xxxl (25px)
--s2-body-font-weight: 400
--s2-body-line-height: 1.5
```

#### Typography — headings
```
--s2-heading-size-xs (18px)  --s2-heading-size-s  (20px)
--s2-heading-size-m  (22px)  --s2-heading-size-l  (28px)
--s2-heading-size-xl (36px)  --s2-heading-size-xxl (45px)
--s2-heading-size-xxxl (58px) --s2-heading-size-xxxxl (73px)
--s2-heading-font-weight: 800
--s2-heading-line-height: 1.3
```

#### Typography — fonts
```
--s2-font-family:         'Adobe Clean', adobe-clean, 'Trebuchet MS', sans-serif
--s2-font-display-family: 'Adobe Clean Display', adobe-clean-display, sans-serif
```

#### Layout
```
--se-grid-container-width  (83.4% up to 1500px at 1800px+)
--se-grid-column-width     (container / 12)
--se-grid-gutter-width     (8.3%)
--sh-header-height         (56px)
```

#### Spectrum Edge conveniences
```
--se-body-background-color   --se-body-color
--se-component-m-height (32px)
--se-corner-radius-50   (1px)
--se-adobe-corporate-color (rgb(235 16 0))
```

## Light and dark mode

Color tokens use the CSS `light-dark()` function — each token resolves automatically based on the user's `color-scheme` preference. **No JavaScript class toggling is needed.**

```css
:root {
  color-scheme: light dark; /* enables light-dark() resolution */
}

/* Each token already handles both modes: */
--s2-gray-25: light-dark(rgb(255 255 255), rgb(17 17 17));
--s2-blue-900: light-dark(rgb(59 99 251), rgb(86 129 255));
```

Always use tokens rather than hardcoded colors. Tokens adapt to the user's mode automatically. To force a specific scheme on a section or component:

```css
.my-block--dark {
  color-scheme: dark;
}

.my-block--light {
  color-scheme: light;
}
```

The utility classes `.dark-scheme` and `.light-scheme` are available globally for one-off overrides.

## The `spectrum-edge` CSS layer

Global element styles in `styles.css` are wrapped in `@layer spectrum-edge`. This gives block stylesheets implicit priority — unlayered styles always beat layered ones, so blocks never need `!important` to override base styles.

```css
/* styles.css */
@layer spectrum-edge {
  html.spectrum-edge {
    h1 { font-size: var(--s2-heading-size-xxl); }
    p  { margin: calc(1em * var(--s2-body-margin-multiplier)) 0; }
  }
}

/* blocks/hero/hero.css — wins without !important */
.hero h1 { font-size: var(--s2-heading-size-xxxxl); }
```

## Global utility classes

These are defined in `styles.css` and available everywhere:

| Class | Purpose |
| --- | --- |
| `.visually-hidden` | Hides content visually but keeps it accessible (`clip-path: inset(50%)`) |
| `.dark-scheme` | Forces dark color scheme on an element |
| `.light-scheme` | Forces light color scheme on an element |
| `.heading-size-*` | Applies heading scale without changing element semantics |

## CSS conventions for block stylesheets

- Use **native CSS nesting** (not Sass).
- Scope all styles to the block root class: `.my-block { ... }`.
- Use **BEM** for class names added inside the block: `.my-block__element`, `.my-block--modifier`.
- Reference tokens, never hardcoded values.
- Use `rgb(from <token> r g b / <alpha>)` for alpha variants of token colors:

```css
&:hover {
  background-color: rgb(from var(--s2-gray-500) r g b / 15%);
}
```

- Write `@media` queries with `width >=` syntax (not `min-width`):

```css
@media (width >= 800px) {
  .my-block { display: flex; }
}
```

- Respect `prefers-reduced-motion` for any transitions or animations:

```css
@media (prefers-reduced-motion: reduce) {
  .my-block { transition: none; }
}
```
