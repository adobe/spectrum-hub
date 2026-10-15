import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const MAX_DETAIL_LINES = 40;
const MAX_LINE_LENGTH = 300;
const PRIMARY_DETAIL_PATTERN = /not ok|ERR_|AssertionError|mapped components without a shell/i;
const SECONDARY_DETAIL_PATTERN = /error|failed/i;

function truncateLine(line) {
  return line.slice(0, MAX_LINE_LENGTH);
}

export function selectFailureDetails(log) {
  const lines = String(log)
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean);
  const primary = lines.filter((line) => PRIMARY_DETAIL_PATTERN.test(line));
  const secondary = lines.filter((line) => SECONDARY_DETAIL_PATTERN.test(line));
  const preferred = primary.length ? primary : secondary;
  const selected = preferred.length
    ? preferred.slice(0, MAX_DETAIL_LINES)
    : lines.slice(-MAX_DETAIL_LINES);

  return selected.map(truncateLine);
}

export function buildValidationReport({
  lintOutcome,
  testOutcome,
  lintLog,
  testLog,
  runUrl,
}) {
  const validations = [
    { command: 'npm run lint:js', outcome: lintOutcome, log: lintLog },
    { command: 'npm run test:extractions', outcome: testOutcome, log: testLog },
  ];
  const failed = validations.filter(({ outcome }) => outcome !== 'success');
  const lines = ['## Validation', ''];

  if (failed.length) {
    lines.push(
      '> [!WARNING]',
      '> Validation failed. This pull request contains new release data, but it is not',
      '> ready to merge. Resolve the failures below before merging.',
      '',
    );
  }

  for (const { command, outcome } of validations) {
    lines.push(`- ${outcome === 'success' ? 'Passed' : 'Failed'}: \`${command}\``);
  }

  if (failed.length) {
    lines.push('', `[View the workflow run](${runUrl})`, '', '### Failure details', '');
    for (const { command, log } of failed) {
      lines.push(`#### \`${command}\``, '');
      const details = selectFailureDetails(log);
      if (details.length) {
        lines.push(...details.map((line) => `    ${line}`));
      } else {
        lines.push('    No concise failure details were captured. Review the workflow log.');
      }
      lines.push('');
    }
  }

  return `${lines.join('\n').trimEnd()}\n`;
}

function readLog(path) {
  if (!path) { return ''; }
  try {
    return readFileSync(path, 'utf8');
  } catch (error) {
    if (error.code === 'ENOENT') {
      return `The validation logs were not captured: ${path}`;
    }
    throw error;
  }
}

function main() {
  const [lintPath, testPath] = process.argv.slice(2);
  const report = buildValidationReport({
    lintOutcome: process.env.LINT_OUTCOME,
    testOutcome: process.env.TEST_OUTCOME,
    lintLog: readLog(lintPath),
    testLog: readLog(testPath),
    runUrl: process.env.RUN_URL,
  });
  process.stdout.write(report);
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  main();
}
