/**
 * Extracts component prop metadata from React Spectrum's @adobe/react-spectrum package
 * and writes per-component JSON files.
 *
 * Fetches each component's TypeScript declaration file from unpkg, finds the
 * target interface, parses its own properties, then merges in shared base type
 * properties from data/rsp-base-props.json (populated by extract-base-props.js).
 *
 * Usage: node deps/rsp/extract-props.js
 */

import { existsSync, readFileSync, writeFileSync, mkdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUTPUT_DIR = join(__dirname, 'data');
const COMPONENTS_FILE = join(__dirname, 'components.json');
const BASE_PROPS_FILE = join(__dirname, 'data', 'rsp-base-props.json');

const ALLOW_LIST = JSON.parse(readFileSync(COMPONENTS_FILE, 'utf8'));

const BASE_PROPS = existsSync(BASE_PROPS_FILE)
  ? JSON.parse(readFileSync(BASE_PROPS_FILE, 'utf8'))
  : {};

const CDN_URLS = [
  (category, component) => `https://unpkg.com/@adobe/react-spectrum/dist/types/src/${category}/${component}.d.ts`,
  (category, component) => `https://cdn.jsdelivr.net/npm/@adobe/react-spectrum/dist/types/src/${category}/${component}.d.ts`,
];

async function fetchTypes(category, component) {
  for (const buildUrl of CDN_URLS) {
    const url = buildUrl(category, component);
    try {
      const res = await fetch(url);
      if (res.ok) return res.text();
    } catch { /* try next CDN */ }
  }
  throw new Error(`Failed to fetch types for ${component} from all CDNs`);
}

/**
 * Extracts the body of a named interface or type from TypeScript source.
 * Uses bracket counting to handle nested types correctly.
 */
function extractInterfaceBlock(source, interfaceName) {
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
 * Capture any component's `extends` list from the interface header.
 * Intersects all word tokens in the header against known BASE_PROPS keys,
 * so generics, utility types, and type params are automatically ignored.
 * Warns about names that look like base types but aren't tracked yet.
 */
function extractExtends(source, interfaceName) {
  const startRegex = new RegExp(
    `(?:export\\s+)?(?:interface|type)\\s+${interfaceName}([^{]*)\\{`,
  );
  const match = startRegex.exec(source);
  if (!match) return [];

  const allNames = match[1].match(/\b\w+\b/g) ?? [];
  const known = allNames.filter((name) => BASE_PROPS[name]);
  const unknown = allNames.filter((name) => !BASE_PROPS[name] && /Props|Events|Mixin/.test(name));

  if (unknown.length) {
    console.warn(`  Warning: [${unknown.join(', ')}] found in ${interfaceName} header but not in rsp-base-props.json — add to BASE_SOURCES in extract-base-props.js, or add "extends" to components.json`);
  }

  return known;
}

function parseJSDoc(comment) {
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

function parseProps(block) {
  const props = [];
  const lines = block.split('\n');

  let jsdocLines = [];
  let inJSDoc = false;

  for (const raw of lines) {
    const line = raw.trim();

    if (line.startsWith('/**')) { inJSDoc = true; jsdocLines = [line]; continue; }
    if (inJSDoc) { jsdocLines.push(line); if (line.includes('*/')) inJSDoc = false; continue; }

    const propMatch = line.match(/^(?:readonly\s+)?(\w+)(\??):\s*(.+?);?\s*$/);
    if (propMatch) {
      const [, name, optional, type] = propMatch;
      const { description, default: defaultVal } = parseJSDoc(jsdocLines.join('\n'));

      const prop = { property: name, type: type.trim() };
      if (optional !== '?') prop.required = true;
      if (defaultVal) prop.default = defaultVal;
      if (description) prop.description = description;

      props.push(prop);
    }

    if (line && !line.startsWith('//')) jsdocLines = [];
  }

  return props;
}

async function main() {
  mkdirSync(OUTPUT_DIR, { recursive: true });

  let count = 0;
  for (const [component, { category, interface: interfaceName, extends: configBases }] of Object.entries(ALLOW_LIST)) {
    console.log(`Fetching types for ${component} (@adobe/react-spectrum/dist/types/src/${category}/${component}.d.ts)...`);

    const source = await fetchTypes(category, component);
    const block = extractInterfaceBlock(source, interfaceName);
    const extendsList = extractExtends(source, interfaceName);
    const bases = configBases ?? extendsList;  

    if (!block) {
      console.warn(`  Warning: ${interfaceName} not found in ${component}.d.ts`);
      continue;
    }

    const ownProps = parseProps(block);

    // Merge base props, own props win on name collision
    const seen = new Set(ownProps.map((p) => p.property));
    const baseProps = bases.flatMap((base) => {
      if (!BASE_PROPS[base]) {
        console.warn(`  Warning: base type "${base}" not found in rsp-base-props.json — run extract-base-props.js`);
        return [];
      }
      return BASE_PROPS[base]
        .filter((p) => !seen.has(p.property))
        .map((p) => ({ ...p, inheritedFrom: base }));
    });

    const props = [...ownProps, ...baseProps];
    const file = join(OUTPUT_DIR, `${component}.json`);
    writeFileSync(file, JSON.stringify(props, null, 2) + '\n');
    console.log(`  Wrote ${props.length} properties (${ownProps.length} own, ${baseProps.length} inherited) to ${component}.json`);
    count++;
  }

  console.log(`Done. Wrote ${count} component file(s) to ${OUTPUT_DIR}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
