/**
 * Data utilities for the component playground block.
 *
 * Fetches two tabs from an AEM spreadsheet workbook:
 *   - "components" tab: maps component names to their authored property lists
 *   - "controls"   tab: maps property names to UI control types (control),
 *     e.g. "textfield", "picker", "segmentedControl", "slider", "switch"
 *
 * Also resolves picker options from the per-component RSP / SWC JSON files
 * that live in deps/rsp/data/ and deps/swc/data/.
 */

import { ICON_OPTIONS, NO_ICON } from '../../deps/shared/playground/icon-options.js';
import { TEXT_KEYS } from '../../deps/shared/playground/text-keys.js';
import { capitalize } from '../../deps/rsp/playground/pascal-case.js';

// Re-exported so existing consumers (playground.js) keep importing it from
// here — text-keys.js is the shared definition, this is just the local name.
export { TEXT_KEYS };

// A page commonly renders more than one playground block — every one of them
// needs this same workbook (and often the same per-component prop-data/markup
// too, when a component appears in more than one block) — so in-flight/settled
// requests are shared by URL instead of every block re-issuing its own fetch.
// The cached value is a live network response, never mutated by any reader
// here, so sharing the same object/array reference across callers is safe.
const fetchCache = new Map();

export function cachedFetch(url, run) {
  if (!fetchCache.has(url)) {
    // A failed request isn't cached — an unrelated block retrying the same
    // URL later (e.g. after a transient network blip) should get a fresh try.
    fetchCache.set(url, run().catch((err) => {
      fetchCache.delete(url);
      throw err;
    }));
  }
  return fetchCache.get(url);
}

// Test-only: clears entries so each test starts from a clean cache instead of
// reusing another test's mocked response for the same URL.
export function clearFetchCache() {
  fetchCache.clear();
}

// Fetches one tab from an AEM JSON workbook, lowercasing column headers so
// downstream lookups are case-insensitive.
function fetchSheet(url, sheet) {
  const sheetUrl = `${url}?sheet=${sheet}`;
  return cachedFetch(sheetUrl, async () => {
    const resp = await fetch(sheetUrl);
    if (!resp.ok) { throw new Error(`Failed to fetch sheet "${sheet}" from ${url}: ${resp.status}`); }
    const { data } = await resp.json();
    return data.map((row) => Object.fromEntries(
      Object.entries(row).map(([k, v]) => [k.toLowerCase(), v]),
    ));
  });
}

// Fetches both playground tabs (components + controls) from the workbook.
export async function fetchPlaygroundSheets(url) {
  const [componentsSheet, controlsSheet] = await Promise.all([
    fetchSheet(url, 'components'),
    fetchSheet(url, 'controls'),
  ]);
  return { componentsSheet, controlsSheet };
}

// Returns the authored property names for a component (rows with
// "component"/"properties" columns), empty if none authored.
export function getComponentProperties(name, componentsSheet) {
  const normalized = name.trim().toLowerCase();
  const row = componentsSheet.find((r) => r.component?.trim().toLowerCase() === normalized);
  if (!row?.properties?.trim()) { return []; }
  return row.properties.split(',').map((p) => p.trim()).filter(Boolean);
}

// Builds a lookup map from property name to its control type + options (the
// optional comma-separated "options" column, e.g. a curated "icon" list).
export function buildControlsMap(controlsSheet) {
  return new Map(
    controlsSheet.map((row) => [
      row.property?.trim(),
      {
        control: row.control?.trim(),
        options: row.options ? row.options.split(',').map((o) => o.trim()).filter(Boolean) : [],
      },
    ]),
  );
}

