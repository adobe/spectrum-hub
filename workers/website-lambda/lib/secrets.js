/*
 * Runtime secret resolution from AWS Secrets Manager.
 *
 * SESSION_SECRET (HMAC key for session cookies) and IMS_CLIENT_SECRET (the
 * confidential DA service credential) must not live in the Lambda's plaintext
 * environment (Adobe AWS Security Standard §3.5.8.5). Instead the env carries
 * only a non-secret *_SECRET_ID, and `resolveSecrets` fetches the value from
 * Secrets Manager via the execution role and assigns it onto `env` under the
 * plain name - so the rest of the code (isAuthenticated, handlers/auth.js) keeps
 * reading env.SESSION_SECRET / env.IMS_CLIENT_SECRET unchanged.
 *
 * Design notes:
 *  - Dynamic import of the SDK inside try/catch: nodejs22.x ships AWS SDK v3, but
 *    if a runtime ever drops it a static top-level import would crash the whole
 *    function at init (total outage). Degrading to fail-closed is safer.
 *  - Bounded TTL cache: a rotated secret propagates within SECRET_TTL_MS without a
 *    redeploy. A failed fetch is cached only for a short backoff so an outage does
 *    not hammer Secrets Manager, while a cold container with no value yet still
 *    fails closed (anonymous), never open.
 *  - Migration-safe: only fetches when the *_SECRET_ID is set; otherwise it leaves
 *    any existing plaintext env[name] in place, so the code can ship before the
 *    envs are switched over.
 */

// Map each plain secret name to the env var that names it in Secrets Manager.
const SECRET_ENV = {
  SESSION_SECRET: 'SESSION_SECRET_ID',
  IMS_CLIENT_SECRET: 'IMS_CLIENT_SECRET_ID',
};

export const SECRET_TTL_MS = 10 * 60 * 1000;
export const SECRET_FAILURE_BACKOFF_MS = 10 * 1000;

// Module-level cache shared across warm invocations of the same container.
let secretsPromise;
let secretsFreshUntil = 0;

// Resolve the *_SECRET_ID env vars into their secret values on `env`. Idempotent
// and cheap on the hot path: returns the cached promise until it goes stale.
// Never rejects - all failure is caught and logged so the caller (handler) can
// `await` it without a try/catch and the pipeline degrades rather than crashes.
export const resolveSecrets = (env) => {
  // Nothing to do if neither secret is configured by id (plaintext-env or dev).
  if (!Object.values(SECRET_ENV).some((idVar) => env[idVar])) { return Promise.resolve(); }
  if (secretsPromise && Date.now() < secretsFreshUntil) { return secretsPromise; }
  secretsPromise = (async () => {
    let sm;
    let GetSecretValueCommand;
    try {
      // Dynamic: a missing SDK degrades to fail-closed instead of crashing init.
      const sdk = await import('@aws-sdk/client-secrets-manager');
      ({ GetSecretValueCommand } = sdk);
      sm = new sdk.SecretsManagerClient({ region: env.AWS_REGION });
    } catch (err) {
      console.error('website-lambda: secrets SDK unavailable', err);
      // No client: retry after the short backoff rather than never again.
      secretsFreshUntil = Date.now() + SECRET_FAILURE_BACKOFF_MS;
      return;
    }
    let ok = true;
    await Promise.all(Object.entries(SECRET_ENV).map(async ([name, idVar]) => {
      const id = env[idVar];
      if (!id) { return; } // not configured: keep any plaintext env[name] (migration)
      try {
        const out = await sm.send(new GetSecretValueCommand({ SecretId: id }));
        // Never log the value. A binary-only secret (no SecretString) is a config
        // error here - treat it as a failure rather than setting an empty value.
        if (out.SecretString) { env[name] = out.SecretString; } else {
          ok = false;
          console.error(`website-lambda: ${name} has no SecretString`);
        }
      } catch (err) {
        // Keep the last-known-good env[name] (availability); the short backoff
        // below makes the next request retry rather than serving stale forever.
        ok = false;
        console.error(`website-lambda: cannot resolve ${name} (${id})`, err);
      }
    }));
    // A good fetch is fresh for the full TTL; a failure only for the short backoff
    // window, so the next request after it retries (last-known-good stays in env).
    secretsFreshUntil = Date.now() + (ok ? SECRET_TTL_MS : SECRET_FAILURE_BACKOFF_MS);
  })();
  return secretsPromise;
};

// Test-only: drop the module cache so each test starts cold.
export const __resetSecretsCacheForTests = () => {
  secretsPromise = undefined;
  secretsFreshUntil = 0;
};
