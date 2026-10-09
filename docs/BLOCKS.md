# Blocks

Blocks (or components) are Spectrum Hub's independently-loaded page features. Each block owns
the transformation from authored EDS markup into its final DOM and normally owns
its own styles.

## File contract

A block named `example` lives in:

```text
blocks/example/example.js
blocks/example/example.css
```

The JavaScript module exports its initializer as the default export:

```js
export default function init(el) {
  // Read the authored rows and cells, then decorate el.
}
```

`el` is the block root. Its first class is the block name and later classes are variants:

```html
<div class="example compact"> <!-- `example` block root -->
  <div> <!-- first row in the DA block table -->
    <div>Authored cell content</div> <!-- first column of the row in the DA block table -->
  </div>
</div>
```

`loadBlock()` imports the JavaScript and CSS in parallel, waits for both, then
calls the default export. An initializer may be synchronous or return a promise.
Initialization failures are logged as block errors rather than silently
reported as success.

`loadBlock()` requests matching CSS for every block except `fragment` and
`profile`, which are listed as CSS opt-outs in the `components` array in
`scripts/scripts.js`.

## Authored DOM shape

EDS represents a block as rows containing cells:

```text
block root
└── row
    ├── column cell
    │   └── authored elements
    └── column cell
        └── authored elements
```

Read direct children when structure matters:

```js
const rows = [...el.children];
const firstRowCells = [...rows[0].children];
```

Avoid broad selectors when nested authored content could accidentally match.
Use `:scope` when querying the immediate block shape.

Once the authored meaning has been read, blocks may add classes, move nodes, or
replace the raw structure with semantic elements. Preserve authored links,
headings, alternative text, and other accessibility information unless the
block deliberately replaces them with an equivalent.

## Decoration order

`loadArea()` in `scripts/ak.js` drives the lifecycle. It prepares the whole area
before loading anything:

1. `decorateAudience()` resolves audience-gated blocks, so a block this viewer must
   not see is never fetched
2. `removeEmptySections()` drops sections audience gating left empty
3. `decoratePictures()` decorates pictures
4. `decorateSections()` groups each section's children, converts configured links into
   blocks, and collects that section's block roots from `.block-content`

It then walks the sections in document order, and for each one:

1. `loadIcons()` loads that section's icons
2. `loadBlock()` runs on the link-derived blocks, and the section waits for all of them
3. `loadBlock()` runs on the authored blocks, and the section waits for all of them

Blocks load in parallel within each of those two passes, but the passes are sequential:
every link-derived block in a section finishes before any authored block in the same
section starts. A block must not depend on a later section already being initialized.
Fragments call `loadArea()` recursively, so blocks inside a fragment follow the same
lifecycle.

While a section is loading it carries `data-status="decorated"`, set by
`decorateSections()` and deleted once that section's blocks resolve. `styles/styles.css`
hides `div[data-status]`, so each section stays invisible until its own blocks are ready
and then reveals itself in document order. That attribute is the per-section guard
against showing undecorated content, which is why a finished page never has one —
`scripts/utils/copy-md.js` waits for the last one to disappear before converting a page
to Markdown. However, do not query `[data-status]` globally and assume it refers to
section decoration, as `data-status` by `status-table` and `component-status` to tag
component status ids.

## Ways blocks are created

### Authored blocks

Most blocks begin as named tables in an authored document. The first block class maps directly to the folder name.

This project has a central block registry spreadsheet in DA at `docs/library/blocks`. When registered, the blocks appear in the authoring "Library" tool for content authors to select.

### Link-triggered blocks

`scripts/scripts.js` maps specific link patterns to block names before loading:

| Pattern | Block |
| --- | --- |
| `/tools/widgets/action-button` | `action-button` |
| `/tools/widgets/search-bar` | `search` |
| `/tools/widgets/profile` | `profile` |
| `/fragments/` | `fragment` |
| `/schedules/` | Reserved `schedule` block name; no local block implementation is currently present |
| YouTube URLs | `youtube` |

