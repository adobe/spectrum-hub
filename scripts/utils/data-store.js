/*
 * Shared cache for JSON index requests. Blocks that read the same index (the
 * component roll-up, deps/status-index.json) share one response instead of
 * each paying for a fetch, and concurrent requests for one endpoint collapse
 * into a single request.
 */

const payloads = new Map();
const inFlight = new Map();

/**
 * Parsed JSON for `endpoint`, or null when the request fails. A failure is not
 * cached, so a transient error does not pin an endpoint to null for the page's
 * lifetime. Successful payloads are cached by endpoint for the page lifetime;
 * request options and cache bypass are not supported.
 *
 * @param {string} endpoint - path or URL to fetch.
 * @returns {Promise<object|null>}
 */
export const getData = async (endpoint) => {
  if (payloads.has(endpoint)) { return payloads.get(endpoint); }
  if (inFlight.has(endpoint)) { return inFlight.get(endpoint); }

  const request = (async () => {
    try {
      const resp = await fetch(endpoint);
      if (!resp.ok) { return null; }
      const payload = await resp.json();
      payloads.set(endpoint, payload);
      return payload;
    } catch {
      return null;
    } finally {
      inFlight.delete(endpoint);
    }
  })();

  inFlight.set(endpoint, request);
  return request;
};

/** Drops every cached payload and in-flight request. Used by tests. */
export const clear = () => {
  payloads.clear();
  inFlight.clear();
};
