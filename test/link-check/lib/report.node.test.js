import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { toMarkdown } from './report.js';

describe('toMarkdown', () => {
  it('reports a clean crawl without a table', () => {
    const report = toMarkdown({}, { pagesVisited: 12, linksChecked: 40 });
    assert.match(report, /Pages crawled: 12/);
    assert.match(report, /Broken internal links found: 0/);
    assert.match(report, /Broken external links found: 0/);
    assert.match(report, /No broken internal links found\./);
    assert.match(report, /No broken external links found\./);
    assert.doesNotMatch(report, /\| Source page \|/);
  });

  it('renders one table row per broken internal link', () => {
    const report = toMarkdown(
      {
        internal: [{
          sourcePage: '/foundations/color', text: 'Typography', href: '/foundations/typografy', kind: 'internal', status: 404,
        }],
      },
      { pagesVisited: 5, linksChecked: 20 },
    );
    assert.match(report, /\| \/foundations\/color \| Typography \| \/foundations\/typografy \| internal \| 404 \|/);
  });

  it('reports external breakage in its own section, flagged as non-failing', () => {
    const report = toMarkdown(
      {
        external: [{
          sourcePage: '/a', text: 'Figma', href: 'https://figma.com/x', kind: 'external', status: 503,
        }],
      },
      { pagesVisited: 3, linksChecked: 10 },
    );
    assert.match(report, /Broken external links found: 1/);
    assert.match(report, /do not fail the run/);
    assert.match(report, /No broken internal links found\./);
    assert.match(report, /\| \/a \| Figma \| https:\/\/figma\.com\/x \| external \| 503 \|/);
  });

  it('escapes pipes so a broken link cannot corrupt the table', () => {
    const report = toMarkdown(
      {
        internal: [{
          sourcePage: '/a', text: 'A | B', href: '/b', kind: 'internal', status: 404, reason: 'not | found',
        }],
      },
      { pagesVisited: 1, linksChecked: 1 },
    );
    assert.match(report, /A \\\| B/);
    assert.match(report, /not \\\| found/);
  });

  it('flags a truncated crawl so coverage gaps are visible', () => {
    const report = toMarkdown({}, { pagesVisited: 200, linksChecked: 900, truncated: true });
    assert.match(report, /LINKCHECK_MAX_PAGES/);
  });
});
