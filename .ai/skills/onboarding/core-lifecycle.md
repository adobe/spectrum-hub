# Core Page Lifecycle Walkthrough

Use this walkthrough progressively to learn how Adobe Edge Delivery Services
(EDS) pages start and load shared experiences. Verify every named function
against [`scripts/scripts.js`](../../../scripts/scripts.js) and
[`scripts/ak.js`](../../../scripts/ak.js) before teaching it. These source files
are authoritative when this guide and the implementation differ.

Both files run universally. They can affect every visitor and the initial
rendering of every page, including Largest Contentful Paint (LCP), the time
until the largest visible content element renders, and Cumulative Layout Shift
(CLS), the amount visible content moves unexpectedly while the page loads.
The teaching flow pauses after each checkpoint so the contributor can ask
questions before continuing.

## Checkpoint 1: Project bootstrap in `scripts/scripts.js`

### Configuration map

The module starts with project-specific configuration data:

- `hostnames` lists hosts whose absolute links should become local,
  root-relative links.
- `linkBlocks` maps link patterns to automatic block names. A matching link
  becomes an `auto-block` for shared loading.
- `components` lists blocks that do not need the loader to request a matching
  CSS file. These are CSS opt-outs, not the complete block catalog.
- `cdnEnv` identifies whether the page is running through a content delivery
  network (CDN), the edge layer that delivers cached content close to visitors.
  It is true for the configured local worker, Adobe, worker, CloudFront, and
  explicit mock conditions.
- `env` classifies the current host as `dev`, `stage`, or `prod`.
- `locales` supplies the root English locale.
- `decorateArea` gives the shared loader a project-specific decoration hook.

`loadPage()` passes this map to `setConfig()`. The shared configuration adds
the resolved locale, code base, and error logger in `ak.js`.

Treat additions to the existing arrays and map as configuration-data changes.
New conditional logic in this module is different: it joins a universal path
and adds work or risk to every page.

### Synchronous document setup

Before `loadPage()` runs, module evaluation establishes page state
synchronously:

1. It reads the current host, port, and query parameters and determines
   `cdnEnv` and `env`.
2. It adds `spectrum-edge` to the root `<html>` element.
3. It checks `sessionStorage`. A returning session adds `is-returning` to the
   body.
4. `setScheme(document.body)` applies the stored or system color scheme.
5. `getMetadata()` reads `template`.
6. A non-marketing template adds the `expand-sitenav` root attribute.
7. `getMetadata()` reads `breadcrumbs` and `hero`.

These reads and mutations occur before the asynchronous page-loading sequence.
Adding synchronous computation, selectors, or DOM changes here increases the
startup cost for every page.

### Metadata-driven composition

`buildAutoHero()` checks the `hero` and `template` metadata. For `hero: auto`
or a component template, it moves the page `<h1>` into a new `page-hero`
element at the start of the heading's section.

`buildBreadcrumbs()` creates a `breadcrumbs` block when breadcrumb metadata is
present or the page uses the component template. `breadcrumbs: off` disables
it. The block is prepended to the automatic hero when one exists, or otherwise
to the first main section.

These functions compose structures from metadata. The normal block discovery
and loading path in `ak.js` still initializes the resulting blocks.

### Image priority and backgrounds

The project `decorateArea()` hook finds one initial non-SVG image. For the
document, it searches the first main section. For another area, it searches
that area. It removes the image's `loading` attribute and sets
`fetchPriority` to `high`.

`decorateBackground()` handles a separate concern. It reads `light-bg` and
`dark-bg` metadata, creates scheme-aware background pictures, and prepends
them to the body. The image for the active scheme is eager; the other is lazy.
Each image receives a `decoded` class after its decode promise resolves or
rejects.

Do not confuse first-content-image priority with scheme-aware background
construction. They use different selectors, metadata, and loading decisions.

### `loadPage()` in execution order

`loadPage()` invokes work in this exact order:

1. `setConfig()` publishes the project configuration to `ak.js`.
2. `checkIms()` is awaited. Adobe Identity Management System (IMS) handling is
   loaded only when the URL contains an IMS callback hash or the readable
   session marker cookie is present; otherwise the check returns an anonymous
   result without the IMS import.
3. For a returning session, `loadNav()` is awaited before page composition.
4. `decorateBackground()` is invoked to create scheme-aware backgrounds.
5. `buildAutoHero()` and `buildBreadcrumbs()` create automatic blocks.
6. `loadArea()` is awaited to decorate and load the document.

The module then awaits `loadPage()` at top level. Although
`decorateBackground()` is declared `async`, `loadPage()` does not await its
return value. Its picture creation is synchronous, while image decoding
continues through promise callbacks.

### Authoring entry points

After initial page startup, the final module wrapper checks query parameters:

- `dapreview` dynamically imports the DA preview tool and passes `loadPage` to
  it.
