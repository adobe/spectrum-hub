# Dependencies and implementation data

Use `deps/` for code and data that Spectrum Hub needs from an external runtime,
implementation source, or generated dependency pipeline. It is not a general-purpose
shared-code directory.

Most changes here fall into one of five categories:

| Category | Examples | Source of truth |
| --- | --- | --- |
| Browser-shipped dependencies | `lit/`, `turndown/`, `rum.js`, `se/` | Upstream package or the checked-in source and build process |
| Implementation catalogs | `rsp/`, `swc/`, `figma/` | Published implementation metadata and extraction scripts |
| Authored mappings | `component-aliases.json`, `status-overrides.json`, `roster-excludes.json` | The checked-in JSON file |
| Extraction and build logic | `build-status-index.js`, `shared/`, extractor scripts | The checked-in source and tests |
| Generated outputs | `status-index.json`, `status/`, `impl-component-names.js`, implementation data files | Their generator; never the generated file itself |

## Does a new file belong here?

Add something to `deps/` when it meets one of these needs:

| Need | Location |
| --- | --- |
| A library must ship as a static browser dependency rather than only supporting local development or a build | `deps/<library>/` |
| A dependency-specific custom element or runtime adapter is maintained with its upstream dependency | `deps/components/<name>/` or the owning dependency directory |
| Spectrum Hub extracts component metadata from an implementation source | `deps/<implementation>/` |
| Multiple implementation pipelines need the same extraction or playground contract logic | `deps/shared/` |
| The combined status model needs an authored alias, override, exclusion, or secondary message | The existing top-level or implementation-specific mapping file |
| A generated artifact is required by runtime consumers | The path owned by its generator |
| Documentation describes a dependency data contract rather than general contributor workflow | `deps/docs/` |

Do not add a file here only because other code imports it. Use:

- `blocks/<name>/` for block-owned code and assets;
- `scripts/` for shared site behavior;
- `styles/` for global styles;
- `tools/` for contributor and operational tooling;
- `package.json` for dependencies used only by local development, tests, or builds;
- `docs/` for repository-wide contributor documentation.

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

Do not hand-edit generated files. Change the source of truth, run the owning generator,
and review the resulting diff.

Common generated paths include:

- `deps/rsp/components.json`
- `deps/rsp/data/*.json`
- `deps/swc/components.json`
- `deps/swc/data/*.json`
- `deps/swc/version.json`
- `deps/status-index.json`
- `deps/status/<slug>.json`
- `deps/impl-component-names.js`

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
