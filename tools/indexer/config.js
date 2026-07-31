/**
 * Environment configuration for the indexer.
 *
 * .env is loaded when present so a local run needs no shell setup; in CI the
 * file is absent and loadEnvFile throws, which is the expected path. The same
 * code therefore runs in both places without branching.
 *
 * .env lives at the repository root, not beside this module, and the documented
 * invocation is `node tools/indexer/index.js` from that root. The working
 * directory is therefore tried first. A module-relative path is tried second so
 * the load still works from another directory — and, unlike a module-relative
 * path alone, moving this folder cannot silently stop .env from being found.
 */

import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

export const DEFAULT_SITE_ORIGIN = 'https://main--spectrum-hub--adobe.aem.live';

/**
 * Page fetches in flight. The origin rate-limits a burst: at 8 the full 155-page
 * run drew HTTP 429 on roughly a third of its requests, which the retry layer
 * can absorb but should not have to. Tunable with INDEXER_CONCURRENCY so an
 * operator can react to the origin without a code change.
 */
export const DEFAULT_CONCURRENCY = 3;

const REQUIRED = ['ALGOLIA_APP_ID', 'ALGOLIA_WRITE_API_KEY', 'ALGOLIA_INDEX_NAME'];

/**
 * A bad value fails the run rather than falling back, because a silent fallback
 * would hide the very tuning the variable exists for.
 */
function readConcurrency(raw) {
  if (raw === undefined || raw === '') { return DEFAULT_CONCURRENCY; }
  const value = Number(raw);
  if (!Number.isInteger(value) || value < 1) {
    throw new Error(`INDEXER_CONCURRENCY must be a positive integer, got: ${raw}`);
  }
  return value;
}

/**
 * Ordered candidate locations for .env, most-expected first.
 * @param {string} cwd the working directory to resolve against
 * @returns {string[]} absolute paths to try
 */
export function envCandidates(cwd = process.cwd()) {
  return [
    join(cwd, '.env'),
    fileURLToPath(new URL('../../.env', import.meta.url)),
  ];
}

envCandidates().some((path) => {
  try {
    process.loadEnvFile(path);
    return true;
  } catch {
    return false; // Absent or unreadable. Try the next, then rely on the environment as CI does.
  }
});

/**
 * @param {object} env the environment to read
 * @returns {object} validated configuration
 */
export function loadConfig(env = process.env) {
  const missing = REQUIRED.filter((name) => !env[name]);
  if (missing.length) {
    throw new Error(`Missing required environment variables: ${missing.join(', ')}`);
  }

  return {
    appId: env.ALGOLIA_APP_ID,
    writeKey: env.ALGOLIA_WRITE_API_KEY,
    indexName: env.ALGOLIA_INDEX_NAME,
    siteOrigin: (env.SITE_ORIGIN || DEFAULT_SITE_ORIGIN).replace(/\/$/, ''),
    concurrency: readConcurrency(env.INDEXER_CONCURRENCY),
  };
}
