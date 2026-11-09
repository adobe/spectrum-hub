/**
 * Discovers published React Spectrum components and writes components.json.
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
import ts from 'typescript';
import {
  COMPONENT_TYPES_PATH, componentBasePath, componentEntryPath, cdnUrlsForCanonicalPath,
} from './locate-published-files.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUTPUT_FILE = join(__dirname, 'components.json');

// The default package is omitted from roster entries for backwards compatibility.
export const DEFAULT_PACKAGE = 's2';

const PACKAGES = [DEFAULT_PACKAGE, 'ai'];

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
 * names), then a local interface referenced by a function's first parameter.
 * extract-props.js resolves the interface's properties.
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

  const parsed = ts.createSourceFile('component.d.ts', source, ts.ScriptTarget.Latest);
  const declaration = parsed.statements.find(
    (node) => ts.isFunctionDeclaration(node) && node.name?.text === componentName,
  );
  const paramType = declaration?.parameters[0]?.type;
  if (paramType && ts.isTypeReferenceNode(paramType) && ts.isIdentifier(paramType.typeName)) {
    const name = paramType.typeName.text;
    if (parsed.statements.some((node) => ts.isInterfaceDeclaration(node) && node.name.text === name
      && node.modifiers?.some((modifier) => modifier.kind === ts.SyntaxKind.ExportKeyword))) {
      return name;
    }
  }

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
 * Candidate declarations in the published `?meta` listing, sorted.
 * PixelLoader's React entry is the exception to capitalized component filenames.
 *
 * @param {{ files: { path: string }[] }} meta
 * @returns {string[]}
 */
export function componentFileNames(meta) {
  return meta.files
    .map((f) => f.path.replace(`/${COMPONENT_TYPES_PATH}/`, '').replace('.d.ts', ''))
    .filter((name) => (/^[A-Z]/.test(name) || name === 'loader/react') && !SKIP_FILES.test(name))
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

  for (const id of PACKAGES) {
    const base = componentBasePath(id);
    const meta = JSON.parse(await fetchFirst(cdnUrlsForCanonicalPath(`${base}/?meta`)));
    const fileNames = componentFileNames(meta);
    const loadSource = (fileName) => fetchFirst(cdnUrlsForCanonicalPath(
      componentEntryPath(fileName, { package: id }),
    ));
    const discovered = await discoverComponents(fileNames, loadSource, id);

    Object.assign(components, discovered);
    console.log(`Discovered ${Object.keys(discovered).length} component(s) in ${base}`);
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