// Parses a TS union type string into its values, e.g. "'a' | 'b'" -> ['a', 'b'].
// Empty for non-union types like "boolean"/"ReactNode".
export function parsePickerOptions(typeString) {
  if (!typeString) { return []; }
  const matches = typeString.match(/'([^']+)'/g);
  if (!matches) { return []; }
  return matches.map((m) => m.replace(/'/g, ''));
}

// Strips a leading is/has prefix and lowercases the next char, e.g.
// "isDisabled" -> "disabled". Unchanged when no prefix matches.
export function normalizePropertyName(name) {
  const match = name.match(/^(?:is|has)([A-Z].*)/);
  if (match) {
    return match[1].charAt(0).toLowerCase() + match[1].slice(1);
  }
  return name;
}

// Candidates in both directions of the is/has prefix convention (RSP <-> SWC),
// as-authored name first so exact matches win.
export function propertyNameCandidates(name) {
  const stripped = normalizePropertyName(name);
  if (stripped !== name) {
    return [name, stripped];
  }
  const capitalized = capitalize(name);
  return [name, `is${capitalized}`, `has${capitalized}`];
}

// Finds a prop row matching any cross-implementation candidate for `property`,
// preferring earlier candidates (exact match first).
function findPropByCandidates(property, props) {
  return propertyNameCandidates(property)
    .map((candidate) => props.find((p) => p.property === candidate))
    .find(Boolean);
}

// Finds a component's SWC prop row via cross-implementation name candidates
// (e.g. "isDisabled" -> "disabled").
export function findSwcProp(property, swcProps) {
  return findPropByCandidates(property, swcProps);
}

// Finds a component's RSP prop row via cross-implementation name candidates
// (e.g. the SWC-style "disabled" -> RSP "isDisabled").
export function findRspProp(property, rspProps) {
  return findPropByCandidates(property, rspProps);
}

// Resolves picker options for a property from RSP and SWC component data. RSP
// data has inline union types; SWC data has named types that aren't
// resolvable, so RSP is always tried first.
export function resolvePickerOptions(property, rspProps, swcProps) {
  const rspRow = findRspProp(property, rspProps);
  if (rspRow?.type) {
    const options = parsePickerOptions(rspRow.type);
    if (options.length) { return options; }
    if (rspRow.type === 'boolean') { return ['no', 'yes']; }
  }

  const swcRow = findSwcProp(property, swcProps);
  if (swcRow?.type === 'boolean') { return ['no', 'yes']; }

  return [];
}

// Control types that take a freeform value instead of a fixed option list
// (rendered as `se-input`), so they don't need resolvePickerOptions to
// resolve anything before they can render.
export const FREEFORM_CONTROLS = new Set(['textfield', 'slider']);

// Control types named in the "control" column that don't have a component
// built yet. Properties assigned one of these are skipped with a warning
// rather than silently falling back to a different control.
const UNIMPLEMENTED_CONTROLS = new Set([]);

export function resolveControl(property, implementation, controlsMap, rspProps, swcProps, onSkip) {
  const rspRow = findRspProp(property, rspProps);
  const existsInRsp = Boolean(rspRow);
  const swcRow = findSwcProp(property, swcProps);
  const existsInSwc = Boolean(swcRow);

  const controlEntry = controlsMap.get(property);
  const controlType = controlEntry?.control ?? 'picker';
  // "icon" is a slot property (like TEXT_KEYS), not a real attribute.
  const isIcon = property === 'icon';
  const isSlotProperty = TEXT_KEYS.has(property) || isIcon;

  // Any other implementation (e.g. ios/android) skips this gate entirely.
  const existsByImplementation = { rsp: existsInRsp, swc: existsInSwc };
  const exists = existsByImplementation[implementation];
  if (implementation in existsByImplementation && !exists && !isSlotProperty) {
    onSkip?.(`No control shown for "${property}": it isn't defined in the ${implementation.toUpperCase()} data for this component.`);
    return null;
  }

  if (UNIMPLEMENTED_CONTROLS.has(controlType)) {
    onSkip?.(`No control shown for "${property}": the "${controlType}" control isn't built yet.`);
    return null;
  }

  // NO_ICON leads the list (so it's the default). A controls-sheet row may
  // curate its own icon subset; otherwise falls back to ICON_OPTIONS.
  const options = isIcon
    ? [NO_ICON, ...(controlEntry?.options?.length ? controlEntry.options : ICON_OPTIONS)]
    : resolvePickerOptions(property, rspProps, swcProps);
  const attribute = isIcon ? null : (swcRow?.attribute ?? null);

  if (!options.length && !FREEFORM_CONTROLS.has(controlType)) {
    if (isIcon) {
      onSkip?.(`No control shown for "${property}": no icon options are configured (empty ICON_OPTIONS catalog and no options in the controls sheet).`);
    } else {
      const type = rspRow?.type ?? swcRow?.type ?? 'unknown';
      onSkip?.(`No control shown for "${property}": its type ("${type}") isn't a boolean or a list of options, so there's nothing to build a picker from.`);
    }
  }

  return { controlType, options, attribute };
}
