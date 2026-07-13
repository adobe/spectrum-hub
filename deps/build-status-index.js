/**
 * Builds the combined, build-time component status index.
 *
 * The daily GitHub Action runs this after the per-implementation extractions. It joins
 * the RSP and SWC rosters into canonical components, resolves each implementation's
 * unified status through the adapter, applies the manual override file last, and writes
 * a single `deps/status-index.json` that downstream surfaces bind to.
 *
 * Design guarantees:
 * - Columns are data-driven from the implementations registry, never hard-coded, so
 *   onboarding a new implementation is a data change (see scripts/utils/implementations.js).
 * - Raw implementation vocabulary never reaches the output; it is unified in the adapter
 *   (scripts/utils/status-model.js) via the data-shape bridge (component-status.js).
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
import { IMPLEMENTATIONS } from '../scripts/utils/implementations.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUTPUT_FILE = join(__dirname, 'status-index.json');
const ALIASES_FILE = join(__dirname, 'component-aliases.json');
const OVERRIDES_FILE = join(__dirname, 'status-overrides.json');
const EXCLUDES_FILE = join(__dirname, 'roster-excludes.json');

// The single platform surfaced today. New platforms are additive (see the memory /
// data-contract notes); each brings its own roster + implementations.
const PLATFORM = 'web';

// Roster membership is the presence signal: a component an implementation ships is never
// "Not available". When the extraction yields no maturity signal, the component is
// present but its status is inferred from what "no signal" means for that source — so the
// floor is per-implementation. "Not available" is reserved for the column whose
// implementation lacks the component entirely.
//
// - rsp: a component in the published types with no S2 doc page. It ships in stable S2, so
//   it floors to Available; the `Stable` context is omitted because no maturity was read.
// - swc: a CEM declaration with no `since` (the AI/chat cohort). Genuinely new, maturity
//   unconfirmed, so it floors to Experimental.
const PRESENT_FLOOR = {
  rsp: { status: 'available' },
  swc: { status: 'experimental' },
};
const DEFAULT_FLOOR = { status: 'experimental' };

/**
 * Converts an SWC custom-element tag to its canonical PascalCase name.
 * `swc-action-button` → `ActionButton`.
 *
 * @param {string} tag
 * @returns {string}
 */
export function swcTagToPascal(tag) {
  return tag
    .replace(/^swc-/, '')
    .split('-')
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join('');
}

/**
 * Resolves the canonical name for an SWC tag, letting the alias file override the
 * mechanical normalization for genuine mismatches.
 *
 * @param {string} tag
 * @param {Record<string, string>} aliases
 * @returns {string}
 */
export function canonicalNameForSwc(tag, aliases = {}) {
  return Object.hasOwn(aliases, tag) ? aliases[tag] : swcTagToPascal(tag);
}

/**
 * Joins the RSP and SWC rosters into a sorted list of canonical components. Each entry
 * carries a `sources` map of implementation id → the source key to read its data with.
 * Components present in only one implementation are legitimate single-impl rows.
 *
 * @param {string[]} rspNames - RSP PascalCase component names (allow-list keys).
 * @param {string[]} swcTags - SWC `swc-<kebab>` tags (allow list).
 * @param {Record<string, string>} aliases
 * @returns {{ name: string, sources: { rsp?: string, swc?: string } }[]}
 */
export function joinRosters(rspNames, swcTags, aliases = {}) {
  const byName = new Map();

  for (const name of rspNames) {
    byName.set(name, { name, sources: { rsp: name } });
  }

  for (const tag of swcTags) {
    const name = canonicalNameForSwc(tag, aliases);
    const existing = byName.get(name);
    if (existing) {
      existing.sources.swc = tag;
    } else {
      byName.set(name, { name, sources: { swc: tag } });
    }
  }

  return [...byName.values()].sort((a, b) => a.name.localeCompare(b.name));
}

/**
 * Drops composition parts (sub-components) from the joined roster by canonical name, so
 * a part is removed from every implementation at once (e.g. `AccordionItem` also drops
 * `swc-accordion-item`). The exclusion list is a reviewed, committed file
 * (deps/roster-excludes.json) — seeded from the RSP `components.json` `file` signal
 * (an entry declared inside another component's file) minus co-declared standalone
 * components — because that signal alone over-includes real components (e.g. TextArea).
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
 * Resolves one implementation's raw extraction data to its unified index status.
 * Absent data resolves to Not available. The Level 2 `context` is included only when
 * the adapter supplies one.
 *
 * @param {string} source - Implementation id (`rsp`, `swc`, ...).
 * @param {unknown} rawData - Raw extraction JSON, or null when the component has no file.
 * @returns {{ status: string, context?: string }}
 */
