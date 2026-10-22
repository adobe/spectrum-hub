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
 * `deps/impl-component-names.js`, a tiny per-implementation slug → { docs, export }
 * lookup statically imported (no fetch) by scripts/utils/go-to-impl.js and the playground.
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
  readFileSync, writeFileSync, existsSync, mkdirSync, readdirSync, unlinkSync,
} from 'fs';
import { join, dirname, basename } from 'path';
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
// Keyed by platform, because an exclusion drops a canonical name from every source at
// once and the platforms disagree about what counts as a standalone component:
// `ToggleButton` is a web composition part but a first-class mobile component.
const EXCLUDES_FILE = join(__dirname, 'roster-excludes.json');
// Documented, but not components in their own right. Unlike the excludes list these stay
// in the roster and the index, carrying `listed: false`; the status table filters on it.
const UNLISTED_FILE = join(__dirname, 'roster-unlisted.json');
const IMPL_COMPONENT_NAMES_FILE = join(__dirname, 'impl-component-names.js');

// The platform a build run describes. Every function below takes it as an argument;
// this is only the fallback for a caller that passes none.
const DEFAULT_PLATFORM = 'web';

// The status table's web columns, in display order. Figma is a design source; its label
// lives here (not in the shared code-implementation registry). RSP/SWC labels are sourced
// from that registry so the two never drift.
export const WEB_COLUMNS = [
  { id: 'figma', label: 'Figma' },
  { id: 'rsp', label: getImplementationById('rsp').label },
  { id: 'swc', label: getImplementationById('swc').label },
];

