import { spawnSync } from 'node:child_process';

export const PLAYWRIGHT_IMAGE = 'mcr.microsoft.com/playwright:v1.62.1-noble';
export const DEFAULT_UI_PORT = 9323;

const SHELL_PROGRAM = 'npm ci --quiet && exec npx playwright test "$@"';
const CONFIGS = {
  local: 'playwright.visual.config.js',
  deployed: 'playwright.visual.deployed.config.js',
};
const FORBIDDEN_OPTIONS = [
  '--config',
  '-c',
  '--update-snapshots',
  '-u',
  '-u',
  '--ui',
  '--ui-host',
  '--ui-port',
];
const OPTIONS_WITH_VALUES = new Set([
  '--project',
  '--workers',
  '--reporter',
  '--grep-invert',
  '-G',
  '--max-failures',
  '--output',
  '--repeat-each',
  '--retries',
  '--shard',
  '--timeout',
]);

function validateForwardedArgs(forwardedArgs) {
  for (const argument of forwardedArgs) {
    const forbiddenOption = FORBIDDEN_OPTIONS.find(
      (option) => argument === option
        || argument.startsWith(`${option}=`)
        || (!option.startsWith('--') && argument.startsWith(option)),
    );

    if (forbiddenOption) {
      throw new Error(`${forbiddenOption} is managed by the visual review command.`);
    }
  }
}

function hasApprovalTarget(forwardedArgs) {
  for (let index = 0; index < forwardedArgs.length; index += 1) {
    const argument = forwardedArgs[index];

    if (argument === '-g' || argument === '--grep') {
      return Boolean(forwardedArgs[index + 1]);
    }

    if (argument.startsWith('--grep=')) {
      return argument.length > '--grep='.length;
    }

    if (OPTIONS_WITH_VALUES.has(argument)) {
      index += 1;
    } else if (!argument.startsWith('-')
      && (argument.includes('/') || /\.spec\.[cm]?[jt]s$/.test(argument))) {
      return true;
    }
  }

  return false;
}

function validateDeployedURL(visualBaseURL) {
  if (!visualBaseURL) {
    throw new Error('VISUAL_BASE_URL is required for deployed visual tests.');
  }

  let parsedURL;
  try {
    parsedURL = new URL(visualBaseURL);
  } catch {
    throw new Error('VISUAL_BASE_URL must be an absolute HTTP or HTTPS URL.');
  }

  if (!['http:', 'https:'].includes(parsedURL.protocol)) {
    throw new Error('VISUAL_BASE_URL must be an absolute HTTP or HTTPS URL.');
  }
}

export function buildVisualCommand({
  action,
  suite,
  forwardedArgs,
  cwd,
  env,
}) {
  if (!['review', 'approve'].includes(action)) {
    throw new Error(`Unknown visual action: ${action}`);
  }

  const config = CONFIGS[suite];
  if (!config) {
    throw new Error(`Unknown visual suite: ${suite}`);
  }

  validateForwardedArgs(forwardedArgs);

  if (action === 'approve' && !hasApprovalTarget(forwardedArgs)) {
    throw new Error('Visual baseline approval requires a test file or title filter.');
  }

  if (suite === 'deployed') {
    validateDeployedURL(env.VISUAL_BASE_URL);
  }

  const args = [
    'run',
    '--rm',
    '--ipc=host',
    '--init',
  ];

  if (action === 'review') {
    args.push('-p', `127.0.0.1:${DEFAULT_UI_PORT}:${DEFAULT_UI_PORT}`);
  }

  args.push(
    '-v',
    `${cwd}:/work`,
    '-v',
    '/work/node_modules',
    '-w',
    '/work',
  );

  if (suite === 'deployed') {
    args.push('-e', `VISUAL_BASE_URL=${env.VISUAL_BASE_URL}`);
  }

  args.push(
    PLAYWRIGHT_IMAGE,
    'bash',
    '-lc',
    SHELL_PROGRAM,
    'visual-review',
    `--config=${config}`,
  );

  if (action === 'review') {
    args.push(
      '--ui',
      '--ui-host=0.0.0.0',
      `--ui-port=${DEFAULT_UI_PORT}`,
      '--update-snapshots=none',
    );
  } else {
    args.push('--update-snapshots');
  }

  args.push(...forwardedArgs);

  return {
    executable: 'docker',
    args,
  };
}

export function runVisualCommand(options, { spawn = spawnSync } = {}) {
  const command = buildVisualCommand(options);
  const result = spawn(command.executable, command.args, {
    stdio: 'inherit',
  });

  if (result.error) {
    throw new Error(`Unable to start Docker: ${result.error.message}`);
  }

  if (typeof result.status !== 'number') {
    throw new Error('Docker exited without a status code.');
  }

  return result.status;
}
