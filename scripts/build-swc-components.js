/**
 * Bundles each SWC component's registration entry point into a self-contained
 * ESM file so the browser can import it without bare specifiers or an import
 * map.
 *
 * Input:  every deps/swc/swc-dist/{components,patterns}/**\/*.js file that
 *         calls defineElement("swc-{component}", ...) — the entry file name
 *         itself varies (components/* use swc-{component}.js; patterns/* use
 *         index.js), so entries are found by content, not by naming convention.
 * Output: deps/swc/bundled/swc-{component}.js
 *
 * Run:    node scripts/build-swc-components.js
 *         node scripts/build-swc-components.js button   ← single component
 *
 * deps/swc/swc-dist/ is gitignored (vendored 2nd-gen SWC build output, not
 * published to npm) — if it's missing, see "Vendoring swc-dist" in
 * deps/swc/README.md to (re)populate it before running this.
 */

import { build } from 'esbuild';
import { readdir, readFile, mkdir } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(fileURLToPath(import.meta.url), '../../');
const SWC_DIST = join(ROOT, 'deps/swc/swc-dist');
const OUT_DIR = join(ROOT, 'deps/swc/bundled');
const CORE_PATH = join(SWC_DIST, 'core');

// The imported `defineElement` binding is minified to a different alias per
// file (e.g. `import { defineElement as t } from "...";`), so resolve that
// file-local alias first, then match only its call site — e.g. `t("swc-foo", e);`.
// Matching the tag-name string literal alone is too broad: components also
// dispatch CustomEvents named "swc-{component}-{verb}" (e.g.
// "swc-message-feedback-change"), which share the same `(` + quoted-string
// shape and would otherwise be mistaken for a second component registration.
const DEFINE_ELEMENT_IMPORT_RE = /defineElement\s+as\s+(\w+)\s*}\s*from\s*["']@spectrum-web-components\/core\/element\/index\.js["']/;

function findRegistration(source) {
  const importMatch = source.match(DEFINE_ELEMENT_IMPORT_RE);
  if (!importMatch) return null;

  const alias = importMatch[1];
  const callMatch = source.match(new RegExp(`\\b${alias}\\(\\s*["']swc-([a-z0-9-]+)["']`));
  return callMatch ? callMatch[1] : null;
}

async function findComponentEntries(dir) {
  let dirents;
  try {
    dirents = await readdir(dir, { withFileTypes: true });
  } catch {
    return []; // optional trees (e.g. patterns/) may not exist in older vendoring snapshots
  }

  const found = [];
  for (const dirent of dirents) {
    const full = join(dir, dirent.name);

    if (dirent.isDirectory()) {
      if (full === CORE_PATH) continue; // shared runtime, not a bundlable component
      found.push(...(await findComponentEntries(full)));
      continue;
    }

    if (!dirent.name.endsWith('.js') || dirent.name.endsWith('.d.ts')) continue;

    const source = await readFile(full, 'utf8');
    const component = findRegistration(source);
    if (component) {
      found.push({ component, entry: full });
    }
  }

  return found;
}

async function getComponentEntries() {
  const all = [
    ...(await findComponentEntries(join(SWC_DIST, 'components'))),
    ...(await findComponentEntries(join(SWC_DIST, 'patterns'))),
  ];

  // Keep the first entry found per tag name in case a component is ever
  // vendored under more than one path.
  const byName = new Map();
  for (const candidate of all) {
    if (!byName.has(candidate.component)) byName.set(candidate.component, candidate);
  }
  return [...byName.values()];
}

async function bundleComponent({ component, entry }) {
  const outfile = join(OUT_DIR, `swc-${component}.js`);

  await build({
    entryPoints: [entry],
    outfile,
    bundle: true,
    format: 'esm',
    platform: 'browser',
    minify: false,
    sourcemap: false,
    logLevel: 'warning',
    alias: {
      '@spectrum-web-components/core': CORE_PATH,
    },
  });

  console.log(`  ✓ swc-${component}.js`);
}

async function main() {
  const filter = process.argv[2];
  const all = await getComponentEntries();
  const components = filter ? all.filter((c) => c.component === filter) : all;

  if (!components.length) {
    console.error(filter ? `No component "${filter}" found in ${SWC_DIST}` : `No components found in ${SWC_DIST}`);
    process.exit(1);
  }

  await mkdir(OUT_DIR, { recursive: true });
  console.log(`Bundling ${components.length} component(s) → deps/swc/bundled/\n`);

  const results = await Promise.allSettled(components.map(bundleComponent));

  const failures = results
    .map((r, i) => ({ component: components[i].component, result: r }))
    .filter(({ result }) => result.status === 'rejected');

  if (failures.length) {
    console.error(`\n${failures.length} component(s) failed:`);
    failures.forEach(({ component, result }) => {
      console.error(`  ✗ swc-${component}: ${result.reason?.message ?? result.reason}`);
    });
    process.exit(1);
  }

  console.log('\nDone.');
}

main();
