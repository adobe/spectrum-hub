/**
 * Discovers component sets from the S2 · Web Figma file and regenerates
 * component-status.json.
 *
 * Requires a Figma personal access token in `FIGMA_TOKEN` (sent as the
 * `X-Figma-Token` header) — see https://www.figma.com/developers/api#access-tokens.
 *
 * Usage:
 *   FIGMA_TOKEN=... node deps/figma/discover-components.js
 */

import { writeFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

import { fetchFigmaComponents } from './fetch-figma-components.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUTPUT_FILE = join(__dirname, 'component-status.json');

function createApi(token) {
  return async function api(url) {
    const res = await fetch(url, { headers: { 'X-Figma-Token': token } });
    if (!res.ok) throw new Error(`HTTP ${res.status} for ${url}`);
    return res.json();
  };
}

async function main() {
  const token = process.env.FIGMA_TOKEN;
  if (!token) {
    console.error('Set FIGMA_TOKEN to a Figma personal access token before running this script.');
    process.exit(1);
  }
  const api = createApi(token);

  console.log('Fetching component sets from the S2 · Web Figma file...');
  const components = await fetchFigmaComponents(api);

  const sorted = [...components].sort((a, b) => a.name.localeCompare(b.name));
  writeFileSync(OUTPUT_FILE, JSON.stringify(sorted, null, 2) + '\n');
  console.log(`Wrote ${sorted.length} component(s) to ${OUTPUT_FILE}`);
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  main().catch((err) => {
    console.error(err);
    process.exit(1);
  });
}
