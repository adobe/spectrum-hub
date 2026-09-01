/**
 * Extracts component properties from the 2nd-gen Spectrum Web Components package
 * and writes per-component JSON files.
 * 
 * Fetches or reads the 2nd-gen CEM from @adobe/spectrum-wc, then formats
 * each component declaration's attributes. In 2nd-gen, inherited and
 * mixin-provided attributes are already included on the component declaration.
 *
 * Usage:
 *   node deps/swc/extract-cem-components.js 
 *   node deps/swc/extract-cem-components.js <path-to-custom-elements.json> (manual workflow)
 */

import { readFileSync, writeFileSync, mkdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { fetchManifest, findCorePackageName } from './locate-published-files.js';
import { collectResolutionTargets, resolveTargets } from './resolve-attribute-types.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUTPUT_DIR = join(__dirname, 'data');
const COMPONENTS_FILE = join(__dirname, 'components.json');
const VERSION_FILE = join(__dirname, 'version.json');
const PACKAGE_NAME = '@adobe/spectrum-wc';
const DIST_TAG = 'beta';

// components.json maps bare component name -> module subpath; extraction only
// needs the roster of names. Tags carry the `swc-` prefix in the CEM.
const ALLOW_LIST = Object.keys(JSON.parse(readFileSync(COMPONENTS_FILE, 'utf8')));

const CDN_BASE_URLS = [
  () => `https://unpkg.com/${PACKAGE_NAME}@${DIST_TAG}`,
  () => `https://cdn.jsdelivr.net/npm/${PACKAGE_NAME}@${DIST_TAG}`,
];

// Shared CDN-fallback: tries each CDN's version of `path` in turn, returning
// the first successful `parse(response)`. Used for both the CEM itself and
// (separately) resolving the concrete version `@beta` currently points to.
async function fetchFromCdns(path, parse) {
  for (const buildBase of CDN_BASE_URLS) {
    try {
      const res = await fetch(`${buildBase()}${path}`);
      if (res.ok) return await parse(res);
    } catch { /* try next CDN */ }
  }
  return null;
}

export async function fetchCEM() {
  const cem = await fetchFromCdns('/dist/custom-elements.json', (res) => res.json());
  if (!cem) { throw new Error(`Failed to fetch CEM for ${PACKAGE_NAME} from all CDNs`); }
  return cem;
}

// The concrete version `@beta` resolves to right now — written to version.json
// (see main()) so the browser-side playground (deps/swc/playground/define-swc.js)
// loads a committed, always-daily-fresh version instead of independently
// floating on `@beta` on every single page load with no record of what ran.
export async function fetchResolvedVersion() {
  const version = await fetchFromCdns('/package.json', async (res) => (await res.json()).version);
  if (!version) { throw new Error(`Failed to resolve the published version of ${PACKAGE_NAME}`); }
  return version;
}

function getInheritedFromName(attr) {
  if (!attr.inheritedFrom) return undefined;
  return typeof attr.inheritedFrom === 'string'
    ? attr.inheritedFrom
    : attr.inheritedFrom.name;
}

/**
 * The kind of control a row's data can back, so no consumer parses `type`.
 * `values` (from the TypeScript checker, see resolve-attribute-types.js) decides
 * "enum" on its own — a resolved union is an enum whatever its type text says.
 * Anything else falls through to "unknown", which draws no control and keeps the
 * existing skip warning: aria-haspopup/aria-expanded reach the CEM with no type at
 * all, and guessing would build a control out of nothing.
 */
export function attributeKind(typeText, values) {
  if (values?.length) return 'enum';
  // A nullable primitive is just that primitive — nullish is stripped everywhere,
  // never offered as a value (see typeToValues in resolve-attribute-types.js).
  const bare = String(typeText ?? '').replace(/\s*\|\s*(null|undefined)\b/g, '').trim();
  switch (bare) {
    case 'boolean': return 'boolean';
    case 'string': return 'text';
    case 'number': return 'number';
    default: return 'unknown';
  }
}

// Writes resolution results back onto a component's formatted rows, in place.
// A row with no result keeps its original bare type — resolution failing is a
// degraded run, not an error (see resolveAllAttributeTypes).
export function applyResolvedTypes(rows, resolvedTypes, tag) {
  // eslint-disable-next-line no-restricted-syntax
  for (const row of rows) {
    const resolved = resolvedTypes.get(`${tag}::${row.attribute}`);
    if (!resolved) continue;
    row.type = resolved.type;
    row.values = resolved.values;
    row.kind = attributeKind(resolved.type, resolved.values);
    row.optional = resolved.optional;
  }
  return rows;
}

function formatAttr(a, componentStatus, componentSince) {
  const entry = {
    attribute: a.name,
    property: a.fieldName,
    type: a.type?.text,
    kind: attributeKind(a.type?.text, []),
    values: [],
    optional: false,
  };
  if (a.default) entry.default = a.default;
  if (a.description) entry.description = a.description;
  const inheritedFrom = getInheritedFromName(a);
  if (inheritedFrom) entry.inheritedFrom = inheritedFrom;
  if (componentStatus) entry.status = componentStatus;
  if (componentSince) entry.since = componentSince;
  return entry;
}

/** Finds a component's declaration AND the module that declares it (`mod.path`,
 * e.g. "components/button/Button.ts") — the module path is needed to resolve the
 * component's own attribute types (see resolve-attribute-types.js) but isn't part
 * of collectComponentData's own formatted-row output, so it's a separate lookup. */
export function findDeclarationAndModule(cem, tag) {
  for (const mod of cem.modules) {
    for (const decl of mod.declarations || []) {
      if (decl.tagName === tag) return { decl, modPath: mod.path };
    }
  }
  return null;
}

export function collectComponentData(cem, tag) {
  const found = findDeclarationAndModule(cem, tag);
  if (!found) return null;
  const { decl: componentDecl } = found;

  const attrs = (componentDecl.attributes || [])
    .map((attr) => formatAttr(attr, componentDecl.status, componentDecl.since));

  // Deduplicate by attribute name (first wins)
  const seen = new Set();
  return attrs.filter((a) => {
    if (seen.has(a.attribute)) return false;
    seen.add(a.attribute);
    return true;
  });
}

// Resolves named-alias attribute types (e.g. "ButtonVariant") to their real literal
// union across every component in ONE shared crawl + compile pass, via the real
// TypeScript compiler (see resolve-attribute-types.js) — most declaring files
// (mixins, the shared `element` base, lit itself) are reused across many
// components, so batching the whole run avoids re-fetching/re-compiling them once
// per component. Returns Map<"tag::attributeName", {type, values}>; a lookup miss
// means "couldn't resolve — keep the original bare alias name", not an error.
export async function resolveAllAttributeTypes(cem, wcVersion) {
  const wcManifest = await fetchManifest(PACKAGE_NAME, wcVersion);
  const corePkgName = findCorePackageName(wcManifest);
  if (!corePkgName) {
    console.warn(`  Warning: couldn't find ${PACKAGE_NAME}'s core peer dependency in its own package.json — named-alias types will be left unresolved this run.`);
    return new Map();
  }
  const coreManifest = await fetchManifest(corePkgName, wcManifest.dependencies[corePkgName]);
  const coreVersion = coreManifest.version;

  const onSkip = (message) => console.warn(`  Warning: ${message}`);
  const allTargets = [];
  for (const name of ALLOW_LIST) {
    const tag = `swc-${name}`;
    const found = findDeclarationAndModule(cem, tag);
    if (!found) continue;
    allTargets.push(...collectResolutionTargets(found.decl.attributes || [], {
      modPath: found.modPath,
      wcVersion,
      corePkgName,
      coreVersion,
      superclassName: found.decl.superclass?.name,
      keyPrefix: `${tag}::`,
      onSkip,
    }));
  }

  console.log(`Resolving ${allTargets.length} named-alias attribute type(s) against @adobe/spectrum-wc@${wcVersion} / ${corePkgName}@${coreVersion}...`);
  return resolveTargets(allTargets, { fileCache: new Map(), resolutionCache: new Map(), onSkip });
}

async function main() {
  const cemPath = process.argv[2];
  mkdirSync(OUTPUT_DIR, { recursive: true });
  let cem;
  let version;
  if (cemPath) {
    console.log(`Reading CEM from ${cemPath}...`);
    cem = JSON.parse(readFileSync(cemPath, 'utf8'));
  } else {
    console.log(`Fetching CEM for ${PACKAGE_NAME}...`);
    cem = await fetchCEM();
    version = await fetchResolvedVersion();
  }

  if (version) {
    writeFileSync(VERSION_FILE, `${JSON.stringify({ version }, null, 2)}\n`);
    console.log(`Wrote resolved version ${version} to ${VERSION_FILE}`);
  }

  // Only runs against the daily/CI path (a concrete resolved `version` to pin the
  // crawl to) — the manual `<cem-path>` workflow has no reliable version for that,
  // so it writes bare (unresolved) alias names, same as before this rewrite. A
  // failure here degrades to "no resolution this run" rather than aborting the
  // whole extraction — every attribute still gets written with its original type.
  let resolvedTypes = new Map();
  if (version) {
    try {
      resolvedTypes = await resolveAllAttributeTypes(cem, version);
    } catch (err) {
      console.warn(`  Warning: named-alias type resolution failed, writing unresolved alias names this run: ${err.message}`);
    }
  }

  let count = 0;
  for (const name of ALLOW_LIST) {
    const tag = `swc-${name}`;
    console.log(`Extracting properties for ${tag}...`);
    const attrs = collectComponentData(cem, tag);
    if (!attrs) {
      console.warn(`  Warning: ${tag} not found in CEM`);
      continue;
    }

    applyResolvedTypes(attrs, resolvedTypes, tag);

    const file = join(OUTPUT_DIR, `${tag}.json`);
    writeFileSync(file, JSON.stringify(attrs, null, 2) + '\n');
    console.log(`  Wrote ${attrs.length} properties to ${tag}.json`);
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