// The native mobile columns. There is no Figma column: a mobile component available in
// code is available in the design library and the catalog apps too, so design fidelity
// rides on the single platform status rather than a column of its own. ios/android are
// deliberately absent from scripts/utils/implementations.js — that registry is read by
// every surface that lists web implementations — so these labels live here.
export const MOBILE_COLUMNS = [
  { id: 'ios', label: 'iOS' },
  { id: 'android', label: 'Android' },
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

/**
 * The per-platform knobs of a build run, so onboarding a platform is a config entry
 * rather than a second copy of this file. Everything below the roster join — the status
 * resolution, the overlay and override pipelines, the slice writer — is platform-agnostic
 * and takes these as arguments.
 *
 * The outputs are shared, not per-platform: one combined `status-index.json` and one
 * `deps/status/<slug>.json` per component carrying every platform it ships on. Only the
 * *inputs* vary by platform. `status-overrides.json` is shared too — it has always been
 * keyed `name → platform → impl`.
 *
 * `readRoster` is a function rather than a file path because each platform assembles its
 * roster differently: web unions three extracted sources with their own narrowing rules
 * (SWC drops `patterns/` members and internals, Figma folds its overlay into membership),
 * while mobile reads authored files that state every row outright.
 *
 * Key order matters — it is the platform order mergePlatformIndexes folds in, and the
 * first platform to produce a row supplies that row's label.
 */
export const PLATFORM_CONFIG = {
  web: {
    columns: WEB_COLUMNS,
    presentFloor: PRESENT_FLOOR,
    overlayFiles: OVERLAY_FILES,
    readRoster: (...args) => readWebRoster(...args),
  },
  mobile: {
    columns: MOBILE_COLUMNS,
    // Presence is the signal, as it is for SWC: a platform that lists a component ships
    // it, so a catalog with no maturity signal floors to Available rather than vanishing.
    presentFloor: { ios: { status: 'available' }, android: { status: 'available' } },
    overlayFiles: {
      ios: 'ios-secondary-status.json',
      android: 'android-secondary-status.json',
    },
    readRoster: (...args) => readMobileRoster(...args),
  },
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
 * Picks a component's display label. An explicit label on the roster entry always wins:
 * a source whose roster is display-name-first (the mobile platforms) derives its canonical
 * key *from* the display name, and that direction is lossy — `Floating action button
 * (FAB)` normalizes to `FloatingActionButtonFAB`, which de-PascalCases back to `Floating
 * Action Button FAB` with the parentheses gone for good. Such a roster carries the name it
 * was authored with instead of having it reconstructed.
 *
 * Otherwise: RSP/SWC rows de-PascalCase their canonical key (which *is* the code
 * identifier, so the derivation is sound), and Figma-only rows keep the designed display
 * name, title-cased.
 *
 * @param {string} canonical
 * @param {{ rsp?: string, swc?: string, figma?: string }} sources
 * @param {string} [label] - The roster entry's own display name, when it has one.
 * @returns {string}
 */
function displayLabel(canonical, sources, label) {
  if (label) { return label; }
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
 * Joins rosters shaped `{ <name>: <module subpath> }` — the same name-to-locator form
 * `deps/swc/components.json` uses, one file per source. Membership is presence, as
 * everywhere else: a source that lists a component ships it.
 *
 * The key is the name that source calls the component, which for the mobile platforms is
 * a display name. Normalizing it to a canonical key is lossy (`Floating action button
 * (FAB)` collapses to `FloatingActionButtonFAB`), so each row keeps the key as its
 * `label` rather than having the name reconstructed from it — see displayLabel.
 *
 * @param {Record<string, Record<string, string>>} rosters - source id → name → subpath.
 * @param {Record<string, object>} [aliases] - per-source alias maps.
 * @returns {{ name: string, label: string, sources: Record<string, string> }[]}
 */
export function joinNamedRosters(rosters, aliases = {}) {
  const byName = new Map();

  for (const [id, entries] of Object.entries(rosters)) {
    for (const name of Object.keys(entries ?? {})) {
      const canonical = canonicalNameForFigma(name, aliases[id]);
      // First source in config order supplies the label when two platforms spell the
      // same component differently (`Icon button` vs `Icon Button`).
      const entry = byName.get(canonical) ?? { name: canonical, label: name, sources: {} };
      entry.sources[id] = name;
      byName.set(canonical, entry);
    }
  }

  return [...byName.values()].sort((a, b) => a.name.localeCompare(b.name));
}

const isPlainObject = (value) => typeof value === 'object' && value !== null && !Array.isArray(value);

const CONFIG_SHAPES = {
  object: isPlainObject,
  array: Array.isArray,
  'object-of-arrays': (value) => isPlainObject(value) && Object.values(value).every(Array.isArray),
  'object-of-objects': (value) => isPlainObject(value) && Object.values(value).every(isPlainObject),
};

/**
 * Asserts a configuration file parsed to the shape the build expects, returning it.
 *
 * Configuration decides what the whole index contains, so a malformed file must stop the
 * build rather than degrade quietly. The failure this guards against already happened
 * once: `roster-excludes.json` was still a flat array while the builder indexed it by
 * platform, so `excludes.web` was `undefined`, every exclusion was dropped, and the run
 * published ~60 composition parts as table rows. Nothing caught it — the fail-closed
 * empty-roster guard only fires when a roster is emptier than expected, never fuller.
 *
 * Per-component catalogs keep the opposite behaviour (see readJson): one unreadable
 * catalog should cost that component its maturity label, not the whole build.
 *
 * @param {string} name - The file name, for the error message.
 * @param {unknown} value - The parsed contents.
 * @param {keyof CONFIG_SHAPES} shape
 * @returns {unknown} `value`, when it matches.
 */
export function validateConfigShape(name, value, shape) {
  if (CONFIG_SHAPES[shape](value)) { return value; }
  const actual = Array.isArray(value) ? 'an array' : `${value === null ? 'null' : typeof value}`;
  throw new Error(
    `${name}: expected ${shape}, got ${actual}. `
    + 'A malformed config file silently empties the roster rules it carries, so the build stops here.',
  );
}

/**
 * Flags roster entries that are documented but are not components in their own right —
 * composition parts like `AccordionItem` or `TableHeader`.
 *
 * They stay in the roster, so their extracted catalogs still reach `deps/status/<slug>.json`
 * and a page can show their properties. The flag rides into the index, and the status
 * table filters on it. This is the difference from `deps/roster-excludes.json`, which
 * removes a name outright and discards its data with it.
 *
 * @param {{ name: string }[]} roster
 * @param {string[]} unlisted - Canonical names to flag.
 * @returns {{ name: string, listed?: false }[]}
 */
export function markUnlisted(roster, unlisted = []) {
  const names = new Set(unlisted);
  return roster.map((entry) => (names.has(entry.name) ? { ...entry, listed: false } : entry));
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
 * Overlay entries are authored as display names, so each one normalizes through
 * `canonicalNameForFigma` (the display-name normalizer, despite the name) using **that
 * source's own alias map** — never one shared map, which would let a Figma rename silently
 * rewrite an iOS entry. Note the key space differs per source: `aliases.figma` and the
 * mobile maps are display-name keyed, while `aliases.rsp`/`aliases.swc` are keyed by
 * export name and tag. No committed rsp/swc overlay entry needs an alias today; one that
 * does must be authored under the display name it is written with here.
 *
 * @param {{ id: string }[]} columns
 * @param {(impl: string) => { name: string, context: string }[] | null} readOverlay
 * @param {Record<string, object>} aliases - Per-source alias maps.
 * @returns {Record<string, Record<string, string>>} impl id → canonical name → guidance.
 */
export function readSecondaries(columns, readOverlay, aliases = {}) {
  const secondaries = {};
  for (const { id } of columns) {
    const entries = readOverlay(id);
    if (!entries) { continue; }
    const byCanonical = {};
    for (const { name, context } of entries) {
      byCanonical[canonicalNameForFigma(name, aliases[id])] = context;
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
 * @param {string} [platform]
 * @returns {string[]} warnings
 */
export function applySecondaries(components, secondaries = {}, platform = DEFAULT_PLATFORM) {
  const warnings = [];
  const byName = new Map(components.map((component) => [component.name, component]));

  for (const [impl, byCanonical] of Object.entries(secondaries)) {
    for (const [canonical, context] of Object.entries(byCanonical)) {
      const cell = byName.get(canonical)?.platforms?.[platform]?.[impl];
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
export function applyOverrides(components, overrides = {}, platform = DEFAULT_PLATFORM) {
  const warnings = [];
  const byName = new Map(components.map((component) => [component.name, component]));

  for (const [name, platforms] of Object.entries(overrides)) {
    // One shared, platform-keyed file serves every platform, so most entries say nothing
    // about the one being built. That is the normal case, not a mistake worth warning on.
    const impls = platforms[platform];
    if (impls) {
      const component = byName.get(name);
      if (!component) {
        warnings.push(`override for unknown component "${name}"`);
        continue;
      }

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
 * @param {string} [args.platform] - The platform key the output is filed under.
 * @param {Record<string, { status: string }> | null} [args.presentFloor] - Per-source floor
 *   for a component a source ships but yields no maturity signal for. Pass `null` for a
 *   platform whose rosters state every status outright (the authored mobile ones) — there
 *   flooring would overwrite a deliberate Not available with Available purely because the
 *   component appears in the file.
 * @param {object} [args.overrides]
 * @param {Record<string, Record<string, string>>} [args.secondaries]
 * @returns {{ index: object, warnings: string[] }}
 */
export function buildIndex({
  roster,
  readData,
  columns = WEB_COLUMNS,
  platform = DEFAULT_PLATFORM,
  presentFloor = PRESENT_FLOOR,
  overrides = {},
  secondaries = {},
}) {
  const components = roster.map(({
    name, label, listed, sources, upstreamNames = {},
  }) => {
    const cells = {};
    for (const { id } of columns) {
      const sourceName = sources[id];
      if (!sourceName) {
        // This source does not ship the component.
        cells[id] = { status: 'not-available' };
        continue;
      }
      const resolved = toIndexStatus(id, readData(id, sourceName));
      const cell = (presentFloor && resolved.status === 'not-available')
        ? { ...(presentFloor[id] ?? DEFAULT_FLOOR) }
        : resolved;
      // What this source's own public docs site calls the component, when that differs
      // from the canonical name — react-spectrum.adobe.com has no `ActionGroup.html`, only
      // `ActionButtonGroup.html`. Set only when the alias entry says so explicitly: a
      // rename's direction isn't inferable, since some canonical names are themselves the
      // real upstream name.
      if (upstreamNames[id]) { cell.upstreamName = upstreamNames[id]; }
      cells[id] = cell;
    }
    const component = {
      name,
      label: displayLabel(name, sources, label),
      platforms: { [platform]: cells },
    };
    // Only ever emitted when false, so a listed component stays the clean common case.
    if (listed === false) { component.listed = false; }
    return component;
  });

  const secondaryWarnings = applySecondaries(components, secondaries, platform);
  const { warnings: overrideWarnings } = applyOverrides(components, overrides, platform);

  const index = {
    statuses: statusLegend(),
    implementations: { [platform]: columns },
    components,
  };
  return { index, warnings: [...secondaryWarnings, ...overrideWarnings] };
}

/**
 * Folds each platform's build into the one index every surface reads.
 *
 * A component both platforms ship becomes a single row carrying both keys under
 * `platforms` — the shape this index was designed around. A component only one platform
 * ships keeps only that platform's key, which is how a reader tells "this table has no
 * row for it" from "this cell is Not available": the status table renders only the
 * components that declare its platform.
 *
 * One row carries one label, so where the platforms disagree the first build wins (web is
 * built first). They disagree when a canonical name is derived from a code identifier on
 * one side and authored on the other — `Text Field` vs `Text field`.
 *
 * @param {{ platform: string, index: object }[]} builds - in platform order.
 * @returns {object} the combined index.
 */
export function mergePlatformIndexes(builds) {
  const implementations = {};
  const byName = new Map();

  for (const { platform, index } of builds) {
    implementations[platform] = index.implementations[platform];
    for (const component of index.components) {
      const existing = byName.get(component.name);
      if (existing) {
        Object.assign(existing.platforms, component.platforms);
      } else {
        byName.set(component.name, { ...component, platforms: { ...component.platforms } });
      }
    }
  }

  return {
    statuses: statusLegend(),
    implementations,
    components: [...byName.values()].sort((a, b) => a.name.localeCompare(b.name)),
  };
}

/**
 * Folds each platform's slices into one file per component slug.
 *
 * The slug is the natural key across platforms — `/web/rsp/components/button` and
 * `/mobile/components/button` are both Button — so one `deps/status/button.json` carries
 * every platform's cells and each component page reads the key it cares about. Collisions
 * *within* a platform are already resolved (and warned about) by writeComponentSlices
 * before this sees them; merging across platforms is the intended outcome, not a clash.
 *
 * @param {{ slug: string, data: object, shared: boolean }[][]} sliceSets - in platform order.
 * @returns {{ slug: string, data: object, shared: boolean }[]}
 */
export function mergeSlices(sliceSets) {
  const bySlug = new Map();

  for (const slices of sliceSets) {
    for (const { slug, data, shared } of slices) {
      const existing = bySlug.get(slug);
      if (existing) {
        Object.assign(existing.data, data);
        existing.shared = existing.shared || shared;
      } else {
        bySlug.set(slug, { slug, data: { ...data }, shared });
      }
    }
  }

  return [...bySlug.values()];
}

/** The first `page` override found on any of a component's cells, or null. */
function sharedPageSlug(component, platform = DEFAULT_PLATFORM) {
  const cells = component.platforms?.[platform] ?? {};
  const cell = Object.values(cells).find((c) => c?.page);
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
export function buildComponentSlices(
  roster,
  components,
  figmaRoster,
  platform = DEFAULT_PLATFORM,
) {
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
    const pageSource = component.platforms[platform]?.figma?.figmaPageSource;
    const figmaSourceName = pageSource ?? sources.figma;
    const figmaPageId = figmaSourceName ? figmaPageIdByName.get(figmaSourceName) : undefined;
    if (pageSource && !figmaPageId) {
      warnings.push(`figma figmaPageSource override for "${name}" targets unmatched Figma roster entry "${pageSource}"`);
    }
    const data = { [platform]: component.platforms[platform] };
    if (figmaPageId) { data.figmaPageId = figmaPageId; }
    const sharedSlug = sharedPageSlug(component, platform);
    return { slug: sharedSlug ?? toSlug(name), data, shared: Boolean(sharedSlug) };
  });

  return { slices, warnings };
}

/**
 * The names an implementation uses for a component, keyed by the exact slug a live URL
 * carries: `{ <impl>: { <slug>: { docs?, export? } } }`.
 *
 * Two fields, because they answer different questions and disagree for real components:
 *
 *   docs    which page the source's own docs site publishes it on. Many-to-one —
 *           AlertDialog, Dialog and FullscreenDialog all link to Dialog.html.
 *   export  what to import and render. One-to-one: FullscreenDialog is its own
 *           component even though its docs redirect to Dialog's page.
 *
 * They diverge today on `cards` (Card vs CardView), `radio-button` (RadioGroup vs Radio)
 * and `takeover-dialog` (Dialog vs FullscreenDialog). Collapsing them to a single value
 * has shipped a bug before, so keep both and read the one that answers your question.
 *
 * `docs` comes from each cell's `upstreamName` (buildIndex's auto-derived alias, or a
 * manual override — see applyOverrides), read off the already-computed slices so a `page`
 * override's shared slug is picked up for free. `export` comes from the roster, where an
 * entry exists only when the implementation's own name differs from the canonical one.
 *
 * Only RSP populates `export`: SWC renders by tag name, which deps/swc/components.json
 * already maps. Figma is excluded entirely — its redirect field is `figmaPageSource`
 * (selecting buildComponentSlices' figmaPageId lookup, see there), not a code
 * implementation anything looks up here.
 *
 * Written to `deps/impl-component-names.js` as a plain `export default {...}` module, not
 * JSON — this repo's ESLint parser target can't follow a JSON-with-import-attributes
 * module through its consumers' own imports, and a plain object literal needs no special
 * loading in the browser either. The whole table is a couple dozen entries at most, so a
 * static import avoids a per-page-load round trip for data that's usually empty for the
 * current page anyway.
 *
 * @param {{ slug: string, data: { web: object } }[]} slices
 * @param {{ name: string, sources: Record<string, string> }[]} roster
 * @returns {Record<string, Record<string, { docs?: string, export?: string }>>}
 */
export function buildImplComponentNames(slices, roster, platform = DEFAULT_PLATFORM) {
  const names = {};
  const put = (impl, slug, field, value) => {
    names[impl] = names[impl] ?? {};
    names[impl][slug] = names[impl][slug] ?? {};
    names[impl][slug][field] = value;
  };

  for (const { slug, data } of slices) {
    for (const [impl, cell] of Object.entries(data[platform] ?? {})) {
      if (!cell?.upstreamName || !getImplementationById(impl)) { continue; }
      put(impl, slug, 'docs', cell.upstreamName);
    }
  }

  for (const { name, sources } of roster) {
    if (sources.rsp && sources.rsp !== name) { put('rsp', toSlug(name), 'export', sources.rsp); }
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
export function dedupeSlices(slices) {
  const warnings = [];
  const seen = new Set();
  const kept = [];

  for (const slice of slices) {
    if (seen.has(slice.slug)) {
      if (!slice.shared) {
        warnings.push(`slug collision "${slice.slug}" — skipping duplicate component status file`);
      }
      continue;
    }
    seen.add(slice.slug);
    kept.push(slice);
  }

  return { slices: kept, warnings };
}

/**
 * Deletes slices that no longer have a component behind them, returning their slugs.
 *
 * The writer used to add and update but never delete, so a component leaving every
 * roster left its slice on disk indefinitely. Nothing reads a directory listing, so the
 * table stayed correct — but any page resolving to that slug was served stale data, and
 * a single run with a malformed config once stranded 64 files at once.
 *
 * Safe against a collapsed roster: buildPlatform exits the process when a platform's
 * roster comes back empty, so a run that would prune everything never reaches here.
 *
 * @param {{ slug: string }[]} slices - The slices this run wrote.
 * @param {string} [dir]
 * @returns {string[]} the slugs removed.
 */
export function pruneComponentSlices(slices, dir = SLICES_DIR) {
  if (!existsSync(dir)) { return []; }
  const keep = new Set(slices.map((slice) => slice.slug));
  const removed = [];

  for (const file of readdirSync(dir)) {
    if (!file.endsWith('.json')) { continue; }
    const slug = file.replace(/\.json$/, '');
    if (keep.has(slug)) { continue; }
    unlinkSync(join(dir, file));
    removed.push(slug);
  }

  return removed;
}

/** Writes one `deps/status/<slug>.json` per slice. Deduped and merged before it gets here. */
export function writeComponentSlices(slices, dir = SLICES_DIR) {
  mkdirSync(dir, { recursive: true });
  for (const { slug, data } of slices) {
    writeFileSync(join(dir, `${slug}.json`), `${JSON.stringify(data, null, 2)}\n`);
  }
  return slices.length;
}

/**
 * Reads and parses a JSON file, returning `fallback` when it is absent or unparseable.
 *
 * Tolerant on purpose: a half-written catalog is a normal state while a platform's
 * extraction is still being built, and it should cost that one component its maturity
 * signal — not take the whole index down and leave every surface reading a stale file.
 * The warning is the signal that something needs attention.
 */
function readJson(path, fallback) {
  if (!existsSync(path)) { return fallback; }
  try {
    return JSON.parse(readFileSync(path, 'utf8'));
  } catch (error) {
    console.warn(`warning: catalog unreadable, skipping — ${path}: ${error.message}`);
    return fallback;
  }
}

/**
 * Reads a configuration file, failing the build when it is absent, unparseable, or the
 * wrong shape. The opposite policy to readJson, and deliberately so: see
 * validateConfigShape for which failure this exists to catch.
 */
function readConfig(path, shape) {
  const name = basename(path);
  if (!existsSync(path)) {
    throw new Error(`${name}: configuration file is missing. The build cannot proceed without it.`);
  }
  let parsed;
  try {
    parsed = JSON.parse(readFileSync(path, 'utf8'));
  } catch (error) {
    throw new Error(`${name}: ${error.message}. A malformed config file would silently empty the roster rules it carries.`);
  }
  return validateConfigShape(name, parsed, shape);
}

/** Reads a component's raw extraction file for a source, or null when absent/unparseable. */
function readExtraction(source, name) {
  return readJson(join(__dirname, source, 'data', `${name}.json`), null);
}

/**
 * Assembles the web roster: the union of the RSP, SWC, and Figma rosters, narrowed and
 * joined onto canonical names. Each platform needs its own version of this — the sources,
 * their shapes, and their narrowing rules are all platform-specific — which is why it is
 * a function here rather than an entry in PLATFORM_CONFIG.
 */
function readWebRoster(config, aliases, excludes) {
  const rspComponents = readConfig(join(__dirname, 'rsp', 'components.json'), 'object');
  // swc/components.json maps bare name -> module subpath; the roster is its keys as tags.
  const swcComponents = readConfig(join(__dirname, 'swc', 'components.json'), 'object');
  const figmaRoster = readConfig(join(__dirname, 'figma', 'components.json'), 'array');
  // The secondary overlay lists Figma designs that carry redirect guidance; some are not
  // in the roster export but still exist in the library, so they count toward membership.
  const figmaOverlay = readJson(join(__dirname, 'figma', config.overlayFiles.figma), []);

  const figmaNames = [...new Set([
    ...figmaRoster.map((component) => component.name),
    ...figmaOverlay.map((entry) => entry.name),
  ])];
  const swcTags = excludeInternalSwc(
    standaloneSwcTags(swcComponents),
    (tag) => readExtraction('swc', tag),
  );
  const joined = joinRosters(Object.keys(rspComponents), swcTags, figmaNames, aliases);
  return {
    roster: filterRoster(joined, excludes),
    figmaRoster,
    readData: readExtraction,
  };
}

/**
 * Assembles the mobile roster from one `deps/<platform>/components.json` per platform,
 * each mapping the name that platform uses to the component's module subpath.
 *
 * The catalog that supplies a component's status lives at `deps/<platform>/data/<X>.json`,
 * where `X` is the subpath's last segment — the component's own PascalCase name. Keeping
 * the file named after the module rather than the roster key is what lets a display-name
 * key like `Pop-up button` sit beside a `PopUpButton.json` catalog, and it is the name a
 * future extractor would write anyway.
 */
function readMobileRoster(config, aliases, excludes) {
  const rosters = Object.fromEntries(config.columns.map(({ id }) => [
    id,
    readConfig(join(__dirname, id, 'components.json'), 'object'),
  ]));

  const joined = joinNamedRosters(rosters, aliases);
  return {
    roster: filterRoster(joined, excludes),
    figmaRoster: [],
    readData: (source, name) => {
      const subpath = rosters[source]?.[name];
      return subpath ? readExtraction(source, basename(subpath)) : null;
    },
  };
}

/**
 * Resolves one platform's roster and builds its slice of the index. Writes nothing —
 * every output is shared across platforms, so writing happens once in `main`.
 *
 * @param {string} platform
 * @param {object} config - That platform's PLATFORM_CONFIG entry.
 * @param {{ aliases: object, overrides: object, excludes: string[] }} inputs
 */
function buildPlatform(platform, config, {
  aliases, overrides, excludes, unlisted,
}) {
  const { roster: joined, figmaRoster, readData } = config.readRoster(config, aliases, excludes);
  const roster = markUnlisted(joined, unlisted);

  // Fail-closed guard: an empty roster means an upstream extraction produced nothing.
  // Refuse to overwrite a good index with an empty one (see deps/docs/REMOVED-DETECTION.md).
  if (!roster.length) {
    console.error(`Refusing to write an empty status index — the ${platform} roster is empty.`);
    process.exit(1);
  }

  const secondaries = readSecondaries(
    config.columns,
    (impl) => readJson(join(__dirname, impl, config.overlayFiles[impl]), null),
    aliases,
  );

  const { index, warnings } = buildIndex({
    roster,
    readData,
    columns: config.columns,
    platform,
    presentFloor: config.presentFloor,
    overrides,
    secondaries,
  });

  const built = buildComponentSlices(roster, index.components, figmaRoster, platform);
  const deduped = dedupeSlices(built.slices);

  return {
    platform,
    roster,
    index,
    slices: deduped.slices,
    warnings: [...warnings, ...built.warnings, ...deduped.warnings],
  };
}

function main() {
  const aliases = readConfig(ALIASES_FILE, 'object-of-objects');
  const overrides = readConfig(OVERRIDES_FILE, 'object-of-objects');
  const excludes = readConfig(EXCLUDES_FILE, 'object-of-arrays');
  const unlisted = readConfig(UNLISTED_FILE, 'object-of-arrays');

  const builds = Object.entries(PLATFORM_CONFIG).map(([platform, config]) => buildPlatform(
    platform,
    config,
    {
      aliases,
      overrides,
      excludes: excludes[platform] ?? [],
      unlisted: unlisted[platform] ?? [],
    },
  ));

  const index = mergePlatformIndexes(builds);
  writeFileSync(OUTPUT_FILE, `${JSON.stringify(index, null, 2)}\n`);
  console.log(`Wrote ${index.components.length} component(s) to ${OUTPUT_FILE}`);

  // One slice per component slug, carrying every platform that ships it — the slug is the
  // key both /web/<impl>/components/<slug> and /mobile/components/<slug> share, so a
  // component page reads whichever platform key it cares about from one small fetch.
  const slices = mergeSlices(builds.map((build) => build.slices));
  console.log(`Wrote ${writeComponentSlices(slices)} component status slice(s) to ${SLICES_DIR}`);

  // A component that leaves every roster takes its slice with it. Without this the file
  // lingers and any page resolving to that slug is served data no build produced.
  const removed = pruneComponentSlices(slices);
  if (removed.length) {
    console.log(`Removed ${removed.length} obsolete slice(s): ${removed.join(', ')}`);
  }

  // Web-only by construction: buildImplComponentNames skips any column that is not a
  // registered web implementation, so feeding it other platforms would add nothing.
  const web = builds.find((build) => build.platform === 'web');
  const implComponentNames = buildImplComponentNames(web.slices, web.roster, 'web');
  writeFileSync(IMPL_COMPONENT_NAMES_FILE, '// Generated by deps/build-status-index.js — do not edit by hand.\n'
    + `export default ${JSON.stringify(implComponentNames, null, 2)};\n`);
  const nameCount = Object.values(implComponentNames)
    .reduce((n, bySlug) => n + Object.keys(bySlug).length, 0);
  console.log(`Wrote ${nameCount} component name entr${nameCount === 1 ? 'y' : 'ies'} to ${IMPL_COMPONENT_NAMES_FILE}`);

  for (const build of builds) {
    for (const warning of build.warnings) {
      console.warn(`warning: ${build.platform}: ${warning}`);
    }
  }
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  try {
    main();
  } catch (error) {
    // Configuration failures are operator errors, not crashes — report them the way the
    // empty-roster guard does rather than as a stack trace in a CI log.
    console.error(`Error: ${error.message}`);
    process.exit(1);
  }
}
