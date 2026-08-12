/*
 * Pure request-gating policy: given a request path, decides how an anonymous
 * visitor is treated. No Request/Response/fetch here - index.js is the
 * platform adapter that reads the session cookie and turns a verdict into a
 * proxied response or a 404. Authenticated callers bypass this entirely.
 */

// Exact-match public paths (compared whole, not by prefix - a prefix of '/'
// would allow the entire site). The site root is public: the homepage renders
// for everyone, and its own client code calls /auth/session to decide whether
// to reveal additional content to a logged-in visitor. /404.html is public so
// CloudFront's custom error response can fetch it to render the real 404 page
// for gated/missing paths (the gate otherwise returns a bare 'Not found').
export const PUBLIC_ALLOW_EXACT = [
  '/',
  '/404.html',
];

// Public resources served to anyone, matched by prefix (startsWith).
export const PUBLIC_ALLOW_PREFIX = [
  '/blocks/',
  '/templates/',
  '/deps/',
  '/styles/',
  '/scripts/',
  '/img/',
  '/fragments/nav/',
  '/fragments/public/',
  '/fragments/404',
  // Telemetry endpoints (RUM / OpTel) beacon before and without login, so
  // they must stay reachable for anonymous visitors.
  '/.rum/',
  '/.optel/',
  // Specific paths
  '/favicon.ico',
  '/robots.txt',
];

// JSON resources that must be filtered before an anonymous visitor may see
// them. The filter itself is a later pass; until it lands these fail closed -
// classified 'filter' here, answered with a 404 at the call site. Only
// /query-index.json needs it today.
export const PUBLIC_FILTER_PATHS = [
  '/query-index.json',
];

// Media is always public, matched loosely by "/media_" anywhere in the path -
// deliberately looser than index.js's isMediaRequest, whose strict hashed-
// filename regex serves a different (search-param) purpose.
const isPublicMedia = (pathname) => pathname.includes('/media_');

// Three-way verdict for an anonymous visitor:
//   'allow'  - serve as-is
//   'filter' - JSON that needs filtering first; 404 until that pass lands
//   'deny'   - 404, indistinguishable from a path that does not exist
export const classifyPublicPath = (pathname) => {
  if (isPublicMedia(pathname)) { return 'allow'; }
  if (PUBLIC_ALLOW_EXACT.includes(pathname)) { return 'allow'; }
  if (PUBLIC_ALLOW_PREFIX.some((prefix) => pathname.startsWith(prefix))) { return 'allow'; }
  if (PUBLIC_FILTER_PATHS.includes(pathname)) { return 'filter'; }
  return 'deny';
};
