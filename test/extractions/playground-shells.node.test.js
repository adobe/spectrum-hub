import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '../..');
const SHELLS = [
  'blocks/playground/preview/index.html',
];

describe('playground preview lifecycle baseline', () => {
  for (const path of SHELLS) {
    it(`${path} reports its first successful mount`, () => {
      const source = readFileSync(join(ROOT, path), 'utf8');
      assert.match(source, /send\(\{\s*type:\s*['"]preview-mounted['"]/);
    });
  }

  it('uses the parent-owned initialization payload without package discovery', () => {
    const source = readFileSync(join(ROOT, 'blocks/playground/preview/index.html'), 'utf8');
    assert.match(source, /type:\s*['"]shell-ready['"]/);
    assert.match(source, /['"]preview-init['"]/);
    assert.doesNotMatch(source, /package\.json|data\.jsdelivr\.com/);
  });
});
