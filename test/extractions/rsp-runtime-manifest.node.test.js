import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import fs, {
  mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import {
  buildRuntimeManifest,
  extractRuntimeSpecifiers,
} from '../../deps/rsp/build-playground-runtime-manifest.js';
import {
  createRspRuntimeSource,
  generateRuntimeManifest,
  writeManifestArtifact,
} from '../../deps/rsp/generate-playground-runtime-manifest.js';

const filesBySource = {
  s2: new Map([
    ['/dist/exports/ActionButton.mjs', `
      import '../src/ActionButton.mjs';
      import '../private/ActionButton.css';
    `],
    ['/dist/src/ActionButton.mjs', `
      import './ProgressCircle.mjs';
    `],
    ['/dist/src/ProgressCircle.mjs', `
      import '../private/ProgressCircle.css';
    `],
    ['/illustrations/gradient/generic1/Image.mjs', 'export default function Image() {}'],
  ]),
  synthetic: new Map([
    ['/dist/exports/AssistantButton.mjs', `
      import '../private/AssistantButton.css';
    `],
  ]),
};

const sources = {
  s2: {
    packageName: '@react-spectrum/s2',
    packageVersion: '1.7.1',
    reactVersion: '19.0.0',
    entries: {
      ActionButton: '/dist/exports/ActionButton.mjs',
    },
    externalModules: {
      ImageIllustration: {
        specifier: '@react-spectrum/s2/illustrations/gradient/generic1/Image',
        entryPath: '/illustrations/gradient/generic1/Image.mjs',
        exportName: 'default',
      },
    },
    pageStyles: ['/page.css'],
    packageFiles: [
      '/page.css',
      '/dist/exports/ActionButton.mjs',
      '/dist/src/ActionButton.mjs',
      '/dist/src/ProgressCircle.mjs',
      '/dist/private/ActionButton.css',
      '/dist/private/ProgressCircle.css',
      '/illustrations/gradient/generic1/Image.mjs',
    ],
    canaries: {
      ActionButton: ['/dist/private/ProgressCircle.css'],
    },
  },
  synthetic: {
    packageName: '@react-spectrum/ai',
    packageVersion: '0.1.0',
    reactVersion: '19.0.0',
    entries: {
      AssistantButton: '/dist/exports/AssistantButton.mjs',
    },
    externalModules: {},
    pageStyles: ['/page.css'],
    packageFiles: [
      '/page.css',
      '/dist/exports/AssistantButton.mjs',
      '/dist/private/AssistantButton.css',
    ],
    canaries: {},
  },
};

function loadModule(sourceId, path) {
  const source = filesBySource[sourceId].get(path);
  if (source === undefined) { throw new Error(`Missing fixture module: ${sourceId}:${path}`); }
  return Promise.resolve(source);
}

function generationFixture(t) {
  const dir = mkdtempSync(join(tmpdir(), 'rsp-generation-'));
  t.after(() => rmSync(dir, { recursive: true, force: true }));
  const componentsPath = join(dir, 'components.json');
  const outputPath = join(dir, 'runtime-manifest.json');
  const versionPath = join(dir, 'version.json');
  writeFileSync(versionPath, '{\n  "s2": "1.8.2",\n  "ai": "0.5.2",\n  "react": "19.3.1"\n}\n');
  writeFileSync(componentsPath, JSON.stringify({
    ActionButton: { interface: 'ActionButtonProps' },
    PixelLoader: { interface: 'PixelLoaderProps', package: 'ai', file: 'loader/react' },
  }));
  const aiMetadata = {
    version: '0.5.2',
    peerDependencies: { react: '^19.0.0' },
    dependencies: { '@react-spectrum/s2': '1.8.2' },
  };
  const responses = new Map([
    ['https://esm.sh/@react-spectrum/ai/package.json', aiMetadata],
    ['https://esm.sh/@react-spectrum/ai@0.5.2/package.json', aiMetadata],
    ['https://esm.sh/@react-spectrum/s2@1.8.2/package.json', {
      version: '1.8.2', peerDependencies: { react: '^19.0.0' },
    }],
    ['https://esm.sh/react@^19.0.0/package.json', { version: '19.3.1' }],
    ['https://esm.sh/react@19.3.1/package.json', { version: '19.3.1' }],
  ]);
  const packageModules = {
    s2: {
      '/page.css': '',
      '/dist/exports/index.mjs': 'export {ActionButton} from "./ActionButton.mjs";',
      '/dist/exports/ActionButton.mjs': 'import "../private/ProgressCircle.css";',
      '/dist/private/ProgressCircle.css': '',
      '/illustrations/gradient/generic1/Image.mjs': 'export default function Image() {}',
    },
    ai: {
      '/dist/exports/index.mjs': 'export {PixelLoader} from "./loader.mjs";',
      '/dist/exports/loader.mjs': 'import {ActionButton} from "@react-spectrum/s2";',
    },
  };
  for (const [id, modules] of Object.entries(packageModules)) {
    const version = id === 's2' ? '1.8.2' : '0.5.2';
    const key = `@react-spectrum/${id}@${version}`;
    responses.set(`https://data.jsdelivr.com/v1/package/npm/${key}/flat`, {
      files: Object.keys(modules).map((name) => ({ name })),
    });
    for (const [path, source] of Object.entries(modules)) {
      responses.set(`https://unpkg.com/${key}${path}`, source);
    }
  }
  const requests = [];
  const fetchImpl = async (url) => {
    requests.push(url);
    assert.ok(responses.has(url), `Unexpected generation request: ${url}`);
    const body = responses.get(url);
    return new Response(typeof body === 'string' ? body : JSON.stringify(body));
  };
  return {
    componentsPath, outputPath, versionPath, fetchImpl, responses, requests,
  };
}

describe('generateRuntimeManifest', () => {
  it('resolves AI once, uses its exact S2 dependency and shares a concrete React release', async (t) => {
    const fixture = generationFixture(t);
    const manifest = await generateRuntimeManifest(fixture);
    assert.equal(manifest.sources.ai.packageVersion, '0.5.2');
    assert.equal(manifest.sources.s2.packageVersion, '1.8.2');
    assert.equal(manifest.sources.ai.reactVersion, '19.3.1');
    assert.equal(manifest.sources.s2.reactVersion, '19.3.1');
    assert.equal(fixture.requests.filter(
      (url) => url === 'https://esm.sh/@react-spectrum/ai/package.json',
    ).length, 1);
    assert.ok(fixture.requests.includes('https://esm.sh/@react-spectrum/s2@1.8.2/package.json'));
    assert.deepEqual(JSON.parse(readFileSync(fixture.outputPath, 'utf8')), manifest);
    assert.deepEqual(JSON.parse(readFileSync(fixture.versionPath, 'utf8')), {
      s2: '1.8.2', ai: '0.5.2', react: '19.3.1',
    });
    assert.equal(manifest.sources.ai.exports.PixelLoader.modules[0].specifier, '/loader');
  });

  it('locked regeneration and check mode never request floating versions or rewrite matching bytes', async (t) => {
    const fixture = generationFixture(t);
    await generateRuntimeManifest(fixture);
    const committed = readFileSync(fixture.outputPath, 'utf8');
    const versions = readFileSync(fixture.versionPath, 'utf8');
    fixture.requests.length = 0;
    await generateRuntimeManifest({ ...fixture, locked: true });
    await generateRuntimeManifest({ ...fixture, check: true });
    assert.equal(readFileSync(fixture.outputPath, 'utf8'), committed);
    assert.equal(readFileSync(fixture.versionPath, 'utf8'), versions);
    assert.equal(fixture.requests.some((url) => /react@\^|\/ai\/package/.test(url)), false);
    assert.ok(fixture.requests.includes('https://esm.sh/@react-spectrum/ai@0.5.2/package.json'));
    assert.ok(fixture.requests.includes('https://esm.sh/react@19.3.1/package.json'));
  });

  it('check mode reports stale bytes without overwriting them', async (t) => {
    const fixture = generationFixture(t);
    await generateRuntimeManifest(fixture);
    const stale = `${readFileSync(fixture.outputPath, 'utf8')} \n`;
    writeFileSync(fixture.outputPath, stale);
    await assert.rejects(generateRuntimeManifest({ ...fixture, check: true }), /stale/i);
    assert.equal(readFileSync(fixture.outputPath, 'utf8'), stale);
  });

  it('rejects an AI S2 dependency range instead of treating it as an exact pin', async (t) => {
    const fixture = generationFixture(t);
    fixture.responses.get('https://esm.sh/@react-spectrum/ai/package.json')
      .dependencies['@react-spectrum/s2'] = '^1.8.2';
    fixture.responses.set(
      'https://esm.sh/@react-spectrum/s2@^1.8.2/package.json',
      fixture.responses.get('https://esm.sh/@react-spectrum/s2@1.8.2/package.json'),
    );
    await assert.rejects(generateRuntimeManifest(fixture), /S2.*version/i);
  });

  it('uses version.json rather than manifest metadata as the locked authority', async (t) => {
    const fixture = generationFixture(t);
    const manifest = await generateRuntimeManifest(fixture);
    manifest.sources.ai.packageVersion = '9.0.0';
    manifest.sources.s2.packageVersion = '8.0.0';
    manifest.sources.ai.reactVersion = 'latest';
    writeFileSync(fixture.outputPath, JSON.stringify(manifest));
    fixture.requests.length = 0;
    const rebuilt = await generateRuntimeManifest({ ...fixture, locked: true });
    assert.equal(rebuilt.sources.ai.packageVersion, '0.5.2');
    assert.equal(rebuilt.sources.s2.packageVersion, '1.8.2');
    assert.equal(rebuilt.sources.ai.reactVersion, '19.3.1');
    assert.equal(fixture.requests.some((url) => url.includes('@9.0.0') || url.includes('@8.0.0')), false);
  });

  it('rebuilds a missing manifest from the version file in locked mode', async (t) => {
    const fixture = generationFixture(t);
    const manifest = await generateRuntimeManifest({ ...fixture, locked: true });
    assert.deepEqual(JSON.parse(readFileSync(fixture.outputPath, 'utf8')), manifest);
    assert.equal(fixture.requests.includes('https://esm.sh/@react-spectrum/ai/package.json'), false);
  });

  it('uses changed version-file pins for check and locked regeneration', async (t) => {
    const fixture = generationFixture(t);
    await generateRuntimeManifest(fixture);
    const committed = readFileSync(fixture.outputPath, 'utf8');
    const pins = '{"s2":"1.8.2","ai":"0.5.2","react":"19.2.0"}';
    writeFileSync(fixture.versionPath, pins);
    fixture.responses.set('https://esm.sh/react@19.2.0/package.json', { version: '19.2.0' });
    await assert.rejects(generateRuntimeManifest({ ...fixture, check: true }), /stale/i);
    assert.equal(readFileSync(fixture.outputPath, 'utf8'), committed);
    assert.equal(readFileSync(fixture.versionPath, 'utf8'), pins);
    const manifest = await generateRuntimeManifest({ ...fixture, locked: true });
    assert.equal(manifest.sources.ai.reactVersion, '19.2.0');
    assert.equal(manifest.sources.s2.reactVersion, '19.2.0');
    assert.match(manifest.sources.ai.exports.PixelLoader.modules[0].url, /react@19\.2\.0/);
    assert.equal(readFileSync(fixture.versionPath, 'utf8'), pins);
  });

  for (const mode of ['locked', 'check']) {
    for (const key of ['ai', 's2', 'react']) {
      it(`${mode} rejects missing, floating, and malformed ${key} pins before any fetch`, async (t) => {
        const fixture = generationFixture(t);
        writeFileSync(fixture.outputPath, 'existing manifest');
        for (const value of [undefined, 'latest', '^1.8.2', '01.8.2', '1.8.2-01', 123]) {
          const pins = { ai: '0.5.2', s2: '1.8.2', react: '19.3.1', [key]: value };
          const invalid = JSON.stringify(pins);
          writeFileSync(fixture.versionPath, invalid);
          await assert.rejects(generateRuntimeManifest({ ...fixture, [mode]: true }), /exact version/i);
          assert.equal(fixture.requests.length, 0);
          assert.equal(readFileSync(fixture.outputPath, 'utf8'), 'existing manifest');
          assert.equal(readFileSync(fixture.versionPath, 'utf8'), invalid);
        }
      });
    }

    it(`${mode} requires version.json even when the manifest exists`, async (t) => {
      const fixture = generationFixture(t);
      await generateRuntimeManifest(fixture);
      rmSync(fixture.versionPath);
      await assert.rejects(generateRuntimeManifest({ ...fixture, [mode]: true }), { code: 'ENOENT' });
    });
  }

  for (const [id, version] of [['ai', '0.5.2'], ['s2', '1.8.2'], ['react', '19.3.1']]) {
    it(`rejects ${id} metadata that disagrees with the requested pin`, async (t) => {
      const fixture = generationFixture(t);
      await generateRuntimeManifest(fixture);
      const committed = readFileSync(fixture.outputPath, 'utf8');
      const packageName = id === 'react' ? 'react' : `@react-spectrum/${id}`;
      fixture.responses.get(`https://esm.sh/${packageName}@${version}/package.json`)
        .version = '9.0.0';
      await assert.rejects(generateRuntimeManifest({ ...fixture, locked: true }), /version.*pin/i);
      assert.equal(readFileSync(fixture.outputPath, 'utf8'), committed);
    });
  }

  it('rejects an AI S2 dependency different from the selected version-file pin', async (t) => {
    const fixture = generationFixture(t);
    fixture.responses.get('https://esm.sh/@react-spectrum/ai@0.5.2/package.json')
      .dependencies['@react-spectrum/s2'] = '1.9.0';
    await assert.rejects(generateRuntimeManifest({ ...fixture, locked: true }), /S2.*1\.8\.2.*1\.9\.0/);
  });

  for (const [id, version] of [['ai', '0.5.2'], ['s2', '1.8.2']]) {
    it(`rejects React incompatible with ${id}'s peer range without writing either artifact`, async (t) => {
      const fixture = generationFixture(t);
      await generateRuntimeManifest(fixture);
      const before = [fixture.versionPath, fixture.outputPath].map((path) => readFileSync(path, 'utf8'));
      fixture.responses.get(`https://esm.sh/@react-spectrum/${id}@${version}/package.json`)
        .peerDependencies.react = '^18.0.0';
      await assert.rejects(generateRuntimeManifest({ ...fixture, locked: true }), /react.*19\.3\.1.*18\.0\.0/i);
      assert.deepEqual(
        [fixture.versionPath, fixture.outputPath].map((path) => readFileSync(path, 'utf8')),
        before,
      );
    });

    it(`rejects ReactDOM incompatible with ${id}'s peer range`, async (t) => {
      const fixture = generationFixture(t);
      fixture.responses.get(`https://esm.sh/@react-spectrum/${id}@${version}/package.json`)
        .peerDependencies['react-dom'] = '^18.0.0';
      await assert.rejects(generateRuntimeManifest({ ...fixture, locked: true }), /react-dom.*19\.3\.1.*18\.0\.0/i);
    });
  }

  it('check reports a missing manifest without creating it', async (t) => {
    const fixture = generationFixture(t);
    await assert.rejects(generateRuntimeManifest({ ...fixture, check: true }), /manifest is missing/i);
    assert.equal(fs.existsSync(fixture.outputPath), false);
  });

  it('check rejects manifest pins inconsistent with version.json without writing either file', async (t) => {
    const fixture = generationFixture(t);
    const manifest = await generateRuntimeManifest(fixture);
    manifest.sources.s2.reactVersion = '18.0.0';
    const stale = JSON.stringify(manifest);
    const pins = readFileSync(fixture.versionPath, 'utf8');
    writeFileSync(fixture.outputPath, stale);
    await assert.rejects(generateRuntimeManifest({ ...fixture, check: true }), /stale/i);
    assert.equal(readFileSync(fixture.outputPath, 'utf8'), stale);
    assert.equal(readFileSync(fixture.versionPath, 'utf8'), pins);
  });

  it('check does not rewrite matching artifacts, including version-file formatting', async (t) => {
    const fixture = generationFixture(t);
    await generateRuntimeManifest(fixture);
    const pins = '{"react":"19.3.1","ai":"0.5.2","s2":"1.8.2"}';
    writeFileSync(fixture.versionPath, pins);
    const writes = t.mock.method(fs, 'writeFileSync', () => assert.fail('check must not write'));
    await generateRuntimeManifest({ ...fixture, check: true });
    assert.equal(writes.mock.callCount(), 0);
    assert.equal(readFileSync(fixture.versionPath, 'utf8'), pins);
  });

  it('unlocked generation replaces both stale artifacts only after building successfully', async (t) => {
    const fixture = generationFixture(t);
    writeFileSync(fixture.versionPath, '{"s2":"1.0.0","ai":"0.1.0","react":"18.0.0"}');
    writeFileSync(fixture.outputPath, 'old manifest');
    await generateRuntimeManifest(fixture);
    assert.deepEqual(JSON.parse(readFileSync(fixture.versionPath, 'utf8')), {
      s2: '1.8.2', ai: '0.5.2', react: '19.3.1',
    });
    assert.equal(JSON.parse(readFileSync(fixture.outputPath, 'utf8')).sources.ai.packageVersion, '0.5.2');
  });

  it('a failed unlocked graph build preserves both existing artifacts', async (t) => {
    const fixture = generationFixture(t);
    const pins = '{"s2":"1.0.0","ai":"0.1.0","react":"18.0.0"}';
    writeFileSync(fixture.versionPath, pins);
    writeFileSync(fixture.outputPath, 'old manifest');
    fixture.responses.set(
      'https://unpkg.com/@react-spectrum/s2@1.8.2/dist/exports/ActionButton.mjs',
      'import "../private/Missing.css";',
    );
    await assert.rejects(generateRuntimeManifest(fixture), /missing package module/i);
    assert.equal(readFileSync(fixture.versionPath, 'utf8'), pins);
    assert.equal(readFileSync(fixture.outputPath, 'utf8'), 'old manifest');
    assert.deepEqual(readdirSync(join(fixture.outputPath, '..')).sort(), [
      'components.json', 'runtime-manifest.json', 'version.json',
    ]);
  });

  it('rolls back both artifacts if publishing the second file fails', async (t) => {
    const fixture = generationFixture(t);
    writeFileSync(fixture.versionPath, 'old pins');
    writeFileSync(fixture.outputPath, 'old manifest');
    const rename = fs.renameSync;
    let renames = 0;
    t.mock.method(fs, 'renameSync', (...args) => {
      renames += 1;
      if (renames === 2) { throw new Error('injected publish failure'); }
      return rename(...args);
    });
    await assert.rejects(generateRuntimeManifest(fixture), /injected publish failure/);
    assert.equal(readFileSync(fixture.versionPath, 'utf8'), 'old pins');
    assert.equal(readFileSync(fixture.outputPath, 'utf8'), 'old manifest');
    assert.deepEqual(readdirSync(join(fixture.outputPath, '..')).sort(), [
      'components.json', 'runtime-manifest.json', 'version.json',
    ]);
  });

  it('removes a newly published artifact on failure when neither artifact existed', async (t) => {
    const fixture = generationFixture(t);
    rmSync(fixture.versionPath);
    const rename = fs.renameSync;
    let renames = 0;
    t.mock.method(fs, 'renameSync', (...args) => {
      renames += 1;
      if (renames === 2) { throw new Error('injected publish failure'); }
      return rename(...args);
    });
    await assert.rejects(generateRuntimeManifest(fixture), /injected publish failure/);
    assert.deepEqual(readdirSync(join(fixture.outputPath, '..')), ['components.json']);
  });

  it('preserves both artifacts when staging the new version file fails', async (t) => {
    const fixture = generationFixture(t);
    writeFileSync(fixture.versionPath, 'old pins');
    writeFileSync(fixture.outputPath, 'old manifest');
    const write = fs.writeFileSync;
    t.mock.method(fs, 'writeFileSync', (path, ...args) => {
      if (path.startsWith(`${fixture.versionPath}.`) && path.endsWith('.tmp')) {
        throw new Error('injected staging failure');
      }
      return write(path, ...args);
    });
    await assert.rejects(generateRuntimeManifest(fixture), /injected staging failure/);
    assert.equal(readFileSync(fixture.versionPath, 'utf8'), 'old pins');
    assert.equal(readFileSync(fixture.outputPath, 'utf8'), 'old manifest');
    assert.deepEqual(readdirSync(join(fixture.outputPath, '..')).sort(), [
      'components.json', 'runtime-manifest.json', 'version.json',
    ]);
  });
});

describe('extractRuntimeSpecifiers', () => {
  it('finds static imports, re-exports, and literal dynamic imports', () => {
    const source = `
      import './one.mjs';
      export { value } from "./two.mjs";
      const three = import('./three.mjs');
      import(variable);
    `;
    assert.deepEqual(extractRuntimeSpecifiers(source), [
      './one.mjs',
      './two.mjs',
      './three.mjs',
    ]);
  });
});

describe('buildRuntimeManifest', () => {
  it('records S2 dependencies reached by AI exports and preserves loader subpaths', async () => {
    const ai = {
      ...sources.synthetic,
      packageName: '@react-spectrum/ai',
      dependencies: { '@react-spectrum/s2': '1.7.1' },
      modulePaths: { AssistantButton: '/loader' },
    };
    const manifest = await buildRuntimeManifest({ ai }, {
      loadModule: async () => 'import {ActionButton as Button} from "@react-spectrum/s2";',
    });
    assert.deepEqual(manifest.sources.ai.dependencies, ai.dependencies);
    assert.deepEqual(manifest.sources.ai.exports.AssistantButton.supportExports, ['ActionButton']);
    assert.equal(manifest.sources.ai.exports.AssistantButton.modules[0].specifier, '/loader');
  });

  it('keeps package graphs and styles isolated by runtime source', async () => {
    const manifest = await buildRuntimeManifest(sources, { loadModule });

    assert.deepEqual(manifest.sources.s2.exports.ActionButton.styles, [
      '/dist/private/ActionButton.css',
      '/dist/private/ProgressCircle.css',
      '/page.css',
    ]);
    assert.deepEqual(manifest.sources.synthetic.exports.AssistantButton.styles, [
      '/dist/private/AssistantButton.css',
      '/page.css',
    ]);
    assert.equal(
      manifest.sources.synthetic.exports.AssistantButton.styles.some((path) => path.includes('ProgressCircle')),
      false,
    );
  });

  describe('createRspRuntimeSource', () => {
    it('rejects floating package metadata rather than emitting a floating descriptor', () => {
      assert.throws(() => createRspRuntimeSource({
        packageMetadata: { version: 'latest', peerDependencies: { react: '^19' } },
        packageFiles: ['/illustrations/gradient/generic1/Image.mjs'],
        components: {},
      }), /RSP.*version/i);
    });

    it('uses the AI loader entry and only the AI portion of the roster', () => {
      const source = createRspRuntimeSource({
        packageMetadata: {
          version: '0.5.2',
          peerDependencies: { react: '^19' },
          dependencies: { '@react-spectrum/s2': '1.8.2' },
        },
        packageFiles: [
          '/dist/exports/loader.mjs', '/dist/private/loader/react.mjs',
          '/dist/private/Chat.mjs', '/dist/private/Button.mjs',
        ],
        components: {
          PixelLoader: { interface: 'PixelLoaderProps', package: 'ai', file: 'loader/react' },
          Chat: { interface: 'ChatProps', package: 'ai' },
          Button: { interface: 'ButtonProps' },
        },
        publicRootSource: 'export {$chat as Chat, $button as Button};',
        sourceConfig: {
          packageName: '@react-spectrum/ai', pageStyles: [], externalModules: {}, canaries: {},
        },
      });
      assert.equal(source.entries.PixelLoader, '/dist/exports/loader.mjs');
      assert.equal(source.entries.Chat, '/dist/private/Chat.mjs');
      assert.equal(source.entries.Button, undefined);
      assert.deepEqual(source.dependencies, { '@react-spectrum/s2': '1.8.2' });
    });
    it('builds exact-version entries from the discovered component roster', () => {
      const source = createRspRuntimeSource({
        packageMetadata: {
          version: '1.7.1',
          peerDependencies: { react: '^19.0.0-rc.1' },
        },
        packageFiles: [
          '/page.css',
          '/dist/exports/ActionButton.mjs',
          '/dist/exports/index.mjs',
          '/dist/private/ProgressCircle.css',
          '/illustrations/gradient/generic1/Image.mjs',
        ],
        components: { ActionButton: { interface: 'ActionButtonProps' } },
        publicRootSource: 'export { ActionButton } from "./ActionButton.mjs";',
      });

      assert.equal(source.packageVersion, '1.7.1');
      assert.equal(source.reactVersion, '19.0.0-rc.1');
      assert.equal(source.entries.ActionButton, '/dist/exports/ActionButton.mjs');
      assert.equal(
        source.externalModules.ImageIllustration.entryPath,
        '/illustrations/gradient/generic1/Image.mjs',
      );
    });

    it('omits an internal declaration that is not a published runtime export', () => {
      const source = createRspRuntimeSource({
        packageMetadata: { version: '1.7.1', peerDependencies: { react: '^19' } },
        packageFiles: [
          '/page.css',
          '/dist/exports/index.mjs',
          '/dist/private/ClearButton.mjs',
          '/illustrations/gradient/generic1/Image.mjs',
        ],
        components: { ClearButton: { interface: 'ClearButtonProps' } },
        publicRootSource: 'export { Button } from "./Button.mjs";',
      });

      assert.deepEqual(source.entries, {});
    });

    it('maps a root-only public export to its private runtime origin for CSS crawling', () => {
      const source = createRspRuntimeSource({
        packageMetadata: { version: '1.7.1', peerDependencies: { react: '^19' } },
        packageFiles: [
          '/page.css',
          '/dist/exports/index.mjs',
          '/dist/private/DialogTrigger.mjs',
          '/illustrations/gradient/generic1/Image.mjs',
        ],
        components: { DialogTrigger: { interface: 'DialogTriggerProps' } },
        publicRootSource: `
          import {DialogTrigger as $dialog} from "../private/DialogTrigger.mjs";
          export {$dialog as DialogTrigger};
        `,
      });

      assert.equal(source.entries.DialogTrigger, '/dist/private/DialogTrigger.mjs');
    });
  });

  describe('writeManifestArtifact', () => {
    it('preserves non-missing filesystem errors in check mode', (t) => {
      const dir = mkdtempSync(join(tmpdir(), 'rsp-manifest-'));
      t.after(() => rmSync(dir, { recursive: true, force: true }));
      assert.throws(
        () => writeManifestArtifact(dir, { schemaVersion: 1, sources: {} }, { check: true }),
        { code: 'EISDIR' },
      );
    });

    it('writes stable JSON with a trailing newline', () => {
      const dir = mkdtempSync(join(tmpdir(), 'rsp-manifest-'));
      const path = join(dir, 'runtime-manifest.json');
      try {
        writeManifestArtifact(path, { schemaVersion: 1, sources: {} });
        assert.equal(
          readFileSync(path, 'utf8'),
          '{\n  "schemaVersion": 1,\n  "sources": {}\n}\n',
        );
      } finally {
        rmSync(dir, { recursive: true, force: true });
      }
    });

    it('fails check mode when the committed artifact is stale', () => {
      const dir = mkdtempSync(join(tmpdir(), 'rsp-manifest-'));
      const path = join(dir, 'runtime-manifest.json');
      try {
        writeFileSync(path, '{}\n');
        assert.throws(
          () => writeManifestArtifact(path, { schemaVersion: 1, sources: {} }, { check: true }),
          /regenerate/i,
        );
      } finally {
        rmSync(dir, { recursive: true, force: true });
      }
    });

    it('accepts check mode when the committed bytes match', () => {
      const dir = mkdtempSync(join(tmpdir(), 'rsp-manifest-'));
      const path = join(dir, 'runtime-manifest.json');
      try {
        const manifest = { schemaVersion: 1, sources: {} };
        writeManifestArtifact(path, manifest);
        assert.doesNotThrow(() => writeManifestArtifact(path, manifest, { check: true }));
      } finally {
        rmSync(dir, { recursive: true, force: true });
      }
    });
  });

  it('emits concrete runtime descriptors for exports and external modules', async () => {
    const manifest = await buildRuntimeManifest({ s2: sources.s2 }, { loadModule });
    const source = manifest.sources.s2;

    assert.deepEqual(source.exports.ActionButton.modules, [{
      exportName: 'ActionButton',
      url: 'https://esm.sh/@react-spectrum/s2@1.7.1?bundle&exports=ActionButton&deps=react@19.0.0,react-dom@19.0.0',
    }]);
    assert.deepEqual(source.externalModules.ImageIllustration.modules, [{
      exportName: 'default',
      url: 'https://esm.sh/@react-spectrum/s2@1.7.1/illustrations/gradient/generic1/Image?deps=react@19.0.0,react-dom@19.0.0',
    }]);
  });

  it('sorts source, export, module, and style output deterministically', async () => {
    const reversed = Object.fromEntries(Object.entries(sources).reverse());
    const manifest = await buildRuntimeManifest(reversed, { loadModule });

    assert.deepEqual(Object.keys(manifest.sources), ['s2', 'synthetic']);
    assert.deepEqual(Object.keys(manifest.sources.s2.exports), ['ActionButton']);
    assert.deepEqual(
      manifest.sources.s2.allStyles,
      ['/dist/private/ActionButton.css', '/dist/private/ProgressCircle.css', '/page.css'],
    );
  });

  it('fails closed when a configured entry cannot be loaded', async () => {
    const broken = structuredClone(sources.s2);
    broken.entries.ActionButton = '/dist/exports/Missing.mjs';

    await assert.rejects(
      buildRuntimeManifest({ s2: broken }, { loadModule }),
      /Missing fixture module: s2:\/dist\/exports\/Missing\.mjs/,
    );
  });

  it('fails closed when a required CSS canary disappears', async () => {
    const broken = structuredClone(sources.s2);
    broken.canaries.ActionButton = ['/dist/private/Missing.css'];

    await assert.rejects(
      buildRuntimeManifest({ s2: broken }, { loadModule }),
      /ActionButton.*Missing\.css/,
    );
  });
});
