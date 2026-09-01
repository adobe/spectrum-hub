/**
 * Extracts component prop metadata from @react-spectrum/s2 and writes per-component JSON files.
 *
 * For each component in components.json, crawls its `.d.ts` import graph (build-ts-checker.js)
 * and asks the TypeScript checker for the props interface's fully resolved, transitively
 * inherited property set (`checker.getPropertiesOfType()`). The checker is the source of
 * truth because S2 inherits through several hops and subtracts with `Omit<>` as often as
 * it adds — reading interface headers can do neither reliably.
 *
 * Usage: node deps/rsp/extract-props.js
 */

import {
  readFileSync, writeFileSync, mkdirSync, readdirSync, unlinkSync,
} from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import ts from 'typescript';
import { fetchComponentDocStatus } from './extract-doc-status.js';
import { crawl, buildProgram } from './build-ts-checker.js';
import { S2_COMPONENT_BASE } from './locate-published-files.js';
import { typeToDisplayString, typeToValues, declaredValueOrder, propKind } from '../shared/prop-contract.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUTPUT_DIR = join(__dirname, 'data');
const COMPONENTS_FILE = join(__dirname, 'components.json');

const ALLOW_LIST = JSON.parse(readFileSync(COMPONENTS_FILE, 'utf8'));

// S2 omits these from public component APIs (Omit<..., 'className' | 'style' | ...>) in
// favor of the `styles` prop / style() macro — they remain reachable via real inheritance
// resolution (unlike the previous regex pipeline, which could never see them at all), so
// they're filtered explicitly here instead. UNSAFE_className/UNSAFE_style are S2's own
// documented escape hatches for the same className/style it otherwise omits — same reasoning.
const EXCLUDED_PROPERTIES = new Set(['className', 'UNSAFE_className', 'UNSAFE_style']);

// Data files for components absent from the roster, so a dropped component's stale
// rows stop reaching blocks/table. Fails closed: a roster smaller than half the data
// directory means discovery failed, and must not be allowed to delete the catalog.
const MIN_ROSTER_RATIO = 0.5;

export function pruneStaleData(dataFiles, roster) {
  const jsonFiles = dataFiles.filter((f) => f.endsWith('.json'));
  if (jsonFiles.length && roster.length < jsonFiles.length * MIN_ROSTER_RATIO) {
    throw new Error(
      `Refusing to prune: roster has ${roster.length} components for ${jsonFiles.length} data files. `
      + 'Discovery probably failed — re-run it before extracting.',
    );
  }
  const rostered = new Set(roster);
  return jsonFiles.filter((f) => !rostered.has(f.replace(/\.json$/, '')));
}

/** Finds a top-level interface declaration by name in a parsed source file. */
export function findInterfaceDeclaration(sourceFile, interfaceName) {
  let found;
  ts.forEachChild(sourceFile, (node) => {
    if (!found && ts.isInterfaceDeclaration(node) && node.name.text === interfaceName) {
      found = node;
    }
  });
  return found;
}

/**
 * Renders a symbol's JSDoc description and `@default` tag the same shape the previous
 * regex-based `parseJSDoc` produced.
 */
function readJsDoc(symbol, checker) {
  const description = ts.displayPartsToString(symbol.getDocumentationComment(checker));
  const defaultTag = symbol.getJsDocTags(checker).find((tag) => tag.name === 'default');
  const defaultValue = defaultTag ? ts.displayPartsToString(defaultTag.text) : null;
  return { description, default: defaultValue };
}

/**
 * @param {import('typescript').TypeChecker} checker
 * @param {import('typescript').Type} type - the component's resolved props type
 * @param {string} primaryInterfaceName - only used to omit `inheritedFrom` when a prop is
 *   declared directly on the component's own interface, matching prior output shape.
 */
