/**
 * Bundles each SWC component's entry point into a self-contained ESM file so
 * the browser can import it without bare specifiers or an import map.
 *
 * Input:  deps/swc/swc-dist/components/{component}/swc-{component}.js
 * Output: deps/swc/bundled/{component}.js
 *
 * Run:    node scripts/build-swc-components.js
 *         node scripts/build-swc-components.js button   ← single component
 *
 * deps/swc/swc-dist/ is gitignored (vendored 2nd-gen SWC build output, not
 * published to npm) — if it's missing, see "Vendoring swc-dist" in
 * deps/swc/README.md to (re)populate it before running this.
 */

import { build } from 'esbuild';
import { readdir, mkdir } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(fileURLToPath(import.meta.url), '../../');
const SWC_DIST = join(ROOT, 'deps/swc/swc-dist/components');
const OUT_DIR = join(ROOT, 'deps/swc/bundled');

async function getComponents() {
  const entries = await readdir(SWC_DIST, { withFileTypes: true });
  return entries
    .filter((e) => e.isDirectory())
    .map((e) => e.name)
    .filter((name) => existsSync(join(SWC_DIST, name, `swc-${name}.js`)));
}

const CORE_PATH = join(ROOT, 'deps/swc/swc-dist/core');

async function bundleComponent(component) {
  const entry = join(SWC_DIST, component, `swc-${component}.js`);
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
  const components = filter ? [filter] : await getComponents();

  if (!components.length) {
    console.error('No components found in', SWC_DIST);
    process.exit(1);
  }

  await mkdir(OUT_DIR, { recursive: true });
  console.log(`Bundling ${components.length} component(s) → deps/swc/bundled/\n`);

  const results = await Promise.allSettled(components.map(bundleComponent));

  const failures = results
    .map((r, i) => ({ component: components[i], result: r }))
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
