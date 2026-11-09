import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { existsSync, readFileSync } from 'node:fs';

const path = new URL('../../.github/workflows/validate-figma-discovery.yml', import.meta.url);
function workflow() {
  assert.ok(existsSync(path), 'A manual authenticated Figma validation workflow must exist');
  return readFileSync(path, 'utf8');
}

describe('authenticated Figma validation workflow', () => {
  it('only runs on explicit manual dispatch with read-only repository permission', () => {
    const source = workflow();
    assert.match(source, /workflow_dispatch:/);
    assert.match(source, /contents: read/);
    assert.doesNotMatch(source, /pull_request(?:_target)?:|schedule:|contents: write/);
  });

  it('checks out trusted default-branch code without persisting credentials', () => {
    const source = workflow();
    assert.match(source, /github\.ref_name != github\.event\.repository\.default_branch/);
    assert.match(source, /ref: \$\{\{ github\.event\.repository\.default_branch \}\}/);
    assert.match(source, /persist-credentials: false/);
  });

  it('injects the Figma credential only into discovery without rebuilding legacy consumers', () => {
    const source = workflow();
    assert.match(source, /FIGMA_TOKEN: \$\{\{ secrets\.FIGMA_TOKEN \}\}/);
    const discovery = source.indexOf('node deps/figma/discover-components.js');
    assert.ok(discovery >= 0);
    assert.doesNotMatch(source, /node deps\/build-status-index\.js/);
    assert.doesNotMatch(source, /git (?:commit|push)|gh pr create|upload-artifact/);
  });
});