export function toIndexStatus(source, rawData) {
  const rawStatus = rawData == null ? null : getComponentStatus(rawData);
  const { status, context } = getUnifiedStatus(source, rawStatus);
  return context ? { status: status.id, context } : { status: status.id };
}

/**
 * Applies the manual override file last (override wins over auto-detected). Overrides
 * are keyed name → platform → implementation and may set `context` and a `note`
 * provenance field. Redundant, unknown-component, unknown-implementation, and
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
        if (current.status === override.status
          && (current.context ?? null) === (override.context ?? null)) {
          warnings.push(`redundant override for "${name}" ${platform}/${impl} (already ${override.status})`);
        }

        const next = { status: override.status };
        if (override.context) { next.context = override.context; }
        if (override.note) { next.note = override.note; }
        component.platforms[platform][impl] = next;
      }
    }
  }

  return { components, warnings };
}

/**
 * Builds the index object from an injected roster and data reader (pure — no file I/O).
 *
 * @param {object} args
 * @param {{ name: string, sources: Record<string, string> }[]} args.roster
 * @param {(source: string, name: string) => unknown} args.readData
 * @param {{ id: string, label: string }[]} [args.implementations]
 * @param {object} [args.overrides]
 * @returns {{ index: object, warnings: string[] }}
 */
export function buildIndex({ roster, readData, implementations = IMPLEMENTATIONS, overrides = {} }) {
  const components = roster.map(({ name, sources }) => {
    const web = {};
    for (const { id } of implementations) {
      const sourceName = sources[id];
      if (!sourceName) {
        // This implementation does not ship the component.
        web[id] = { status: 'not-available' };
        continue;
      }
      const resolved = toIndexStatus(id, readData(id, sourceName));
      web[id] = resolved.status === 'not-available'
        ? { ...(PRESENT_FLOOR[id] ?? DEFAULT_FLOOR) }
        : resolved;
    }
    return { name, platforms: { [PLATFORM]: web } };
  });

  const { warnings } = applyOverrides(components, overrides);

  const index = {
    implementations: { [PLATFORM]: implementations.map((impl) => impl.id) },
    components,
  };
  return { index, warnings };
}

/** Reads and parses a JSON file, returning `fallback` when it is absent. */
function readJson(path, fallback) {
  if (!existsSync(path)) { return fallback; }
  return JSON.parse(readFileSync(path, 'utf8'));
}

/** Reads a component's raw extraction file for an implementation, or null when absent. */
function readExtraction(source, name) {
  const path = join(__dirname, source, 'data', `${name}.json`);
  if (!existsSync(path)) { return null; }
  return JSON.parse(readFileSync(path, 'utf8'));
}

function main() {
  const rspComponents = readJson(join(__dirname, 'rsp', 'components.json'), {});
  const swcComponents = readJson(join(__dirname, 'swc', 'components.json'), []);
  const aliases = readJson(ALIASES_FILE, {});
  const overrides = readJson(OVERRIDES_FILE, {});
  const excludes = readJson(EXCLUDES_FILE, []);

  const joined = joinRosters(Object.keys(rspComponents), swcComponents, aliases);
  const roster = filterRoster(joined, excludes);

  // Fail-closed guard: an empty roster means an upstream extraction produced nothing.
  // Refuse to overwrite a good index with an empty one (see deps/REMOVED-DETECTION.md).
  if (!roster.length) {
    console.error('Refusing to write an empty status index — both rosters are empty.');
    process.exit(1);
  }

  const { index, warnings } = buildIndex({ roster, readData: readExtraction, overrides });

  for (const warning of warnings) {
    console.warn(`warning: ${warning}`);
  }

  writeFileSync(OUTPUT_FILE, `${JSON.stringify(index, null, 2)}\n`);
  console.log(`Wrote ${index.components.length} component(s) to ${OUTPUT_FILE}`);
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  main();
}
