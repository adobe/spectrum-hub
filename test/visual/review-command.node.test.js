import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';

import {
  DEFAULT_UI_PORT,
  PLAYWRIGHT_IMAGE,
  buildVisualCommand,
  runVisualCommand,
} from './review-command.js';

const REPOSITORY_ROOT = '/repo';
const SHELL_PROGRAM = 'npm ci --quiet && exec npx playwright test "$@"';
const CLI_PATH = path.join(
  path.dirname(fileURLToPath(import.meta.url)),
  'review.js',
);

test('builds a localhost-only local review command', () => {
  const command = buildVisualCommand({
    action: 'review',
    suite: 'local',
    forwardedArgs: [
      'test/visual/blocks/card.spec.js',
      '--project=desktop-light',
    ],
    cwd: REPOSITORY_ROOT,
    env: {},
  });

  assert.equal(DEFAULT_UI_PORT, 9323);
  assert.equal(command.executable, 'docker');
  assert.deepEqual(command.args, [
    'run',
    '--rm',
    '--ipc=host',
    '--init',
    '-p',
    '127.0.0.1:9323:9323',
    '-v',
    '/repo:/work',
    '-v',
    '/work/node_modules',
    '-w',
    '/work',
    PLAYWRIGHT_IMAGE,
    'bash',
    '-lc',
    SHELL_PROGRAM,
    'visual-review',
    '--config=playwright.visual.config.js',
    '--ui',
    '--ui-host=0.0.0.0',
    '--ui-port=9323',
    '--update-snapshots=none',
    'test/visual/blocks/card.spec.js',
    '--project=desktop-light',
  ]);
});

test('passes a deployed preview URL as a Docker environment argument', () => {
  const command = buildVisualCommand({
    action: 'review',
    suite: 'deployed',
    forwardedArgs: ['pattern-library.spec.js'],
    cwd: REPOSITORY_ROOT,
    env: {
      VISUAL_BASE_URL: 'https://example.com/preview?ref=a&mode=test',
    },
  });

  assert.deepEqual(command.args.slice(12, 16), [
    '-e',
    'VISUAL_BASE_URL=https://example.com/preview?ref=a&mode=test',
    PLAYWRIGHT_IMAGE,
    'bash',
  ]);
  assert.ok(command.args.includes('--config=playwright.visual.deployed.config.js'));
  assert.equal(
    command.args.find((argument) => argument === SHELL_PROGRAM),
    SHELL_PROGRAM,
  );
});

test('builds a targeted approval command without UI options', () => {
  const command = buildVisualCommand({
    action: 'approve',
    suite: 'local',
    forwardedArgs: [
      'test/visual/blocks/card.spec.js',
      '--project=desktop-light',
    ],
    cwd: REPOSITORY_ROOT,
    env: {},
  });

  assert.ok(command.args.includes('--update-snapshots'));
  assert.ok(!command.args.includes('--ui'));
  assert.ok(!command.args.includes('-p'));
  assert.deepEqual(command.args.slice(-3), [
    '--update-snapshots',
    'test/visual/blocks/card.spec.js',
    '--project=desktop-light',
  ]);
});

test('keeps title filters with shell metacharacters as positional arguments', () => {
  const title = 'card renders $HOME; echo unsafe';
  const command = buildVisualCommand({
    action: 'approve',
    suite: 'local',
    forwardedArgs: ['--grep', title, '--project=desktop-light'],
    cwd: REPOSITORY_ROOT,
    env: {},
  });

  assert.equal(command.args.at(-2), title);
  assert.equal(command.args.filter((argument) => argument === title).length, 1);
  assert.ok(!SHELL_PROGRAM.includes(title));
});

test('requires a file or title filter for approval', () => {
  for (const forwardedArgs of [
    [],
    ['--project=desktop-light'],
    ['--project', 'desktop-light'],
    ['--workers=1'],
  ]) {
    assert.throws(
      () => buildVisualCommand({
        action: 'approve',
        suite: 'local',
        forwardedArgs,
        cwd: REPOSITORY_ROOT,
        env: {},
      }),
      /Visual baseline approval requires a test file or title filter/,
    );
  }
});

