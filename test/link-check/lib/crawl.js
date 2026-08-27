/**
 * Buckets a raw `<a href>` value into how the crawler should treat it. Hrefs are
 * resolved to absolute URLs before classification so relative, root-relative, and
 * already-absolute forms of the same target collapse to one entry for dedup.
 * @param {string|null} href raw attribute value; may be relative, absolute, hash-only, or empty
 * @param {string} sourceUrl absolute URL of the page the link was found on
 * @param {string} siteOrigin the crawl's own origin, e.g. `https://main--spectrum-hub--adobe.aem.live`
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
    return { kind: 'hash', id: trimmed.slice(1) };
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
  return resolved.origin === siteOrigin
    ? { kind: 'internal', url: resolved.href }
    : { kind: 'external', url: resolved.href };
}

/**
 * @param {string} pathOrUrl a path or absolute URL to crawl
 * @param {string} baseURL the crawl's base URL
 * @returns {string} an absolute URL with any hash fragment stripped
 */
export function normalizeUrl(pathOrUrl, baseURL) {
  const resolved = new URL(pathOrUrl, baseURL);
  resolved.hash = '';
  return resolved.href;
}
