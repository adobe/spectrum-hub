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

/**
 * Fetches a single sheet tab from an AEM JSON workbook.
 * @param {string} url Path to base spreadsheet JSON (without ?sheet=)
 * @param {string} sheet Tab name
 * @returns {Promise<object[]>} Row data array
 */
async function fetchSheet(url, sheet) {
  const resp = await fetch(`${url}?sheet=${sheet}`);
  if (!resp.ok) { throw new Error(`Failed to fetch sheet "${sheet}" from ${url}: ${resp.status}`); }
  const { data } = await resp.json();
  return data.map((row) => Object.fromEntries(
    Object.entries(row).map(([k, v]) => [k.toLowerCase(), v]),
  ));
}

/**
 * Fetches both playground tabs from the workbook and returns them as structured maps.
 * @param {string} url Spreadsheet URL
 * @returns {Promise<{ componentsSheet: object[], controlsSheet: object[] }>}
 */
export async function fetchPlaygroundSheets(url) {
  const [componentsSheet, controlsSheet] = await Promise.all([
    fetchSheet(url, 'components'),
    fetchSheet(url, 'controls'),
  ]);
  return { componentsSheet, controlsSheet };
}

/**
 * Returns the authored property names for a component.
 * Expects rows with "component" and "properties" columns.
 * @param {string} name Component name as authored (e.g. "Button")
 * @param {object[]} componentsSheet
 * @returns {string[]} Array of property names, empty if none authored
 */
export function getComponentProperties(name, componentsSheet) {
  const normalized = name.trim().toLowerCase();
  const row = componentsSheet.find((r) => r.component?.trim().toLowerCase() === normalized);
  if (!row?.properties?.trim()) { return []; }
  return row.properties.split(',').map((p) => p.trim()).filter(Boolean);
}

/**
 * Builds a lookup map from property name to its control types.
 * Expects rows with "property" and "control" columns. Property keys are
 * trimmed so lookups match the (already-trimmed) names from
 * getComponentProperties even if the sheet has stray whitespace.
 * @param {object[]} controlsSheet
 * @returns {Map<string, { control: string, v1plus: string }>}
 */
export function buildControlsMap(controlsSheet) {
  return new Map(
    controlsSheet.map((row) => [
      row.property?.trim(),
      { control: row.control?.trim() },
    ]),
  );
}

/**
 * Parses a TypeScript union type string into an array of string values.
 * e.g. "'primary' | 'secondary' | 'accent'" → ['primary', 'secondary', 'accent']
 * Returns an empty array for non-union types (e.g. "boolean", "ReactNode").
 * @param {string} typeString
 * @returns {string[]}
 */
