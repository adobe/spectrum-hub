import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, it } from 'node:test';
import { fileURLToPath } from 'node:url';

import {
  buildValidationReport,
  selectFailureDetails,
} from '../../.github/scripts/extraction-validation-report.js';

const REPORT_SCRIPT = fileURLToPath(
  new URL('../../.github/scripts/extraction-validation-report.js', import.meta.url),
);

describe('extraction validation report CLI', () => {
  it('reports when a failed validation log was not captured', () => {
    const missingLog = join(
      tmpdir(),
      `spectrum-hub-missing-validation-log-${process.pid}.log`,
    );
    const result = spawnSync(
      process.execPath,
      [REPORT_SCRIPT, missingLog, missingLog],
      {
        encoding: 'utf8',
        env: {
          ...process.env,
          LINT_OUTCOME: 'failure',
          TEST_OUTCOME: 'success',
          RUN_URL: 'https://github.com/adobe/spectrum-hub/actions/runs/123',
        },
      },
    );

    assert.equal(result.status, 0, result.stderr);
    assert.ok(
      result.stdout.includes(`The validation logs were not captured: ${missingLog}`),
      result.stdout,
    );
  });
});

describe('buildValidationReport', () => {
  it('reports both validation commands as passed', () => {
    const report = buildValidationReport({
      lintOutcome: 'success',
      testOutcome: 'success',
      lintLog: '',
      testLog: '',
      runUrl: 'https://github.com/adobe/spectrum-hub/actions/runs/123',
    });

    assert.match(report, /Passed: `npm run lint:js`/);
    assert.match(report, /Passed: `npm run test:extractions`/);
    assert.doesNotMatch(report, /\[!WARNING\]/);
  });

  it('warns reviewers and includes concise failure details', () => {
    const report = buildValidationReport({
      lintOutcome: 'success',
      testOutcome: 'failure',
      lintLog: '',
      testLog: [
        'not ok 43 - every mapped component has a per-component shell',
        'mapped components without a shell: menu, thumbnail',
        "code: 'ERR_ASSERTION'",
      ].join('\n'),
      runUrl: 'https://github.com/adobe/spectrum-hub/actions/runs/123',
    });

    assert.match(report, /> \[!WARNING\]/);
    assert.match(report, /Failed: `npm run test:extractions`/);
    assert.match(report, /mapped components without a shell: menu, thumbnail/);
    assert.match(
      report,
      /\[View the workflow run\]\(https:\/\/github\.com\/adobe\/spectrum-hub\/actions\/runs\/123\)/,
    );
  });

  it('includes details only from failed commands', () => {
    const report = buildValidationReport({
      lintOutcome: 'success',
      testOutcome: 'failure',
      lintLog: 'error from a passing command',
      testLog: 'not ok 1 - extraction failed',
      runUrl: 'https://github.com/adobe/spectrum-hub/actions/runs/123',
    });

    assert.doesNotMatch(report, /error from a passing command/);
    assert.match(report, /not ok 1 - extraction failed/);
  });
});

describe('selectFailureDetails', () => {
  it('bounds the number and length of selected lines', () => {
    const oversized = `error ${'x'.repeat(400)}`;
    const log = [
      oversized,
      ...Array.from({ length: 50 }, (_, index) => `not ok ${index} - failed check`),
    ].join('\n');
    const details = selectFailureDetails(log);

    assert.equal(details.length, 40);
    assert.ok(details.every((line) => line.length <= 300));
    assert.ok(!details.includes(oversized));
  });

  it('falls back to the last non-empty lines when no preferred detail matches', () => {
    const lines = Array.from({ length: 45 }, (_, index) => `context line ${index}`);
    const details = selectFailureDetails(lines.join('\n'));

    assert.deepEqual(details, lines.slice(-40));
  });

  it('prioritizes assertion failures over generic error mentions', () => {
    const log = [
      ...Array.from({ length: 45 }, (_, index) => `ok ${index} - handles an error response`),
      'not ok 43 - every mapped component has a per-component shell',
      'mapped components without a shell: menu, thumbnail',
      "code: 'ERR_ASSERTION'",
    ].join('\n');
    const details = selectFailureDetails(log);

    assert.deepEqual(details, [
      'not ok 43 - every mapped component has a per-component shell',
      'mapped components without a shell: menu, thumbnail',
      "code: 'ERR_ASSERTION'",
    ]);
  });
});
