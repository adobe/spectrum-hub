import { describe, it, expect } from 'vitest';
import {
  filterAudienceBlocks, filterAudienceMarkdown, hasAudienceBlocks,
  filterPrivateCardMeta, hasPrivateCardMeta,
} from './audience.js';
import { PRIVATE_CARD_FIELDS } from './card-fields.js';

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

describe('filterAudienceBlocks on .plain.html markup', () => {
  // The .plain.html variant is the sections without the document or <main>.
  const plain = (...blocks) => `\n<div>\n${blocks.join('\n')}\n</div>\n`;

  it('removes audience-private blocks for anonymous viewers', () => {
    const out = filterAudienceBlocks(plain(PUBLIC, PRIVATE, PLAIN), false);
    expect(out).toContain('public banner');
    expect(out).toContain('shared');
    expect(out).not.toContain('private banner');
  });

  it('removes audience-public blocks for authenticated viewers', () => {
    const out = filterAudienceBlocks(plain(PUBLIC, PRIVATE), true);
    expect(out).toContain('private banner');
    expect(out).not.toContain('public banner');
  });

  it('ignores audience classes nested deeper than block level', () => {
    const nested = '<div class="columns"><div><div class="audience-private">inner</div></div></div>';
    const html = plain(nested);
    expect(filterAudienceBlocks(html, false)).toBe(html);
  });
});

