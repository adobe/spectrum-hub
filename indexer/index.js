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
import { DEFAULT_CONCURRENCY, loadConfig } from './config.js';
import { publish } from './algolia.js';
import { splitSections, stripNoise } from './sections.js';

const MIN_FAILURES_TO_ABORT = 3;
const MIN_FRAGMENT_FAILURES_TO_ABORT = 3;
// Below this, "nothing resolved" is an ordinary single page whose few fragment
// links happen to be unpublished, not a run-wide wipe worth aborting on.
const MIN_ATTEMPTS_FOR_TOTAL_LOSS = 10;
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
 * @throws {Error} on an unrecognized argument, or a bad --path/--limit value
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

  // --limit=0 and --limit=-5 are numbers that would otherwise fall through to
  // "no limit", which is a full live replace of the index — the opposite of
  // what someone asking for zero or fewer pages meant.
  if (rawLimit !== null && Number.isFinite(limit) && limit < 1) {
    throw new Error(`--limit must be a positive integer, got: ${rawLimit}.`);
  }

  return {
    dryRun: has('--dry-run') || Boolean(path),
    limit: Number.isInteger(limit) && limit > 0 ? limit : null,
    path,
  };
}

/**
 * Aborts a run that lost too many pages to publish safely. Without this an
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
 * Aborts a run that lost too much fragment prose to publish safely. A page whose
 * fragments all failed still returns 200 and still yields its title record, so
 * page-level failures alone cannot see this: an origin that throttles every
 * fragment would publish a full-looking index of nothing but headings. Applied
 * separately from the page rate so that an isolated bad fragment costs one
 * section rather than a whole page.
 *
 * Two rules, because the two loss modes look nothing alike on the live site:
 *
 * - Fragments the origin says do not exist are the steady state. A full run
 *   resolves 127 and 404s on 368, so a flat rate over all failures would abort
 *   every run forever and the guard would be turned off within a week. They are
 *   still warned about and reported; they just cannot be the abort trigger on
 *   their own.
 * - Fragments the origin failed to answer for — a rejection, meaning retries
 *   were exhausted — are an incident. Those get the rate limit.
 *
 * Total loss is caught regardless of cause: a run of any size that inlines
 * nothing at all, having tried, is a gutted index whatever the status code was.
 * @param {object} fragments resolved, missing, and unavailable counts
 */