test('accepts supported file and title approval filters', () => {
  for (const forwardedArgs of [
    ['test/visual/blocks/card.spec.js'],
    ['test/visual/blocks/'],
    ['-g', 'card default'],
    ['--grep', 'card default'],
    ['--grep=card default'],
  ]) {
    assert.doesNotThrow(() => buildVisualCommand({
      action: 'approve',
      suite: 'local',
      forwardedArgs,
      cwd: REPOSITORY_ROOT,
      env: {},
    }));
  }
});

test('rejects unknown actions and suites', () => {
  assert.throws(
    () => buildVisualCommand({
      action: 'replace',
      suite: 'local',
      forwardedArgs: [],
      cwd: REPOSITORY_ROOT,
      env: {},
    }),
    /Unknown visual action: replace/,
  );

  assert.throws(
    () => buildVisualCommand({
      action: 'review',
      suite: 'production',
      forwardedArgs: [],
      cwd: REPOSITORY_ROOT,
      env: {},
    }),
    /Unknown visual suite: production/,
  );
});

test('requires an absolute HTTP or HTTPS deployed URL', () => {
  for (const VISUAL_BASE_URL of [
    undefined,
    '/relative',
    'file:///tmp/preview',
    'not a URL',
  ]) {
    assert.throws(
      () => buildVisualCommand({
        action: 'review',
        suite: 'deployed',
        forwardedArgs: [],
        cwd: REPOSITORY_ROOT,
        env: { VISUAL_BASE_URL },
      }),
      /VISUAL_BASE_URL (is required|must be an absolute HTTP or HTTPS URL)/,
    );
  }
});

test('rejects options owned by the wrapper', () => {
  const forbiddenArguments = [
    '--config=other.js',
    '--config',
    '-c',
    '-cother.js',
    '--update-snapshots',
    '--update-snapshots=all',
    '-u',
    '-uall',
    '--ui',
    '--ui-host=localhost',
    '--ui-port=1234',
  ];

  for (const argument of forbiddenArguments) {
    assert.throws(
      () => buildVisualCommand({
        action: 'review',
        suite: 'local',
        forwardedArgs: [argument],
        cwd: REPOSITORY_ROOT,
        env: {},
      }),
      /is managed by the visual review command/,
    );
  }
});

test('runs Docker with inherited standard streams', () => {
  const calls = [];
  const status = runVisualCommand({
    action: 'review',
    suite: 'local',
    forwardedArgs: ['test/visual/blocks/card.spec.js'],
    cwd: REPOSITORY_ROOT,
    env: {},
  }, {
    spawn(executable, args, options) {
      calls.push({ executable, args, options });
      return { status: 0 };
    },
  });

  assert.equal(status, 0);
  assert.equal(calls.length, 1);
  assert.equal(calls[0].executable, 'docker');
  assert.equal(calls[0].options.stdio, 'inherit');
});

test('preserves a nonzero Docker exit status', () => {
  const status = runVisualCommand({
    action: 'review',
    suite: 'local',
    forwardedArgs: [],
    cwd: REPOSITORY_ROOT,
    env: {},
  }, {
    spawn() {
      return { status: 7 };
    },
  });

  assert.equal(status, 7);
});

test('reports when Docker cannot start', () => {
  assert.throws(
    () => runVisualCommand({
      action: 'review',
      suite: 'local',
      forwardedArgs: [],
      cwd: REPOSITORY_ROOT,
      env: {},
    }, {
      spawn() {
        return { error: new Error('spawn docker ENOENT'), status: null };
      },
    }),
    /Unable to start Docker: spawn docker ENOENT/,
  );
});

test('CLI reports validation errors and exits nonzero', () => {
  const result = spawnSync(
    process.execPath,
    [CLI_PATH, 'replace', 'local'],
    { encoding: 'utf8' },
  );

  assert.equal(result.status, 1);
  assert.match(result.stderr, /Unknown visual action: replace/);
});
