/**
 * Discovers all registered Figma libraries and atomically regenerates components.json.
 *
 * Requires a Figma personal access token in `FIGMA_TOKEN` (sent as the
 * `X-Figma-Token` header) — see https://www.figma.com/developers/api#access-tokens.
 *
 * Usage: node deps/figma/discover-components.js
 */

import {
  existsSync, readFileSync, renameSync, rmSync, writeFileSync,
} from 'fs';
import { randomUUID } from 'node:crypto';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

import { fetchFigmaComponents } from './fetch-figma-components.js';
import { FIGMA_SOURCES } from '../../scripts/utils/figma-sources.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUTPUT_FILE = join(__dirname, 'components.json');

function createApi(token, source, fetchImpl) {
  return async function api(url) {
    const res = await fetchImpl(url, {
      headers: { 'X-Figma-Token': token },
      signal: AbortSignal.timeout(30_000),
    });
    if (!res.ok) {
      throw new Error(`${source.id}: HTTP ${res.status}. Check token scope, file access, and rate limits.`);
    }
    return res.json();
  };
}

export async function discoverFigmaComponents({
  token = process.env.FIGMA_TOKEN,
  outputFile = OUTPUT_FILE,
  sources = FIGMA_SOURCES,
  fetchImpl = fetch,
} = {}) {
  if (!token) {
    throw new Error('Set FIGMA_TOKEN to a Figma personal access token before running discovery.');
  }
  const previous = existsSync(outputFile) ? JSON.parse(readFileSync(outputFile, 'utf8')) : [];
  if (!Array.isArray(previous) || !sources.length) {
    throw new Error('Invalid previous Figma roster or empty source registry.');
  }
  const components = [];
  for (const source of sources) {
    let rows;
    try {
      rows = await fetchFigmaComponents(createApi(token, source, fetchImpl), source);
    } catch (error) {
      throw new Error(`${source.id}: discovery failed. ${error.message}`, { cause: error });
    }
    if (!rows.length) {
      throw new Error(`${source.id}: empty published component-set result. Check library publication.`);
    }
    const oldCount = previous.filter((row) => (row.source ?? 's2-web') === source.id).length;
    if (rows.length < oldCount / 2) {
      throw new Error(`${source.id}: refusing a roster smaller than half the previous count (${rows.length}/${oldCount}).`);
    }
    const nodes = new Set(rows.map((row) => row.figmaPageId));
    if (nodes.size !== rows.length) {
      throw new Error(`${source.id}: duplicate component-set node identity`);
    }
    components.push(...rows);
  }

  components.sort((a, b) => a.platform.localeCompare(b.platform)
    || a.source.localeCompare(b.source)
    || a.name.localeCompare(b.name)
    || a.figmaPageId.localeCompare(b.figmaPageId));
  const temporary = `${outputFile}.${randomUUID()}.tmp`;
  try {
    writeFileSync(temporary, `${JSON.stringify(components, null, 2)}\n`, { flag: 'wx' });
    renameSync(temporary, outputFile);
  } finally {
    rmSync(temporary, { force: true });
  }
  return components;
}

async function main() {
  const components = await discoverFigmaComponents();
  for (const source of FIGMA_SOURCES) {
    console.log(`${source.id}: ${components.filter((row) => row.source === source.id).length} component sets`);
  }
  console.log(`Wrote ${components.length} component(s) to ${OUTPUT_FILE}`);
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  main().catch((err) => {
    console.error(err.message);
    process.exit(1);
  });
}
