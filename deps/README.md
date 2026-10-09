# Dependencies and implementation data

Use `deps/` for code and data that Spectrum Hub needs from an external runtime,
implementation source, or generated dependency pipeline. It is not a general-purpose
shared-code directory.

Most changes here fall into one of six categories:

| Category | Examples | Source of truth |
| --- | --- | --- |
| Vendored browser dependencies | `lit/`, `turndown/`, `components/swc-tooltip/`, `rum.js` | The upstream package, bundled by the build in [Vendored dependencies](#vendored-dependencies) |
| Authored runtime components | `se/` | The checked-in source in this repository |
| Implementation catalogs | `rsp/`, `swc/`, `figma/` | Published implementation metadata and extraction scripts |
| Authored mappings | `component-aliases.json`, `status-overrides.json`, `roster-excludes.json` | The checked-in JSON file |
| Extraction and build logic | `build-status-index.js`, `shared/`, extractor scripts | The checked-in source and tests |
| Generated outputs | `status-index.json`, `status/`, `impl-component-names.js`, implementation data files | The script that writes them (for instance, `build-status-index.js` writes the three).  The generated file itself is never the source of truth. |

## Does a new file belong here?

Add something to `deps/` when it meets one of these needs:

| Need | Location |
| --- | --- |
| A library must ship as a static browser dependency rather than only supporting local development or a build | `deps/<library>/` |
| A custom element wraps an element published by an upstream package | `deps/components/<name>/` |
| Spectrum Hub extracts component metadata from an implementation source | `deps/<implementation>/` |
| Multiple implementation pipelines need the same extraction or playground contract logic | `deps/shared/` |
| The combined status model needs an authored alias, override, exclusion, or secondary message | The existing top-level or implementation-specific mapping file |
| A generated artifact is required by runtime consumers | The path its generator writes to, as `build-status-index.js` writes `deps/status/<slug>.json` |
| Documentation describes a dependency data contract rather than general contributor workflow | `deps/docs/` |

Do not add a file here only because other code imports it. Use:

- `blocks/<name>/` for block-owned code and assets;
- `scripts/` for shared site behavior;
- `styles/` for global styles;
- `tools/` for contributor and operational tooling;
- `package.json` for dependencies used only by local development, tests, or builds;
- `docs/` for repository-wide contributor documentation.

## Vendored dependencies

`lit/`, `turndown/`, and each directory under `components/` share one layout:

| Path | Role |
| --- | --- |
| `<name>/src/index.js` | Authored entry point that re-exports what Spectrum Hub uses from the upstream package |
| `<name>/dist/index.js` | The bundled file the browser loads |

Treat `dist/index.js` as generated output. To change what a dependency exposes, edit
`src/index.js`, run the owning build script, and commit both files together:

```bash
npm run build:lit
npm run build:turndown
npm run build:swc-tooltip
```

Pages resolve the bare `lit` specifier to `/deps/lit/dist/index.js` through the import
map in `head.html`, so blocks import `lit` by name. Standalone pages under `tools/`
carry their own import map or import the `dist/` path directly.

`rum.js` is the exception: a single checked-in file with no `src/` entry point and no
build step. `se/` is not vendored at all — see [Custom elements](#custom-elements).

## Custom elements

Spectrum Hub ships custom elements from two directories, and they do not share a change
policy. Check which one you are editing:

| Directory | Kind | How to change it |
| --- | --- | --- |
| `components/<name>/` | Vendored wrapper around an element published by Spectrum Web Components | Edit `src/index.js`, then run the owning `npm run build:*` script |
| `se/` | Lit source authored in this repository | Edit `se.js` and its CSS directly. There is no upstream package and no build step; the browser loads `se.js` as written |

`se/se.js` registers the shared `se-*` form and UI elements that several blocks import.
Each registered element needs its own accessibility fixture and spec, and
`test/a11y/coverage.spec.js` fails when one is missing. See
[`test/a11y/README.md`](../test/a11y/README.md) before adding an element.

> **TODO:** `se/` is transitional. The `se-*` elements are being refactored into vendored
> wrappers under `components/`, following the `swc-tooltip` pattern, as their Spectrum Web
> Components equivalents become available. Prefer wrapping an upstream element over adding
> a new `se-*` element, and expect `se/` to shrink and then be removed.

## Before adding a dependency

1. Confirm that an existing block, shared script, package dependency, or implementation
directory is not the correct owner.
2. Decide whether the checked-in file is authored source, vendored source, or generated
output.
3. Record the upstream source, versioning strategy, and refresh or build command in the
owning README when they are not evident from the code.
4. Preserve required upstream license and attribution files.
5. Add the smallest tests that cover extraction, generation, or runtime integration.
6. Commit authored source and any required regenerated output together.

Vendored browser code should have a clear reason to be checked in. Do not copy a package
into `deps/` when adding it to `package.json` is sufficient.

## Generated files

Do not hand-edit generated files. Change the source of truth, run the script that writes
the file, and review the resulting diff. The generator is always the `.js` script you run.
The generated file is the `.json` or `.js` data it writes. An edit to
`deps/status-index.json` is gone the next time anyone runs `deps/build-status-index.js`,
including the daily extraction workflows that run it unattended.

Common generated paths, with the generator that writes each one:

| Generated file | Written by |
| --- | --- |
| `deps/rsp/components.json` | `deps/rsp/discover-components.js` |
| `deps/rsp/data/*.json` | `deps/rsp/extract-props.js` |
| `deps/swc/components.json` | `deps/swc/discover-components.js` |
| `deps/swc/data/*.json` | `deps/swc/extract-cem-components.js` |
| `deps/swc/version.json` | `deps/swc/extract-cem-components.js` |
| `deps/status-index.json` | `deps/build-status-index.js` |
| `deps/status/<slug>.json` | `deps/build-status-index.js` |
| `deps/impl-component-names.js` | `deps/build-status-index.js` |
| `deps/lit/dist/index.js` | `npm run build:lit` |
| `deps/turndown/dist/index.js` | `npm run build:turndown` |
| `deps/components/swc-tooltip/dist/index.js` | `npm run build:swc-tooltip` |

Not every generated format can carry a do-not-edit comment. Use the owning README and
build documentation to identify generated files.

## Where to read next

- [`docs/DEPS.md`](../docs/DEPS.md) — categories, regeneration commands, automation, and
  the safe-change checklist
- [`deps/rsp/README.md`](./rsp/README.md) — React Spectrum discovery and TypeScript
  extraction
- [`deps/swc/README.md`](./swc/README.md) — Spectrum Web Components CEM extraction and
  type resolution
- [`deps/docs/STATUS-FILES.md`](./docs/STATUS-FILES.md) — status mappings, aliases, and
  generated outputs
- [`deps/docs/DATA-CONTRACT.md`](./docs/DATA-CONTRACT.md) — extracted row and status
  contracts
- [`deps/docs/PLAYGROUND-CONTRACT.md`](./docs/PLAYGROUND-CONTRACT.md) — playground
  catalog consumption
- [`deps/docs/REMOVED-DETECTION.md`](./docs/REMOVED-DETECTION.md) — proposed Removed
  status detection
