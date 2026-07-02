/**
 * Data utilities for the component playground block.
 *
 * Fetches two tabs from an AEM spreadsheet workbook:
 *   - "components" tab: maps component names to their authored property lists
 *   - "controls"   tab: maps property names to UI control types (v1, v1+)
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
  if (!resp.ok) throw new Error(`Failed to fetch sheet "${sheet}" from ${url}: ${resp.status}`);
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
  if (!row?.properties?.trim()) return [];
  return row.properties.split(',').map((p) => p.trim()).filter(Boolean);
}

/**
 * Builds a lookup map from property name to its control types.
 * Expects rows with "property", "v1", and "v1+" columns.
 * @param {object[]} controlsSheet
 * @returns {Map<string, { v1: string, v1plus: string }>}
 */
export function buildControlsMap(controlsSheet) {
  return new Map(
    controlsSheet.map((row) => [
      row.property,
      { v1: row.v1, v1plus: row['v1+'] },
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
  if (!typeString) return [];
  const matches = typeString.match(/'([^']+)'/g);
  if (!matches) return [];
  return matches.map((m) => m.replace(/'/g, ''));
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
  const rspRow = rspProps.find((p) => p.property === property);
  if (rspRow?.type) {
    const options = parsePickerOptions(rspRow.type);
    if (options.length) return options;
    if (rspRow.type === 'boolean') return ['no', 'yes'];
  }

  const swcRow = swcProps.find((p) => p.property === property)
    ?? swcProps.find((p) => p.property === normalizePropertyName(property));
  if (swcRow?.type === 'boolean') return ['no', 'yes'];

  return [];
}

/**
 * Resolves a single control descriptor for a property in a given implementation.
 * Returns null when the property doesn't exist in that implementation's data,
 * which signals the block to skip rendering a control for it.
 *
 * @param {string} property camelCase property name
 * @param {'swc'|'rsp'} implementation
 * @param {Map<string, { v1: string, v1plus: string }>} controlsMap
 * @param {object[]} rspProps
 * @param {object[]} swcProps
 * @returns {{ controlType: string, options: string[], attribute: string|null } | null}
 */
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
  if (match) return match[1].charAt(0).toLowerCase() + match[1].slice(1);
  return name;
}

export function resolveControl(property, implementation, controlsMap, rspProps, swcProps) {
  const existsInRsp = rspProps.some((p) => p.property === property);

  const swcRow = swcProps.find((p) => p.property === property)
    ?? swcProps.find((p) => p.property === normalizePropertyName(property));
  const existsInSwc = Boolean(swcRow);

  if (implementation === 'rsp' && !existsInRsp) return null;
  if (implementation === 'swc' && !existsInSwc) return null;

  const controlEntry = controlsMap.get(property);
  const controlType = controlEntry?.v1 ?? 'picker';
  const options = resolvePickerOptions(property, rspProps, swcProps);
  const attribute = swcRow?.attribute ?? null;

  return { controlType, options, attribute };
}
