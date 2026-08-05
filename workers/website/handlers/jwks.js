// Fetches and caches Adobe IMS's RSA signing keys so createSession can
// verify an access_token's signature instead of trusting it blindly.
// Cached in module scope only - it resets on a cold start, which is fine:
// a cold start already pays for a fresh isolate, and every other platform
// this runs on (Lambda, I/O Runtime) keeps module scope warm the same way
// between invocations.

export const IMS_JWKS_URL = {
  dev: 'https://ims-na1-stg1.adobelogin.com/ims/keys',
  stage: 'https://ims-na1-stg1.adobelogin.com/ims/keys',
  prod: 'https://ims-na1.adobelogin.com/ims/keys',
};

// Adobe rotates keys ahead of retiring old ones, so a short TTL only means
// a slightly higher fetch rate - never a false rejection of a still-live key.
export const JWKS_TTL_MS = 60 * 60 * 1000;

let cache = null; // { imsEnv, fetchedAt, keys: Map<kid, jwk> }

const fetchKeys = async (imsEnv) => {
  const url = IMS_JWKS_URL[imsEnv] ?? IMS_JWKS_URL.prod;
  const resp = await fetch(url);
  if (!resp.ok) { throw new Error(`IMS JWKS request failed with status ${resp.status}`); }
  const { keys } = await resp.json();
  return new Map(keys.map((jwk) => [jwk.kid, jwk]));
};

const isFresh = (entry, imsEnv) => (
  !!entry && entry.imsEnv === imsEnv && Date.now() - entry.fetchedAt < JWKS_TTL_MS
);

// One refetch on a cache miss covers key rotation without looping: a kid
// absent from a keyset fetched moments ago in this same call is absent,
// not a reason to fetch it again.
export const getJwk = async (imsEnv, kid) => {
  let justFetched = false;
  if (!isFresh(cache, imsEnv)) {
    cache = { imsEnv, fetchedAt: Date.now(), keys: await fetchKeys(imsEnv) };
    justFetched = true;
  }
  if (!cache.keys.has(kid) && !justFetched) {
    cache = { imsEnv, fetchedAt: Date.now(), keys: await fetchKeys(imsEnv) };
  }
  return cache.keys.get(kid) ?? null;
};

export const resetJwksCache = () => { cache = null; };