export function parsePickerOptions(typeString) {
  if (!typeString) { return []; }
  const matches = typeString.match(/'([^']+)'/g);
  if (!matches) { return []; }
  return matches.map((m) => m.replace(/'/g, ''));
}

/**
 * Derives a candidate SWC property name from an RSP-style authored name.
 * Strips a leading `is` or `has` prefix and lowercases the first character.
 * e.g. "isDisabled" → "disabled", "isQuiet" → "quiet", "hasLabel" → "label"
 * Returns the original name unchanged if no prefix is found.
 * @param {string} name
 * @returns {string}
 */
export function normalizePropertyName(name) {
  const match = name.match(/^(?:is|has)([A-Z].*)/);
  if (match) {
    return match[1].charAt(0).toLowerCase() + match[1].slice(1);
  }
  return name;
}

/**
 * Generates the candidate property names to try when matching one
 * implementation's authored name against another's data, in BOTH directions of
 * the `is`/`has` boolean-prefix convention:
 *   - the name as-authored (always first, so exact matches win)
 *   - the prefix stripped, for an RSP-style name -> SWC (isDisabled -> disabled)
 *   - `is`/`has` prefixes added, for an SWC-style name -> RSP (disabled -> isDisabled)
 * Candidates that don't exist in the target data simply never match, so adding
 * both prefixes is harmless.
 * @param {string} name
 * @returns {string[]}
 */
export function propertyNameCandidates(name) {
  const stripped = normalizePropertyName(name);
  if (stripped !== name) {
    return [name, stripped];
  }
  const capitalized = name.charAt(0).toUpperCase() + name.slice(1);
  return [name, `is${capitalized}`, `has${capitalized}`];
}

/**
 * Finds a prop row whose name matches any of the cross-implementation
 * candidates for `property`, preferring earlier candidates (exact match first).
 * @param {string} property
 * @param {object[]} props
 * @returns {object | undefined}
 */
function findPropByCandidates(property, props) {
  return propertyNameCandidates(property)
    .map((candidate) => props.find((p) => p.property === candidate))
    .find(Boolean);
}

/**
 * Finds a component's SWC prop row by matching cross-implementation name
 * candidates (e.g. "isDisabled" -> "disabled").
 * @param {string} property
 * @param {object[]} swcProps
 * @returns {object | undefined}
 */
export function findSwcProp(property, swcProps) {
  return findPropByCandidates(property, swcProps);
}

/**
 * Finds a component's RSP prop row by matching cross-implementation name
 * candidates (e.g. the SWC-style "disabled" -> RSP "isDisabled").
 * @param {string} property
 * @param {object[]} rspProps
 * @returns {object | undefined}
 */
export function findRspProp(property, rspProps) {
  return findPropByCandidates(property, rspProps);
}

/**
 * Resolves picker options for a property from RSP and SWC component data.
 * RSP data has inline union types; SWC data has named types that aren't resolvable,
 * so RSP is always tried first.
 * @param {string} property camelCase property name (e.g. "fillStyle")
 * @param {object[]} rspProps RSP prop rows ({ property, type, ... })
 * @param {object[]} swcProps SWC prop rows ({ property, attribute, type, ... })
 * @returns {string[]} Picker option values, empty if none resolvable
 */
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

/**
 * Control types that take a freeform value instead of a fixed option list
 * (rendered as `se-input`), so they don't need `resolvePickerOptions` to
 * resolve anything before they can render.
 * @type {Set<string>}
 */
export const FREEFORM_CONTROLS = new Set(['textfield', 'slider']);

/**
 * Control types named in the "control" column that don't have a component
 * built yet. Properties assigned one of these are skipped with a warning
 * rather than silently falling back to a different control.
 * @type {Set<string>}
 */
const UNIMPLEMENTED_CONTROLS = new Set(['switch']);

/**
 * Resolves a single control descriptor for a property in a given implementation.
 * Returns null when the property doesn't exist in that implementation's data,
 * or when its control type isn't implemented yet, which signals the block to
 * skip rendering a control for it.
 *
 * @param {string} property camelCase property name
 * @param {'swc'|'rsp'} implementation
 * @param {Map<string, {control: string }>} controlsMap
 * @param {object[]} rspProps
 * @param {object[]} swcProps
 * @param {(message: string) => void} [onSkip] Called with a plain-English reason
 *   whenever a control is skipped (property missing from the implementation's
 *   data, its control type isn't built yet, or its type can't be resolved into
 *   picker options).
 * @returns {{ controlType: string, options: string[], attribute: string|null } | null}
 */
export function resolveControl(property, implementation, controlsMap, rspProps, swcProps, onSkip) {
  const rspRow = findRspProp(property, rspProps);
  const existsInRsp = Boolean(rspRow);
  const swcRow = findSwcProp(property, swcProps);
  const existsInSwc = Boolean(swcRow);

  if (implementation === 'rsp' && !existsInRsp) {
    onSkip?.(`No control shown for "${property}": it isn't defined in the RSP data for this component.`);
    return null;
  }
  if (implementation === 'swc' && !existsInSwc) {
    onSkip?.(`No control shown for "${property}": it isn't defined in the SWC data for this component.`);
    return null;
  }

  const controlEntry = controlsMap.get(property);
  const controlType = controlEntry?.control ?? 'picker';

  if (UNIMPLEMENTED_CONTROLS.has(controlType)) {
    onSkip?.(`No control shown for "${property}": the "${controlType}" control isn't built yet.`);
    return null;
  }

  const options = resolvePickerOptions(property, rspProps, swcProps);
  const attribute = swcRow?.attribute ?? null;

  if (!options.length && !FREEFORM_CONTROLS.has(controlType)) {
    const type = rspRow?.type ?? swcRow?.type ?? 'unknown';
    onSkip?.(`No control shown for "${property}": its type ("${type}") isn't a boolean or a list of options, so there's nothing to build a picker from.`);
  }

  return { controlType, options, attribute };
}
