/**
 * Builds the combined, build-time component status index.
 *
 * The daily GitHub Action runs this after the per-implementation extractions. It joins
 * the RSP, SWC, and Figma rosters into canonical components, resolves each column's
 * unified status through the adapter, layers on the per-implementation secondary-status
 * guidance and the manual override file, and writes a single `deps/status-index.json`
 * that downstream surfaces bind to.
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
 *   (scripts/utils/status-model.js) via the data-shape bridge (component-status.js).
 * - The output is self-describing: a top-level `statuses` legend embeds the full status
 *   vocabulary (id → label + definition) so a single fetch of status-index.json is
 *   interpretable by downstream / AI-assisted consumers without also reading the adapter.
 * - The output carries no timestamp so the committed index is a clean git diff — the
 *   deferred Removed-detection story baselines against the previously-committed file
 *   (see deps/REMOVED-DETECTION.md).
 *
 * Usage: node deps/build-status-index.js
 */

import { readFileSync, writeFileSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

import { getComponentStatus } from '../scripts/utils/component-status.js';
import { STATUSES, getUnifiedStatus } from '../scripts/utils/status-model.js';
import { getImplementationById } from '../scripts/utils/implementations.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUTPUT_FILE = join(__dirname, 'status-index.json');
const ALIASES_FILE = join(__dirname, 'component-aliases.json');
const OVERRIDES_FILE = join(__dirname, 'status-overrides.json');
const EXCLUDES_FILE = join(__dirname, 'roster-excludes.json');

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
// - swc: a CEM declaration with no `since` (the AI/chat cohort); maturity unconfirmed, so
//   Experimental.
const PRESENT_FLOOR = {
  figma: { status: 'available' },
  rsp: { status: 'available' },
  swc: { status: 'experimental' },
};
const DEFAULT_FLOOR = { status: 'experimental' };

// Per-column secondary-status overlay filenames. Figma's is qualified ("secondary")
// because its roster already lives in component-status.json; rsp/swc keep the plain
// <impl>-status.json since their roster is components.json.
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

/** Resolves the canonical name for an SWC tag, letting the alias map override. */
export function canonicalNameForSwc(tag, aliases = {}) {
  return Object.hasOwn(aliases, tag) ? aliases[tag] : swcTagToPascal(tag);
}

/**
 * Resolves the canonical name for an RSP export, letting the alias map override.
 */
export function canonicalNameForRsp(name, aliases = {}) {
  return Object.hasOwn(aliases, name) ? aliases[name] : name;
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
  const add = (canonical, id, sourceKey) => {
    const entry = byName.get(canonical) ?? { name: canonical, sources: {} };
    entry.sources[id] = sourceKey;
    byName.set(canonical, entry);
  };

  for (const name of rspNames) { add(canonicalNameForRsp(name, aliases.rsp), 'rsp', name); }
  for (const tag of swcTags) { add(canonicalNameForSwc(tag, aliases.swc), 'swc', tag); }
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
 * keyed name → platform → implementation and may set `context` and a `note` provenance
 * field. Redundant, unknown-component, unknown-implementation, and unknown-status
 * overrides are warned about but do not abort the build.
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
        if (current.status === override.status
          && (current.context ?? null) === (override.context ?? null)) {
          warnings.push(`redundant override for "${name}" ${platform}/${impl} (already ${override.status})`);
        }

        // Preserve any secondary guidance already layered onto the cell.
        const next = { status: override.status };
        if (override.context) { next.context = override.context; }
        if (current.secondary) { next.secondary = current.secondary; }
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
  const components = roster.map(({ name, sources }) => {
    const web = {};
    for (const { id } of columns) {
      const sourceName = sources[id];
      if (!sourceName) {
        // This source does not ship the component.
        web[id] = { status: 'not-available' };
        continue;
      }
      const resolved = toIndexStatus(id, readData(id, sourceName));
      web[id] = resolved.status === 'not-available'
        ? { ...(PRESENT_FLOOR[id] ?? DEFAULT_FLOOR) }
        : resolved;
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
  const swcComponents = readJson(join(__dirname, 'swc', 'components.json'), []);
  const figmaRoster = readJson(join(__dirname, 'figma', 'component-status.json'), []);
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
  const joined = joinRosters(Object.keys(rspComponents), swcComponents, figmaNames, aliases);
  const roster = filterRoster(joined, excludes);

  // Fail-closed guard: an empty roster means an upstream extraction produced nothing.
  // Refuse to overwrite a good index with an empty one (see deps/REMOVED-DETECTION.md).
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

  for (const warning of warnings) {
    console.warn(`warning: ${warning}`);
  }

  writeFileSync(OUTPUT_FILE, `${JSON.stringify(index, null, 2)}\n`);
  console.log(`Wrote ${index.components.length} component(s) to ${OUTPUT_FILE}`);
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  main();
}
