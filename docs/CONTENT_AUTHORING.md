# Content authoring

This guide explains how authored content becomes Spectrum Hub pages and which
page-level controls affect the browser runtime. It is written for code
contributors who need to reproduce authored markup, debug a page, or coordinate
with content authors.

## Content and code are separate

Most page copy and block tables do not live in this Git repository. Authors edit
documents through the AEM/DA authoring environment. EDS converts those documents
into HTML and exposes preview and published versions.

The repository provides:

- block implementations and styles
- document decoration and page lifecycle code
- global assets and head markup
- authoring and preview tools
- query-index configuration
- edge filtering for private content

When a problem appears on one page, first determine whether it comes from the
authored document, a shared fragment, metadata, generated EDS markup, or
repository code.

## Author contribution workflow

Content authors work in Document Authoring (DA), not directly in this
repository. DA access and publish permissions are managed separately from
GitHub access.

Use DA for:

- page copy, headings, links, and media
- existing block rows and cells
- page metadata
- shared fragments

Use the GitHub engineering workflow when the change requires:

- a new block or new block behavior
- JavaScript or CSS changes
- a new metadata value or interpretation
- changes to generated data, tools, integrations, or edge behavior

For a content-only change:

1. Open the page or fragment in the Spectrum Hub DA workspace.
2. Edit the content, existing block structure, or metadata.
3. Preview the page and verify the combined content and code.
4. Check shared fragments on more than one consuming page.
5. Use the Sidekick or DA publish action when the change is approved.
6. Verify the published AEM page and the public production URL when applicable.

A content-only change does not require a Git branch or pull request. If the
existing authored structures cannot express the requested experience, record
the page URL, desired behavior, and representative content for an engineer
rather than inventing unsupported markup.

