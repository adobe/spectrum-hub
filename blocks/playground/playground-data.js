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
import { NONE_OPTION, DEFAULT_OPTION } from '../../deps/shared/playground/unset-control-options.js';
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

// Strips a leading is/has prefix and lowercases the next char, e.g.
// "isDisabled" -> "disabled". Unchanged when no prefix matches.
export function normalizePropertyName(name) {
  const match = name.match(/^(?:is|has)([A-Z].*)/);
  if (match) {
    return match[1].charAt(0).toLowerCase() + match[1].slice(1);
  }
  return name;
}

// Candidates in both directions of the is/has prefix convention, as-authored first
// so an exact match wins.
export function propertyNameCandidates(name) {
  const stripped = normalizePropertyName(name);
  if (stripped !== name) {
    return [name, stripped];
  }
  const capitalized = capitalize(name);
  return [name, `is${capitalized}`, `has${capitalized}`];
}

/**
 * The catalog row for a workbook property name, from the page's own catalog — the
 * only one fetched (see fetchPlaygroundInputs).
 *
 * The candidate walk is the name bridge: the workbook is RSP-keyed ("isDisabled")
 * while SWC's catalog carries SWC's own spelling ("disabled"). It stays a runtime
 * walk only until SWC's extractor writes a canonical name onto each row; then this
 * becomes a plain lookup.
 */
export function findProp(property, propRows) {
  return propertyNameCandidates(property)
    .map((candidate) => propRows.find((row) => row.property === candidate))
    .find(Boolean);
}

/**
 * The options a control can offer, taken from the row's resolved `values` — real JSON
 * written at extraction by deps/shared/prop-contract.js. Nothing here parses a type
 * string: `values` is non-empty if and only if the row is an enum, so a row with no
 * fixed option set correctly yields none.
 *
 * A boolean is the one kind whose options are a convention rather than data — the
 * controls render yes/no, not true/false.
 */
export function resolvePickerOptions(property, propRows) {
  const row = findProp(property, propRows);
  if (!row) { return []; }
  if (row.kind === 'boolean') { return ['no', 'yes']; }
  return row.values ?? [];
}

// Implementations that ship a deps/<impl>/data catalog. ios/android are authored
// entirely from the workbook (images, no prop data), so a missing row there is
// normal rather than a resolution failure worth warning about.
export const CATALOG_IMPLEMENTATIONS = new Set(['rsp', 'swc']);

// Control types that take a freeform value instead of a fixed option list
// (rendered as `se-input`), so they don't need resolvePickerOptions to
// resolve anything before they can render.
export const FREEFORM_CONTROLS = new Set(['textfield', 'slider']);

// RSP props are optional by default, so optionality can't select these — they are named.
// `staticColor` is simply off when absent; a DERIVED property is one the component works
// out for itself, which is what "default" means to a reader of the S2 docs.
const NONE_PROPERTIES = new Set(['staticColor']);
const DERIVED_PROPERTIES = new Set(['xChannel', 'yChannel']);

function resolveUnsetOption(property, isOptional) {
  if (DERIVED_PROPERTIES.has(property)) { return DEFAULT_OPTION; }
  return isOptional || NONE_PROPERTIES.has(property) ? NONE_OPTION : null;
}

/**
 * A property whose first catalog value is not a safe starting one, because it is only
 * valid in combination with another property's own default.
 *
 * ColorSlider's `channel` is the case: required, and — unlike ColorArea's xChannel /
 * yChannel — not inferred, so it gets no unset choice; omitting it renders nothing.
 * Its catalog lists all eight channels across all three color spaces, `hue` first, but
 * `hue` is invalid in `rgb`, which is what colorSpace itself defaults to, so the
 * preview loaded blank. Measured live: rgb takes red/green/blue/alpha, hsl
 * hue/saturation/lightness/alpha, hsb hue/saturation/brightness/alpha — `alpha` is the
 * only channel valid in all three, so it stays valid however colorSpace is changed.
 *
 * This is a cross-property constraint, which is exactly what a per-prop catalog
 * `default` cannot express — so it wins over one. It does not stop a reader choosing
 * an invalid pair deliberately; only the colorSpace-aware option filtering would.
 */
const DEFAULT_OVERRIDES = { channel: 'alpha' };

export function resolveControl(property, implementation, controlsMap, propRows, onSkip) {
  const row = findProp(property, propRows);
  const controlEntry = controlsMap.get(property);
  const controlType = controlEntry?.control ?? 'picker';
  // "icon" is a slot property (like TEXT_KEYS), not a real attribute.
  const isIcon = property === 'icon';
  const isSlotProperty = TEXT_KEYS.has(property) || isIcon;
  // An optional attribute can be absent, so its control needs an explicit "unset"
  // choice. Only SWC's extractor emits `optional`: RSP's props are optional by
  // default (97% of them), so the flag carries no signal there and would put a
  // spurious "None" on nearly every control. The RSP properties below are named
  // explicitly for that reason — they are its genuine cases, not an oversight.
  //
  // DERIVED_PROPERTIES take "default" rather than "None" because the component works
  // one out when the prop is absent: ColorArea reads both channels from its value's
  // color space. Leaving the picker's first real option to lead instead sent
  // colorSpace="rgb" with xChannel="hue" and yChannel="hue" — the wrong space, and
  // the same axis twice — and ColorArea rendered nothing at all.
  const unsetOption = resolveUnsetOption(property, row?.optional);

  // Only an implementation with a catalog can be checked for a missing row.
  // ios/android have none, so they skip the gate rather than failing it.
  if (CATALOG_IMPLEMENTATIONS.has(implementation) && !row && !isSlotProperty) {
    onSkip?.(`No control shown for "${property}": it isn't defined in the ${implementation.toUpperCase()} data for this component.`);
    return null;
  }

  // NO_ICON and the unset sentinel both lead their list, so they land as the default.
  let options;
  if (isIcon) {
    // A controls-sheet row may curate its own icon subset; otherwise ICON_OPTIONS.
    options = [NO_ICON, ...(controlEntry?.options?.length ? controlEntry.options : ICON_OPTIONS)];
  } else if (unsetOption) {
    options = [unsetOption, ...resolvePickerOptions(property, propRows)];
  } else {
    // A row with no fixed option set (a generic, an interface, RSP's StylesProp)
    // falls back to the controls sheet's curated options — the same role the sheet
    // plays for "icon" above.
    const derived = resolvePickerOptions(property, propRows);
    options = derived.length ? derived : (controlEntry?.options ?? []);
  }
  // RSP props are not DOM attributes, so only SWC rows carry one.
  const attribute = isIcon ? null : (row?.attribute ?? null);

  if (!options.length && !FREEFORM_CONTROLS.has(controlType)) {
    if (isIcon) {
      onSkip?.(`No control shown for "${property}": no icon options are configured (empty ICON_OPTIONS catalog and no options in the controls sheet).`);
    } else {
      onSkip?.(`No control shown for "${property}": its type ("${row?.type ?? 'unknown'}") isn't a boolean or a list of options, so there's nothing to build a picker from.`);
    }
  }

  // Spread rather than always set, so a property with no override keeps the descriptor
  // shape it has always had instead of gaining an undefined key.
  const defaultOverride = DEFAULT_OVERRIDES[property];
  return {
    controlType, options, attribute, ...(defaultOverride && { defaultOverride }),
  };
}
