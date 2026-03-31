/**
 * Extracts mixin/base class properties from a full Spectrum Web Components CEM.
 *
 * Run this when SWC updates its shared base classes or mixins.
 * Requires a locally generated custom-elements.json from the SWC repo
 * (cd spectrum-web-components/1st-gen && yarn cem analyze --outdir .)
 *
 * Usage: node deps/swc/extract-cem-mixins.js <path-to-custom-elements.json>
 */

import { readFileSync, writeFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUTPUT_FILE = join(__dirname, 'data', 'sp-mixins.json');

const cemPath = process.argv[2];
if (!cemPath) {
  console.error(
    'Usage: node deps/swc/generate-mixins.mjs <path-to-custom-elements.json>'
  );
  process.exit(1);
}

const cem = JSON.parse(readFileSync(cemPath, 'utf8'));

// Find all class names referenced as inheritedFrom in any component's attributes
const inheritedNames = new Set();
for (const mod of cem.modules) {
  for (const decl of mod.declarations || []) {
    for (const a of decl.attributes || []) {
      if (a.inheritedFrom) {
        inheritedNames.add(a.inheritedFrom.name);
      }
    }
  }
}

// For each inherited class, collect its own (non-inherited) attributes
const mixins = {};
for (const name of [...inheritedNames].sort()) {
  const attrs = [];
  for (const mod of cem.modules) {
    for (const decl of mod.declarations || []) {
      if (decl.name !== name) continue;
      for (const a of decl.attributes || []) {
        if (a.inheritedFrom) continue;
        if (attrs.find((e) => e.attribute === a.name)) continue;
        const entry = {
          attribute: a.name,
          property: a.fieldName,
          type: a.type?.text,
        };
        if (a.default) entry.default = a.default;
        if (a.description) entry.description = a.description;
        attrs.push(entry);
      }
    }
  }
  if (attrs.length > 0) mixins[name] = attrs;
}

writeFileSync(OUTPUT_FILE, JSON.stringify(mixins, null, 2) + '\n');
console.log(
  `Wrote ${Object.keys(mixins).length} mixin(s) to ${OUTPUT_FILE}`
);
