/**
 * Builds the combined, build-time component status index.
 *
 * The daily GitHub Action runs this after the per-implementation extractions. It joins
 * the RSP, SWC, and Figma rosters into canonical components, resolves each column's
 * unified status through the adapter, layers on the per-implementation secondary-status
 * guidance and the manual override file, and writes a single `deps/status-index.json`
 * that downstream surfaces bind to — plus one small `deps/status/<slug>.json` per
 * component (its web cells + Figma node id) for blocks/component-status.js, so a single
 * component page's status pills don't need to fetch and search the whole index — and
 * `deps/impl-aliases.js`, a tiny slug → upstreamName lookup statically imported (no
 * fetch) by scripts/utils/go-to-impl.js.
 *
 * Design guarantees:
 * - Columns are data-driven. The status table's web columns are defined here (WEB_COLUMNS)
 *   and emitted into the index with their labels, so the block never hard-codes columns.
 *   Figma is a design source, not a code implementation, so it is intentionally NOT in
 *   scripts/utils/implementations.js (that registry stays code-only for the picker etc.).
 * - Roster membership is the union of every column: a component that ships in only one
 *   source is a legitimate single-source row (e.g. a Figma-only design surfaces as
 *   Figma = Available, RSP/SWC = Not available).
 * - Raw implementation vocabulary never reaches the output; it is unified in the adapter
 *   (scripts/utils/status-model.js) via the data-shape bridge (extraction-status.js).
 * - The output is self-describing: a top-level `statuses` legend embeds the full status
 *   vocabulary (id → label + definition) so a single fetch of status-index.json is
 *   interpretable by downstream / AI-assisted consumers without also reading the adapter.
 * - The output carries no timestamp so the committed index is a clean git diff — the
 *   deferred Removed-detection story baselines against the previously-committed file
 *   (see deps/docs/REMOVED-DETECTION.md).
 *
 * Usage: node deps/build-status-index.js
 */

import {
  readFileSync, writeFileSync, existsSync, mkdirSync,
} from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

import { getComponentStatus } from '../scripts/utils/extraction-status.js';
import { STATUSES, getUnifiedStatus } from '../scripts/utils/status-model.js';
import { getImplementationById } from '../scripts/utils/implementations.js';
import { toSlug } from '../scripts/utils/component-path.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUTPUT_FILE = join(__dirname, 'status-index.json');
const SLICES_DIR = join(__dirname, 'status');
const ALIASES_FILE = join(__dirname, 'component-aliases.json');
const OVERRIDES_FILE = join(__dirname, 'status-overrides.json');
const EXCLUDES_FILE = join(__dirname, 'roster-excludes.json');
const IMPL_ALIASES_FILE = join(__dirname, 'impl-aliases.js');
const RSP_EXPORT_NAMES_FILE = join(__dirname, 'rsp-export-names.js');

// The single platform surfaced today. New platforms are additive (see the memory /
// data-contract notes); each brings its own roster + columns.
const PLATFORM = 'web';

// The status table's web columns, in display order. Figma is a design source; its label
// lives here (not in the shared code-implementation registry). RSP/SWC labels are sourced
// from that registry so the two never drift.
export const WEB_COLUMNS = [
  { id: 'figma', label: 'Figma' },
  { id: 'rsp', label: getImplementationById('rsp').label },
  { id: 'swc', label: getImplementationById('swc').label },
];

// Roster membership is the presence signal: a component a source ships is never
// "Not available" for that column. When the extraction yields no maturity signal, the
// component is present but its status is floored per source. "Not available" is reserved
// for the column whose source lacks the component entirely.
//
// - figma: a design in the library. There is no maturity vocabulary, so presence = Available.
// - rsp: in the published types with no S2 doc page — ships in stable S2, so Available.
// - swc: a CEM declaration with no `since` (the AI/chat cohort); it still ships, so Available.
const PRESENT_FLOOR = {
  figma: { status: 'available' },
  rsp: { status: 'available' },
  swc: { status: 'available' },
};
const DEFAULT_FLOOR = { status: 'experimental' };

