# Video Block Migration Plan

> **For agentic workers:** REQUIRED SUB-SKILL: load
> `.ai/skills/test-driven-development/SKILL.md` and follow red-green-refactor
> for every task in this plan. `.ai/skills/create-new-block/SKILL.md` governs
> the block scaffold, and `.ai/skills/stylesheet-conventions/SKILL.md` governs
> its CSS. Steps use checkbox (`- [x]`) syntax for tracking.

**Goal:** Replace the minimal `youtube` link block with a `video` block ported
from the `adobe-labs-website` project, keeping the existing link-authored
contract working while adding a table-authored contract for transcripts and
custom poster images.

**Architecture:** One block folder, `blocks/video/`. `init(el)` branches on the
element it receives. An `<a>` arrives from the `linkBlocks` auto-block path and
supplies only a URL; a block `<div>` arrives from an authored table and supplies
labelled rows. Both paths produce the same data object, which builds a poster
facade — a static image plus a play button — and swaps in the provider iframe
only when the button is activated. A per-provider table holds the poster
builder, oEmbed endpoint, embed URL, and iframe `allow` list, so adding a
provider later does not touch the build or play code. Five authored-cell
readers move into `scripts/utils/cells.js` so the table path does not inline
DOM archaeology.

**Tech Stack:** Node.js 24, npm, `@web/test-runner`, `@esm-bundle/chai`,
`sinon`, `@playwright/test`, `@axe-core/playwright`, native CSS nesting.

**Source:** `adobe-labs-website/blocks/video/{video.js,video.css,video.test.js}`.

**TDD:** No exception is approved for this plan. Every task adds production
code and begins with a failing test. Per `AGENTS.md`, an unattended agent must
not approve its own TDD exception; stop and ask if a step appears to need one.

**Commit policy:** Ask before committing. Do not push, and do not open a pull
request without a direct request.

## Decisions

| Decision | Choice | Why |
| --- | --- | --- |
| Block name | `video`, replacing `youtube` | The block is no longer YouTube-specific in shape, and the folder name is the class name `loadBlock` resolves. |
| Authoring contracts | Both link and table | Authors keep pasting a bare link for the common case; a table is only needed for a transcript or a custom poster. |
| Adobe Video Publishing Cloud provider | Included | Videos are authored as links in DA rather than held in the repository, so searching the repository for `video.tv.adobe.com` proved nothing either way. |
| `IntersectionObserver` deferral | Dropped | The facade already removes the iframe cost. The poster uses `loading="lazy"`, and the one small oEmbed request does not justify an observer that cannot fire on the hidden pages `@web/test-runner` uses. |
| `trackInteraction` analytics | Dropped | `deps/rum.js` already instruments clicks. The Adobe Launch `_satellite` call has no counterpart here. |

## What is ported

1. Poster-plus-play-button facade; iframe built on activation, with focus moved
   into it.
2. `getYoutubeId()` — watch, `youtu.be`, embed, shorts, live, and `/v/` URLs,
   validated against the 11-character ID format.
3. Accessible naming: play button label, iframe title derived from it, a
   `role="status"` live region announcing the player load.
4. oEmbed title fetch to replace the placeholder label with the real title.
5. Poster `maxresdefault` to `hqdefault` fallback, through both the `error`
   event and the tiny-placeholder `naturalWidth` check.
6. Broken-URL handling: remove the block and its empty wrapper, log once.
7. Transcript `<details>` disclosure with `aria-describedby` wiring, table path
   only.

## What is adapted

| From | To |
| --- | --- |
| `--s2a-*` tokens | `--s2-*` tokens from `styles/styles.css` |
| `:root[data-theme="dark"]` override | `light-dark()` tokens; no JS scheme toggling |
| `.video__poster` BEM classes | `.video-poster` kebab-case, prefixed with the block name |
| `scripts/utils/utils.js` cell helpers | new `scripts/utils/cells.js`, reusing `toClassName` from `ak.js` |
| `console.warn` | `getConfig().log` |
| Jest and `@testing-library/dom` | `@web/test-runner`, `@esm-bundle/chai`, `sinon` |
| `.video-wrapper` article sizing | dropped; no article layout in this project |

## Tasks

### 1. Authored-cell helpers

- [x] Write failing tests in `test/scripts/cells.test.js` for `getAuthoredCells`,
      `getCellText`, `getCellLinkHref`, and `getCellMedia`, including the
      `.visually-hidden` exclusion in `getCellText`.
- [x] Watch them fail.
- [x] Add `scripts/utils/cells.js` with the minimal implementation.
- [x] Watch them pass.

### 2. URL parsing

