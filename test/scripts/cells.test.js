import { expect } from '@esm-bundle/chai';
import {
  getAuthoredCells,
  getCellLinkHref,
  getCellMedia,
  getCellText,
  toSafeHttpUrl,
} from '../../scripts/utils/cells.js';

/** Builds a block from `[label, valueHtml]` pairs in raw row/cell shape. */
function makeBlock(rows) {
  const block = document.createElement('div');
  rows.forEach(([label, html]) => {
    const row = document.createElement('div');
    row.innerHTML = `<div>${label}</div><div>${html}</div>`;
    block.append(row);
  });
  return block;
}

/** Builds a single value cell. */
function makeCell(html) {
  const cell = document.createElement('div');
  cell.innerHTML = html;
  return cell;
}

describe('getAuthoredCells', () => {
  it('keys value cells by the label turned into a class name', () => {
    const block = makeBlock([['Video URL', 'https://example.com']]);

    const cells = getAuthoredCells(block);

    expect(Object.keys(cells)).to.deep.equal(['video-url']);
    expect(cells['video-url'].textContent).to.equal('https://example.com');
  });

  it('reads every labelled row', () => {
    const block = makeBlock([
      ['Video URL', 'https://example.com'],
      ['Transcript', '<p>Hello</p>'],
    ]);

    expect(Object.keys(getAuthoredCells(block))).to.deep.equal(['video-url', 'transcript']);
  });

  it('skips a row that has no value cell', () => {
    const block = document.createElement('div');
    const row = document.createElement('div');
    row.innerHTML = '<div>Video URL</div>';
    block.append(row);

    expect(getAuthoredCells(block)).to.deep.equal({});
  });

  it('returns an empty map for a block with no rows', () => {
    expect(getAuthoredCells(document.createElement('div'))).to.deep.equal({});
  });
});

describe('getCellText', () => {
  it('returns trimmed text', () => {
    expect(getCellText(makeCell('  <p>Watch this</p>  '))).to.equal('Watch this');
  });

  it('ignores visually hidden hints', () => {
    const cell = makeCell('Watch this <span class="visually-hidden">(opens in a new tab)</span>');

    expect(getCellText(cell)).to.equal('Watch this');
  });

  it('returns an empty string for a missing cell', () => {
    expect(getCellText(undefined)).to.equal('');
  });
});

describe('getCellLinkHref', () => {
  it('returns the href of the first link', () => {
    const cell = makeCell('<a href="https://example.com/one">One</a><a href="/two">Two</a>');

    expect(getCellLinkHref(cell)).to.equal('https://example.com/one');
  });

  it('returns an empty string when the cell has no link', () => {
    expect(getCellLinkHref(makeCell('<p>No link</p>'))).to.equal('');
  });

  it('returns an empty string for a missing cell', () => {
    expect(getCellLinkHref(undefined)).to.equal('');
  });
});

describe('getCellMedia', () => {
  it('prefers a picture over a bare image', () => {
    const cell = makeCell('<img src="loose.jpg" alt=""><picture><img src="in-picture.jpg" alt=""></picture>');

    expect(getCellMedia(cell).tagName).to.equal('PICTURE');
  });

  it('returns a bare image when there is no picture', () => {
    const cell = makeCell('<img src="loose.jpg" alt="">');

    expect(getCellMedia(cell).tagName).to.equal('IMG');
  });

  it('returns null when the cell has no media', () => {
    expect(getCellMedia(makeCell('<p>Text</p>')) === null).to.equal(true);
  });

  it('returns null for a missing cell', () => {
    expect(getCellMedia(undefined) === null).to.equal(true);
  });
});

describe('toSafeHttpUrl', () => {
  it('returns an absolute http(s) URL unchanged', () => {
    expect(toSafeHttpUrl('https://example.com/video')).to.equal('https://example.com/video');
  });

  it('resolves a relative URL against the current page', () => {
    expect(toSafeHttpUrl('/video')).to.equal(`${window.location.origin}/video`);
  });

  it('rejects a non-http protocol', () => {
    // Built from parts so the linter does not read it as a script URL literal.
    expect(toSafeHttpUrl(`java${'script'}:alert(1)`)).to.equal('');
  });

  it('rejects a data URL', () => {
    expect(toSafeHttpUrl('data:text/html,<p>hi</p>')).to.equal('');
  });

  it('returns an empty string for a missing value', () => {
    expect(toSafeHttpUrl('')).to.equal('');
  });
});
