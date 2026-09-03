import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

// The nightly extractions commit their own output, and both of the ways they do that
// reference repo paths as bare strings that nothing else resolves. Renaming a file the
// code no longer mentions therefore leaves the workflow pointing at nothing, and the
// failure surfaces only on the next scheduled run — as a red cron nobody is watching,
// hours after the merge that caused it.
//
// This has bitten twice: extract-rsp-properties kept running extract-base-props.js after
// it was deleted, and both workflows kept `git add`-ing impl-aliases.js after it became
// impl-component-names.js. `git add` on a missing pathspec is a hard error, not a
// warning, so that one takes the whole commit step down and the run pushes nothing.
//
// Scans every workflow rather than the two extraction ones, so a new workflow is covered
// without being added here.
const ROOT = join(dirname(fileURLToPath(import.meta.url)), '../..');
const WORKFLOWS = join(ROOT, '.github/workflows');

function workflowFiles() {
  return readdirSync(WORKFLOWS).filter((file) => /\.ya?ml$/.test(file));
}

// A `${{ ... }}` expression is resolved by Actions at run time, not by us — any argument
// containing one is skipped rather than guessed at.
const isLiteral = (token) => token && !token.includes('${{');

function referencesIn(source, pattern, take) {
  const found = [];
  for (const line of source.split('\n')) {
    const match = line.match(pattern);
    if (match) { found.push(...take(match)); }
  }
  return found.filter(isLiteral);
}

describe('workflow file references resolve', () => {
  for (const file of workflowFiles()) {
    const source = readFileSync(join(WORKFLOWS, file), 'utf8');

    // `git add a/ b.json c.js` — every pathspec must exist, or the step aborts.
    it(`${file}: every git-add pathspec exists`, () => {
      const paths = referencesIn(source, /git add (.+)$/, (m) => m[1].trim().split(/\s+/));
      const missing = paths.filter((path) => !existsSync(join(ROOT, path)));
      assert.deepEqual(missing, [], `${file} git-adds paths that do not exist`);
    });

    // `run: node deps/rsp/extract-props.js` — the script must exist, or the step fails.
    it(`${file}: every node script exists`, () => {
      const scripts = referencesIn(source, /run:\s*node\s+(\S+)/, (m) => [m[1]]);
      const missing = scripts.filter((path) => !existsSync(join(ROOT, path)));
      assert.deepEqual(missing, [], `${file} runs scripts that do not exist`);
    });
  }
});
