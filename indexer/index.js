/**
 * CLI entry point for the Algolia content indexer.
 *
 *   node indexer/index.js                    full rebuild, pushes to Algolia
 *   node indexer/index.js --dry-run          writes indexer/out/records.json only
 *   node indexer/index.js --limit=10         first 10 pages
 *   node indexer/index.js --path=/some/page  one page, implies --dry-run
 *
 * --limit and --path restrict what is read, but a push is still a full replace,
 * so a limited run that publishes leaves the index holding only those pages.
 */

import { mkdirSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { parse } from 'node-html-parser';

import { createClient, mapWithConcurrency } from './aem-client.js';
import { buildRecords } from './records.js';
import { inlineFragments } from './fragments.js';
import { loadConfig } from './config.js';
import { publish } from './algolia.js';
import { splitSections, stripNoise } from './sections.js';

const CONCURRENCY = 8;
const MIN_FAILURES_TO_ABORT = 3;
const FAILURE_RATE_LIMIT = 0.1;
const OUT_DIR = new URL('./out/', import.meta.url);

const ACCEPTED_FLAGS = '--dry-run, --limit=<positive integer>, --path=<page path>';

/** True for anything other than --dry-run, --limit=..., or --path=... */
const isUnknownArg = (arg) => (
  arg !== '--dry-run' && !arg.startsWith('--limit=') && !arg.startsWith('--path=')
);

/**
 * A typo'd flag (e.g. --dry-runn) must not fall through to a full live
 * replace of the index, and an empty --path/--limit value must not silently
 * behave as if the flag were absent, so both are rejected outright rather
 * than ignored.
 * @param {string[]} argv raw CLI arguments
 * @returns {object} parsed flags
 * @throws {Error} on an unrecognized argument, or an empty --path/--limit value
 */
export function parseArgs(argv) {
  const unknown = argv.find(isUnknownArg);
  if (unknown) {
    throw new Error(`Unrecognized argument: ${unknown}. Accepted flags: ${ACCEPTED_FLAGS}.`);
  }

  const has = (name) => argv.includes(name);
  const value = (name) => {
    const match = argv.find((arg) => arg.startsWith(`${name}=`));
    return match ? match.slice(name.length + 1) : null;
  };

  const path = value('--path');
  if (path === '') { throw new Error('--path requires a non-empty value.'); }

  const rawLimit = value('--limit');
  if (rawLimit === '') { throw new Error('--limit requires a non-empty value.'); }
  const limit = Number(rawLimit);

  return {
    dryRun: has('--dry-run') || Boolean(path),
    limit: Number.isInteger(limit) && limit > 0 ? limit : null,
    path,
  };
}

/**
 * Aborts a run that lost too much content to publish safely. Without this an
 * upstream outage would turn an atomic rebuild into an atomic emptying.
 * @param {number} attempted pages tried
 * @param {string[]} failures paths that could not be indexed
 */
export function assertAcceptableFailureRate(attempted, failures) {
  const threshold = Math.max(MIN_FAILURES_TO_ABORT, attempted * FAILURE_RATE_LIMIT);
  if (failures.length >= threshold) {
    throw new Error(
      `${failures.length} of ${attempted} pages failed, at or above the ${Math.ceil(threshold)} allowed. `
      + `Refusing to publish. First failures: ${failures.slice(0, 5).join(', ')}`,
    );
  }
}

/**
 * Builds every record for a single query-index row. Isolated from buildAll so
 * the worker below can wrap it in a single try/catch: a missing <main> is
 * raised the same way fetchPage's network rejection and buildRecords' no-path
 * error already are, so all three collapse onto one failure path instead of
 * being allowed to reject the whole mapWithConcurrency pool over what should
 * be a tolerable per-page failure.
 * @param {object} row a query-index row
 * @param {object} client an aem-client instance
 * @returns {Promise<object[]>} records for this row
 * @throws {Error} when the page has no fetchable <main>, or a downstream step fails
 */
async function buildRow(row, client) {
  const fetched = await client.fetchPage(row.path);
  const pageMain = fetched?.html ? parse(fetched.html).querySelector('main') : null;
  if (!pageMain) { throw new Error(`No <main> found for ${row.path}`); }

  const fragmentTimes = await inlineFragments(pageMain, client.fetchPage);
  stripNoise(pageMain);
  return buildRecords(row, splitSections(pageMain), fragmentTimes);
}

/**
 * @param {object[]} rows query-index rows
 * @param {object} client an aem-client instance
 * @returns {Promise<object>} records and the paths that failed
 */
export async function buildAll(rows, client) {
  const failures = [];

  const built = await mapWithConcurrency(rows, CONCURRENCY, async (row) => {
    try {
      return await buildRow(row, client);
    } catch {
      failures.push(row.path);
      return [];
    }
  });

  return { records: built.flat(), failures };
}

function writeDryRun(records) {
  mkdirSync(fileURLToPath(OUT_DIR), { recursive: true });
  const file = fileURLToPath(new URL('records.json', OUT_DIR));
  writeFileSync(file, `${JSON.stringify(records, null, 2)}\n`);
  return file;
}

async function main() {
  const started = Date.now();
  const options = parseArgs(process.argv.slice(2));
  const config = loadConfig();
  const client = createClient({ siteOrigin: config.siteOrigin });

  let rows = await client.fetchQueryIndex();
  if (options.path) { rows = rows.filter((row) => row.path === options.path); }
  if (options.limit) { rows = rows.slice(0, options.limit); }

  if (!rows.length) {
    throw new Error('No pages matched. Check --path, or whether the query index is empty.');
  }
  if (options.limit && !options.dryRun) {
    console.warn(`WARNING: --limit with a live push replaces the whole index with ${rows.length} pages.`);
  }

  const { records, failures } = await buildAll(rows, client);
  failures.forEach((path) => console.warn(`WARNING: could not index ${path}`));
  assertAcceptableFailureRate(rows.length, failures);

  const elapsed = ((Date.now() - started) / 1000).toFixed(1);
  console.log(`Pages: ${rows.length} (${failures.length} failed)  Records: ${records.length}  Elapsed: ${elapsed}s`);

  if (options.dryRun) {
    console.log(`Dry run. Wrote ${writeDryRun(records)}`);
    return;
  }

  await publish(records, config);
  console.log(`Published ${records.length} records to "${config.indexName}".`);
}

// Only run when invoked directly, so the test can import the exports. argv[1]
// is resolved because `node indexer/index.js` passes a relative path while
// import.meta.url is always absolute.
if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch((error) => {
    console.error(`FAILED: ${error.message}`);
    process.exitCode = 1;
  });
}