Use this mechanism only when the content contract is naturally a link.

### Programmatic blocks

Page setup and blocks may create other blocks through `createBlock()` and then
load them normally. Current examples include automatic `page-hero`,
`breadcrumbs`, and `component-status` blocks.

This repository does not use a separate template registry. Metadata and the
closest owning page/block code control automatic composition.

## JavaScript conventions

- Keep initialization inside `init(el)`; do not scan the whole document at
module evaluation time.
- Limit selectors and events to the block unless the feature explicitly owns a
global surface.
- Reuse helpers from `scripts/ak.js` and `scripts/utils/` rather than copying
loading, metadata, icon, or focus behavior.
- Await required asynchronous work so `loadBlock()` reflects the block's real
readiness.
- Surface invalid required input rather than manufacturing success-shaped
fallback content.
- Remove author-only scaffolding, such as metadata tables, after its values have
been applied.
- Add custom elements or global listeners only when their lifecycle and cleanup
are clear.

## CSS and class conventions

Scope selectors under the block root and use kebab-case, block-prefixed child/state classes:

```css
.status-table {
  .status-table-card {
    /* ... */
  }

  .status-table-card.is-selected {
    /* ... */
  }
}
```

Short variant classes are appropriate on the block root:

```css
.card.vertical {
  /* ... */
}
```

Block styles are unlayered, so [they override the global styles](https://developer.mozilla.org/en-US/docs/Web/CSS/Reference/At-rules/@layer#description) defined in the
`spectrum-edge` layer without unnecessary specificity. See [Styles](./STYLES.md) for tokens, schemes, media queries, and lint rules.

## Block catalog

| Block | Responsibility |
| --- | --- |
| `action-button` | Link-triggered action control with Spectrum action-button styling |
| `banner` | Notice content, including public/private paired variants |
| `breadcrumbs` | Automatic path navigation for component and opted-in pages |
| `card` | General linked/content card layouts |
| `columns` | Responsive multi-column content layout |
| `component-status` | Implementation status assembled from generated dependency data |
| `footer` | Loads and decorates the configured footer fragment |
| `fragment` | Fetches reusable content and recursively runs the page lifecycle |
| `header` | Loads header navigation, IMS controls, and responsive behavior |
| `hero` | Authored hero with foreground and optional image/video background |
| `media` | Scheme-aware media with authored size and opacity variants |
| `page-hero` | Metadata-driven page heading and component status composition |
| `page-nav` | In-page navigation derived from page headings |
| `playground` | Interactive component demonstration driven by generated contracts |
| `profile` | Link-triggered account/profile control |
| `search` | Link-triggered Algolia search interface |
| `section-metadata` | Applies section style, layout, spacing, radius, and background settings |
| `sitenav` | Site-level navigation loaded from a fragment |
| `status-table` | Tabular component status presentation |
| `table` | General authored table decoration |
| `usage` | Recommended/not-recommended media guidance panels |
| `youtube` | Link-triggered embedded YouTube player |

Read the implementation before changing an authored contract. Some blocks
support multiple shapes or infer behavior from row counts, icons, and variant
classes.

## Adding or changing a block

1. Read `.ai/skills/create-new-block/SKILL.md` when adding a new block.
2. Define the authored rows, cells, variants, and invalid-input behavior.
3. Add the block JavaScript and CSS.
4. Add focused unit tests for meaningful logic.
5. Add an accessibility fixture and spec under `test/a11y/`. The coverage test fails when a block has no matching accessibility spec.
6. Update accessibility snapshots when the intended semantic tree changes.
7. Run lint, targeted tests, and the block's accessibility test.
8. Document non-obvious authoring requirements near the owning feature.

Changing only code without updating its authored fixture can leave tests
passing against a shape authors cannot produce. Validate both the raw fixture
and the final decorated result.

## Related guides

- [Content authoring](./CONTENT_AUTHORING.md)
- [Styles](./STYLES.md)
- [Tests](./TESTS.md)
- [Dependencies and generated data](./DEPS.md)
