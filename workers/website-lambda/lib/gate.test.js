import { describe, it, expect } from 'vitest';
import { classifyPublicPath, PUBLIC_ALLOW_PREFIX } from './gate.js';

describe('classifyPublicPath', () => {
  it('allows every configured prefix by startsWith', () => {
    for (const prefix of PUBLIC_ALLOW_PREFIX) {
      expect(classifyPublicPath(`${prefix}anything/deeper.ext`)).toBe('allow');
    }
  });

  it('allows a path that only starts with a prefix, not merely contains it', () => {
    expect(classifyPublicPath('/scripts/app.js')).toBe('allow');
    expect(classifyPublicPath('/not/scripts/app.js')).toBe('deny');
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

  it('allows the site root (public homepage) exactly, not as a prefix', () => {
    expect(classifyPublicPath('/')).toBe('allow');
    // '/' must not leak into a prefix match that opens the whole site
    expect(classifyPublicPath('/some/content/page')).toBe('deny');
  });

  it('allows /404.html so the custom error page can be fetched publicly', () => {
    expect(classifyPublicPath('/404.html')).toBe('allow');
  });

  it('denies content pages', () => {
    expect(classifyPublicPath('/some/content/page')).toBe('deny');
    expect(classifyPublicPath('/index.html')).toBe('deny');
  });

  it('denies a non-listed json path (only /query-index.json is filtered today)', () => {
    expect(classifyPublicPath('/data/other.json')).toBe('deny');
  });
});