See the [author workflow in the contribution guide](../CONTRIBUTING.md#author-workflow)
for the shorter task checklist.

## Environments

| Environment | Typical use |
| --- | --- |
| `http://localhost:3000` | Local code served by `aem up`, with content proxied from the linked preview source |
| `https://preview.spectrum.adobe.com/` | Preview site through CloudFront and Lambda. Requires the Adobe VPN |
| `https://spectrum.adobe.com/` | Public production site through CloudFront and Lambda |

Run the local site with:

```bash
npm ci
npx aem up
```

Local traffic does not reproduce every production edge behavior. `localhost` will emulate an authenticated user's experience,
and may render both "private" and "public" content (i.e. duplicate links).
Use a production-like host when validating session cookies, CloudFront caching, or Lambda filtering.

## Page structure

EDS delivers page content inside `<main>`. Direct child `<div>` elements become
sections.

### EDS markup conversion

Edge Delivery Services converts an authored document in DA to plain HTML, accessible at
`<page>.plain.html`. A heading and a `columns` table authored on `/content/voice-and-tone`
arrive as an anonymous section wrapping a heading and nested `div` markup:

```html
<div>
  <h1 id="voice-and-tone">Voice and tone</h1>
  <div class="columns">
    <div>
      <div>Just as products should look and act consistently, they should also speak consistently.</div>
    </div>
  </div>
</div>
```

Nothing is grouped or classed yet. The section is a bare `div`, and the block is
identifiable only by the first class on its own `div`.

During `loadArea()`, Spectrum Hub:

1. removes empty sections
2. decorates pictures
3. groups non-`div` content under `.default-content`
4. groups block `div` elements under `.block-content`
5. identifies blocks from their first class
6. loads sections in document order

An authored block table becomes nested `div` markup in row → cell → content
shape. Blocks should read that raw structure in `init(el)` rather than expecting
their final decorated output.

The same section after `loadArea()` and the block's own `init(el)` have run:

```html
<div class="section">
  <div class="default-content">
    <h1 id="voice-and-tone" tabindex="-1" class="page-nav-target">Voice and tone</h1>
  </div>
  <div class="block-content">
    <div class="columns" data-block-name="columns">
      <div class="row row-1">
        <div class="col col-1">Just as products should look and act consistently, they should also speak consistently.</div>
      </div>
    </div>
  </div>
</div>
```

Three different owners touched that markup:

- `loadArea()` added `.section`, then split the section's children into
`.default-content` (the heading) and `.block-content` (the block `div`). Grouping
follows document order and opens a new group each time the child type changes between
`div` and non-`div`, so one section can hold several groups of each kind.
- `loadBlock()` read `columns` as the first class and recorded it as `data-block-name`.
Any remaining classes are variants and do not affect module resolution.
- `blocks/columns/columns.js` added `row`/`row-N` and `col`/`col-N` inside the block.
Only the owning block adds that layer, so do not expect it in another block's markup.

The `tabindex` and `page-nav-target` on the heading come from the `page-nav` block rather
than from section decoration.

## Page metadata

Metadata is authored with the page and delivered as `<meta>` elements. The
runtime reads these keys:

| Metadata | Effect |
| --- | --- |
| `template` | `component` enables the automatic component page hero and breadcrumbs. `marketing` collapses the persistent navigation behavior and skips page-nav loading. |
| `hero` | `auto` moves the page `<h1>` into an automatic `page-hero` block. |
| `breadcrumbs` | Any non-empty value enables automatic breadcrumbs; `off` explicitly disables them. Component pages enable breadcrumbs by default. |
| `description` | Supplies the description shown by `page-hero` on component pages. |
| `header` | Selects the header class/path convention; `off` removes the header. |
| `header-path` | Overrides the default `/fragments/nav/header` source used by the header block. |
| `footer` | Selects the footer fragment; `off` disables the footer. |
| `sitenav` | `off` prevents sitenav loading. |
| `pagenav` | `off` prevents page-nav loading. Marketing pages skip page-nav regardless. |
| `locale` | Overrides locale-prefix detection and document language configuration. |
| `favicon` | Selects the favicon name loaded after page content. |
| `light-bg` | Background image used for the light color scheme. |
| `dark-bg` | Background image used for the dark color scheme. |
| `audience` | Used by the production edge to classify private pages. |

Metadata values are strings. Check the consuming code before inventing a new
value or assuming a truthy value has special semantics.

## Automatic page composition

This repository does not currently have a `templates/` registry. Page-type behavior is
implemented through the `metadata` spreadsheet in DA, and existing owners:

- `scripts/scripts.js` creates automatic page heroes and breadcrumbs.
- `page-hero` creates the component status block for component pages.
- `ak.js` loads sitenav and page-nav according to metadata.
- header and footer blocks load their configured fragments.

Keep new block-specific composition in the closest owning block. Reserve
`scripts.js` for page setup that is genuinely universal.

## Fragments

Fragments are separately authored documents reused across pages. A fragment
link becomes a `fragment` block, which fetches the fragment HTML, inserts its
content, and runs `loadArea()` so nested sections and blocks receive the normal
decoration lifecycle.

Site-wide navigation uses conventional fragment paths in DA:

- `/fragments/nav/header`
- `/fragments/nav/footer`
- `/fragments/nav/site-nav`

Header and footer paths can be overridden through metadata. When debugging a
fragment, test both the fragment document and a consuming page because nested
decoration and surrounding styles can change the result.

## Link-triggered blocks

`scripts/scripts.js` converts links containing known URL patterns into blocks:

| Link pattern | Block |
| --- | --- |
| `/tools/widgets/action-button` | `action-button` |
| `/tools/widgets/search-bar` | `search` |
| `/tools/widgets/profile` | `profile` |
| `/fragments/` | `fragment` |
| `https://www.youtube` | `youtube` |

The first class added to the link becomes the block name. Add a new pattern only
for a link-driven feature; ordinary authored blocks need no registry entry.

## Audience-aware content

Whole blocks can carry `audience-public` or `audience-private` classes. In
production, the Lambda removes content the viewer cannot access before the
response is delivered. The browser repeats the decision wherever the Lambda is
bypassed, including local development.

Pages can also be removed from navigation if desired by adding the `audience: private` row to a page's `metadata` block.

Off the CDN, preview and local authoring show the private variant and remove the
public variant. Do not treat local visibility as proof that anonymous production
visitors can see the same content.

The `banner` block also supports paired public/private rows and resolves them
with the same audience rules.

## Authoring and preview tools

Non-production pages load the AEM sidekick integration after page
content. Useful query parameters include:

| Parameter | Effect |
| --- | --- |
| `?dapreview=on` | Loads DA live preview support from `da.live` |
| `?dapreview=local` | Loads DA preview support from `localhost:3000` |
| `?dapreview=<ref>` | Loads a named DA preview deployment |
| `?quick-edit=on` | Loads Quick Edit from `da.live` |
| `?quick-edit=local` | Loads local Quick Edit from port `6456` |
| `?quick-edit=<ref>` | Loads a named Quick Edit deployment |

These tools are authoring aids, not production application behavior.

## Preview and publish checklist

Before treating a content-related code change as complete:

1. Confirm the authored block shape matches what the block reads.
2. Test a representative page through `aem up`.
3. Check the branch preview URL.
4. Test light and dark schemes when the page uses scheme-aware media.
5. Test anonymous and authorized variants for audience-gated content.
6. Confirm shared fragments still work on more than one consuming page.
7. Run the relevant block and accessibility tests described in [Tests](./TESTS.md).

## Related guides

- [Architecture](./ARCHITECTURE.md)
- [Blocks](./BLOCKS.md)
- [Styles](./STYLES.md)
- [Tools](./TOOLS.md)