describe('filterAudienceMarkdown', () => {
  // AEM renders each block in the .md variant as a grid table headed
  // `Name (variants)`.
  const table = (header, ...rows) => {
    const width = Math.max(header.length, ...rows.map((r) => r.length)) + 2;
    const border = `+${'-'.repeat(width)}+`;
    const row = (text) => `| ${text.padEnd(width - 2)} |`;
    return [border, row(header), border, ...rows.map(row), border].join('\n');
  };
  const doc = (...parts) => `${parts.join('\n\n')}\n`;

  const MD_PUBLIC = table('Banner (audience public)', 'public banner');
  const MD_PRIVATE = table('Banner (audience private)', 'private banner');
  const MD_PLAIN = table('Columns (large)', 'shared');
  const metadata = (...rows) => {
    const border = `+${'-'.repeat(30)}+${'-'.repeat(50)}+`;
    const row = (key, value) => `| ${key.padEnd(28)} | ${value.padEnd(48)} |`;
    return [
      border, `${'| Metadata'.padEnd(border.length - 1)}|`, border,
      ...rows.flatMap(([key, value]) => [row(key, value), border]),
    ].join('\n');
  };

  it('removes audience-private tables for anonymous viewers', () => {
    const out = filterAudienceMarkdown(doc('# Title', MD_PUBLIC, MD_PRIVATE, MD_PLAIN), false);
    expect(out).toContain('public banner');
    expect(out).toContain('shared');
    expect(out).toContain('# Title');
    expect(out).not.toContain('private banner');
    expect(out).toBe(doc('# Title', MD_PUBLIC, MD_PLAIN));
  });

  it('removes audience-public tables for authenticated viewers', () => {
    const out = filterAudienceMarkdown(doc(MD_PUBLIC, MD_PRIVATE), true);
    expect(out).toContain('private banner');
    expect(out).not.toContain('public banner');
  });

  it('matches the audience variant among others, hyphenated or spaced, any case', () => {
    for (const header of ['Columns (centered, audience private)', 'Columns (Audience-Private, large)']) {
      const out = filterAudienceMarkdown(doc(table(header, 'hidden'), '# Kept'), false);
      expect(out).not.toContain('hidden');
      expect(out).toContain('# Kept');
    }
  });

  it('removes every row of a multi-line block, including nested tables', () => {
    const nested = [
      '+--------------------------------+',
      '| Columns (audience private)     |',
      '+---------------+----------------+',
      '| cell one      | +------------+ |',
      '|               | | inner      | |',
      '|               | +------------+ |',
      '+---------------+----------------+',
    ].join('\n');
    const out = filterAudienceMarkdown(doc(nested, 'After'), false);
    expect(out).toBe(doc('After'));
  });

  it('matches headers that keep the author\'s inline formatting', () => {
    for (const header of [
      '**Cards (audience private)**',
      'Cards **(audience private)**',
      '*Cards (audience-private)*',
      'Cards (audience\\-private)',
      'Cards (`audience private`)',
    ]) {
      const out = filterAudienceMarkdown(doc(table(header, 'hidden'), '# Kept'), false);
      expect(out, header).not.toContain('hidden');
      expect(out, header).toContain('# Kept');
    }
  });

  it('drops reference definitions used only by removed blocks', () => {
    const md = doc(
      table('Columns (audience private)', '![][image0] ![][image1]'),
      table('Columns', '![][image1]'),
      '[image0]: https://example.com/media_aaa.png#width=1&height=1 "private title"',
      '[image1]: https://example.com/media_bbb.png#width=1&height=1',
    );
    const out = filterAudienceMarkdown(md, false);
    expect(out).not.toContain('media_aaa');
    expect(out).not.toContain('private title');
    expect(out).toContain('[image1]: https://example.com/media_bbb.png');
    expect(out).toBe(doc(
      table('Columns', '![][image1]'),
      '[image1]: https://example.com/media_bbb.png#width=1&height=1',
    ));
  });

  it('keeps reference definitions when nothing is removed', () => {
    const md = doc(MD_PUBLIC, '![][image0]', '[image0]: https://example.com/media_aaa.png');
    expect(filterAudienceMarkdown(md, false)).toBe(md);
  });

  it('leaves prose that mentions the audience class untouched', () => {
    const md = doc('Add `audience private` to a block to hide it.', MD_PLAIN);
    expect(filterAudienceMarkdown(md, false)).toBe(md);
  });

  it('does not treat a metadata row as a block variant', () => {
    const md = doc('# Title', table('Metadata', 'audience | public'));
    expect(filterAudienceMarkdown(md, true)).toBe(md);
  });

  it.each([
    'Card steward', 'card-steward', '**CARD-STEWARD**',
    'Card design resources', 'card-design-resources', 'Card contact', 'card-contact',
  ])('removes private metadata row %s without changing public rows', (key) => {
    const md = doc('# Title', metadata(
      ['Title', 'Public title'],
      [key, 'private value'],
      ['Description', 'Public description'],
    ), MD_PLAIN);

    expect(filterAudienceMarkdown(md, false)).toBe(doc('# Title', metadata(
      ['Title', 'Public title'],
      ['Description', 'Public description'],
    ), MD_PLAIN));
  });

  it('removes wrapped private metadata keys and values', () => {
    const md = doc(metadata(
      ['Title', 'Public title'],
      ['**Card design**', 'private first line'],
    ).replace(
      /(\| \*\*Card design\*\*[^\n]*\n)/,
      '$1| **resources**                | private continuation                             |\n',
    ));

    expect(filterAudienceMarkdown(md, false)).toBe(doc(metadata(['Title', 'Public title'])));
  });

  it('preserves private metadata for authenticated viewers byte-for-byte', () => {
    const md = doc(metadata(['Card steward', 'private value']), '# Public content');

    expect(filterAudienceMarkdown(md, true)).toBe(md);
  });

  it('removes metadata tables left empty after filtering', () => {
    const md = doc('# Before', metadata(['Card contact', 'private value']), '# After');

    expect(filterAudienceMarkdown(md, false)).toBe(doc('# Before', '# After'));
  });

  it('removes orphaned private metadata references but keeps shared references', () => {
    const md = doc(
      metadata(
        ['Title', 'Public title'],
        ['Card design resources', '[Design][private] [Shared][shared]'],
      ),
      'Public [resource][shared].',
      '[private]: https://example.test/private-design "private title"',
      '[shared]: https://example.test/public-resource',
    );

    expect(filterAudienceMarkdown(md, false)).toBe(doc(
      metadata(['Title', 'Public title']),
      'Public [resource][shared].',
      '[shared]: https://example.test/public-resource',
    ));
  });

  it('filters every metadata table alongside audience-private blocks', () => {
    const md = doc(
      metadata(['Card steward', 'private team']),
      MD_PRIVATE,
      metadata(['Title', 'Public title'], ['Card contact', 'private contact']),
      MD_PUBLIC,
    );

    expect(filterAudienceMarkdown(md, false)).toBe(doc(
      metadata(['Title', 'Public title']),
      MD_PUBLIC,
    ));
  });

  it('keeps private field names outside metadata keys untouched', () => {
    const md = doc(
      'Card steward is an authored metadata field.',
      metadata(['Description', 'How to author card-steward']),
      table('Columns', 'card-contact | public example'),
    );

    expect(filterAudienceMarkdown(md, false)).toBe(md);
  });

  it('returns non-strings and audience-free markdown unchanged', () => {
    expect(filterAudienceMarkdown(undefined, false)).toBeUndefined();
    const md = doc('# Title', MD_PLAIN);
    expect(filterAudienceMarkdown(md, false)).toBe(md);
  });
});

