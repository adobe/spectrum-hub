import { describe, it, expect } from 'vitest';
import { filterSitemap } from './sitemap.js';

const entry = (path, extra = '') => `  <url>
    <loc>https://spectrum.adobe.com${path}</loc>
    <lastmod>2026-09-30</lastmod>${extra}
  </url>
`;

const sitemap = (...entries) => `<?xml version="1.0" encoding="utf-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">
${entries.join('')}</urlset>
`;

const locs = (xml) => [...xml.matchAll(/<loc>([^<]*)<\/loc>/g)].map((m) => new URL(m[1]).pathname);

const privateSet = (...paths) => (pathname) => paths.includes(pathname);

describe('filterSitemap', () => {
  it('drops <url> entries whose path is private and keeps the rest', () => {
    const out = filterSitemap(
      sitemap(entry('/a'), entry('/secret'), entry('/b')),
      privateSet('/secret'),
    );
    expect(locs(out)).toEqual(['/a', '/b']);
    expect(out).not.toContain('/secret');
  });

  it('leaves a well-formed document with matched tags', () => {
    const out = filterSitemap(sitemap(entry('/a'), entry('/secret')), privateSet('/secret'));
    expect(out.startsWith('<?xml')).toBe(true);
    expect(out.trim().endsWith('</urlset>')).toBe(true);
    expect(out.match(/<url>/g)).toHaveLength(1);
    expect(out.match(/<\/url>/g)).toHaveLength(1);
  });

  it('returns the body unchanged when nothing is private', () => {
    const xml = sitemap(entry('/a'), entry('/b'));
    expect(filterSitemap(xml, () => false)).toBe(xml);
  });

  it('matches percent-encoded and entity-escaped locs against the plain path', () => {
    const out = filterSitemap(
      sitemap(entry('/caf%C3%A9'), entry('/a&amp;b'), entry('/ok')),
      privateSet('/café', '/a&b'),
    );
    expect(locs(out)).toEqual(['/ok']);
  });

  it('drops an entry whose <loc> is missing or unparseable (fail closed)', () => {
    const xml = sitemap(
      '  <url>\n    <lastmod>2026-09-30</lastmod>\n  </url>\n',
      '  <url>\n    <loc>not a url</loc>\n  </url>\n',
      entry('/ok'),
    );
    const out = filterSitemap(xml, () => false);
    expect(out.match(/<url>/g)).toHaveLength(1);
    expect(locs(out)).toEqual(['/ok']);
  });

  it('removes xhtml:link alternates that point at a private path', () => {
    const alternates = `
    <xhtml:link rel="alternate" hreflang="en" href="https://spectrum.adobe.com/a"/>
    <xhtml:link rel="alternate" hreflang="de" href="https://spectrum.adobe.com/secret"/>`;
    const out = filterSitemap(sitemap(entry('/a', alternates)), privateSet('/secret'));
    expect(locs(out)).toEqual(['/a']);
    expect(out).toContain('hreflang="en"');
    expect(out).not.toContain('/secret');
  });

  it('fails closed (returns null) for a body that is not a <urlset>', () => {
    const index = '<?xml version="1.0"?><sitemapindex><sitemap><loc>https://x/s.xml</loc></sitemap></sitemapindex>';
    expect(filterSitemap(index, () => false)).toBe(null);
    expect(filterSitemap('not xml', () => false)).toBe(null);
    expect(filterSitemap(null, () => false)).toBe(null);
  });
});