export function assertAcceptableFragmentLoss({ resolved = 0, missing = 0, unavailable = 0 } = {}) {
  const attempted = resolved + missing + unavailable;
  if (!attempted) { return; }

  if (!resolved && attempted >= MIN_ATTEMPTS_FOR_TOTAL_LOSS) {
    throw new Error(
      `None of the ${attempted} fragments attempted contributed any content `
      + `(${unavailable} unreachable, ${missing} not found). `
      + 'Refusing to publish a page set stripped of its prose.',
    );
  }

  const threshold = Math.max(MIN_FRAGMENT_FAILURES_TO_ABORT, attempted * FAILURE_RATE_LIMIT);
  if (unavailable >= threshold) {
    throw new Error(
      `${unavailable} of ${attempted} fragments were unreachable, at or above the `
      + `${Math.ceil(threshold)} allowed. Refusing to publish against a failing origin.`,
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
 * @param {Function} warn where fragment warnings go
 * @returns {Promise<object>} records for this row, plus its fragment counts
 * @throws {Error} when the page has no fetchable <main>, or a downstream step fails
 */
async function buildRow(row, client, warn) {
  const fetched = await client.fetchPage(row.path);
  const pageMain = fetched?.html ? parse(fetched.html).querySelector('main') : null;
  if (!pageMain) { throw new Error(`No <main> found for ${row.path}`); }

  const fragments = await inlineFragments(pageMain, client.fetchPage, { warn });
  stripNoise(pageMain);
  return {
    records: buildRecords(row, splitSections(pageMain), fragments.timestamps),
    fragments,
  };
}

/**
 * @param {object[]} rows query-index rows
 * @param {object} client an aem-client instance
 * @param {object} options concurrency and a warn sink
 * @returns {Promise<object>} records, the paths that failed, and fragment counts
 */
export async function buildAll(rows, client, options = {}) {
  const { concurrency = DEFAULT_CONCURRENCY, warn = console.warn } = options;
  const failures = [];
  const fragments = {
    resolved: 0,
    missing: 0,
    unavailable: 0,
  };

  const built = await mapWithConcurrency(rows, concurrency, async (row) => {
    try {
      const result = await buildRow(row, client, warn);
      fragments.resolved += result.fragments.resolved;
      fragments.missing += result.fragments.missing;
      fragments.unavailable += result.fragments.unavailable;

      // A 200 with an empty <main> throws nothing and yields nothing. Left
      // uncounted it would look like a healthy page, so a wholesale upstream
      // emptying could still clear the abort threshold.
      if (!result.records.length) {
        warn(`WARNING: could not index ${row.path}: the page yielded no records`);
        failures.push(row.path);
        return [];
      }
      return result.records;
    } catch (error) {
      // The reason matters: a retry-exhausted 429 and a genuine 404 both land
      // here, and an operator reading a red run needs to tell them apart.
      warn(`WARNING: could not index ${row.path}: ${error.message}`);
      failures.push(row.path);
      return [];
    }
  });

  return {
    records: built.flat(),
    failures,
    fragments,
  };
}

function writeDryRun(records) {
  mkdirSync(fileURLToPath(OUT_DIR), { recursive: true });
  const file = fileURLToPath(new URL('records.json', OUT_DIR));
  writeFileSync(file, `${JSON.stringify(records, null, 2)}\n`);
  return file;
}

/**
 * Orchestrates a run. Every collaborator is injectable so a test can assert the
 * one property that matters most — that publish is never reached by a run that
 * failed its thresholds — without touching the network or a real index.
 * @param {object} options argv and injectable collaborators
 * @returns {Promise<object>} the run's counts, and whether it published
 */
export async function main({
  argv = process.argv.slice(2),
  configLoader = loadConfig,
  clientFactory = createClient,
  publisher = publish,
  dryRunWriter = writeDryRun,
  log = console,
} = {}) {
  const started = Date.now();
  const options = parseArgs(argv);
  const config = configLoader();
  const client = clientFactory({ siteOrigin: config.siteOrigin });

  let rows = await client.fetchQueryIndex();
  if (options.path) { rows = rows.filter((row) => row.path === options.path); }
  if (options.limit) { rows = rows.slice(0, options.limit); }

  if (!rows.length) {
    throw new Error('No pages matched. Check --path, or whether the query index is empty.');
  }
  if (options.limit && !options.dryRun) {
    log.warn(`WARNING: --limit with a live push replaces the whole index with ${rows.length} pages.`);
  }

  const { records, failures, fragments } = await buildAll(rows, client, {
    concurrency: config.concurrency,
    warn: (message) => log.warn(message),
  });

  const elapsed = ((Date.now() - started) / 1000).toFixed(1);
  // Printed before the abort decision: an aborted unattended run is exactly the
  // one whose counts an operator needs, and throwing first would swallow them.
  log.log(
    `Pages: ${rows.length} (${failures.length} failed)  `
    + `Fragments: ${fragments.resolved} resolved `
    + `(${fragments.missing} not found, ${fragments.unavailable} unreachable)  `
    + `Records: ${records.length}  Elapsed: ${elapsed}s`,
  );

  assertAcceptableFailureRate(rows.length, failures);
  assertAcceptableFragmentLoss(fragments);

  if (options.dryRun) {
    log.log(`Dry run. Wrote ${dryRunWriter(records)}`);
    return {
      records, failures, fragments, published: false,
    };
  }

  await publisher(records, config);
  log.log(`Published ${records.length} records to "${config.indexName}".`);
  return {
    records, failures, fragments, published: true,
  };
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