- `quick-edit` dynamically imports and starts the Quick Edit tool.

These are conditional authoring entry points. They are not steps inside
`loadPage()` and do not change the order above.

### Checkpoint questions

Before continuing, locate and explain:

1. Where would you add only the pattern for a new link-triggered block?
2. Which configured function is the universal decoration hook that enters
   `ak.js`?
3. Why does a new synchronous selector or computation in this module create a
   page-wide cost?

Pause here. Answer the questions and resolve uncertainties before starting
checkpoint 2.

## Checkpoint 2: Shared loading in `scripts/ak.js`

### Shared primitives

`getMetadata()` reads a named metadata value, using the `property` attribute
for names containing a colon and the `name` attribute otherwise.

The scheme helpers share color-scheme behavior:

- `getScheme()` returns a valid stored choice or the system preference.
- `setScheme()` applies a single light or dark class and persists only an
  explicit selection made for the body.

`getLocale()` chooses the longest configured path prefix unless `locale`
metadata overrides it, and updates the document language when configured.
`setConfig()` stores project configuration plus the locale, code base, and
logger. `getConfig()` returns that shared value and creates defaults if needed.

### Audience and session handling

`checkIms()` performs a soft anonymous check first. It avoids importing IMS
unless the URL is returning from IMS or the readable session marker indicates
a live server session. When a hard check is needed, it imports `loadIms()`.

`removeForAudience()` handles a paired public/private element. Off the CDN it
keeps private content for authoring and preview. On the CDN it checks
authorization and keeps only the appropriate element.

`decorateAudience()` applies the same policy to
`audience-public` and `audience-private` classes across an area. It runs before
block discovery and loading, so a removed block is not fetched or initialized.
The production edge usually performs this filtering first; the browser pass
covers environments where that worker path is bypassed and provides defense
in depth.

### Experience and block loading

`loadStyle()` resolves root-relative paths against the configured code base,
deduplicates an existing direct child stylesheet link in `<head>`, and resolves
whether the stylesheet loads or errors.

`loadExperience()` builds a path from an experience type and name. It imports
and runs the matching JavaScript default export. When requested, it loads the
matching stylesheet in the same `Promise.all()`, so JavaScript and CSS load in
parallel.

`loadBlock()` uses the block element's first class as its block name, records
that name in `data-block-name`, and calls `loadExperience()` under `blocks/`.
It requests the matching CSS unless that first-class name appears in the
configured `components` CSS opt-out list. Class order therefore participates
in block resolution.

### Content decoration

Before blocks initialize, shared helpers normalize authored and generated
content:

- Picture decoration repairs PNG handling or adds a large-screen source.
- Button decoration interprets link title properties, audience hints, and
  emphasis markup, then assigns shared button classes and styles.
- URL localization adds the active locale prefix only to eligible local links.
- Link decoration makes configured hosts relative, handles special hash
  controls, decorates buttons, and recognizes `linkBlocks` patterns.
- Icon loading removes size-only icon placeholders or delegates remaining
  icons to the shared SVG utility.
- Child grouping separates consecutive default content and block content into
  `default-content` and `block-content` groups.
- Section decoration applies section state, decorates links, and records link
  blocks separately from authored blocks.
- Header decoration applies header metadata or removes a disabled header.
- Navigation loading conditionally loads site navigation and, outside
  marketing templates, page navigation.

`decorateDoc()` owns document-only header decoration and stores a URL hash for
later lazy-hash handling.

### Navigation and session timing

`loadSession()` marks `sessionStorage`, adds the body `session` class, starts
header block loading when a header exists, and starts navigation unless the
body is already marked `is-returning`. Header and navigation work inside this
function is intentionally not awaited.

For a returning session, `scripts.js` has already awaited `loadNav()`.
`loadArea()` calls `loadSession()` before its section loop without awaiting it;
the `is-returning` class prevents that call from starting navigation again.

For a new session, `loadArea()` starts `loadSession()` after section 0 has
finished. This lets the first section complete before the header and
navigation work begins.

### `loadArea()` in execution order

`loadArea()` follows this sequence:

1. It determines whether the area is the full document. For a document, it
   runs `decorateDoc()`. It then calls the configured project
   `decorateArea()` hook for any area.
2. It awaits `decorateAudience()` before discovering blocks.
3. It removes empty sections and decorates pictures.
4. It groups section children, decorates and discovers automatic link blocks,
   and discovers authored blocks.
5. For a returning document session, it starts `loadSession()` before the
   section loop without awaiting it.
6. For each section in document order, it starts icon loading, then awaits the
   automatic link blocks with one `Promise.all()`, then awaits the authored
   blocks with a separate `Promise.all()`.
7. Loading is parallel within each link-block group and within each
   authored-block group. The two groups are separate and ordered: authored
   blocks start only after that section's link blocks finish.
