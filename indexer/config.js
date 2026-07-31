/**
 * Environment configuration for the indexer.
 *
 * .env is loaded when present so a local run needs no shell setup; in CI the
 * file is absent and loadEnvFile throws, which is the expected path. The same
 * code therefore runs in both places without branching.
 */

export const DEFAULT_SITE_ORIGIN = 'https://main--spectrum-hub--adobe.aem.live';

const REQUIRED = ['ALGOLIA_APP_ID', 'ALGOLIA_WRITE_API_KEY', 'ALGOLIA_INDEX_NAME'];

try {
  process.loadEnvFile(new URL('../.env', import.meta.url).pathname);
} catch {
  // No .env file. Rely on the environment, as CI does.
}

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
  };
}
