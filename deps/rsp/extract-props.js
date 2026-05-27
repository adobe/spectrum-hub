/**
 * Extracts component prop metadata from @react-spectrum/s2 and writes per-component JSON files.
 *
 * Fetches each component's TypeScript declaration file from unpkg, parses the target
 * interface (and optional co-located *StyleProps / *SpectrumProps interfaces), then
 * merges shared base types from data/rsp-base-props.json.
 *
 * Usage: node deps/rsp/extract-props.js
 */

import { existsSync, readFileSync, writeFileSync, mkdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { fetchComponentDocStatus } from './extract-doc-status.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUTPUT_DIR = join(__dirname, 'data');
const COMPONENTS_FILE = join(__dirname, 'components.json');
const BASE_PROPS_FILE = join(__dirname, 'data', 'rsp-base-props.json');

const ALLOW_LIST = JSON.parse(readFileSync(COMPONENTS_FILE, 'utf8'));

const BASE_PROPS = existsSync(BASE_PROPS_FILE)
  ? JSON.parse(readFileSync(BASE_PROPS_FILE, 'utf8'))
  : {};

// S2 omits these from public component APIs (Omit<..., 'className' | 'style' | ...>).
// They remain on react-aria-components base types but are not surfaced in S2 docs.
const EXCLUDED_PROPERTIES = new Set(['className']);

const CDN_URLS = [
  (component) => `https://unpkg.com/@react-spectrum/s2/dist/types/src/${component}.d.ts`,
  (component) => `https://cdn.jsdelivr.net/npm/@react-spectrum/s2/dist/types/src/${component}.d.ts`,
];

// Tries each CDN in order; jsdelivr is the fallback in case unpkg is rate-limited or unavailable.
async function fetchTypes(component) {
  for (const buildUrl of CDN_URLS) {
    const url = buildUrl(component);
    try {
      const res = await fetch(url);
      if (res.ok) return res.text();
    } catch { /* try next CDN */ }
  }
  throw new Error(`Failed to fetch types for ${component} from all CDNs`);
}

/** Fetches component and include `.d.ts` sources using paths from components.json. */
async function loadComponentSources(component, config) {
  const sourcesByFile = new Map();
  const load = async (typesComponent) => {
    if (!sourcesByFile.has(typesComponent)) {
      sourcesByFile.set(typesComponent, await fetchTypes(typesComponent));
    }
    return sourcesByFile.get(typesComponent);
  };

  const mainTypesComponent = config.file ?? component;
  const mainSource = await load(mainTypesComponent);

  const includeSources = {};
  for (const includeName of config.includes ?? []) {
    const typesComponent = config.includeFiles?.[includeName] ?? mainTypesComponent;
    includeSources[includeName] = await load(typesComponent);
  }

  return { mainSource, includeSources };
}

/**
 * Extracts the body of a named interface or type from TypeScript source.
 * Uses bracket counting rather than a closing-brace regex because interface
 * bodies can contain nested object types ({ }) that would cause a simple
 * pattern to close too early.
 */
export function extractInterfaceBlock(source, interfaceName) {
  const startRegex = new RegExp(
    `(?:export\\s+)?(?:interface|type)\\s+${interfaceName}([^{]*)\\{`,
  );
  const startMatch = startRegex.exec(source);
  if (!startMatch) return null;

  let depth = 1;
  let i = startMatch.index + startMatch[0].length;
  const start = i;

  while (i < source.length && depth > 0) {
    if (source[i] === '{') depth++;
    else if (source[i] === '}') depth--;
    i++;
  }

  return source.slice(start, i - 1);
}

/**
 * Captures the resolved `extends` list from the interface header in the .d.ts source.
 *
 * Rather than parsing TypeScript syntax, this intersects all word tokens in the header
 * against known rsp-base-props.json keys. Utility type names (Omit, Pick, Partial, and
 * similar tokens in `ignored`) are skipped explicitly. Other tokens that are not in the
 * catalog are skipped without a warning unless they look like base types (Props, Events,
 * or Mixin).
 *
 * A warning is emitted for untracked names that look like base types — rerun
 * extract-base-props.js so react-aria-components types land in the catalog, or add an
 * explicit `"extends"` entry in components.json (what discover-components.js writes).
 *
 * Production extraction uses `"extends"` from components.json only; this helper supports
 * tests and diagnosing headers when extends is omitted.
 */
export function extractExtends(source, interfaceName, baseProps = BASE_PROPS) {
  const startRegex = new RegExp(
    `(?:export\\s+)?(?:interface|type)\\s+${interfaceName}([^{]*)\\{`,
  );
  const match = startRegex.exec(source);
  if (!match) return [];

  // Manually maintained: same role as IGNORE_EXTENDS in discover-components.js but smaller.
  // Production uses `extends` from components.json (from discovery), not this helper — drift
  // between the two sets is a known source of test vs CI mismatch if either list is updated alone.
  const ignored = new Set([
    'extends', 'Omit', 'Pick', 'Partial', 'Required', 'Readonly', 'Record',
    'keyof', 'GlobalDOMAttributes',
  ]);
  const allNames = match[1].match(/\b\w+\b/g) ?? [];
  const known = allNames.filter((name) => !ignored.has(name) && baseProps[name]);
  const unknown = allNames.filter(
    (name) =>
      !ignored.has(name) &&
      !baseProps[name] &&
      /Props|Events|Mixin/.test(name),
  );

  if (unknown.length) {
    console.warn(
      `Warning: [${unknown.join(', ')}] found in ${interfaceName} header but not in rsp-base-props.json — rerun extract-base-props.js or add "extends" to components.json`,
    );
  }

  return known;
}

// Strips delimiters and leading `* ` from a raw JSDoc comment block, then extracts
// a plain-text description and optional @default value.
export function parseJSDoc(comment) {
  const result = { description: '', default: null };
  if (!comment) return result;

  const cleaned = comment.replace(/^\/\*\*/, '').replace(/\*\/$/, '');
  const lines = cleaned
    .split('\n')
    .map((l) => l.replace(/^\s*\*\s?/, '').trim())
    .filter(Boolean);

  const descLines = [];
  for (const line of lines) {
    if (line.startsWith('@')) break;
    descLines.push(line);
  }
  result.description = descLines.join(' ').trim();

  const defaultMatch = comment.match(/@default\s+([^\n*]+)/);
  if (defaultMatch) result.default = defaultMatch[1].trim();

  return result;
}

/**
 * Parses individual property declarations from an interface body.
 *
 * Uses a single-line regex and will silently skip or misparse:
 *   - Multi-line type unions
 *   - Generic types with angle brackets (e.g. Array<string>)
 *   - Function signatures (e.g. (val: T) => void)
 *   - Conditional or mapped types
 *
 * Spot-check output JSON against RSP docs when adding a new component. If output
 * looks sparse, the component likely uses one of these patterns.
 */
export function parseProps(block) {
  const props = [];
  const lines = block.split('\n');

  let jsdocLines = [];
  let inJSDoc = false;

  for (const raw of lines) {
    const line = raw.trim();

    // Single-line JSDoc (/** ... */) must close inJSDoc on the same iteration;
    // otherwise the next line (the property declaration) gets absorbed into jsdocLines.
    if (line.startsWith('/**')) {
      inJSDoc = true;
      jsdocLines = [line];

      if (line.includes('*/')) inJSDoc = false; continue;
    }
    if (inJSDoc) {
      jsdocLines.push(line);

      if (line.includes('*/')) inJSDoc = false; continue;
    }

    const propMatch = line.match(/^(?:readonly\s+)?(\w+)(\??):\s*(.+?);?\s*$/);
    if (propMatch) {
      const [, name, optional, type] = propMatch;
      const { description, default: defaultVal } = parseJSDoc(jsdocLines.join('\n'));

      const prop = { property: name, type: type.trim().replace(/,$/, '') };
      if (optional !== '?') prop.required = true;
      if (defaultVal) prop.default = defaultVal;
      if (description) prop.description = description;

      props.push(prop);
    }

    if (line && !line.startsWith('//')) jsdocLines = [];
  }

  return props;
}

/**
 * @param {string} source - Component .d.ts source
 * @param {{ interface: string, includes?: string[], includeFiles?: Record<string, string>, extends?: string[] }} config
 */
export function collectComponentProps(
  source,
  config,
  baseProps = BASE_PROPS,
  includeSources = {},
) {
  const {
    interface: interfaceName,
    includes = [],
    extends: configBases,
  } = config;

  const ownProps = [];
  const seen = new Set();

  const addProps = (props, inheritedFrom) => {
    for (const prop of props) {
      if (EXCLUDED_PROPERTIES.has(prop.property) || seen.has(prop.property)) continue;
      seen.add(prop.property);
      ownProps.push(
        inheritedFrom ? { ...prop, inheritedFrom } : prop,
      );
    }
  };

  for (const includeName of includes) {
    const includeSource = includeSources[includeName] ?? source;
    const includeBlock = extractInterfaceBlock(includeSource, includeName);
    if (!includeBlock) {
      console.warn(`  Warning: include "${includeName}" not found in source`);
      continue;
    }
    addProps(parseProps(includeBlock), includeName);
  }

  const block = extractInterfaceBlock(source, interfaceName);
  if (block) {
    addProps(parseProps(block));
  }

  if (!block && ownProps.length === 0) {
    return null;
  }

  const bases = configBases ?? [];

  const inheritedBaseProps = bases.flatMap((base) => {
    if (!baseProps[base]) {
      console.warn(
        `  Warning: base type "${base}" not found in rsp-base-props.json — run extract-base-props.js`,
      );
      return [];
    }
    return baseProps[base]
      .filter((p) => !EXCLUDED_PROPERTIES.has(p.property) && !seen.has(p.property))
      .map((p) => ({ ...p, inheritedFrom: base }));
  });

  return [...ownProps, ...inheritedBaseProps];
}

/**
 * Builds the JSON object written to data/{Component}.json.
 *
 * @param {object[]} props Parsed prop rows from collectComponentProps.
 * @param {string | null} status From fetchComponentDocStatus; omitted when null (no doc page).
 */
export function buildComponentData(props, status) {
  const componentData = { props };
  if (status) componentData.status = status;
  return componentData;
}

async function main() {
  mkdirSync(OUTPUT_DIR, { recursive: true });

  let count = 0;
  for (const [component, config] of Object.entries(ALLOW_LIST)) {
    console.log(`Fetching types for ${component} (@react-spectrum/s2/dist/types/src/${config.file ?? component}.d.ts)...`,);

    const { mainSource, includeSources } = await loadComponentSources(component, config);
    const props = collectComponentProps(mainSource, config, BASE_PROPS, includeSources);

    if (!props) {
      console.warn(
        `  Warning: ${config.interface} not found in ${config.file ?? component}.d.ts`,
      );
      continue;
    }

    const ownCount = props.filter((p) => !p.inheritedFrom).length;
    const inheritedCount = props.length - ownCount;

    const status = await fetchComponentDocStatus(component);
    const componentData = buildComponentData(props, status);

    const outFile = join(OUTPUT_DIR, `${component}.json`);
    writeFileSync(outFile, JSON.stringify(componentData, null, 2) + '\n');
    const statusNote = status ? `Status=${status}` : 'No doc page.';
    console.log(
      `  Wrote ${props.length} properties (${ownCount} own, ${inheritedCount} inherited) to ${component}.json. ${statusNote}`,
    );
    count++;
  }

  console.log(`Done. Wrote ${count} component file(s) to ${OUTPUT_DIR}`);
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  main().catch((err) => {
    console.error(err);
    process.exit(1);
  });
}
