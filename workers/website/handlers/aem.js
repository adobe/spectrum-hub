const getRedirect = (resp, savedSearch) => {
  if (!(resp.status === 301 && savedSearch)) { return; }
  const location = resp.headers.get('location');
  if (location && !location.match(/\?.*$/)) {
    resp.headers.set('location', `${location}${savedSearch}`);
  }
};

export const fetchFromAem = async ({ request, cache, savedSearch }) => {
  // cacheEverything only forces caching of content Cloudflare wouldn't
  // otherwise cache (e.g. HTML); it does nothing to content Cloudflare
  // already caches by default based on file extension (.js, .css, images).
  // When cache is false, cache: 'no-store' is needed too - it's the one
  // documented way to bypass Cloudflare's edge cache entirely (read and
  // write) regardless of content type.
  const init = cache
    ? { method: request.method, cf: { cacheEverything: true } }
    : { method: request.method, cache: 'no-store' };
  let resp = await fetch(request, init);

  // Recreate a mutable response
  resp = new Response(resp.body, resp);

  // Handle redirects
  const redirectResp = getRedirect(resp, savedSearch);
  if (redirectResp) { return redirectResp; }

  // 304 Not Modified - remove CSP header
  if (resp.status === 304) { resp.headers.delete('Content-Security-Policy'); }

  resp.headers.delete('age');
  resp.headers.delete('x-robots-tag');

  return resp;
};

export async function fetchSchedule({ request, cache, savedSearch }) {
  const resp = await fetchFromAem({ request, cache, savedSearch });

  if (resp.status === 301 || resp.status === 304) { return resp; }

  return resp;
}
