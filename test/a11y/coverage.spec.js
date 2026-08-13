import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { test, expect } from './axe-test.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const BLOCKS_DIR = path.resolve(__dirname, '../../blocks');

// Blocks intentionally excluded from a11y coverage.
// fragment: renders arbitrary CMS-authored content passed through verbatim — there's no
// fixed markup to assert against, so an a11y scan of a canned mock wouldn't test anything real.
const EXCLUDED = new Set(['fragment']);

test('every block under blocks/ has its own test/a11y/blocks/<name>.spec.js', () => {
  const blockDirs = fs.readdirSync(BLOCKS_DIR, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name)
    .filter((name) => !EXCLUDED.has(name))
    .sort();

  const hasOwnSpec = (name) => fs.existsSync(path.join(__dirname, 'blocks', `${name}.spec.js`));
  const missing = blockDirs.filter((name) => !hasOwnSpec(name));

  expect(
    missing,
    `Add test/a11y/fixtures/<name>.html + test/a11y/blocks/<name>.spec.js for: ${missing.join(', ')} (see AGENTS.md § Accessibility tests)`,
  ).toHaveLength(0);
});
