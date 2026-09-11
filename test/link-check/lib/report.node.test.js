import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { toMarkdown } from './report.js';

describe('toMarkdown', () => {
  it('reports a clean crawl without a table', () => {
    const report = toMarkdown([], { pagesVisited: 12, linksChecked: 40 });
    assert.match(report, /Pages crawled: 12/);
    assert.match(report, /Broken links found: 0/);
    assert.match(report, /No broken navigation found\./);
    assert.doesNotMatch(report, /\| Source page \|/);
  });

  it('renders one table row per broken link', () => {
    const report = toMarkdown(
      [
        {
          sourcePage: '/foundations/color', text: 'Typography', href: '/foundations/typografy', kind: 'internal', status: 404,
        },
      ],
      { pagesVisited: 5, linksChecked: 20 },
    );
    assert.match(report, /\| \/foundations\/color \| Typography \| \/foundations\/typografy \| internal \| 404 \|/);
  });

  it('escapes pipes so a broken link cannot corrupt the table', () => {
    const report = toMarkdown(
      [{
        sourcePage: '/a', text: 'A | B', href: '/b', kind: 'internal', status: 404, reason: 'not | found',
      }],
      { pagesVisited: 1, linksChecked: 1 },
    );
    assert.match(report, /A \\\| B/);
    assert.match(report, /not \\\| found/);
  });

  it('flags a truncated crawl so coverage gaps are visible', () => {
    const report = toMarkdown([], { pagesVisited: 200, linksChecked: 900, truncated: true });
    assert.match(report, /LINKCHECK_MAX_PAGES/);
  });
});