- [x] Write failing tests in `test/blocks/video.test.js` for `getYoutubeId`
      across watch, `youtu.be`, embed, shorts, live, and `/v/` URLs, plus
      rejection of non-YouTube hosts, malformed URLs, and wrong-length IDs.
- [x] Watch them fail.
- [x] Add `getYoutubeId` and `getVideoSource` to `blocks/video/video.js`.

### 3. Link-authored facade

- [x] Write failing tests: an `<a>` becomes a block-level container holding a
      poster image and a labelled play button; the anchor's text becomes the
      label when it is not the raw URL; a broken URL removes the block.
- [x] Watch them fail.
- [x] Implement the link branch of `init` and `buildVideo`.

### 4. Table-authored facade

- [x] Write failing tests: a `Video URL` row builds the same facade; an
      authored picture cell wins over the provider thumbnail; a `Transcript`
      row becomes a closed disclosure with a unique id referenced by the
      button's `aria-describedby`; an empty or missing transcript row adds
      nothing.
- [x] Watch them fail.
- [x] Implement the table branch and `buildTranscript`.

### 5. Play and poster behavior

- [x] Write failing tests: activating the button replaces the poster with a
      `youtube-nocookie` iframe that keeps the transcript in place, titles the
      iframe from the label, and announces through the live region; a poster
      `error` and a tiny `naturalWidth` both swap to `hqdefault`; an authored
      poster is never rewritten.
- [x] Watch them fail.
- [x] Implement `loadEmbed`, `buildYoutubePoster`, and the live region.

### 6. oEmbed title

- [x] Write failing tests with a stubbed `window.fetch`: a successful payload
      renames the button; a failed request leaves the fallback label; a label
      authored as custom link text is never overwritten.
- [x] Watch them fail.
- [x] Implement `fetchOembed` and the post-build upgrade.

### 7. Stylesheet

- [x] Port `video.css` with remapped tokens, kebab-case classes, and the play
      icon sizing variables.
- [x] Confirm `npm run lint:css` passes.

### 8. Rewire and remove

- [x] Change `linkBlocks` in `scripts/scripts.js` from `youtube` to `video`.
- [x] Delete `blocks/youtube/`.
- [x] Update the `linkBlocks` fixture in `test/scripts/ak.test.js`.

### 9. Accessibility tests

- [x] Replace `test/a11y/fixtures/youtube.html` with
      `test/a11y/fixtures/video.html`, covering both a link-authored and a
      table-authored instance.
- [x] Replace `test/a11y/blocks/youtube.spec.js` with `video.spec.js`;
      `readySelector` becomes the play button, and the YouTube image and oEmbed
      hosts are route-mocked.
- [x] Regenerate the accessibility-tree snapshot.

### 10. Documentation

- [x] Update the link-triggered and block tables in `docs/BLOCKS.md`.
- [x] Update the link-pattern table in `docs/CONTENT_AUTHORING.md`.
- [x] Document the authored row names for the table contract.

### 11. Verification

- [x] `npm run lint`
- [x] `npm run test:unit`
- [x] `npx playwright test test/a11y/blocks/video.spec.js`

## Outcome

Completed on 2026-11-17. Two things surfaced during the work that the plan did
not anticipate:

- **`youtu.be` was added to `linkBlocks`.** `getYoutubeId` already parses the
  short form, so without the pattern those links would never auto-block.
- **The Adobe Video Publishing Cloud provider was added after the first pass.**
  It was initially left out on the strength of a repository search, which was
  the wrong test: the links live in DA. `video.tv.adobe.com` is now a
  `linkBlocks` pattern, with `getAdobeVideoId`, the `format=jpeg` poster frame
  upgraded from the oEmbed thumbnail, authored player params preserved, and a
  host allowlist on the thumbnail the oEmbed payload reports.
- **Two defects were found and fixed by testing the real rendering.** The
  authored paragraph survived when the link sat on its own line, leaving the
  player nested in a `<p>`; `holdsOnly` now ignores surrounding whitespace. The
  play icon took `--s2-gray-25`, which inverts to near-black in dark mode;
  it now resolves to a light value in both schemes, like the stage background.

Verified with `npm run lint`, `npm run test:unit` (1237 passing), and
`npx playwright test test/a11y/blocks/video.spec.js test/a11y/coverage.spec.js`.

## Risks

- **Authored content with a bare YouTube link** keeps working, because the link
  pattern drives the auto-block and only the mapped class name changes. No page
  authors a `youtube` table today, so there is no table contract to break.
- **The DA block registry spreadsheet** at `docs/library/blocks` lives outside
  this repository. Registering `video` there is a separate manual step.
- **The poster is a cross-origin image** from `img.youtube.com`. If a future
  Content Security Policy restricts `img-src`, the facade loses its thumbnail
  and falls back to the player background color.
