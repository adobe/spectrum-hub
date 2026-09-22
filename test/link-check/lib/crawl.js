/**
 * Collapses a trailing slash on an internal path so `/foo` and `/foo/` dedup to a
 * single crawl entry (EDS serves clean, slash-less URLs). The bare root `/` is
 * left intact.
 * @param {URL} url a parsed URL, mutated in place
 * @returns {URL} the same URL with any trailing slash removed from a non-root path
 */
function stripTrailingSlash(url) {
  if (url.pathname.length > 1 && url.pathname.endsWith('/')) {
    url.pathname = url.pathname.replace(/\/+$/, '');
  }
  return url;
}

/**
 * Decodes a percent-encoded fragment id so it can be matched against a real DOM
 * `id` (e.g. `#usage%20notes` → `usage notes`). Falls back to the raw value if the
 * href carries a malformed escape sequence rather than throwing.
 * @param {string} raw the fragment text after the leading `#`
 * @returns {string} the decoded id
 */
function decodeHashId(raw) {
  try {
    return decodeURIComponent(raw);
  } catch {
    return raw;
  }
}

/**
 * Buckets a raw `<a href>` value into how the crawler should treat it. Hrefs are
 * resolved to absolute URLs before classification so relative, root-relative, and
 * already-absolute forms of the same target collapse to one entry for dedup.
 * @param {string|null} href raw attribute value; may be relative, absolute, hash-only, or empty
 * @param {string} sourceUrl absolute URL of the page the link was found on
 * @param {string} siteOrigin the crawl's own origin, e.g. `https://spectrum.adobe.com`
 * @returns {{kind: 'skip'}
 *   | {kind: 'invalid', href: string}
 *   | {kind: 'hash', id: string}
 *   | {kind: 'internal', url: string}
 *   | {kind: 'external', url: string}}
 */
export function classifyLink(href, sourceUrl, siteOrigin) {
  if (!href) {
    return { kind: 'skip' };
  }
  const trimmed = href.trim();
  if (!trimmed || trimmed === '#') {
    return { kind: 'skip' };
  }
  // mailto:/tel: aren't HTTP resources an external status check can validate.
  if (/^(javascript|mailto|tel):/i.test(trimmed)) {
    return { kind: 'skip' };
  }
  if (trimmed.startsWith('#')) {
    return { kind: 'hash', id: decodeHashId(trimmed.slice(1)) };
  }

  let resolved;
  try {
    resolved = new URL(trimmed, sourceUrl);
  } catch {
    return { kind: 'invalid', href: trimmed };
  }
  if (!/^https?:$/.test(resolved.protocol)) {
    return { kind: 'skip' };
  }

  resolved.hash = '';
  // Only canonicalize our own paths; external servers may treat `/foo` and
  // `/foo/` as genuinely different resources, so leave those untouched.
  return resolved.origin === siteOrigin
    ? { kind: 'internal', url: stripTrailingSlash(resolved).href }
    : { kind: 'external', url: resolved.href };
}

/**
 * @param {string} pathOrUrl a path or absolute URL to crawl
 * @param {string} baseURL the crawl's base URL
 * @returns {string} an absolute internal URL with any hash fragment and trailing slash stripped
 */
export function normalizeUrl(pathOrUrl, baseURL) {
  const resolved = new URL(pathOrUrl, baseURL);
  resolved.hash = '';
  return stripTrailingSlash(resolved).href;
}