// Per-column secondary-status overlay filenames. Figma's is qualified ("secondary")
// to avoid colliding with its roster file (components.json, same name as rsp/swc's);
// rsp/swc keep the plain <impl>-status.json since their roster has its own impl prefix.
const OVERLAY_FILES = {
  figma: 'figma-secondary-status.json',
  rsp: 'rsp-secondary-status.json',
  swc: 'swc-secondary-status.json',
};

// Small words kept lowercase (except when first) when title-casing a Figma display name.
const SMALL_WORDS = new Set(['and', 'or', 'of', 'the', 'to', 'a', 'an', 'for', 'in', 'on', 'with']);

/**
 * Normalizes a human display name to a canonical PascalCase key.
 * `Bar panel and toolbar` → `BarPanelAndToolbar`; `In-line alert` → `InLineAlert`.
 *
 * @param {string} name
 * @returns {string}
 */
export function normalizeName(name) {
  return name
    .replace(/[()+]/g, ' ')
    .split(/[\s-]+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join('');
}

/**
 * Converts an SWC custom-element tag to its canonical PascalCase name.
 * `swc-action-button` → `ActionButton`.
 *
 * @param {string} tag
 * @returns {string}
 */
export function swcTagToPascal(tag) {
  return normalizeName(tag.replace(/^swc-/, ''));
}

/** An alias entry is a plain canonical-name string, or `{ canonical, upstreamName }`. */
function resolveAliasEntry(value) {
  return typeof value === 'string' ? { canonical: value } : value;
}

/** Resolves the canonical name for an SWC tag, letting the alias map override. */
export function canonicalNameForSwc(tag, aliases = {}) {
  return Object.hasOwn(aliases, tag) ? resolveAliasEntry(aliases[tag]).canonical : swcTagToPascal(tag);
}

/**
 * Resolves the canonical name for an RSP export, letting the alias map override.
 */
export function canonicalNameForRsp(name, aliases = {}) {
  return Object.hasOwn(aliases, name) ? resolveAliasEntry(aliases[name]).canonical : name;
}

/** The verified real upstream name for an rsp/swc alias entry, or null (see resolveAliasEntry). */
function upstreamNameForAlias(sourceKey, aliases = {}) {
  return Object.hasOwn(aliases, sourceKey) ? (resolveAliasEntry(aliases[sourceKey]).upstreamName ?? null) : null;
}

/** Resolves the canonical name for a Figma display name, letting the alias map override. */
export function canonicalNameForFigma(name, aliases = {}) {
  return Object.hasOwn(aliases, name) ? aliases[name] : normalizeName(name);
}

/** De-PascalCases a canonical name into a readable label: `ActionButton` → `Action Button`. */
function deCamel(name) {
  return name
    .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
    .replace(/([A-Z])([A-Z][a-z])/g, '$1 $2');
}

/** Title-cases a Figma display name, keeping small words lowercase. */
function toTitleCase(name) {
  return name
    .split(/\s+/)
    .map((word, i) => {
      const lower = word.toLowerCase();
      if (i > 0 && SMALL_WORDS.has(lower)) { return lower; }
      return word.charAt(0).toUpperCase() + word.slice(1);
    })
    .join(' ');
}

/**
 * Picks a component's display label. RSP/SWC rows de-PascalCase their canonical key;
 * Figma-only rows keep the designed display name (title-cased).
 *
 * @param {string} canonical
 * @param {{ rsp?: string, swc?: string, figma?: string }} sources
 * @returns {string}
 */
function displayLabel(canonical, sources) {
  if (sources.rsp || sources.swc) { return deCamel(canonical); }
  if (sources.figma) { return toTitleCase(sources.figma); }
  return deCamel(canonical);
}

/**
 * Joins the RSP, SWC, and Figma rosters into a sorted list of canonical components. Each
 * entry carries a `sources` map of column id → the source key to read/label it with.
 * Membership is the union across sources; single-source rows are legitimate.
 *
 * @param {string[]} rspNames - RSP PascalCase component names (allow-list keys).
 * @param {string[]} swcTags - SWC `swc-<kebab>` tags (allow list).
 * @param {string[]} figmaNames - Figma component-set display names.
 * @param {{ rsp?: object, swc?: object, figma?: object }} aliases
 * @returns {{ name: string, sources: { rsp?: string, swc?: string, figma?: string } }[]}
 */
export function joinRosters(rspNames, swcTags, figmaNames, aliases = {}) {
  const byName = new Map();
  const add = (canonical, id, sourceKey, upstreamName = null) => {
    const entry = byName.get(canonical) ?? { name: canonical, sources: {}, upstreamNames: {} };
    entry.sources[id] = sourceKey;
    if (upstreamName && !entry.upstreamNames[id]) { entry.upstreamNames[id] = upstreamName; }
    byName.set(canonical, entry);
  };

  for (const name of rspNames) {
    add(canonicalNameForRsp(name, aliases.rsp), 'rsp', name, upstreamNameForAlias(name, aliases.rsp));
  }
  for (const tag of swcTags) {
    add(canonicalNameForSwc(tag, aliases.swc), 'swc', tag, upstreamNameForAlias(tag, aliases.swc));
  }
  for (const name of figmaNames) { add(canonicalNameForFigma(name, aliases.figma), 'figma', name); }

  return [...byName.values()].sort((a, b) => a.name.localeCompare(b.name));
}

/**
 * Drops composition parts (sub-components) from the joined roster by canonical name, so a
 * part is removed from every source at once. The exclusion list is a reviewed, committed
 * file (deps/roster-excludes.json).
 *
 * @param {{ name: string, sources: object }[]} roster
 * @param {string[]} excludes - Canonical names to drop.
 * @returns {{ name: string, sources: object }[]}
 */
export function filterRoster(roster, excludes = []) {
  const excluded = new Set(excludes);
  return roster.filter((entry) => !excluded.has(entry.name));
}

/**
 * Selects the standalone SWC components from the generated components.json, as tags. Pattern
 * members (subpath under `patterns/`, e.g. the conversational-ai set) are dropped
 *
 * @param {Record<string, string>} components - components.json: bare name -> module subpath.
 * @returns {string[]} standalone-component tags (`swc-<name>`).
 */
export function standaloneSwcTags(components) {
  return Object.entries(components)
    .filter(([, subpath]) => !subpath.startsWith('patterns/'))
    .map(([name]) => `swc-${name}`);
}

/**
 * Drops SWC internal primitives
 *
 * @param {string[]} tags - SWC tags (`swc-<kebab>`).
 * @param {(tag: string) => unknown} readData - Reads a tag's raw extraction JSON, or null.
 * @returns {string[]} the tags with internal components removed.
 */
export function excludeInternalSwc(tags, readData) {
  return tags.filter((tag) => getComponentStatus(readData(tag)) !== 'internal');
}

/**
 * Resolves one column's raw extraction data to its unified index status. Absent data
 * resolves to Not available. The Level 2 `context` is included only when the adapter
 * supplies one.
 *
 * @param {string} source - Column id (`rsp`, `swc`, `figma`).
 * @param {unknown} rawData - Raw extraction JSON, or null when the component has no file.
 * @returns {{ status: string, context?: string }}
 */
export function toIndexStatus(source, rawData) {
  const rawStatus = rawData == null ? null : getComponentStatus(rawData);
  const { status, context } = getUnifiedStatus(source, rawStatus);
  return context ? { status: status.id, context } : { status: status.id };
}

/**
 * Reads the per-implementation secondary-status overlays (deps/<impl>/<impl>-status.json),
 * keying each entry's guidance by canonical name. These render as the muted line beneath a
 * status badge (e.g. an SWC "Use Gen1" redirect) regardless of the cell's primary status.
 *
 * @param {{ id: string }[]} columns
 * @param {(impl: string) => { name: string, context: string }[] | null} readOverlay
 * @param {{ figma?: object }} aliases
 * @returns {Record<string, Record<string, string>>} impl id → canonical name → guidance.
 */
export function readSecondaries(columns, readOverlay, aliases = {}) {
  const secondaries = {};
  for (const { id } of columns) {
    const entries = readOverlay(id);
    if (!entries) { continue; }
    const byCanonical = {};
    for (const { name, context } of entries) {
      byCanonical[canonicalNameForFigma(name, aliases.figma)] = context;
    }
    secondaries[id] = byCanonical;
  }
  return secondaries;
}

/**
 * Attaches secondary guidance onto the matching cells. Overlay entries that match no
 * component in the roster are warned about (a likely name drift) but do not abort.
 *
 * @param {object[]} components
 * @param {Record<string, Record<string, string>>} secondaries
 * @returns {string[]} warnings
 */
export function applySecondaries(components, secondaries = {}) {
  const warnings = [];
  const byName = new Map(components.map((component) => [component.name, component]));

  for (const [impl, byCanonical] of Object.entries(secondaries)) {
    for (const [canonical, context] of Object.entries(byCanonical)) {
      const cell = byName.get(canonical)?.platforms?.[PLATFORM]?.[impl];
      if (!cell) {
        warnings.push(`secondary for ${impl} targets unmatched component "${canonical}"`);
        continue;
      }
      cell.secondary = context;
    }
  }

  return warnings;
}

/**
 * Applies the manual override file last (override wins over auto-detected). Overrides are
 * keyed name → platform → implementation and may set `context`, `hasPage` (false when the
 * status is accurate but no component page exists yet — suppresses the status-table link),
 * and a `note` provenance field. Redundant, unknown-component, unknown-implementation, and
 * unknown-status overrides are warned about but do not abort the build.
 *
 * @param {object[]} components
 * @param {object} overrides
 * @returns {{ components: object[], warnings: string[] }}
 */
export function applyOverrides(components, overrides = {}) {
  const warnings = [];
  const byName = new Map(components.map((component) => [component.name, component]));

  for (const [name, platforms] of Object.entries(overrides)) {
    const component = byName.get(name);
    if (!component) {
      warnings.push(`override for unknown component "${name}"`);
      continue;
    }

    for (const [platform, impls] of Object.entries(platforms)) {
      for (const [impl, override] of Object.entries(impls)) {
        const current = component.platforms?.[platform]?.[impl];
        if (!current) {
          warnings.push(`override targets absent ${platform}/${impl} for "${name}"`);
          continue;
        }
        if (!Object.hasOwn(STATUSES, override.status)) {
          warnings.push(`override for "${name}" ${platform}/${impl} has unknown status "${override.status}"`);
          continue;
        }
        const hasPage = override.hasPage ?? true;
        if (current.status === override.status
          && (current.context ?? null) === (override.context ?? null)
          && (current.hasPage ?? true) === hasPage
          && (current.page ?? null) === (override.page ?? null)
          && (current.upstreamName ?? null) === (override.upstreamName ?? null)
          && (current.figmaPageSource ?? null) === (override.figmaPageSource ?? null)) {
          warnings.push(`redundant override for "${name}" ${platform}/${impl} (already ${override.status})`);
        }

        // Preserve any secondary guidance / auto-derived upstreamName already on the cell.
        const next = { status: override.status };
        if (override.context) { next.context = override.context; }
        if (current.secondary) { next.secondary = current.secondary; }
        if (!hasPage) { next.hasPage = false; }
        if (override.page) { next.page = override.page; }
        if (override.upstreamName) {
          next.upstreamName = override.upstreamName;
        } else if (current.upstreamName) {
          next.upstreamName = current.upstreamName;
        }
        if (override.figmaPageSource) { next.figmaPageSource = override.figmaPageSource; }
        if (override.note) { next.note = override.note; }
        component.platforms[platform][impl] = next;
      }
    }
  }

  return { components, warnings };
}

/**
 * The status vocabulary embedded in the index so a single fetch of status-index.json is
 * self-describing: every `status` id a cell can carry, mapped to its human label and
 * legend definition. This is the machine-readable legend for downstream / AI-assisted
 * consumers that read the JSON directly rather than importing status-model.js.
 *
 * @returns {Record<string, { label: string, definition: string }>}
 */
export function statusLegend() {
  return Object.fromEntries(
    Object.entries(STATUSES).map(([id, { label, definition }]) => [id, { label, definition }]),
  );
}

/**
 * Builds the index object from an injected roster and data reader (pure — no file I/O).
 *
 * @param {object} args
 * @param {{ name: string, sources: Record<string, string> }[]} args.roster
 * @param {(source: string, name: string) => unknown} args.readData
 * @param {{ id: string, label: string }[]} [args.columns]
 * @param {object} [args.overrides]
 * @param {Record<string, Record<string, string>>} [args.secondaries]
 * @returns {{ index: object, warnings: string[] }}
 */
export function buildIndex({
  roster, readData, columns = WEB_COLUMNS, overrides = {}, secondaries = {},
}) {
  const components = roster.map(({ name, sources, upstreamNames = {} }) => {
    const web = {};
    for (const { id } of columns) {
      const sourceName = sources[id];
      if (!sourceName) {
        // This source does not ship the component.
        web[id] = { status: 'not-available' };
        continue;
      }
      const resolved = toIndexStatus(id, readData(id, sourceName));
      const cell = resolved.status === 'not-available'
        ? { ...(PRESENT_FLOOR[id] ?? DEFAULT_FLOOR) }
        : resolved;
      // What this source's own public docs site calls the component, when that differs
      // from the canonical name — react-spectrum.adobe.com has no `ActionGroup.html`, only
      // `ActionButtonGroup.html`. Set only when the alias entry says so explicitly: a
      // rename's direction isn't inferable, since some canonical names are themselves the
      // real upstream name.
      if (upstreamNames[id]) { cell.upstreamName = upstreamNames[id]; }
      web[id] = cell;
    }
    return { name, label: displayLabel(name, sources), platforms: { [PLATFORM]: web } };
  });

  const secondaryWarnings = applySecondaries(components, secondaries);
  const { warnings: overrideWarnings } = applyOverrides(components, overrides);

  const index = {
    statuses: statusLegend(),
    implementations: { [PLATFORM]: columns },
    components,
  };
  return { index, warnings: [...secondaryWarnings, ...overrideWarnings] };
}

/** The first `page` override found on any of a component's web cells, or null. */
function sharedPageSlug(component) {
  const web = component.platforms?.[PLATFORM] ?? {};
  const cell = Object.values(web).find((c) => c?.page);
  return cell?.page ?? null;
}

/**
 * Builds the per-component status slices blocks/component-status.js and go-to-impl.js fetch:
 * one small file per component (`{ web, figmaPageId? }`) instead of the whole index, so a
 * component page's status pills need a single small fetch rather than parsing the full
 * multi-KB index and searching a separate Figma roster client-side. Each cell's own
 * `upstreamName` (buildIndex's auto-derived alias, or a manual override — see
 * applyOverrides) rides along on `web` unchanged; this function only decides the file name.
 *
 * Normally a slice is named by the component's own slug. When a `page` override redirects
 * this component to a slug shared with another (two originally separate components
 * documented on one page), the slice is written at that shared slug instead — `shared`
 * flags this for writeComponentSlices, which silences the collision warning for it.
 *
 * @param {{ name: string, sources: Record<string, string> }[]} roster
 * @param {{ name: string, platforms: object }[]} components - buildIndex's output components
 *   (same canonical names as roster, resolved cells already applied).
 * @param {{ name: string, figmaPageId: string }[]} figmaRoster
 * @returns {{ slices: { slug: string, data: { web: object, figmaPageId?: string }, shared: boolean }[], warnings: string[] }}
 */
export function buildComponentSlices(roster, components, figmaRoster) {
  const figmaPageIdByName = new Map(figmaRoster.map((entry) => [entry.name, entry.figmaPageId]));
  const componentByName = new Map(components.map((component) => [component.name, component]));
  const warnings = [];

  const slices = roster.map(({ name, sources }) => {
    const component = componentByName.get(name);
    // `web.figma.figmaPageSource` (an override — see applyOverrides) names which Figma
    // roster entry supplies this component's node id: Calendar borrows Date and time
    // field's page, Cards pins one of its six variant pages. It does not change which
    // Figma name or status this component's own roster membership came from. Distinct
    // from `upstreamName`, which is a display name used to build a doc URL.
    const pageSource = component.platforms[PLATFORM]?.figma?.figmaPageSource;
    const figmaSourceName = pageSource ?? sources.figma;
    const figmaPageId = figmaSourceName ? figmaPageIdByName.get(figmaSourceName) : undefined;
    if (pageSource && !figmaPageId) {
      warnings.push(`figma figmaPageSource override for "${name}" targets unmatched Figma roster entry "${pageSource}"`);
    }
    const data = { web: component.platforms[PLATFORM] };
    if (figmaPageId) { data.figmaPageId = figmaPageId; }
    const sharedSlug = sharedPageSlug(component);
    return { slug: sharedSlug ?? toSlug(name), data, shared: Boolean(sharedSlug) };
  });

  return { slices, warnings };
}

/**
 * Aggregates every cell's `upstreamName` (buildIndex's auto-derived alias, or a manual
 * override — see applyOverrides) into a tiny lookup keyed by the exact slug a live URL
 * carries: `{ <impl>: { <slug>: <upstreamName> } }`. Built from the already-computed
 * component slices (buildComponentSlices) so a `page` override's shared slug is picked up
 * for free, rather than re-deriving slugs by hand.
 *
 * Written once to `deps/impl-aliases.js` (a plain `export default {...}` module, not JSON —
 * this repo's ESLint parser target can't follow a JSON-with-import-attributes module through
 * scripts/utils/go-to-impl.js's own import, and a plain object literal needs no special
 * loading in the browser either) and statically imported (no fetch) from there. The whole
 * table is a couple dozen entries at most (most components have no alias at all), so shipping
 * it as a module avoids a per-page-load network round trip for data that's almost always
 * empty for the current page anyway.
 *
 * Figma is excluded — its own redirect field is `figmaPageSource` (selecting
 * buildComponentSlices' figmaPageId lookup, see there), not a code implementation go-to-impl.js
 * ever looks up by, and go-to-impl.js only ever reads `IMPL_ALIASES[impl]` for a registered
 * implementation id.
 *
 * @param {{ slug: string, data: { web: object } }[]} slices
 * @returns {Record<string, Record<string, string>>}
 */
export function buildImplAliases(slices) {
  const aliases = {};
  for (const { slug, data } of slices) {
    for (const [impl, cell] of Object.entries(data.web ?? {})) {
      if (!cell?.upstreamName || !getImplementationById(impl)) { continue; }
      aliases[impl] = aliases[impl] ?? {};
      aliases[impl][slug] = cell.upstreamName;
    }
  }
  return aliases;
}

/**
 * Authored slug -> the real RSP export to import and render, for the minority whose
 * RSP name differs from the canonical one (`action-group` ships as ActionButtonGroup).
 *
 * Distinct from impl-aliases.js, which answers "which RSP *docs page* covers this
 * slug" and so points a slug at its family page — `radio-button` -> RadioGroup there,
 * but Radio here. Conflating the two has shipped a bug before; see
 * deps/docs/STATUS-FILES.md.
 *
 * @param {{ name: string, sources: Record<string, string> }[]} roster
 * @returns {Record<string, string>}
 */
export function buildRspExportNames(roster) {
  const names = {};
  for (const { name, sources } of roster) {
    if (sources.rsp && sources.rsp !== name) { names[toSlug(name)] = sources.rsp; }
  }
  return names;
}

/**
 * Writes each slice to `deps/status/<slug>.json`, creating the directory if needed. Two
 * different components can legitimately target the same slug via a `page` override (see
 * buildComponentSlices, which flags this via `shared`) — the first one in roster order
 * (alphabetical by canonical name) wins the file, and later ones are silently skipped. An
 * *accidental* slug collision (two unrelated canonical names that happen to kebab-case to
 * the same string, neither `shared`) is warned about instead, since that is a real bug.
 *
 * @param {{ slug: string, data: object, shared: boolean }[]} slices
 * @returns {string[]} warnings
 */
export function writeComponentSlices(slices) {
  const warnings = [];
  const seen = new Set();
  mkdirSync(SLICES_DIR, { recursive: true });

  for (const { slug, data, shared } of slices) {
    if (seen.has(slug)) {
      if (!shared) {
        warnings.push(`slug collision "${slug}" — skipping duplicate component status file`);
      }
      continue;
    }
    seen.add(slug);
    writeFileSync(join(SLICES_DIR, `${slug}.json`), `${JSON.stringify(data, null, 2)}\n`);
  }

  return warnings;
}

/** Reads and parses a JSON file, returning `fallback` when it is absent. */
function readJson(path, fallback) {
  if (!existsSync(path)) { return fallback; }
  return JSON.parse(readFileSync(path, 'utf8'));
}

/** Reads a component's raw extraction file for a source, or null when absent. */
function readExtraction(source, name) {
  const path = join(__dirname, source, 'data', `${name}.json`);
  if (!existsSync(path)) { return null; }
  return JSON.parse(readFileSync(path, 'utf8'));
}

function main() {
  const rspComponents = readJson(join(__dirname, 'rsp', 'components.json'), {});
  // swc/components.json maps bare name -> module subpath; the roster is its keys as tags.
  const swcComponents = readJson(join(__dirname, 'swc', 'components.json'), {});
  const figmaRoster = readJson(join(__dirname, 'figma', 'components.json'), []);
  // The secondary overlay lists Figma designs that carry redirect guidance; some are not
  // in the roster export but still exist in the library, so they count toward membership.
  const figmaOverlay = readJson(join(__dirname, 'figma', OVERLAY_FILES.figma), []);
  const aliases = readJson(ALIASES_FILE, {});
  const overrides = readJson(OVERRIDES_FILE, {});
  const excludes = readJson(EXCLUDES_FILE, []);

  const figmaNames = [...new Set([
    ...figmaRoster.map((component) => component.name),
    ...figmaOverlay.map((entry) => entry.name),
  ])];
  const swcTags = excludeInternalSwc(
    standaloneSwcTags(swcComponents),
    (tag) => readExtraction('swc', tag),
  );
  const joined = joinRosters(Object.keys(rspComponents), swcTags, figmaNames, aliases);
  const roster = filterRoster(joined, excludes);

  // Fail-closed guard: an empty roster means an upstream extraction produced nothing.
  // Refuse to overwrite a good index with an empty one (see deps/docs/REMOVED-DETECTION.md).
  if (!roster.length) {
    console.error('Refusing to write an empty status index — every roster is empty.');
    process.exit(1);
  }

  const secondaries = readSecondaries(
    WEB_COLUMNS,
    (impl) => readJson(join(__dirname, impl, OVERLAY_FILES[impl]), null),
    aliases,
  );

  const { index, warnings } = buildIndex({
    roster, readData: readExtraction, overrides, secondaries,
  });

  const { slices, warnings: sliceOverrideWarnings } = buildComponentSlices(roster, index.components, figmaRoster);
  const sliceWarnings = writeComponentSlices(slices);

  for (const warning of [...warnings, ...sliceOverrideWarnings, ...sliceWarnings]) {
    console.warn(`warning: ${warning}`);
  }

  writeFileSync(OUTPUT_FILE, `${JSON.stringify(index, null, 2)}\n`);
  console.log(`Wrote ${index.components.length} component(s) to ${OUTPUT_FILE}`);
  console.log(`Wrote ${slices.length} component status slice(s) to ${SLICES_DIR}`);

  const implAliases = buildImplAliases(slices);
  const implAliasesModule = '// Generated by deps/build-status-index.js — do not edit by hand.\n'
    + `export default ${JSON.stringify(implAliases, null, 2)};\n`;
  writeFileSync(IMPL_ALIASES_FILE, implAliasesModule);
  const aliasCount = Object.values(implAliases).reduce((n, bySlug) => n + Object.keys(bySlug).length, 0);
  console.log(`Wrote ${aliasCount} impl alias entr${aliasCount === 1 ? 'y' : 'ies'} to ${IMPL_ALIASES_FILE}`);

  const rspExportNames = buildRspExportNames(roster);
  writeFileSync(RSP_EXPORT_NAMES_FILE, '// Generated by deps/build-status-index.js — do not edit by hand.\n'
    + `export default ${JSON.stringify(rspExportNames, null, 2)};\n`);
  console.log(`Wrote ${Object.keys(rspExportNames).length} RSP export-name override(s) to ${RSP_EXPORT_NAMES_FILE}`);
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  main();
}
