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
const EXTRACTION_WORKFLOWS = [
  'extract-rsp-properties.yml',
  'extract-swc-properties.yml',
];

describe('RSP runtime manifest workflow', () => {
  const extraction = readFileSync(join(WORKFLOWS, 'extract-rsp-properties.yml'), 'utf8');
  const pullRequestTests = readFileSync(join(WORKFLOWS, 'test.yml'), 'utf8');

  it('locks discovery and extraction to one generated runtime version', () => {
    const resolve = extraction.indexOf('run: node deps/rsp/generate-playground-runtime-manifest.js\n');
    const discover = extraction.indexOf('run: node deps/rsp/discover-components.js');
    const locked = extraction.indexOf('run: node deps/rsp/generate-playground-runtime-manifest.js --locked');
    const extract = extraction.indexOf('run: node deps/rsp/extract-props.js');

    assert.ok(resolve >= 0, 'runtime versions must be resolved');
    assert.ok(resolve < discover, 'runtime version resolution must precede discovery');
    assert.ok(discover < locked, 'the final manifest must use the discovered roster');
    assert.ok(locked < extract, 'property extraction must use the final locked manifest');
  });

  it('stages the generated runtime manifest', () => {
    assert.match(extraction, /git add[^\n]*deps\/rsp\/playground\/runtime-manifest\.json/);
  });

  it('checks committed manifest drift in pull requests', () => {
    assert.match(
      pullRequestTests,
      /generate-playground-runtime-manifest\.js --check/,
    );
  });
});

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

function stepBlocks(source) {
  const lines = source.split('\n');
  const blocks = [];

  for (let i = 0; i < lines.length; i += 1) {
    if (/^\s{6}- name: /.test(lines[i])) {
      let end = lines.length;
      for (let j = i + 1; j < lines.length; j += 1) {
        if (/^\s{6}- name: /.test(lines[j])) {
          end = j;
          break;
        }
      }

      blocks.push({
        start: i,
        text: lines.slice(i, end).join('\n'),
      });
      i = end - 1;
    }
  }

  return blocks;
}

function conditionalSteps(source, condition) {
  return stepBlocks(source).filter(
    ({ text }) => text.includes(`if: steps.stage.outputs.changed == '${condition}'`),
  );
}

// A YAML block-scalar header is `|` or `>` optionally followed by an indentation
// indicator (1-9) and/or a chomping indicator (+/-), in either order — `|-`, `|+`,
// `|2`, `|2-`, `|-2` are all valid. One shared pattern (rather than a near-duplicate
// used only to test the line, and a second used only to extract its groups) is the
// fix here: two copies of the same alternation drift apart the moment either one is
// edited, and the drift shows up as exactly this kind of "valid header rejected" bug.
const RUN_SCALAR_HEADER = /^(?<baseIndent>\s{8})run:\s*\|(?:(?<indent>[1-9])(?<chomp>[+-])?|(?<chomp2>[+-])(?<indent2>[1-9])?)?\s*$/;

function runBlock(step) {
  if (!step) { return ''; }

  const lines = step.text.split('\n');
  const runIndex = lines.findIndex((line) => RUN_SCALAR_HEADER.test(line));
  if (runIndex === -1) { return ''; }

  const match = lines[runIndex].match(RUN_SCALAR_HEADER);
  const explicitIndent = Number(match?.groups?.indent ?? match?.groups?.indent2 ?? 0);
  const content = lines.slice(runIndex + 1);
  const indents = content
    .filter((line) => line.trim())
    .map((line) => line.match(/^ */)[0].length);
  let trimBy = 0;

  if (explicitIndent) {
    trimBy = match.groups.baseIndent.length + explicitIndent;
  } else if (indents.length) {
    trimBy = Math.min(...indents);
  }

  return content
    .map((line) => line.slice(Math.min(trimBy, line.length)))
    .join('\n')
    .trimEnd();
}

