/**
 * Prints a markdown summary of what a regenerated roster added or removed, for the body
 * of the PR the extraction workflows open.
 *
 * Both rosters are flat objects keyed by component name — RSP's values are config
 * objects, SWC's are module subpaths — so only the key set matters here.
 *
 * Usage: node .github/scripts/roster-delta.js <roster-path> [<base-ref>]
 *
 * Compares <base-ref>'s committed copy (default HEAD) against the working tree, so it
 * runs after extraction and before the commit.
 */
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';

const [rosterPath, baseRef = 'HEAD'] = process.argv.slice(2);
if (!rosterPath) {
  console.error('usage: roster-delta.js <roster-path> [<base-ref>]');
  process.exit(1);
}

function keysAt(ref, path) {
  try {
    return new Set(Object.keys(JSON.parse(
      execFileSync('git', ['show', `${ref}:${path}`], { encoding: 'utf8' }),
    )));
  } catch {
    // No committed copy yet — a first extraction, so everything reads as added.
    return new Set();
  }
}

const before = keysAt(baseRef, rosterPath);
const after = new Set(Object.keys(JSON.parse(readFileSync(rosterPath, 'utf8'))));

const added = [...after].filter((name) => !before.has(name)).sort();
const removed = [...before].filter((name) => !after.has(name)).sort();

const list = (names) => names.map((name) => `- \`${name}\``).join('\n');

if (!added.length && !removed.length) {
  // Property changes without a roster change are the common case, and saying so is
  // more useful than an empty section.
  console.log('No components were added or removed. Property data changed only.');
} else {
  if (added.length) { console.log(`### Added (${added.length})\n\n${list(added)}\n`); }
  if (removed.length) {
    console.log(`### Removed (${removed.length})\n\n${list(removed)}\n`);
    console.log('> Removed components may be renames. Check for an authored snippet or');
    console.log('> page still referencing them — extraction drops the data file, but not');
    console.log('> hand-authored fragments.\n');
  }
}
