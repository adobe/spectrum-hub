/**
 * Extracts component properties from Spectrum Web Components npm packages
 * and writes per-component JSON files.
 *
 * Fetches each component's CEM from unpkg, walks internal inheritance,
 * and merges in shared mixin properties from sp-mixins.json.
 *
 * Usage: node deps/swc/extract-cem-components.js
 */

import { readFileSync, writeFileSync, mkdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUTPUT_DIR = join(__dirname, 'data');
const MIXINS_FILE = join(__dirname, 'data', 'sp-mixins.json');
const COMPONENTS_FILE = join(__dirname, 'components.json');

const ALLOW_LIST = JSON.parse(readFileSync(COMPONENTS_FILE, 'utf8'));

const CDN_URLS = [
  (pkg) => `https://unpkg.com/@spectrum-web-components/${pkg}/custom-elements.json`,
  (pkg) => `https://cdn.jsdelivr.net/npm/@spectrum-web-components/${pkg}/custom-elements.json`,
];

async function fetchCEM(packageName) {
  for (const buildUrl of CDN_URLS) {
    const url = buildUrl(packageName);
    try {
      const res = await fetch(url);
      if (res.ok) return res.json();
    } catch { /* try next CDN */ }
  }
  throw new Error(`Failed to fetch CEM for ${packageName} from all CDNs`);
}

function findDecl(cem, name) {
  for (const mod of cem.modules) {
    for (const decl of mod.declarations || []) {
      if (decl.name === name) return decl;
    }
  }
  return null;
}

function formatAttr(a, inheritedFrom) {
  const entry = {
    attribute: a.name,
    property: a.fieldName,
    type: a.type?.text,
  };
  if (a.default) entry.default = a.default;
  if (a.description) entry.description = a.description;
  if (inheritedFrom) entry.inheritedFrom = inheritedFrom;
  return entry;
}

/**
 * Walks the CEM inheritance chain to collect all attributes,
 * including from internal superclasses. Stops at external package
 * boundaries (handled via sp-mixins.json).
 */
function collectFromCEM(cem, className, seen = new Set()) {
  if (seen.has(className)) return [];
  seen.add(className);

  const decl = findDecl(cem, className);
  if (!decl) return [];

  const attrs = (decl.attributes || [])
    .filter((a) => !a.inheritedFrom)
    .map((a) => formatAttr(a, className === seen.values().next().value ? undefined : className));

  // Walk internal superclass
  if (decl.superclass?.module && !decl.superclass.package) {
    attrs.push(...collectFromCEM(cem, decl.superclass.name, seen));
  }

  // Walk internal mixins
  for (const m of decl.mixins || []) {
    if (m.module && !m.package) {
      attrs.push(...collectFromCEM(cem, m.name, seen));
    }
  }

  return attrs;
}

/**
 * Collects external mixin/superclass names referenced by a component
 * and its internal ancestors.
 */
function collectExternalRefs(cem, className, seen = new Set()) {
  if (seen.has(className)) return [];
  seen.add(className);

  const decl = findDecl(cem, className);
  if (!decl) return [];

  const refs = [];

  if (decl.superclass?.package) {
    refs.push(decl.superclass.name);
  } else if (decl.superclass?.module) {
    refs.push(...collectExternalRefs(cem, decl.superclass.name, seen));
  }

  for (const m of decl.mixins || []) {
    if (m.package) {
      refs.push(m.name);
    } else if (m.module) {
      refs.push(...collectExternalRefs(cem, m.name, seen));
    }
  }

  return refs;
}

async function main() {
  const mixins = JSON.parse(readFileSync(MIXINS_FILE, 'utf8'));
  mkdirSync(OUTPUT_DIR, { recursive: true });

  let count = 0;
  for (const [tag, pkg] of Object.entries(ALLOW_LIST)) {
    console.log(`Fetching CEM for ${tag} (@spectrum-web-components/${pkg})...`);
    const cem = await fetchCEM(pkg);

    // Find the component declaration
    let componentClass = null;
    for (const mod of cem.modules) {
      for (const decl of mod.declarations || []) {
        if (decl.tagName === tag) {
          componentClass = decl.name;
          break;
        }
      }
    }

    if (!componentClass) {
      console.warn(`  Warning: ${tag} not found in CEM`);
      continue;
    }

    // Collect own + internal inherited attributes
    const attrs = collectFromCEM(cem, componentClass);

    // Collect and merge external mixin attributes
    const externalRefs = collectExternalRefs(cem, componentClass);
    for (const ref of externalRefs) {
      if (mixins[ref]) {
        for (const a of mixins[ref]) {
          attrs.push({ ...a, inheritedFrom: ref });
        }
      } else {
        console.warn(`  Warning: "${ref}" referenced by ${tag} not found in sp-mixins.json — run extract-cem-mixins.js to update`);
      }
    }

    // Deduplicate by attribute name (first wins)
    const seen = new Set();
    const deduped = attrs.filter((a) => {
      if (seen.has(a.attribute)) return false;
      seen.add(a.attribute);
      return true;
    });

    const file = join(OUTPUT_DIR, `${tag}.json`);
    writeFileSync(file, JSON.stringify(deduped, null, 2) + '\n');
    console.log(`  Wrote ${deduped.length} properties to ${tag}.json`);
    count++;
  }

  console.log(`Done. Wrote ${count} component file(s) to ${OUTPUT_DIR}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
