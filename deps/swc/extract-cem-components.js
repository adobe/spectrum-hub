/**
 * Extracts component properties from the 2nd-gen Spectrum Web Components package
 * and writes per-component JSON files.
 * 
 * CURRENT: Run this when SWC updates its shared base classes or mixins.
 * Requires a locally generated custom-elements.json from the 2nd-gen SWC repo
 * (cd spectrum-web-components/2nd-gen/packages/swc && yarn analyze). In 2nd-gen,
 * inherited and mixin-provided attributes are already included on the component 
 * declaration.
 * 
 * Usage:
 *   node deps/swc/extract-cem-components.js <path-to-custom-elements.json> (CURRENT: manual workflow for using the unpublished CEM)
 * 
 * 
 * TODO: Fetches or reads the 2nd-gen CEM from @adobe/spectrum-wc, then formats
 * each component declaration's attributes. In 2nd-gen, inherited and
 * mixin-provided attributes are already included on the component declaration.
 *
 * Usage:
 *   node deps/swc/extract-cem-components.js (TODO: can be used once the CEM is published)
 */

import { readFileSync, writeFileSync, mkdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUTPUT_DIR = join(__dirname, 'data');
const COMPONENTS_FILE = join(__dirname, 'components.json');
const PACKAGE_NAME = '@adobe/spectrum-wc';

const ALLOW_LIST = JSON.parse(readFileSync(COMPONENTS_FILE, 'utf8'));

// Currently, the CEM for 2nd-gen SWC is generated in the .storybook directory, 
// so .storybook is included in the url path in case that is what is actually published.
const CDN_URLS = [
  () => `https://unpkg.com/${PACKAGE_NAME}/custom-elements.json`,
  () => `https://unpkg.com/${PACKAGE_NAME}/.storybook/custom-elements.json`,
  () => `https://cdn.jsdelivr.net/npm/${PACKAGE_NAME}/custom-elements.json`,
  () => `https://cdn.jsdelivr.net/npm/${PACKAGE_NAME}/.storybook/custom-elements.json`,
];

async function fetchCEM() {
  for (const buildUrl of CDN_URLS) {
    const url = buildUrl();
    try {
      const res = await fetch(url);
      if (res.ok) return res.json();
    } catch { /* try next CDN */ }
  }
  throw new Error(`Failed to fetch CEM for ${PACKAGE_NAME} from all CDNs`);
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
  if (cemPath) {
    console.log(`Reading CEM from ${cemPath}...`);
    cem = JSON.parse(readFileSync(cemPath, 'utf8'));
  } else {
    console.log(`Fetching CEM for ${PACKAGE_NAME}...`);
    cem = await fetchCEM();
  }

  let count = 0;
  for (const tag of ALLOW_LIST) {
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
