import assert from 'node:assert/strict';
import { afterEach, beforeEach, describe, it } from 'node:test';
import {
  mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';
import { fetchFigmaComponents } from '../../deps/figma/fetch-figma-components.js';
import * as discovery from '../../deps/figma/discover-components.js';
import { FIGMA_SOURCES } from '../../scripts/utils/figma-sources.js';

const AI = {
  id: 'ai-toolkit',
  label: 'Spectrum AI Toolkit',
  platform: 'web',
  fileKey: '3WdX799d7ptEVA6RuTESXs',
};

function response(sets) {
  return { status: 200, error: false, meta: { component_sets: sets } };
}

describe('Figma source fetching', () => {
  it('fetches the requested file and preserves the complete design identity', async () => {
    let requested;
    const rows = await fetchFigmaComponents(async (url) => {
      requested = url;
      return response([{ name: 'Prompt field', node_id: '3161:2278', file_key: AI.fileKey }]);
    }, AI);
    assert.equal(requested, `https://api.figma.com/v1/files/${AI.fileKey}/component_sets`);
    assert.deepEqual(rows, [{
      source: AI.id,
      platform: 'web',
      figmaFile: AI.fileKey,
      name: 'Prompt field',
      figmaPageId: '3161:2278',
    }]);
  });

  describe('Figma roster publication', () => {
    let directory;
    let outputFile;
    const previous = '[{"name":"Button","figmaPageId":"1:1"}]\n';

    beforeEach(() => {
      directory = mkdtempSync(join(tmpdir(), 'spectrum-figma-'));
      outputFile = join(directory, 'components.json');
      writeFileSync(outputFile, previous);
    });

    afterEach(() => rmSync(directory, { recursive: true, force: true }));

    async function discover(options = {}) {
      assert.equal(typeof discovery.discoverFigmaComponents, 'function');
      return discovery.discoverFigmaComponents({
        token: 'fixture-token',
        outputFile,
        fetchImpl: async () => ({
          ok: true,
          json: async () => response([{ name: 'Button', node_id: '1:1' }]),
        }),
        ...options,
      });
    }

    it('publishes every registered source to the canonical filename', async () => {
      const rows = await discover();
      assert.deepEqual(
        new Set(rows.map((row) => row.source)),
        new Set(FIGMA_SOURCES.map((source) => source.id)),
      );
      assert.deepEqual(JSON.parse(readFileSync(outputFile)), rows);
      assert.deepEqual(readdirSync(directory), ['components.json']);
    });

    it('sorts identically regardless of source or response order', async () => {
      const fetchImpl = async () => ({
        ok: true,
        json: async () => response([
          { name: 'Chat', node_id: '2:1' },
          { name: 'Button', node_id: '1:1' },
        ]),
      });
      await discover({ fetchImpl });
      const first = readFileSync(outputFile, 'utf8');
      await discover({ fetchImpl, sources: [...FIGMA_SOURCES].reverse() });
      assert.equal(readFileSync(outputFile, 'utf8'), first);
    });

    it('does not replace the old roster if the last source fails', async () => {
      await assert.rejects(discover({
        fetchImpl: async (url) => {
          if (url.includes(FIGMA_SOURCES.at(-1).fileKey)) {
            return { ok: false, status: 403 };
          }
          return { ok: true, json: async () => response([{ name: 'Button', node_id: '1:1' }]) };
        },
      }), /s2-android.*403/);
      assert.equal(readFileSync(outputFile, 'utf8'), previous);
      assert.deepEqual(readdirSync(directory), ['components.json']);
    });

    [401, 403, 429].forEach((status) => {
      it(`preserves the roster on HTTP ${status}`, async () => {
        await assert.rejects(discover({
          fetchImpl: async () => ({ ok: false, status }),
        }), new RegExp(`s2-web.*${status}`));
        assert.equal(readFileSync(outputFile, 'utf8'), previous);
      });
    });

    it('rejects a missing token before making requests', async () => {
      await assert.rejects(discover({
        token: '',
        fetchImpl: () => assert.fail('must not fetch without credentials'),
      }), /FIGMA_TOKEN/);
      assert.equal(readFileSync(outputFile, 'utf8'), previous);
    });

    it('rejects an empty AI source even when other sources have results', async () => {
      await assert.rejects(discover({
        fetchImpl: async (url) => ({
          ok: true,
          json: async () => response(url.includes(AI.fileKey) ? [] : [{ name: 'Button', node_id: '1:1' }]),
        }),
      }), /ai-toolkit.*empty/);
      assert.equal(readFileSync(outputFile, 'utf8'), previous);
    });

    it('rejects a malformed response without replacing the roster', async () => {
      await assert.rejects(discover({
        fetchImpl: async () => ({ ok: true, json: async () => ({}) }),
      }), /s2-web.*invalid/);
      assert.equal(readFileSync(outputFile, 'utf8'), previous);
    });

    it('checks shrinkage separately against each source', async () => {
      const old = Array.from({ length: 5 }, (_, i) => ({
        name: `AI${i}`,
        figmaPageId: `1:${i}`,
        source: AI.id,
        platform: AI.platform,
        figmaFile: AI.fileKey,
      }));
      writeFileSync(outputFile, JSON.stringify(old));
      await assert.rejects(discover(), /ai-toolkit.*half/);
      assert.deepEqual(JSON.parse(readFileSync(outputFile)), old);
    });

    it('rejects duplicate source/node identities', async () => {
      await assert.rejects(discover({
        fetchImpl: async () => ({
          ok: true,
          json: async () => response([
            { name: 'Chat', node_id: '1:1' },
            { name: 'Other', node_id: '1:1' },
          ]),
        }),
      }), /s2-web.*duplicate/);
      assert.equal(readFileSync(outputFile, 'utf8'), previous);
    });

    it('requires FIGMA_TOKEN on the executable path', () => {
      const result = spawnSync(process.execPath, ['deps/figma/discover-components.js'], {
        encoding: 'utf8', env: { ...process.env, FIGMA_TOKEN: '' },
      });
      assert.equal(result.status, 1);
      assert.match(result.stderr, /FIGMA_TOKEN/);
    });
  });

  it('omits Figma-internal component sets', async () => {
    const rows = await fetchFigmaComponents(async () => response([
      { name: '.Internal', node_id: '1:1' },
      { name: 'Chat', node_id: '1:2' },
    ]), AI);
    assert.deepEqual(rows.map((row) => row.name), ['Chat']);
  });

  for (const [label, body] of [
    ['missing metadata', {}],
    ['non-array sets', { meta: { component_sets: {} } }],
    ['application error', { ...response([]), error: true }],
    ['failed application status', { ...response([]), status: 403 }],
    ['missing name', response([{ node_id: '1:1' }])],
    ['empty name', response([{ name: ' ', node_id: '1:1' }])],
    ['missing node', response([{ name: 'Chat' }])],
    ['invalid node', response([{ name: 'Chat', node_id: '../other' }])],
    ['wrong file', response([{ name: 'Chat', node_id: '1:1', file_key: 'another-file' }])],
  ]) {
    it(`rejects ${label} with source context`, async () => {
      await assert.rejects(fetchFigmaComponents(async () => body, AI), /ai-toolkit/);
    });
  }
});
