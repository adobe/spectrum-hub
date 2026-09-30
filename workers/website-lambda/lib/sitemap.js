/*
 * Pure transform for the AEM sitemap.xml, applied by index.js before an
 * anonymous visitor receives it. No Request/Response here.
 *
 * The sitemap itself carries no audience information, so the caller supplies
 * an `isPrivatePath(pathname)` predicate (built from the query index's
 * audience:private rows plus the gate's deny list). Every <url> entry whose
 * <loc> is private - or cannot be parsed - is dropped, as is any
 * <xhtml:link> alternate that points at a private path.
 */

const XML_ENTITIES = {
  '&amp;': '&', '&lt;': '<', '&gt;': '>', '&quot;': '"', '&apos;': "'",
};

const decodeXml = (value) => value.replace(/&(amp|lt|gt|quot|apos);/g, (m) => XML_ENTITIES[m]);

// Pathname of a sitemap URL, or null when it is not a parseable absolute URL.
// Percent-decoded so it compares equal to the (unencoded) query-index paths.
const toPathname = (raw) => {
  try {
    const { pathname } = new URL(decodeXml(raw.trim()));
    try { return decodeURI(pathname); } catch { return pathname; }
  } catch {
    return null;
  }
};

// Each entry is matched with its leading indentation and trailing newline so
// dropping one leaves the remaining document tidy. `<url\b` does not match
// `<urlset`.
const URL_ENTRY = /[ \t]*<url\b[^>]*>[\s\S]*?<\/url>[ \t]*(?:\r?\n)?/g;
const LOC = /<loc>([\s\S]*?)<\/loc>/;
const ALTERNATE_LINK = /[ \t]*<xhtml:link\b[^>]*?\bhref\s*=\s*("([^"]*)"|'([^']*)')[^>]*>(?:\r?\n)?/g;

// Remove private entries from a sitemap <urlset>. Returns null when the body is
// not a <urlset> (e.g. a <sitemapindex>, whose child sitemaps this filter would
// not reach), so the caller fails closed instead of serving it unfiltered.
export const filterSitemap = (xml, isPrivatePath) => {
  if (typeof xml !== 'string' || !/<urlset\b/.test(xml)) { return null; }
  return xml.replace(URL_ENTRY, (entry) => {
    const loc = entry.match(LOC);
    const pathname = loc ? toPathname(loc[1]) : null;
    if (pathname === null || isPrivatePath(pathname)) { return ''; }
    return entry.replace(ALTERNATE_LINK, (link, _q, dq, sq) => {
      const href = toPathname(dq ?? sq);
      return href === null || isPrivatePath(href) ? '' : link;
    });
  });
};