// A page's <head> carries the private card metadata; filterAudienceBlocks only
// reaches blocks inside <main>, so these fields need their own strip.
const metaPage = (...metas) => '<!doctype html><html><head><title>Button</title>'
  + '<meta property="og:title" content="Button">'
  + '<meta name="card-title" content="Buttons">'
  + metas.join('')
  + '<meta name="platform" content="web">'
  + '</head><body><main><div class="section">'
  + '<div class="columns">shared</div></div></main></body></html>';

const STEWARD = '<meta name="card-steward" content="Marina Harutyunyan">';
const DESIGN = '<meta name="card-design-resources" content="https://www.figma.com/design/abc">';
const CONTACT = '<meta name="card-contact" content="#spectrum-help">';

describe('hasPrivateCardMeta', () => {
  it('is true only when a private field name is present', () => {
    expect(hasPrivateCardMeta(metaPage(STEWARD))).toBe(true);
    expect(hasPrivateCardMeta(metaPage())).toBe(false);
  });

  it('is false for non-string input', () => {
    expect(hasPrivateCardMeta(undefined)).toBe(false);
    expect(hasPrivateCardMeta(null)).toBe(false);
  });
});

describe('filterPrivateCardMeta', () => {
  it('removes every private card meta tag for an anonymous viewer', () => {
    const out = filterPrivateCardMeta(metaPage(STEWARD, DESIGN, CONTACT), false);

    PRIVATE_CARD_FIELDS.forEach((field) => expect(out).not.toContain(field));
    expect(out).not.toContain('Marina Harutyunyan');
    expect(out).not.toContain('figma.com');
    expect(out).not.toContain('#spectrum-help');
  });

  it('leaves the rest of the head and the body untouched', () => {
    const out = filterPrivateCardMeta(metaPage(STEWARD, DESIGN, CONTACT), false);

    expect(out).toContain('<meta name="card-title" content="Buttons">');
    expect(out).toContain('<meta property="og:title" content="Button">');
    expect(out).toContain('<meta name="platform" content="web">');
    expect(out).toContain('<div class="columns">shared</div>');
  });

  it('returns the page byte-for-byte for an authenticated viewer', () => {
    const page = metaPage(STEWARD, DESIGN, CONTACT);

    expect(filterPrivateCardMeta(page, true)).toBe(page);
  });

  // The whole point of stripping by field name: a public page carries these
  // values with nothing marking them private, so row/block filtering by an
  // audience marker would let them through.
  it('strips an unmarked public page, which no audience class covers', () => {
    const page = metaPage(STEWARD);

    expect(page).not.toContain('audience-private');
    expect(filterPrivateCardMeta(page, false)).not.toContain('Marina Harutyunyan');
  });

  it('returns pages without the fields, and non-strings, unchanged', () => {
    const page = metaPage();

    expect(filterPrivateCardMeta(page, false)).toBe(page);
    expect(filterPrivateCardMeta(undefined, false)).toBeUndefined();
  });

  it('composes with filterAudienceBlocks without disturbing either', () => {
    const page = metaPage(STEWARD).replace(
      '<div class="columns">shared</div>',
      '<div class="columns">shared</div><div class="banner audience-private">secret</div>',
    );
    const out = filterPrivateCardMeta(filterAudienceBlocks(page, false), false);

    expect(out).not.toContain('secret');
    expect(out).not.toContain('Marina Harutyunyan');
    expect(out).toContain('shared');
  });
});
