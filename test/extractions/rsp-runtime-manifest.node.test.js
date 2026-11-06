import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import {
  buildRuntimeManifest,
  extractRuntimeSpecifiers,
} from '../../deps/rsp/build-playground-runtime-manifest.js';
import {
  createRspRuntimeSource,
  runtimeSourceVersion,
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

      describe('runtimeSourceVersion', () => {
        it('returns the exact committed package version for a source', () => {
          assert.equal(runtimeSourceVersion({
            schemaVersion: 1,
            sources: { s2: { packageVersion: '1.7.1' } },
          }, 's2'), '1.7.1');
        });

        it('rejects a missing or invalid source version', () => {
          assert.throws(() => runtimeSourceVersion({ schemaVersion: 1, sources: {} }, 's2'), /s2.*version/i);
          assert.throws(
            () => runtimeSourceVersion({ schemaVersion: 1, sources: { s2: { packageVersion: 'latest' } } }, 's2'),
            /s2.*version/i,
          );
        });
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