8. Sections are sequential. The loop does not start the next section until
   both groups in the current section have finished.
9. After both groups finish, it deletes the section's `data-status` attribute.
10. After section 0, a new document session starts `loadSession()` without
   awaiting it.
11. After all sections finish, a document imports
    [`lazy.js`](../../../scripts/lazy.js). The import is started but not
    awaited.

The lazy module then starts lazy-hash support, favicon handling, footer loading,
real user monitoring, and non-production authoring tools.

### What blocks already get for free

A normal block already receives:

- Dynamic JavaScript loading through `loadBlock()` and `loadExperience()`.
- Matching CSS loading unless it is a configured opt-out.
- Parallel loading with peers in the same block group.
- A progressive slot in section order, after earlier sections and before later
  sections.
- Shared picture, link, button, localization, icon, grouping, and audience
  preparation where applicable.

Block code should use this shared contract instead of adding its own loader
hook to `scripts.js` or `ak.js`.

### Checkpoint questions

Explain where a normal block receives its JavaScript, its CSS decision, and its
progressive section-ordered loading slot. Identify the first class used for
resolution and the separate `Promise.all()` groups for link blocks and
authored blocks.

Pause here. Answer the questions and resolve uncertainties before starting
checkpoint 3.

## Checkpoint 3: Performance ownership

### The page-wide tax

The core loaders execute for every page. A selector, import, fetch, or
computation added to their initial path becomes a page-wide tax even when only
one block needs it. It can also change initial rendering and the ordering that
protects LCP and CLS.

### Keep block behavior in the block

Block-specific selectors, imports, and fetches belong in that block's
`init(el)` function. The shared loader already imports the block and gives it a
progressive position in the section loop. Moving block behavior earlier
couples the universal loader to a feature and may query for DOM that the
block's initialization has not created yet.

Reserve layout space with CSS when late content would otherwise shift the
page. Do not replace a layout guarantee with an unmeasured network race.

### Choose the correct lifecycle shelf

Keep work on the earliest shelf that evidence requires, not the earliest shelf
available:

- Block-specific behavior belongs in the block initializer.
- Noncritical universal work belongs in
  [`lazy.js`](../../../scripts/lazy.js), after all sections.
- [`postlcp.js`](../../../scripts/postlcp.js) exports `loadPostLCP()`, but
  `postlcp.js` is not currently active or imported by the page lifecycle. Do
  not describe it as an existing post-LCP hook or move work there without first
  wiring and validating that lifecycle.

### Legitimate core-loader changes

Common legitimate changes are configuration data:

- A `hostnames` entry for local link rewriting.
- A `linkBlocks` pattern for a link-triggered automatic block.
- A `components` entry when a block owns its CSS loading.

These additions use existing generic behavior. New universal logic needs a
stronger case: it must apply without special-casing a block and have evidence
that the universal lifecycle is the correct owner.

### Require evidence

For logic proposed before or inside `loadArea()`, require measured evidence:

1. Does removing it worsen CLS, and can reserved CSS space solve the problem?
2. Does removing it delay the actual LCP candidate in a captured trace?
3. Is it generic, or does it name one block, class, or feature?
4. Could the work run in the block's `init()` with no visible difference?
5. Could noncritical universal work wait for `lazy.js`?

An assumed optimization is not enough. Record the before-and-after LCP or CLS
measurement, the affected page, and the observed loading sequence.

### Historical calibration

Historical example, not current behavior: an earlier `decorateArea()` queried
for `.component-status` and prefetched that block's data. The hook was removed.
It coupled a generic loader to one block, often ran before the block created
the target element, and tried to address possible layout movement with timing
instead of reserved CSS space.

Current behavior lets the component-status block fetch its data from its own
initializer. Use the removed prefetch only as an example of what not to restore,
not as a description of the current lifecycle.

### Before changing either file

Read and apply the
[`eds-performance-review` skill](../eds-performance-review/SKILL.md) before
modifying `scripts/scripts.js` or `scripts/ak.js`. Use
[`ARCHITECTURE.md`](../../../docs/ARCHITECTURE.md) for the wider request and
runtime boundaries, then verify all lifecycle claims against current source.

Before the walkthrough ends, answer:

1. Why do block-specific selectors, imports, and fetches belong in the block
   initializer?
2. Which current shelf owns noncritical universal work?
3. Why is `postlcp.js` not an available active hook today?
4. Which configuration-data changes can legitimately use the core loader?
5. What measured LCP or CLS evidence would justify new universal logic?
6. Which review skill is required before either core file changes?

Pause after checkpoint 3 for questions. After this checkpoint, the contributor
is ready to choose a contribution area, inspect its prerequisites, and identify
the smallest focused validation for that work. The onboarding router conducts
that post-checkpoint handoff.
