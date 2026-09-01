/**
 * Discovers published @react-spectrum/s2 components from unpkg and writes components.json.
 *
 * Records only which primary props interface each component uses, and which source file
 * it lives in when that differs from the component name. Inheritance is deliberately not
 * recorded: extract-props.js resolves it from the declarations themselves via the
 * TypeScript checker, so there is nothing here to configure or drift from.
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

const SKIP_FILES = /^(bar-utils|style-utils|useDOMRef|intl|CenterBaseline|pressScale|Content|Field|Provider|Tree|Collection|Fonts|ImageCoordinator)$/;

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

/**
 * Finds the name of a component's props interface from its `.d.ts` source. Tries, in order:
 * the type argument of its `ForwardRefExoticComponent<...>` declaration (the common case),
 * an interface named `<Component>Props`, then `S2Spectrum<Component>Props` (a few legacy
 * names). Only identifies *which* interface to inspect — extract-props.js resolves what's
 * actually on it.
 */
export function findComponentInterface(source, componentName) {
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

/**
 * Finds component export names in a `.d.ts` source as `export declare const X:`
 * `ForwardRefExoticComponent<...>` or as a plain `export declare function X(...)`
 */
export function findExportedNames(source) {
  const consts = [...source.matchAll(/export declare const (\w+):/g)].map((m) => m[1]);
  const funcs = [...source.matchAll(/export declare function (\w+)\(/g)].map((m) => m[1]);
  return [...new Set([...consts, ...funcs])];
}

export function buildEntry(componentName, fileName, source) {
  const iface = findComponentInterface(source, componentName);
  if (!iface) return null;

  const entry = { interface: iface };
  if (fileName !== componentName) entry.file = fileName;
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

    for (const componentName of findExportedNames(source)) {
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
