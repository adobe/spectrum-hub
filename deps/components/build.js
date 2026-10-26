import { globSync } from 'node:fs';
import { writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { build } from 'esbuild';

export async function buildComponents({
  srcDir = fileURLToPath(new URL('./src/', import.meta.url)),
  outDir = fileURLToPath(new URL('./dist/', import.meta.url)),
} = {}) {
  const entries = globSync('**/index.js', { cwd: srcDir })
    .map((entry) => entry.replaceAll('\\', '/'))
    .sort();
  if (entries.includes('index.js')) {
    throw new Error('components/src/index.js is reserved for the generated importing entry.');
  }
  if (!entries.length) {
    throw new Error(`No component index.js entries found in ${srcDir}`);
  }

  await build({
    entryPoints: entries.map((entry) => resolve(srcDir, entry)),
    outbase: srcDir,
    outdir: outDir,
    bundle: true,
    format: 'esm',
    minify: true,
  });

  const imports = entries.map((entry) => `import './${entry}';`).join('\n');
  await writeFile(resolve(outDir, 'index.js'), `${imports}\n`);
}

if (import.meta.main) {
  await buildComponents();
}
