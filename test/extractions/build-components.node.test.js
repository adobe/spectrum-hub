import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import {
  mkdir, mkdtemp, readFile, rm, writeFile,
} from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, it } from 'node:test';
import { pathToFileURL } from 'node:url';

const buildUrl = new URL('../../deps/components/build.js', import.meta.url);

async function setup(t, files) {
  const root = await mkdtemp(join(tmpdir(), 'spectrum-components-'));
  t.after(() => rm(root, { recursive: true, force: true }));
  const srcDir = join(root, 'src');
  const outDir = join(root, 'dist');
  await mkdir(srcDir);
  for (const [path, content] of Object.entries(files)) {
    const file = join(srcDir, path);
    await mkdir(join(file, '..'), { recursive: true });
    await writeFile(file, content);
  }
  assert.ok(existsSync(buildUrl), 'The component build script must exist');
  const { buildComponents } = await import(buildUrl);
  return { srcDir, outDir, build: () => buildComponents({ srcDir, outDir }) };
}

describe('component dependency build', () => {
  it('bundles recursive index.js entries into matching dist paths', async (t) => {
    const { outDir, build } = await setup(t, {
      'swc-tooltip/index.js': "import { value } from './value.js'; export const component = value;",
      'swc-tooltip/value.js': "export const value = 'bundled tooltip';",
      'nested/swc-tabs/index.js': "export const component = 'nested tabs';",
    });

    await build();

    const tooltip = await import(pathToFileURL(join(outDir, 'swc-tooltip/index.js')));
    const tabs = await import(pathToFileURL(join(outDir, 'nested/swc-tabs/index.js')));
    assert.equal(tooltip.component, 'bundled tooltip');
    assert.equal(tabs.component, 'nested tabs');
    assert.equal(existsSync(join(outDir, 'swc-tooltip/value.js')), false);
  });

  it('generates deterministic side-effect imports of only current component outputs', async (t) => {
    const { srcDir, outDir, build } = await setup(t, {
      'swc-tooltip/index.js': 'export const tooltip = true;',
      'nested/swc-tabs/index.js': 'export const tabs = true;',
    });
    await mkdir(join(outDir, 'stale'), { recursive: true });
    await writeFile(join(outDir, 'stale/index.js'), 'export const stale = true;');

    await build();

    assert.equal(await readFile(join(outDir, 'index.js'), 'utf8'), [
      "import './nested/swc-tabs/index.js';",
      "import './swc-tooltip/index.js';",
      '',
    ].join('\n'));

    await rm(join(srcDir, 'nested'), { recursive: true });
    await build();
    assert.equal(
      await readFile(join(outDir, 'index.js'), 'utf8'),
      "import './swc-tooltip/index.js';\n",
    );
  });

  it('rejects an empty source tree instead of producing an empty root entry', async (t) => {
    const { outDir, build } = await setup(t, {});

    await assert.rejects(build(), /No component index\.js entries found/);
    assert.equal(existsSync(join(outDir, 'index.js')), false);
  });

  it('reserves the root index.js for the generated importing entry', async (t) => {
    const { build } = await setup(t, {
      'index.js': "import './swc-tooltip/index.js';",
      'swc-tooltip/index.js': 'export const tooltip = true;',
    });

    await assert.rejects(build(), /src\/index\.js is reserved/);
  });

  it('propagates bundling errors without generating a root entry', async (t) => {
    const { outDir, build } = await setup(t, {
      'swc-tooltip/index.js': "import './missing.js';",
    });

    await assert.rejects(build(), /Could not resolve/);
    assert.equal(existsSync(join(outDir, 'index.js')), false);
  });

  it('loads only the tooltip output from sitenav', async () => {
    const source = await readFile(new URL('../../blocks/sitenav/sitenav.js', import.meta.url), 'utf8');

    assert.ok(source.includes("import '../../deps/components/dist/swc-tooltip/index.js';"));
    assert.ok(!source.includes("import '../../deps/components/dist/index.js';"));
  });
});