export function extractPropsFromType(checker, type, primaryInterfaceName) {
  const props = [];

  for (const symbol of checker.getPropertiesOfType(type)) {
    if (EXCLUDED_PROPERTIES.has(symbol.name)) continue;

    const decl = symbol.getDeclarations()?.[0];
    const declaringInterface = decl?.parent && ts.isInterfaceDeclaration(decl.parent)
      ? decl.parent.name.text
      : undefined;

    const propType = checker.getTypeOfSymbol(symbol);
    const { description, default: defaultValue } = readJsDoc(symbol, checker);
    // eslint-disable-next-line no-bitwise
    const optional = Boolean(symbol.flags & ts.SymbolFlags.Optional);

    const type = typeToDisplayString(checker, propType);
    const values = typeToValues(propType, declaredValueOrder(checker, symbol));
    const prop = {
      property: symbol.name, type, kind: propKind(type, values), values,
    };
    // Only recorded when true: 3% of RSP props are required, since TS props are
    // optional by default. (SWC is the mirror image and records `optional`.)
    if (!optional) prop.required = true;
    if (defaultValue) prop.default = defaultValue;
    if (description) prop.description = description;
    if (declaringInterface && declaringInterface !== primaryInterfaceName) {
      prop.inheritedFrom = declaringInterface;
    }
    props.push(prop);
  }

  return props;
}

/**
 * Crawls a component's `.d.ts` import graph and resolves its named props interface to a
 * fully-inherited property list. Returns null when the interface itself can't be found (a
 * removed/renamed export), matching the previous pipeline's "not found" signal.
 *
 * @param {{ interface: string, file?: string }} config
 * @param {Map<string, string|null>} sharedFileCache - reused across components in the same
 *   run (see build-ts-checker.js's crawl()) so the ~200 base files aren't re-fetched every time.
 */
export async function extractComponentProps(component, config, sharedFileCache) {
  const entryPath = `${S2_COMPONENT_BASE}/${config.file ?? component}.d.ts`;
  const fileCache = await crawl([entryPath], { cache: sharedFileCache });

  const { program, checker } = buildProgram(fileCache, [entryPath]);
  const sourceFile = program.getSourceFile(entryPath);
  if (!sourceFile) return null;

  const interfaceDecl = findInterfaceDeclaration(sourceFile, config.interface);
  if (!interfaceDecl) return null;

  const type = checker.getTypeAtLocation(interfaceDecl);
  return extractPropsFromType(checker, type, config.interface);
}

/**
 * Builds the JSON object written to data/{Component}.json.
 *
 * @param {object[]} props Parsed prop rows from extractComponentProps.
 * @param {string | null} status From fetchComponentDocStatus; omitted when null (no doc page).
 */
export function buildComponentData(props, status) {
  const componentData = { props };
  if (status) componentData.status = status;
  return componentData;
}

async function main() {
  mkdirSync(OUTPUT_DIR, { recursive: true });

  const sharedFileCache = new Map();
  let count = 0;
  for (const [component, config] of Object.entries(ALLOW_LIST)) {
    console.log(`Extracting ${component} (@react-spectrum/s2/dist/types/src/${config.file ?? component}.d.ts)...`);

    let props;
    try {
      props = await extractComponentProps(component, config, sharedFileCache);
    } catch (err) {
      console.warn(`  Warning: failed to extract ${component}: ${err.message}`);
      continue;
    }

    if (!props) {
      console.warn(`  Warning: ${config.interface} not found in ${config.file ?? component}.d.ts`);
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

  const stale = pruneStaleData(readdirSync(OUTPUT_DIR), Object.keys(ALLOW_LIST));
  stale.forEach((file) => {
    unlinkSync(join(OUTPUT_DIR, file));
    console.log(`  Removed ${file} — not in components.json.`);
  });

  console.log(`Done. Wrote ${count} component file(s) to ${OUTPUT_DIR}`);
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  main().catch((err) => {
    console.error(err);
    process.exit(1);
  });
}
