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
import { NONE_OPTION } from '../../deps/shared/playground/none-option.js';
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

// Splits a comma-separated sheet cell into trimmed, non-empty entries.
function splitCell(value) {
  return String(value ?? '').split(',').map((part) => part.trim()).filter(Boolean);
}

/**
 * The authored property names for a component on this implementation's page.
 *
 * A component may be authored once for every implementation that shares a property
 * list, or split into one row per implementation where they diverge (Badge has
 * `fillStyle` on RSP but not SWC). The optional "implementation" column holds a
 * comma-separated list; a row without one serves every implementation, so existing
 * rows keep working unqualified.
 *
 * A qualified row wins over an unqualified one. Anything the author cannot have
 * meant — no row at all, or two rows claiming the same implementation — warns
 * rather than silently picking, since a dropped property looks identical to one
 * that was never authored.
 */
export function getComponentProperties(name, implementation, componentsSheet, onSkip) {
  const normalized = name.trim().toLowerCase();
  const rows = componentsSheet.filter((r) => r.component?.trim().toLowerCase() === normalized);
  if (!rows.length) {
    onSkip?.(`No row in the components sheet for "${name}", so no controls can be built.`);
    return [];
  }

  const target = implementation?.trim().toLowerCase();
  const qualified = rows.filter((r) => splitCell(r.implementation)
    .some((entry) => entry.toLowerCase() === target));
  const unqualified = rows.filter((r) => !splitCell(r.implementation).length);
  const candidates = qualified.length ? qualified : unqualified;

  if (!candidates.length) {
    onSkip?.(`The components sheet has rows for "${name}" but none covering "${implementation}", so no controls can be built.`);
    return [];
  }
  if (candidates.length > 1) {
    onSkip?.(`The components sheet has more than one row for "${name}" covering "${implementation}" — using the first.`);
  }

  return splitCell(candidates[0].properties);
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

// Parses a TS union type string into its values, e.g. `"a" | "b"` -> ['a', 'b'].
// Empty for non-union types like "boolean"/"ReactNode". Both extractors render types
// through the TypeScript checker, which double-quotes literals; single quotes are
// accepted too so a hand-written type string still parses.
//
// Each catalog row also carries a structured `values` array (deps/shared/prop-contract.js),
// which this function exists to stand in for until the control layer reads it directly.
export function parsePickerOptions(typeString) {
  if (!typeString) { return []; }
  const stringMatches = typeString.match(/'([^']+)'|"([^"]+)"/g);
  if (stringMatches) { return stringMatches.map((m) => m.slice(1, -1)); }

  // A handful of size-like props (e.g. AvatarGroup.size) are a union of bare numeric
  // literals with an open-ended `(number & {})` tail — a TS trick that keeps autocomplete
  // while still allowing an arbitrary number. Pull out just the literal numbers; the
  // open-ended tail has no fixed value to offer a picker, so it's dropped, not matched.
  return typeString
    .split('|')
    .map((part) => part.trim())
    .filter((part) => /^-?\d+(\.\d+)?$/.test(part));
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

// Picker options come from the page's own implementation, never the other one. The
// two genuinely disagree — RSP's Button offers "premium"/"genai" where SWC's does
// not — so borrowing would offer values the previewed component rejects. Both
// extractors resolve real unions into their own catalogs, so neither side needs to.
export function resolvePickerOptions(property, implementation, rspProps, swcProps) {
  if (implementation !== 'swc') {
    const rspRow = findRspProp(property, rspProps);
    if (rspRow?.type) {
      const options = parsePickerOptions(rspRow.type);
      if (options.length) { return options; }
      if (rspRow.type === 'boolean') { return ['no', 'yes']; }
    }
  }

  const swcRow = findSwcProp(property, swcProps);
  if (swcRow?.type === 'boolean') { return ['no', 'yes']; }
  if (implementation === 'swc' && swcRow?.type) {
    const options = parsePickerOptions(swcRow.type);
    if (options.length) { return options; }
  }

  return [];
}

// Control types that take a freeform value instead of a fixed option list
// (rendered as `se-input`), so they don't need resolvePickerOptions to
// resolve anything before they can render.
export const FREEFORM_CONTROLS = new Set(['textfield', 'slider']);

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
  // An optional attribute can be absent, so its control needs an explicit "unset"
  // choice. `optional` comes from the extractor; staticColor is named here only
  // because RSP's extractor does not emit it yet.
  const needsNoneOption = swcRow?.optional || property === 'staticColor';

  // Any other implementation (e.g. ios/android) skips this gate entirely.
  const existsByImplementation = { rsp: existsInRsp, swc: existsInSwc };
  const exists = existsByImplementation[implementation];
  if (implementation in existsByImplementation && !exists && !isSlotProperty) {
    onSkip?.(`No control shown for "${property}": it isn't defined in the ${implementation.toUpperCase()} data for this component.`);
    return null;
  }

  // NO_ICON leads the list (so it's the default). A controls-sheet row may
  // curate its own icon subset; otherwise falls back to ICON_OPTIONS.
  // NONE_OPTION leads the same way
  let options;
  if (isIcon) {
    options = [NO_ICON, ...(controlEntry?.options?.length ? controlEntry.options : ICON_OPTIONS)];
  } else if (needsNoneOption) {
    options = [NONE_OPTION, ...resolvePickerOptions(property, implementation, rspProps, swcProps)];
  } else {
    // A type that still fails to resolve to a real union (rare — e.g. a generic or
    // interface type resolvePickerOptions genuinely can't turn into options) falls
    // back to the controls sheet's own curated options, same fallback role they
    // play for "icon" above.
    const derived = resolvePickerOptions(property, implementation, rspProps, swcProps);
    options = derived.length ? derived : (controlEntry?.options ?? []);
  }
  const attribute = isIcon ? null : (swcRow?.attribute ?? null);

  if (!options.length && !FREEFORM_CONTROLS.has(controlType)) {
    if (isIcon) {
      onSkip?.(`No control shown for "${property}": no icon options are configured (empty ICON_OPTIONS catalog and no options in the controls sheet).`);
    } else {
      const type = (implementation === 'swc' ? swcRow?.type ?? rspRow?.type : rspRow?.type ?? swcRow?.type) ?? 'unknown';
      onSkip?.(`No control shown for "${property}": its type ("${type}") isn't a boolean or a list of options, so there's nothing to build a picker from.`);
    }
  }

  return { controlType, options, attribute };
}
