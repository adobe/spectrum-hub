/**
 * Discovers components from the 2nd-gen Spectrum Web Components CEM and
 * regenerates components.json.
 *
 * Enumerates every declaration with a `tagName` and maps the bare component
 * name (tag without the `swc-` prefix) to the esm.sh module subpath its code
 * ships from — derived from the declaration's module `path` (its directory).
 * That subpath encodes provenance: `components/<name>` for standard components,
 * `patterns/<pattern>/<name>` for pattern members, so the shape upstream ships
 * (components/ vs patterns/<name>/) is preserved without a hand-maintained map.
 *
 * No status filter: `internal` components (for example swc-asset, swc-icon) are
 * still documented in the hub, so they are kept. The published CEM is the
 * source of truth, so components.json is a generated artifact — do not
 * hand-edit it.
 *
 * Usage:
 *   node deps/swc/discover-components.js
 *   node deps/swc/discover-components.js <path-to-custom-elements.json> (local build)
 */

import { readFileSync, writeFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

import { fetchCEM } from './extract-cem-components.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUTPUT_FILE = join(__dirname, 'components.json');

/**
 * Returns the module subpath a declaration ships from: the directory of its
 * module `path` (e.g. `components/tabs/Tab.ts` -> `components/tabs`).
 */
function subpathFor(modulePath) {
  return modulePath.replace(/\/[^/]*$/, '');
}

/**
 * Maps every `swc-*` component to its esm.sh module subpath, keyed by the bare
 * name (tag without the `swc-` prefix), sorted for a stable artifact. Every
 * declaration with a `tagName` is included regardless of `status`.
 *
 * A tag can be declared more than once (a component plus its base class); the
 * base ships from `../core/...`, which escapes the published package root, so
 * those declarations are skipped and the first in-package declaration wins.
 */
export function collectComponents(cem) {
  const components = {};
  for (const mod of cem.modules || []) {
    const path = mod.path || '';
    if (path.startsWith('../')) continue;
    for (const decl of mod.declarations || []) {
      if (!decl.tagName) continue;
      const name = decl.tagName.replace(/^swc-/, '');
      if (name in components) continue; // first in-package declaration wins
      components[name] = subpathFor(path);
    }
  }
  return Object.fromEntries(
    Object.keys(components)
      .sort((a, b) => a.localeCompare(b))
      .map((name) => [name, components[name]]),
  );
}

async function main() {
  const cemPath = process.argv[2];
  let cem;
  if (cemPath) {
    console.log(`Reading CEM from ${cemPath}...`);
    cem = JSON.parse(readFileSync(cemPath, 'utf8'));
  } else {
    console.log('Fetching CEM for @adobe/spectrum-wc...');
    cem = await fetchCEM();
  }

  const components = collectComponents(cem);
  writeFileSync(OUTPUT_FILE, JSON.stringify(components, null, 2) + '\n');
  console.log(`Wrote ${Object.keys(components).length} component(s) to ${OUTPUT_FILE}`);
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  main().catch((err) => {
    console.error(err);
    process.exit(1);
  });
}
