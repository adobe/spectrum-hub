// A redirect that carries the viewer's original query string is specific to
// that request, but the CloudFront cache key only includes the query params
// the origin uses - so it must not be cached and replayed to other viewers.
const applyRedirectSearch = (resp, savedSearch) => {
  if (!(resp.status === 301 && savedSearch)) { return; }
  const location = resp.headers.get('location');
  if (location && !location.match(/\?.*$/)) {
    resp.headers.set('location', `${location}${savedSearch}`);
    resp.headers.set('cache-control', 'no-store');
  }
};

export const fetchFromAem = async ({ request, savedSearch }) => {
  let resp = await fetch(request, { method: request.method });

  // Recreate a mutable response
  resp = new Response(resp.body, resp);

  applyRedirectSearch(resp, savedSearch);

  // 304 Not Modified - remove CSP header
  if (resp.status === 304) { resp.headers.delete('Content-Security-Policy'); }

  resp.headers.delete('age');
  resp.headers.delete('x-robots-tag');

  return resp;
};
