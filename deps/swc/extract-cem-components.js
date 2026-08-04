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

function formatAttr(a, componentStatus, componentSince) {
  const entry = {
    attribute: a.name,
    property: a.fieldName,
    type: a.type?.text,
  };
  if (a.default) entry.default = a.default;
  if (a.description) entry.description = a.description;
  const inheritedFrom = getInheritedFromName(a);
  if (inheritedFrom) entry.inheritedFrom = inheritedFrom;
  if (componentStatus) entry.status = componentStatus;
  if (componentSince) entry.since = componentSince;
  return entry;
}

export function collectComponentData(cem, tag) {
  // Find the component declaration
  let componentDecl = null;
  findDeclaration:
  for (const mod of cem.modules) {
    for (const decl of mod.declarations || []) {
      if (decl.tagName === tag) {
        componentDecl = decl;
        break findDeclaration;
      }
    }
  }

  if (!componentDecl) return null;

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

  let count = 0;
  for (const name of ALLOW_LIST) {
    const tag = `swc-${name}`;
    console.log(`Extracting properties for ${tag}...`);
    const attrs = collectComponentData(cem, tag);
    if (!attrs) {
      console.warn(`  Warning: ${tag} not found in CEM`);
      continue;
    }

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
