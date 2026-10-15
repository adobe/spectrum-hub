import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';

const REPOSITORY_ROOT = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  '../..',
);
const CONFIG_PATH = path.join(REPOSITORY_ROOT, 'playwright.visual.deployed.config.js');

function importDeployedConfig(env = {}, source = `import(${JSON.stringify(CONFIG_PATH)})`) {
  return spawnSync(
    process.execPath,
    ['--input-type=module', '--eval', source],
    {
      cwd: REPOSITORY_ROOT,
      encoding: 'utf8',
      env: {
        ...process.env,
        ...env,
        VISUAL_BASE_URL: env.VISUAL_BASE_URL,
      },
    },
  );
}

test('deployed visual config requires VISUAL_BASE_URL', () => {
  const result = importDeployedConfig();

  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /VISUAL_BASE_URL is required/);
});

test('deployed visual config accepts an explicit HTTPS preview URL', () => {
  const result = importDeployedConfig({
    VISUAL_BASE_URL: 'https://example.com',
  });

  assert.equal(result.status, 0, result.stderr);
});

test('deployed visual config serializes remote requests through one worker', () => {
  const result = importDeployedConfig(
    { VISUAL_BASE_URL: 'https://example.com' },
    `const { default: config } = await import(${JSON.stringify(CONFIG_PATH)});
     console.log(config.workers);`,
  );

  assert.equal(result.status, 0, result.stderr);
  assert.equal(result.stdout.trim(), '1');
});
