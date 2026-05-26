/**
 * Discovers published @react-spectrum/s2 components from unpkg and writes components.json.
 *
 * Usage: node deps/rsp/discover-components.js
 */

import { writeFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUTPUT_FILE = join(__dirname, 'components.json');
// Unpinned, like extract-props.js — always tracks latest published @react-spectrum/s2.
const META_URLS = [
  'https://unpkg.com/@react-spectrum/s2/dist/types/src/?meta',
  'https://cdn.jsdelivr.net/npm/@react-spectrum/s2/dist/types/src/?meta',
];
const TYPES_BASE_URLS = [
  (path) => `https://unpkg.com/@react-spectrum/s2/dist/types/src/${path}`,
  (path) => `https://cdn.jsdelivr.net/npm/@react-spectrum/s2/dist/types/src/${path}`,
];

const SKIP_FILES = /^(bar-utils|style-utils|useDOMRef|intl|CenterBaseline|pressScale|Content|Field|Form|Provider|Tree|Collection|Fonts|ImageCoordinator)$/;

// Manually maintained: tokens to skip when resolving `extends` from interface headers.
// Not derived from TypeScript — if S2 adds new utility or shared type names in headers,
// update this set or discovery may omit/warn incorrectly. Keep in sync with the smaller
// `ignored` set in extract-props.js (`extractExtends`) when both change.
const IGNORE_EXTENDS = new Set([
  'DOMProps', 'UnsafeStyles', 'SlotProps', 'AriaLabelingProps', 'HoverEvents',
  'Focusable', 'FocusableRef', 'DOMRefValue', 'ReactNode', 'CSSProperties',
  'StylesProp', 'StylesPropWithHeight', 'StylesPropWithoutHeight',
  'Partial', 'Omit', 'Pick', 'Record', 'Readonly', 'Required', 'keyof', 'extends',
  'GlobalDOMAttributes', 'ClassNameOrFunction', 'ContextValue', 'RenderProps',
  'SlotProps', 'Labelable', 'FocusableRefValue',
]);

async function fetchText(url) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`HTTP ${res.status} for ${url}`);
  return res.text();
}

async function fetchFirst(urls) {
  for (const url of urls) {
    try {
      return await fetchText(url);
    } catch { /* try next CDN */ }
  }
  throw new Error(`Failed to fetch from all CDNs: ${urls[0]}`);
}

function parseRacImports(source) {
  const map = {};
  for (const m of source.matchAll(
    /import\s+\{([^}]+)\}\s+from\s+['"]react-aria-components\/([^'"]+)['"]/g,
  )) {
    for (const part of m[1].split(',')) {
      const bit = part.trim();
      const alias = bit.match(/(\w+)\s+as\s+(\w+)/);
      if (alias) map[alias[2]] = alias[1];
      else if (/^\w+$/.test(bit)) map[bit] = bit;
    }
  }
  return map;
}

function findComponentInterface(source, componentName) {
  const decl = source.match(
    new RegExp(
      `export declare const ${componentName}:[^;]*?ForwardRefExoticComponent<([^&>]+)`,
    ),
  );
  if (decl) return decl[1].trim();

  const exact = source.match(
    new RegExp(`export interface (${componentName}Props)\\b`),
  );
  if (exact) return exact[1];

  const spectrum = source.match(
    new RegExp(`export interface (S2Spectrum${componentName}Props)\\b`),
  );
  if (spectrum) return spectrum[1];

  return null;
}

/** Returns the sibling `.d.ts` basename when an include is imported via `./…`. */
export function findIncludeImportPath(source, includeName) {
  const includeImportPattern = new RegExp(
    `import\\s+\\{[^}]*\\b${includeName}\\b[^}]*\\}\\s+from\\s+['"]\\./([^'"]+)['"]`,
  );
  return includeImportPattern.exec(source)?.[1] ?? null;
}

function interfaceDeclaredInSource(source, interfaceName) {
  return new RegExp(`(?:export\\s+)?interface\\s+${interfaceName}\\b`).test(source);
}

