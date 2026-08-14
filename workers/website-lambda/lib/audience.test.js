import { describe, it, expect } from 'vitest';
import { filterAudienceBlocks, hasAudienceBlocks } from './audience.js';

// A block is `main > div (section) > div[class]` in the served HTML. Build a
// section from block markup strings so tests read close to real pages.
const page = (...blocks) => '<!doctype html><html><head><title>t</title></head>'
  + `<body><main><div class="section">${blocks.join('')}</div></main></body></html>`;

const PUBLIC = '<div class="banner audience-public">public banner</div>';
const PRIVATE = '<div class="banner audience-private">private banner</div>';
const PLAIN = '<div class="columns">shared</div>';

describe('hasAudienceBlocks', () => {
  it('is true only when an audience class is present', () => {
    expect(hasAudienceBlocks(page(PUBLIC))).toBe(true);
    expect(hasAudienceBlocks(page(PRIVATE))).toBe(true);
    expect(hasAudienceBlocks(page(PLAIN))).toBe(false);
  });

  it('is false for non-string input', () => {
    expect(hasAudienceBlocks(null)).toBe(false);
    expect(hasAudienceBlocks(undefined)).toBe(false);
  });
});

describe('filterAudienceBlocks', () => {
  it('removes audience-private and keeps audience-public for an anonymous viewer', () => {
    const out = filterAudienceBlocks(page(PUBLIC, PRIVATE, PLAIN), false);
    expect(out).toContain('audience-public');
    expect(out).not.toContain('audience-private');
    expect(out).not.toContain('private banner');
    expect(out).toContain('shared');
  });

  it('removes audience-public and keeps audience-private for an authenticated viewer', () => {
    const out = filterAudienceBlocks(page(PUBLIC, PRIVATE, PLAIN), true);
    expect(out).toContain('audience-private');
    expect(out).not.toContain('audience-public');
    expect(out).not.toContain('public banner');
    expect(out).toContain('shared');
  });

  it('removes a block whole, including nested divs', () => {
    const nested = '<div class="cards audience-private"><div class="row">'
      + '<div class="cell">deep private</div></div></div>';
    const out = filterAudienceBlocks(page(PUBLIC, nested), false);
    expect(out).not.toContain('audience-private');
    expect(out).not.toContain('deep private');
    expect(out).not.toContain('class="row"');
    // The public sibling and its content survive intact.
    expect(out).toContain('public banner');
  });

  it('removes every matching block when there are several', () => {
    const out = filterAudienceBlocks(page(PRIVATE, PLAIN, PRIVATE, PUBLIC), false);
    expect(out).not.toContain('audience-private');
    expect(out.match(/audience-public/g)).toHaveLength(1);
    expect(out).toContain('shared');
  });

  it('only targets block-level (main > div > div), not sections or deeper nodes', () => {
    // audience-private on the section wrapper (main > div) - must be left alone.
    const sectionLevel = '<!doctype html><html><head></head><body><main>'
      + '<div class="section audience-private"><div class="columns">keep</div></div>'
      + '</main></body></html>';
    expect(filterAudienceBlocks(sectionLevel, false)).toBe(sectionLevel);

    // audience-private nested one level below the block - also left alone.
    const deeper = page('<div class="wrapper"><div class="audience-private">deep</div></div>');
    const out = filterAudienceBlocks(deeper, false);
    expect(out).toContain('deep');
    expect(out).toContain('audience-private');
  });

  it('returns the HTML byte-identical when there is nothing to strip', () => {
    const html = page(PLAIN);
    expect(filterAudienceBlocks(html, false)).toBe(html);
    // audience-public present but viewer is anonymous -> nothing removed.
    const anonHtml = page(PUBLIC, PLAIN);
    expect(filterAudienceBlocks(anonHtml, false)).toBe(anonHtml);
  });

  it('preserves the doctype and head after a removal', () => {
    const out = filterAudienceBlocks(page(PRIVATE, PLAIN), false);
    expect(out.startsWith('<!doctype html>')).toBe(true);
    expect(out).toContain('<head><title>t</title></head>');
  });
});
