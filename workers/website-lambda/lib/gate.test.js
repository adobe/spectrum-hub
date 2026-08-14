import { describe, it, expect } from 'vitest';
import {
  classifyPublicPath,
  isPrivateHtml,
  PUBLIC_ALLOW_PREFIX,
  PRIVATE_DENY_EXACT,
  PRIVATE_DENY_PREFIX,
} from './gate.js';

describe('classifyPublicPath', () => {
  it('allows every configured public prefix by startsWith', () => {
    for (const prefix of PUBLIC_ALLOW_PREFIX) {
      expect(classifyPublicPath(`${prefix}anything/deeper.ext`)).toBe('allow');
    }
  });

  it('allows anything containing /media_ anywhere in the path', () => {
    expect(classifyPublicPath('/media_abc.png')).toBe('allow');
    expect(classifyPublicPath('/content/page/media_deadbeef.jpeg')).toBe('allow');
  });

  it('allows the specific-file entries exactly', () => {
    expect(classifyPublicPath('/favicon.ico')).toBe('allow');
    expect(classifyPublicPath('/robots.txt')).toBe('allow');
  });

  it('allows telemetry endpoints for anonymous visitors', () => {
    expect(classifyPublicPath('/.rum/@adobe/helix-rum-js@^2/dist/rum-standalone.js')).toBe('allow');
    expect(classifyPublicPath('/.optel/optel.js')).toBe('allow');
  });

  it('classifies /query-index.json as filter (punted, 404 for now)', () => {
    expect(classifyPublicPath('/query-index.json')).toBe('filter');
  });

  it('allows the site root and /404.html exactly (served without a meta parse)', () => {
    expect(classifyPublicPath('/')).toBe('allow');
    expect(classifyPublicPath('/404.html')).toBe('allow');
  });

  it('gates page-like paths so the private meta can be checked post-fetch', () => {
    expect(classifyPublicPath('/some/content/page')).toBe('gate');
    expect(classifyPublicPath('/index.html')).toBe('gate');
    expect(classifyPublicPath('/foo.plain.html')).toBe('gate');
    expect(classifyPublicPath('/some/section/')).toBe('gate');
  });

  it('defaults non-page, non-listed resources to allow (json/xml/other)', () => {
    expect(classifyPublicPath('/data/other.json')).toBe('allow');
    expect(classifyPublicPath('/sitemap.xml')).toBe('allow');
    expect(classifyPublicPath('/not/scripts/app.js')).toBe('allow');
  });
});

describe('classifyPublicPath private overrides', () => {
  const withPrivate = (exact, prefix, fn) => {
    PRIVATE_DENY_EXACT.push(...exact);
    PRIVATE_DENY_PREFIX.push(...prefix);
    try {
      fn();
    } finally {
      PRIVATE_DENY_EXACT.length = 0;
      PRIVATE_DENY_PREFIX.length = 0;
    }
  };

  it('denies an exact private path', () => {
    withPrivate(['/secret'], [], () => {
      expect(classifyPublicPath('/secret')).toBe('deny');
    });
  });

  it('denies a private prefix by startsWith, not merely contains', () => {
    withPrivate([], ['/internal/'], () => {
      expect(classifyPublicPath('/internal/roadmap')).toBe('deny');
      // A path that only *contains* the prefix is not private.
      expect(classifyPublicPath('/not/internal/roadmap')).toBe('gate');
    });
  });

  it('lets a private declaration win over a would-be gate or allow path', () => {
    withPrivate(['/scripts/app.js'], ['/img/'], () => {
      // /scripts/app.js and /img/... would otherwise be public 'allow'.
      expect(classifyPublicPath('/scripts/app.js')).toBe('deny');
      expect(classifyPublicPath('/img/hero.png')).toBe('deny');
    });
  });
});

describe('isPrivateHtml', () => {
  const page = (head) => `<!doctype html><html><head>${head}</head><body></body></html>`;

  it('detects the audience=private meta (double quoted)', () => {
    expect(isPrivateHtml(page('<meta name="audience" content="private">'))).toBe(true);
  });

  it('detects single-quoted and reversed attribute order', () => {
    expect(isPrivateHtml(page("<meta content='private' name='audience'>"))).toBe(true);
  });

  it('tolerates extra attributes and mixed case', () => {
    expect(isPrivateHtml(page('<META Name="Audience" data-x="1" Content="Private">'))).toBe(true);
  });

  it('returns false when the meta is absent', () => {
    expect(isPrivateHtml(page('<meta name="description" content="hi">'))).toBe(false);
  });

  it('returns false for a different audience value', () => {
    expect(isPrivateHtml(page('<meta name="audience" content="mobile">'))).toBe(false);
  });

  it('ignores a matching tag that only appears in the body', () => {
    const html = '<html><head><title>x</title></head>'
      + '<body><meta name="audience" content="private"></body></html>';
    expect(isPrivateHtml(html)).toBe(false);
  });

  it('returns false for empty or non-string input', () => {
    expect(isPrivateHtml('')).toBe(false);
    expect(isPrivateHtml(null)).toBe(false);
    expect(isPrivateHtml(undefined)).toBe(false);
  });
});
