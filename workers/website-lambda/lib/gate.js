/*
 * Pure request-gating policy: given a request path, decides how an anonymous
 * visitor is treated. No Request/Response/fetch here - index.js is the
 * platform adapter that reads the session cookie and turns a verdict into a
 * proxied response or a 404. Authenticated callers bypass this entirely.
 *
 * The posture is default-allow: a page-like path an anonymous visitor requests
 * is served unless the page itself opts into privacy. A page opts in with
 * <meta name="audience" content="private"> in its <head>; because that lives in
 * the fetched HTML, index.js applies it *after* proxying (see isPrivateHtml,
 * used by index.js's gateByMeta). Whole paths/prefixes can also be marked
 * private up front here, with no fetch, via PRIVATE_DENY_EXACT/PREFIX.
 */

// Paths that are private up front, before any fetch - an anonymous visitor
// gets a 404 and no page is proxied. These win over every allow/gate rule
// below, and (unlike the meta gate) can protect non-HTML resources too. Add
// exact paths here and whole sections to PRIVATE_DENY_PREFIX.
export const PRIVATE_DENY_EXACT = [];

// Private sections, matched by prefix (startsWith). e.g. '/internal/'.
export const PRIVATE_DENY_PREFIX = [
  '/drafts/'
];

// Exact-match public paths (compared whole, not by prefix). The site root and
// /404.html are listed so they are served as-is without a meta parse: the
// homepage renders for everyone (its own client code calls /auth/session to
// reveal logged-in content) and /404.html is fetched by CloudFront's custom
// error response to render the real 404 page for gated/missing paths.
export const PUBLIC_ALLOW_EXACT = [];

// Public resources served to anyone, matched by prefix (startsWith).
export const PUBLIC_ALLOW_PREFIX = [
  // TODO: Review if there are any public paths that need to be explicitly allowed
  //
  // '/blocks/',
  // '/templates/',
  // '/deps/',
  // '/styles/',
  // '/scripts/',
  // '/img/',
  // '/fragments/nav/',
  // '/fragments/public/',
  // '/fragments/404',
  // // Telemetry endpoints (RUM / OpTel) beacon before and without login, so
  // // they must stay reachable for anonymous visitors.
  // '/.rum/',
  // '/.optel/',
  // // Specific paths
  // '/favicon.ico',
  // '/robots.txt',
];

// JSON resources served to an anonymous visitor only after a content filter.
// Classified 'filter' here; index.js proxies them and strips the private rows
// (see transformQueryIndex / lib/query-index.js) instead of serving them raw.
// Only /query-index.json needs it today.
export const PUBLIC_FILTER_PATHS = [
  '/query-index.json',
];

// Media is always public, matched loosely by "/media_" anywhere in the path -
// deliberately looser than index.js's isMediaRequest, whose strict hashed-
// filename regex serves a different (search-param) purpose.
const isPublicMedia = (pathname) => pathname.includes('/media_');

// Extension of the last path segment, lowercased ('' for none or a dotfile).
// Mirrors index.js's getExtension - kept here so gate.js stays self-contained.
const getExtension = (pathname) => {
  const basename = pathname.split('/').pop();
  const pos = basename.lastIndexOf('.');
  return (basename === '' || pos < 1) ? '' : basename.slice(pos + 1).toLowerCase();
};

// A "page" is an extensionless path or an .html path - the responses that can
// carry the <meta name="audience"> gate. Everything else (json, xml, ...) is
// data, served by the default-allow fallthrough unless explicitly private.
const isPageLike = (pathname) => {
  const ext = getExtension(pathname);
  return ext === '' || ext === 'html';
};

// Verdict for an anonymous visitor:
//   'allow'  - serve as-is (no meta parse)
//   'filter' - JSON proxied, then private rows stripped before serving
//   'gate'   - page-like: proxy, then 404 only if the HTML opts into privacy
//   'deny'   - 404 up front, indistinguishable from a path that does not exist
// Order matters: an explicitly-private path is denied before any allow/gate.
export const classifyPublicPath = (pathname) => {
  if (PRIVATE_DENY_EXACT.includes(pathname)) { return 'deny'; }
  if (PRIVATE_DENY_PREFIX.some((prefix) => pathname.startsWith(prefix))) { return 'deny'; }
  if (isPublicMedia(pathname)) { return 'allow'; }
  if (PUBLIC_ALLOW_EXACT.includes(pathname)) { return 'allow'; }
  if (PUBLIC_ALLOW_PREFIX.some((prefix) => pathname.startsWith(prefix))) { return 'allow'; }
  if (PUBLIC_FILTER_PATHS.includes(pathname)) { return 'filter'; }
  if (isPageLike(pathname)) { return 'gate'; }
  return 'allow';
};

// Pull one attribute's value out of a single <meta ...> tag, lowercased and
// trimmed. Handles double/single quoted and unquoted values; returns null when
// the attribute is absent. `name` is a literal ('name' | 'content'), so it is
// safe to interpolate into the pattern.
const getMetaAttr = (tag, name) => {
  const match = tag.match(new RegExp(`\\b${name}\\s*=\\s*("([^"]*)"|'([^']*)'|([^"'\\s>]+))`, 'i'));
  if (!match) { return null; }
  return (match[2] ?? match[3] ?? match[4] ?? '').trim().toLowerCase();
};

// True when the page opts into privacy via <meta name="audience"
// content="private"> in its <head>. Pure - index.js's gateByMeta reads the
// proxied HTML and calls this. The scan is scoped to the <head> so a stray
// example of the tag in body content can't gate the page; attribute order,
// quoting, and case are all tolerated.
export const isPrivateHtml = (html) => {
  if (typeof html !== 'string' || html === '') { return false; }
  const headEnd = html.toLowerCase().indexOf('</head>');
  const head = headEnd === -1 ? html : html.slice(0, headEnd);
  const tags = head.match(/<meta\b[^>]*>/gi);
  if (!tags) { return false; }
  return tags.some((tag) => getMetaAttr(tag, 'name') === 'audience'
    && getMetaAttr(tag, 'content') === 'private');
};
