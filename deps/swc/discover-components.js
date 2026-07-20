/**
 * Discovers component tag names from the 2nd-gen Spectrum Web Components CEM
 * and regenerates components.json.
 *
 * Enumerates every declaration with a `tagName`, dedupes, and sorts. No status
 * filter: `internal` components (for example swc-asset, swc-icon) are still
 * documented in the hub, so they are kept. The published CEM is the source of
 * truth, so components.json is a generated artifact — do not hand-edit it.
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
 * Returns the sorted, deduped list of every `swc-*` tag name in the CEM.
 * Every declaration with a `tagName` is included regardless of `status`.
 */
export function collectTags(cem) {
  const tags = new Set();
  for (const mod of cem.modules || []) {
    for (const decl of mod.declarations || []) {
      if (!decl.tagName) continue;
      tags.add(decl.tagName);
    }
  }
  return [...tags].sort((a, b) => a.localeCompare(b));
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

  const tags = collectTags(cem);
  writeFileSync(OUTPUT_FILE, JSON.stringify(tags, null, 2) + '\n');
  console.log(`Wrote ${tags.length} tag(s) to ${OUTPUT_FILE}`);
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  main().catch((err) => {
    console.error(err);
    process.exit(1);
  });
}
