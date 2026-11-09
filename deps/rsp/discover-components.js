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

// Which published package a roster entry came from. `s2` is the default and is never
// written to components.json, so an S2-only roster is byte-identical to the pre-AI one.
export const DEFAULT_PACKAGE = 's2';

// Both packages publish their declarations under the same internal path, so one base
// serves both. This is the path the file is actually at, not the `exports` map subpath —
// see deps/rsp/locate-published-files.js on why those differ.
const TYPES_PATH = 'dist/types/src';

// The published packages the roster is built from, in the order they are merged. Both are
// unpinned, like extract-props.js — discovery always tracks latest published.
//
// `@react-spectrum/ai` ships the Spectrum 2 AI components (Chat, PromptField, UserMessage
// and the rest of that cohort). It is a separate npm package but not a separate column:
// its components resolve into the same `rsp` cell as S2's, so they join one roster here
// rather than getting their own components.json. The `package` field on an entry is what
// later steps branch on — the CDN base extract-props.js crawls, and the docs URL
// scripts/utils/go-to-impl.js builds, since the AI cohort is documented on one shared page
// rather than a page per component.
const PACKAGES = [
  { id: DEFAULT_PACKAGE, npm: '@react-spectrum/s2' },
  { id: 'ai', npm: '@react-spectrum/ai' },
];

const metaUrls = (npm) => [
  `https://unpkg.com/${npm}/${TYPES_PATH}/?meta`,
  `https://cdn.jsdelivr.net/npm/${npm}/${TYPES_PATH}/?meta`,
];
const typesUrls = (npm, path) => [
  `https://unpkg.com/${npm}/${TYPES_PATH}/${path}`,
  `https://cdn.jsdelivr.net/npm/${npm}/${TYPES_PATH}/${path}`,
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
  // `[<(]` because a generic function puts its type parameters between the name and the
  // parameter list — `function Thread<T extends object>(props: ThreadProps<T>)`.
  const funcs = [...source.matchAll(/export declare function (\w+)\s*[<(]/g)].map((m) => m[1]);
  return [...new Set([...consts, ...funcs])];
}

export function buildEntry(componentName, fileName, source, pkg = DEFAULT_PACKAGE) {
  const iface = findComponentInterface(source, componentName);
  if (!iface) return null;

  const entry = { interface: iface };
  if (fileName !== componentName) entry.file = fileName;
  if (pkg !== DEFAULT_PACKAGE) entry.package = pkg;
  return entry;
}

/**
 * The component-declaring file names in a package's published `?meta` listing: top-level,
 * capitalized, and not on the skip list, sorted.
 *
 * Lowercase names are hooks, macros, and style helpers; a name containing a slash is a
 * nested file such as `loader/data`. Neither declares a component, and both are dropped by
 * the capitalized-first-letter test.
 *
 * @param {{ files: { path: string }[] }} meta
 * @returns {string[]}
 */
export function componentFileNames(meta) {
  return meta.files
    .map((f) => f.path.replace(`/${TYPES_PATH}/`, '').replace('.d.ts', ''))
    .filter((name) => /^[A-Z]/.test(name) && !SKIP_FILES.test(name))
    .sort();
}

/**
 * Builds one package's roster entries, keyed by component name.
 *
 * One file routinely declares several components (Chat.d.ts declares Chat, Thread,
 * ThreadItem and ThreadLoadMoreItem), so every exported name in a file is offered to
 * buildEntry and the ones that resolve no props interface — React contexts, plain helper
 * functions — drop out there rather than being filtered by name here.
 *
 * @param {string[]} fileNames
 * @param {(fileName: string) => Promise<string>} loadSource - fetches one file's source.
 * @param {string} pkg - the package id recorded on each entry.
 * @returns {Promise<Record<string, { interface: string, file?: string, package?: string }>>}
 */
export async function discoverComponents(fileNames, loadSource, pkg) {
  const components = {};

  for (const fileName of fileNames) {
    const source = await loadSource(fileName);

    for (const componentName of findExportedNames(source)) {
      const entry = buildEntry(componentName, fileName, source, pkg);
      if (entry) components[componentName] = entry;
    }
  }

  return components;
}

async function main() {
  const components = {};

  for (const { id, npm } of PACKAGES) {
    const meta = JSON.parse(await fetchFirst(metaUrls(npm)));
    const fileNames = componentFileNames(meta);
    const loadSource = (fileName) => fetchFirst(typesUrls(npm, `${fileName}.d.ts`));
    const discovered = await discoverComponents(fileNames, loadSource, id);

    Object.assign(components, discovered);
    console.log(`Discovered ${Object.keys(discovered).length} component(s) in ${npm}`);
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
