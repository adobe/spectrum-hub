# Contributing to Spectrum Hub

Spectrum Hub combines repository code with content authored in Adobe Document
Authoring (DA). Choose the workflow that matches the source of truth for your
change.

| Contributor | Use this workflow for |
| --- | --- |
| [Engineer](#engineer-workflow) | Blocks, JavaScript, CSS, tools, dependency pipelines, tests, and edge infrastructure |
| [Author](#author-workflow) | Page copy, media, metadata, existing block content, and fragments |

All contributors must follow the [Adobe Code of Conduct](./CODE_OF_CONDUCT.md).
External code contributors must also sign the
[Adobe Open Source CLA](https://opensource.adobe.com/cla.html).

## Engineer workflow

Engineering changes are made in Git and reviewed through a GitHub pull request.
Most block and page work can be developed without service credentials.

### Set up the repository

Install [nvm](https://github.com/nvm-sh/nvm), then run:

```bash
nvm install
nvm use
npm ci
npx aem up
```

`nvm install` reads the version from [`.nvmrc`](./.nvmrc), currently Node.js 20, so the
version is never typed by hand. `aem up` serves local code at `http://localhost:3000` and
proxies authored preview content.

Install Chromium before running Playwright accessibility or link tests:

```bash
npx playwright install chromium
```

An `.env` file is needed only for workflows that call configured services, such
as an Algolia indexer dry run. Copy `.env.example` to an untracked `.env` and
use development credentials. Never commit credentials.

### Find the owner of a change

| Change | Start here |
| --- | --- |
| Page lifecycle, global loading, or production request flow | [`docs/ARCHITECTURE.md`](./docs/ARCHITECTURE.md) |
| Block behavior or authored block markup | [`docs/BLOCKS.md`](./docs/BLOCKS.md) |
| CSS, tokens, color schemes, responsive behavior, or motion | [`docs/STYLES.md`](./docs/STYLES.md) |
| Authored pages, metadata, fragments, or preview behavior | [`docs/CONTENT_AUTHORING.md`](./docs/CONTENT_AUTHORING.md) |
| Test selection or CI reproduction | [`docs/TESTS.md`](./docs/TESTS.md) |
| Vendored code, implementation data, mappings, or generated output | [`deps/README.md`](./deps/README.md) |
| DA tools, Sidekick actions, scheduler, or Algolia indexer | [`docs/TOOLS.md`](./docs/TOOLS.md) |

Keep behavior with its closest owner. Block-specific behavior belongs in the
block, not in `scripts/scripts.js` or `scripts/ak.js`. General utilities belong
in `scripts/`; operational tooling belongs in `tools/`.

### Your first engineering change

1. Start from an issue or Jira ticket when the change requires one.
2. Create a branch, and choose a small, representative page for validation.

    i. if possible, keep the branch name to 8 characters or fewer to avoid browser console errors from IMS (though this isn't a blocker)
3. Read the guide for the area you are changing — most often
   [`docs/BLOCKS.md`](./docs/BLOCKS.md) or [`docs/DEPS.md`](./docs/DEPS.md).
   [Find the owner of a change](#find-the-owner-of-a-change) maps every area to its guide.
4. Inspect the authored HTML shape before changing a block.
5. Add or update the focused test that describes the intended behavior.
6. Make the smallest source change and keep any generated output with its generator change.
7. Run the minimum validation for the files changed, using [`docs/TESTS.md`](./docs/TESTS.md#what-to-run).
8. Run `aem up` and verify the representative page in a browser.
9. Push the branch and verify `https://<branch>--spectrum-hub--adobe.aem.page/<path>`. (`.page` preview branches are gated behind authorization with Sidekick)
10. Open a pull request and complete the repository PR template with validation steps, accessibility results, and screenshots when applicable.

**Non-blocking note about branch naming:** IMS validates the branch preview's URI
against a pattern that accommodates only 8 characters in the branch segment, so a longer
name produces a preview host IMS rejects. Sign-in then fails on the branch preview with
CORS errors, while the same code signs in normally on localhost and in production. The
failure looks like a code problem and is not one. However, the browser console errors will
not block your work.

Conventional branch names are almost always too long: `feat/add-banner` and
`fix-sitenav-focus` both exceed the limit, and a `/` becomes a `-` in the preview host
rather than being dropped. Prefer a short slug such as `sitenav`, `a11y-ci`, or `jira-159`,
particularly if you need to validate an IMS change.

### Validation

Start with focused checks while iterating. Before requesting review, run every
independent suite affected by the change.

```bash
npm test
npm run test:a11y
npm run lint
```

`npm test` is the core suite, not every repository check. Accessibility,
full-site link crawls, and edge-package tests run separately. New or changed
blocks also need their Playwright accessibility spec and manual keyboard and
screen-reader review.

Never edit generated files directly. Change their source of truth, run the script that
writes the file, and review generated additions, removals, and renames.
[`deps/README.md`](./deps/README.md#generated-files) lists every generated path with the
generator that produces it.

## Author workflow

Content-only changes are made in DA and do not require a Git branch or pull
request. DA access and EDS author/publish permissions are separate from GitHub access.

### Work in DA

Use DA for:

- page copy, headings, links, and media
- rows and cells for an existing block
- page metadata
- shared fragments, including navigation content

For a content change:

1. Open the page or fragment in the Spectrum Hub DA workspace.
2. Make the smallest content, metadata, or existing block-structure change.
3. Preview the page and verify the combined content and repository code.
    i. `preview.spectrum.adobe.com` is gated behind Adobe VPN to preview your content changes,
    and also is only the code behavior or functionality that is found in the `main` branch.
4. Check links, responsive layout, light and dark schemes, and relevant accessibility behavior.
5. If a shared fragment changed, verify more than one consuming page.
6. Use the Sidekick or DA publish action after approval.
7. Verify the published AEM page and `https://spectrum.adobe.com/<path>` when the page is public.

Read [`docs/CONTENT_AUTHORING.md`](./docs/CONTENT_AUTHORING.md) for metadata,
fragments, environments, audience-aware content, and authoring tools.

### When an author needs an engineer

Open an engineering issue instead of inventing new markup when a request needs:

- a new block or a change to block behavior
- JavaScript or CSS
- a new metadata key or value
- a new authoring tool or Sidekick action
- changes to authentication, audience filtering, search, or generated data

Include the DA or preview URL, the desired behavior, representative content,
screenshots when visual output matters, and the affected audience. This gives
the engineer enough context to reproduce the authored state locally.

## Pull request expectations

- Keep pull requests focused on one coherent change.
- Link the related GitHub issue or include the Jira ticket identifier without
linking to private Jira content.
- Describe what changed, why it changed, and how reviewers can verify it.
- Include the branch preview URL for page-facing changes. That URL only supports IMS
sign-in when the branch name is 8 characters or fewer (see
[Your first engineering change](#your-first-engineering-change)).
- Record manual accessibility testing for interactive or semantic changes.
- Do not include secrets, private content, or internal credentials in commits,
screenshots, logs, or pull request text.