/**
 * Maps include names to types file basenames when the interface lives in another file.
 * Same-file includes are omitted so extract-props can use the component source only.
 */
export function buildIncludeFiles(source, includes) {
  const includeFiles = {};
  for (const includeName of includes) {
    if (interfaceDeclaredInSource(source, includeName)) continue;
    const typesFile = findIncludeImportPath(source, includeName);
    if (typesFile) includeFiles[includeName] = typesFile;
  }
  return Object.keys(includeFiles).length ? includeFiles : undefined;
}

function headerIncludes(source, interfaceName, racImports) {
  const match = source.match(
    new RegExp(`(?:export\\s+)?interface\\s+${interfaceName}([^{]*)\\{`),
  );
  if (!match) return [];
  const header = match[1];
  const styleTokens = header.match(/\b\w+(?:Style|Spectrum)Props\b/g) ?? [];
  const siblingProps = (header.match(/\b\w+Props\b/g) ?? []).filter(
    (name) =>
      name !== interfaceName &&
      !IGNORE_EXTENDS.has(name) &&
      !Object.hasOwn(racImports, name) &&
      new RegExp(`(?:export\\s+)?interface\\s+${name}\\b`).test(source),
  );
  return [...new Set([...styleTokens, ...siblingProps])];
}

function resolveExtends(header, racImports) {
  const names = header.match(/\b\w+\b/g) ?? [];
  const out = [];
  for (const name of names) {
    if (IGNORE_EXTENDS.has(name)) continue;
    if (/\w(?:Style|Spectrum)Props$/.test(name)) continue;

    if (name === 'StyleProps') {
      if (!out.includes('StyleProps')) out.push('StyleProps');
      continue;
    }
    // Only merge react-aria-components bases (not S2-local *Props types).
    if (Object.hasOwn(racImports, name)) {
      const resolved = racImports[name];
      if (/Props$/.test(resolved) && !out.includes(resolved)) out.push(resolved);
    }
  }
  return out;
}

export function buildEntry(componentName, fileName, source) {
  const iface = findComponentInterface(source, componentName);
  if (!iface) return null;

  const headerMatch = source.match(
    new RegExp(`(?:export\\s+)?interface\\s+${iface}([^{]*)\\{`),
  );
  const header = headerMatch?.[1] ?? '';
  const racImports = parseRacImports(source);
  const includes = headerIncludes(source, iface, racImports);
  const extendsList = resolveExtends(header, racImports);
  const includeFiles = buildIncludeFiles(source, includes);

  const entry = { interface: iface };
  if (fileName !== componentName) entry.file = fileName;
  if (includes.length) entry.includes = includes;
  if (includeFiles) entry.includeFiles = includeFiles;
  if (extendsList.length) entry.extends = extendsList;
  return entry;
}

async function main() {
  const meta = JSON.parse(await fetchFirst(META_URLS));
  const files = meta.files
    .map((f) => f.path.replace('/dist/types/src/', '').replace('.d.ts', ''))
    .filter((name) => /^[A-Z]/.test(name) && !SKIP_FILES.test(name))
    .sort();

  const components = {};

  for (const fileName of files) {
    const source = await fetchFirst(TYPES_BASE_URLS.map((b) => b(`${fileName}.d.ts`)));

    const exports = [...source.matchAll(/export declare const (\w+):/g)].map((m) => m[1]);
    for (const componentName of exports) {
      const entry = buildEntry(componentName, fileName, source);
      if (entry) components[componentName] = entry;
    }
  }

  const sorted = Object.fromEntries(
    Object.entries(components).sort(([a], [b]) => a.localeCompare(b)),
  );

  writeFileSync(OUTPUT_FILE, JSON.stringify(sorted, null, 2) + '\n');
  console.log(`Wrote ${Object.keys(sorted).length} component(s) to ${OUTPUT_FILE}`);
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  main().catch((err) => {
    console.error(err);
    process.exit(1);
  });
}