// Returns `{ text, start }` per logical command: `text` is the command joined across
// any `\` line continuations, `start` is its character offset within `run` so callers
// can compare *where a real command sits* rather than where a substring first turns up.
function runCommands(run) {
  const lines = run.split('\n');
  const commands = [];
  let offset = 0;
  const lineOffsets = lines.map((line) => {
    const start = offset;
    offset += line.length + 1;
    return start;
  });

  for (let i = 0; i < lines.length; i += 1) {
    const trimmed = lines[i].trim();
    if (trimmed && !trimmed.startsWith('#')) {
      const start = lineOffsets[i];
      const command = [lines[i].trimEnd()];
      while (command.at(-1).trimEnd().endsWith('\\') && i + 1 < lines.length) {
        do {
          i += 1;
        } while (i < lines.length && (!lines[i].trim() || lines[i].trim().startsWith('#')));
        if (i < lines.length) {
          command.push(lines[i].trimEnd());
        }
      }

      commands.push({ text: command.join('\n'), start });
    }
  }

  return commands;
}

function normalizeShell(command) {
  return command.replace(/\\\n\s*/g, ' ').replace(/\s+/g, ' ').trim();
}

// Strips the parts of a shell line that sit *before* the command actually being run —
// a `var=$(` assignment/subshell opener, or an `if`/`elif`/`while`/`until` keyword —
// so matching looks at what is actually invoked rather than an arbitrary substring of
// the whole line (which `echo "gh pr list ..."` or a `# gh pr list` comment would also
// satisfy).
function commandInvocation(command) {
  return normalizeShell(command)
    .replace(/^[A-Za-z_]\w*=\$\(\s*/, '')
    .replace(/^(?:if|elif|while|until)\s+/, '');
}

function isEchoedText(invocation) {
  return /^(?:echo|printf)\b/.test(invocation);
}

function matchesCommand(invocation, needle) {
  return invocation === needle
    || invocation.startsWith(`${needle} `)
    || invocation.startsWith(`${needle};`);
}

function findCommand(run, needle) {
  return runCommands(run).find(({ text }) => {
    const invocation = commandInvocation(text);
    return !isEchoedText(invocation) && matchesCommand(invocation, needle);
  }) || null;
}

function commandBlock(run, needle) {
  return findCommand(run, needle)?.text || '';
}

// Character offset of the real command matching `needle` within `run`, or -1 when it
// is not actually invoked there. Comparable against another `commandStart` result, or
// against a raw `run.indexOf(...)` offset, because both are positions in the same
// `run` string.
function commandStart(run, needle) {
  return findCommand(run, needle)?.start ?? -1;
}

function exactCommandBlock(run, expected) {
  const match = runCommands(run).find(({ text }) => normalizeShell(text) === expected);
  return match ? match.text : '';
}

// Synthetic steps below stand in for `stepBlocks()` output — a `- name:` line at
// 6-space indent, and its `run:` at 8-space indent — without parsing a whole workflow.
function fakeStep(runHeader, contentLines) {
  return {
    text: [
      '      - name: Fake',
      `        ${runHeader}`,
      ...contentLines.map((line) => `          ${line}`),
    ].join('\n'),
  };
}

describe('extraction helper behavior', () => {
  it('runBlock reads a clip chomping indicator (run: |-)', () => {
    assert.equal(
      runBlock(fakeStep('run: |-', ['echo one', 'echo two'])),
      'echo one\necho two',
    );
  });

  it('runBlock reads a keep chomping indicator (run: |+)', () => {
    assert.equal(
      runBlock(fakeStep('run: |+', ['echo one', 'echo two'])),
      'echo one\necho two',
    );
  });

  it('runBlock reads combined indentation and chomping indicators in either order', () => {
    assert.equal(runBlock(fakeStep('run: |2-', ['echo one'])), 'echo one');
    assert.equal(runBlock(fakeStep('run: |-2', ['echo one'])), 'echo one');
  });

  it('commandBlock ignores an echoed mention of the command it is looking for', () => {
    const run = [
      'echo "gh pr list --head \\"$BRANCH\\""',
      'existing=$(gh pr list --head "$BRANCH" --state open)',
    ].join('\n');

    assert.equal(
      normalizeShell(commandBlock(run, 'gh pr list')),
      'existing=$(gh pr list --head "$BRANCH" --state open)',
    );
  });

  it('commandBlock ignores a commented-out mention of the command it is looking for', () => {
    const run = [
      '# gh pr create --base "$DEFAULT_BRANCH"',
      'gh pr create --base "$DEFAULT_BRANCH" --head "$BRANCH"',
    ].join('\n');

    assert.equal(
      normalizeShell(commandBlock(run, 'gh pr create')),
      'gh pr create --base "$DEFAULT_BRANCH" --head "$BRANCH"',
    );
  });

  it('commandBlock does not match a command name that only appears as a substring', () => {
    const run = 'echo "gh pr list is not the same as gh pr listing"';

    assert.equal(commandBlock(run, 'gh pr list'), '');
  });

  it('commandStart orders real commands even when an echo mentions them out of order', () => {
    const run = [
      'echo "gh pr close \\"$existing\\" runs after gh pr comment"',
      'gh pr comment "$existing" --body "closing"',
      'gh pr close "$existing"',
    ].join('\n');

    const commentStart = commandStart(run, 'gh pr comment "$existing"');
    const closeStart = commandStart(run, 'gh pr close "$existing"');

    assert.notEqual(commentStart, -1);
    assert.notEqual(closeStart, -1);
    assert.ok(commentStart < closeStart);
  });
});

describe('workflow file references resolve', () => {
  for (const file of workflowFiles()) {
    const source = readFileSync(join(WORKFLOWS, file), 'utf8');

    // `git add a/ b.json c.js` — every pathspec must exist, or the step aborts.
    it(`${file}: every git-add pathspec exists`, () => {
      const paths = referencesIn(source, /git add (.+)$/, (m) => m[1].trim().split(/\s+/));
      const missing = paths.filter((path) => !existsSync(join(ROOT, path)));
      assert.deepEqual(missing, [], `${file} git-adds paths that do not exist`);
    });

    // `node deps/rsp/extract-props.js` — the script must exist, or the step fails.
    // Matched anywhere rather than only straight after `run:`, because a multi-line
    // `run: |` block puts the invocation on its own line; the original pattern silently
    // covered none of those. Requiring a script extension skips `node -p "…"` inline
    // evaluation, which references no file.
    it(`${file}: every node script exists`, () => {
      const scripts = referencesIn(source, /(?:^|\s)node\s+([\w./-]+\.[cm]?js)\b/, (m) => [m[1]]);
      const missing = scripts.filter((path) => !existsSync(join(ROOT, path)));
      assert.deepEqual(missing, [], `${file} runs scripts that do not exist`);
    });
  }
});

describe('extraction workflow PR lifecycle', () => {
  for (const file of EXTRACTION_WORKFLOWS) {
    const source = readFileSync(join(WORKFLOWS, file), 'utf8');
    const workflowName = file.replace(/\.ya?ml$/, '');
    const validationStep = conditionalSteps(source, 'true').find(
      (step) => !!exactCommandBlock(runBlock(step), 'npm run test:extractions'),
    ) || null;
    const prStep = conditionalSteps(source, 'true').find(
      (step) => !!exactCommandBlock(runBlock(step), 'git push --force origin "$BRANCH"'),
    ) || null;
    const cleanupStep = conditionalSteps(source, 'false').find(
      (step) => commandStart(runBlock(step), 'git ls-remote --exit-code --heads origin "$BRANCH"') !== -1,
    ) || null;
    const validationRun = runBlock(validationStep);
    const prRun = runBlock(prStep);
    const cleanupRun = runBlock(cleanupStep);

    it(`${file}: checks out the default branch`, () => {
      assert.match(
        source,
        /uses:\s+actions\/checkout@v4[\s\S]*?with:[\s\S]*?ref:\s+\$\{\{\s+github\.event\.repository\.default_branch\s+\}\}/,
        `${file} does not check out the default branch`,
      );
    });

    it(`${file}: exposes the default branch in env`, () => {
      assert.match(
        source,
        /env:[\s\S]*?DEFAULT_BRANCH:\s+\$\{\{\s+github\.event\.repository\.default_branch\s+\}\}/,
        `${file} does not expose the default branch in env`,
      );
    });

    it(`${file}: uses a non-canceling workflow concurrency group`, () => {
      assert.match(
        source,
        new RegExp(String.raw`concurrency:[\s\S]*?group:\s+${workflowName}[\s\S]*?cancel-in-progress:\s+false`),
        `${file} does not lock runs to its workflow-specific concurrency group`,
      );
    });

    it(`${file}: caps the extraction job at 30 minutes`, () => {
      assert.match(
        source,
        /(?:^|\n) {2}update-properties:\n(?:(?!^ {2}[A-Za-z0-9_-]+:\s*$)[\s\S])*? {4}timeout-minutes:\s+30\b/m,
        `${file} does not cap the update-properties extraction job at 30 minutes`,
      );
    });

    it(`${file}: validates before force-pushing the bot branch`, () => {
      assert.ok(
        validationStep,
        `${file} should validate the extraction before force-pushing the bot branch`,
      );
      assert.ok(
        prStep,
        `${file} should force-push the bot branch after validation`,
      );
      assert.ok(
        exactCommandBlock(validationRun, 'npm run lint:js'),
        `${file} should lint the extraction output in the changed-output validation step`,
      );
      assert.ok(
        exactCommandBlock(validationRun, 'npm run test:extractions'),
        `${file} should run npm run test:extractions as a real command in the changed-output validation step`,
      );
      assert.ok(
        exactCommandBlock(prRun, 'git push --force origin "$BRANCH"'),
        `${file} should force-push the bot branch from the changed-output PR step`,
      );
      assert.ok(
        validationStep.start < prStep.start,
        `${file} should run npm run test:extractions before git push --force origin "$BRANCH"`,
      );
    });

    it(`${file}: looks up an open extraction PR against the default branch`, () => {
      assert.ok(prStep, `${file} is missing the changed-output PR reconciliation step`);

      const listCommand = normalizeShell(commandBlock(prRun, 'gh pr list'));

      assert.ok(
        listCommand.includes('gh pr list '),
        `${file} should look up the open extraction PR with gh pr list`,
      );
      assert.ok(
        listCommand.includes('--head "$BRANCH"'),
        `${file} should scope the PR lookup to the bot branch`,
      );
      assert.ok(
        listCommand.includes('--base "$DEFAULT_BRANCH"'),
        `${file} should look up the PR against the default branch`,
      );
      assert.ok(
        listCommand.includes('--state open'),
        `${file} should only look up open PRs`,
      );
    });

    it(`${file}: updates an existing extraction PR when one exists`, () => {
      assert.ok(prStep, `${file} is missing the changed-output PR reconciliation step`);

      const editCommand = normalizeShell(commandBlock(prRun, 'gh pr edit "$existing"'));

      assert.ok(
        editCommand.startsWith('gh pr edit "$existing"'),
        `${file} should update an existing PR with gh pr edit "$existing" as a real command`,
      );
    });

    it(`${file}: creates a new extraction PR against the default branch`, () => {
      assert.ok(prStep, `${file} is missing the changed-output PR reconciliation step`);

      const createCommand = normalizeShell(commandBlock(prRun, 'gh pr create'));

      assert.ok(
        createCommand.startsWith('gh pr create'),
        `${file} should create a new PR when no open extraction PR exists`,
      );
      assert.ok(
        createCommand.includes('--base "$DEFAULT_BRANCH"'),
        `${file} should create the new PR against the default branch`,
      );
      assert.ok(
        createCommand.includes('--head "$BRANCH"'),
        `${file} should point the new PR at the bot branch`,
      );
    });

    it(`${file}: closes stale proposals when the extraction matches the default branch`, () => {
      assert.ok(
        cleanupStep,
        `${file} should include a cleanup step guarded by if: steps.stage.outputs.changed == 'false'`,
      );
      const lookupCommand = normalizeShell(commandBlock(cleanupRun, 'gh pr list'));
      const commentCommand = commandBlock(cleanupRun, 'gh pr comment "$existing"');
      const closeCommand = normalizeShell(commandBlock(cleanupRun, 'gh pr close "$existing"'));
      // Positions of the real commands (not raw substring offsets), so an echoed
      // mention earlier in the step can't masquerade as, or reorder, the actual call.
      const lsRemoteStart = commandStart(cleanupRun, 'git ls-remote --exit-code --heads origin "$BRANCH"');
      const deleteStart = commandStart(cleanupRun, 'git push origin --delete "$BRANCH"');
      const lookupStart = commandStart(cleanupRun, 'gh pr list');
      const closeStart = commandStart(cleanupRun, 'gh pr close "$existing"');
      // These check control-flow/status structure rather than a specific command
      // invocation, so a plain substring search is enough here.
      const elseIndex = cleanupRun.indexOf('\nelse\n');
      const branchStatusIndex = cleanupRun.indexOf('branch_status=$?');
      const onlyMissingBranchIndex = cleanupRun.indexOf('if [ "$branch_status" -ne 2 ]; then');
      const exitIndex = cleanupRun.indexOf('exit "$branch_status"');

      assert.ok(
        lookupCommand.startsWith('existing=$(gh pr list '),
        `${file} should populate $existing from gh pr list during changed=false cleanup`,
      );
      assert.ok(
        lookupCommand.includes('--head "$BRANCH"'),
        `${file} should scope the changed=false PR lookup to the bot branch`,
      );
      assert.ok(
        lookupCommand.includes('--base "$DEFAULT_BRANCH"'),
        `${file} should look up the changed=false PR against the default branch`,
      );
      assert.ok(
        lookupCommand.includes('--state open'),
        `${file} should only look up open PRs during changed=false cleanup`,
      );
      assert.ok(
        deleteStart !== -1,
        `${file} should delete the bot branch when changed=false cleanup finds it on origin`,
      );
      assert.ok(
        lsRemoteStart !== -1
          && elseIndex !== -1
          && lsRemoteStart < deleteStart
          && deleteStart < elseIndex,
        `${file} should delete the remote branch only in the successful git ls-remote path`,
      );
      assert.ok(
        branchStatusIndex !== -1,
        `${file} should capture the failed git ls-remote status during changed=false cleanup`,
      );
      assert.ok(
        onlyMissingBranchIndex !== -1,
        `${file} should treat status 2 from git ls-remote as the only acceptable missing-branch case`,
      );
      assert.ok(
        exitIndex !== -1
          && branchStatusIndex < onlyMissingBranchIndex
          && onlyMissingBranchIndex < exitIndex,
        `${file} should exit with the failing ls-remote status when it is not 2`,
      );
      assert.ok(
        closeCommand,
        `${file} should close the stale PR during changed=false cleanup`,
      );
      assert.ok(
        commentCommand === '',
        `${file} should not use a separate gh pr comment command during changed=false cleanup`,
      );
      assert.ok(
        closeCommand.startsWith('gh pr close "$existing"'),
        `${file} should close the stale PR with gh pr close "$existing" as a real command`,
      );
      assert.ok(
        closeCommand.includes(' --comment '),
        `${file} should pass the stale-PR explanation via gh pr close --comment`,
      );
      assert.match(
        closeCommand,
        /Closing because .*matches .*DEFAULT_BRANCH/,
        `${file} should keep the stale-PR close explanation tied to the default branch`,
      );
      assert.ok(
        lookupStart !== -1 && closeStart !== -1 && lookupStart < closeStart,
        `${file} should look up the stale PR before closing it with gh pr close --comment`,
      );
    });
  }
});
