import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { buildRecords, httpDateToEpochSeconds } from '../../tools/indexer/records.js';

const row = {
  path: '/web/rsp/components/accordion',
  title: 'Accordion',
  description: 'An accordion displays a list of items.',
  lastModified: 1782763749,
  platform: 'Web',
  implementation: 'RSP',
  tags: ['accordion', 'container'],
};

const lead = {
  heading: 'Accordion',
  level: 1,
  anchor: 'accordion',
  content: 'intro prose',
  position: 0,
  hierarchy: { lvl0: 'Accordion', lvl1: '', lvl2: '' },
};
const deep = {
  heading: 'Progressive disclosure',
  level: 3,
  anchor: 'progressive-disclosure',
  content: 'body prose',
  position: 5,
  hierarchy: { lvl0: 'Accordion', lvl1: 'Usage guidelines', lvl2: 'Progressive disclosure' },
};

describe('httpDateToEpochSeconds', () => {
  it('converts an HTTP date to epoch seconds', () => {
    assert.equal(httpDateToEpochSeconds('Fri, 31 Jul 2026 04:03:19 GMT'), 1785470599);
  });

  it('returns null for missing or unparseable input', () => {
    assert.equal(httpDateToEpochSeconds(undefined), null);
    assert.equal(httpDateToEpochSeconds('not a date'), null);
  });
});

describe('buildRecords', () => {
  it('titles a lead section with the page title alone', () => {
    assert.equal(buildRecords(row, [lead])[0].title, 'Accordion');
  });

  it('titles a sub-section with page and its own heading', () => {
    assert.equal(buildRecords(row, [lead, deep])[1].title, 'Accordion › Progressive disclosure');
  });

  it('truncates a long title to 80 characters', () => {
    const long = { ...deep, heading: 'x'.repeat(200) };
    const [, { title }] = buildRecords(row, [lead, long]);
    assert.equal(title.length <= 80, true);
    assert.match(title, /^Accordion › x+$/);
  });

  it('does not leave a dangling separator when truncating', () => {
    const pageTitle78 = 'a'.repeat(78);
    const customRow = { ...row, title: pageTitle78 };
    const section = { ...deep, heading: 'Sub' };
    const [{ title }] = buildRecords(customRow, [section]);
    assert.equal(title.length <= 80, true);
    assert.equal(/[\s›]$/.test(title), false);
  });

  it('builds objectID and url from path and anchor', () => {
    const [, record] = buildRecords(row, [lead, deep]);
    assert.equal(record.objectID, '/web/rsp/components/accordion#progressive-disclosure');
    assert.equal(record.url, '/web/rsp/components/accordion#progressive-disclosure');
  });

  it('omits the fragment when a section has no anchor', () => {
    const [record] = buildRecords(row, [{ ...lead, anchor: '' }]);
    assert.equal(record.objectID, '/web/rsp/components/accordion');
    assert.equal(record.url, '/web/rsp/components/accordion');
  });

  it('emits unique objectIDs across a page', () => {
    const ids = buildRecords(row, [lead, deep]).map((r) => r.objectID);
    assert.equal(new Set(ids).size, ids.length);
  });

  it('passes pill fields through untransformed', () => {
    const [record] = buildRecords(row, [lead]);
    assert.equal(record.implementation, 'RSP');
    assert.equal(record.platform, 'Web');
    assert.deepEqual(record.tags, ['accordion', 'container']);
  });

  it('guarantees tags is an array and pill strings are strings', () => {
    const bare = { path: '/x', title: 'X', lastModified: 1 };
    const [record] = buildRecords(bare, [{ ...lead, hierarchy: { lvl0: 'X', lvl1: '', lvl2: '' } }]);
    assert.deepEqual(record.tags, []);
    assert.equal(record.implementation, '');
    assert.equal(record.platform, '');
    assert.equal(record.description, '');
  });

  it('coerces a single string tag into an array', () => {
    const [record] = buildRecords({ ...row, tags: 'solo' }, [lead]);
    assert.deepEqual(record.tags, ['solo']);
  });

  it('derives section from the first path segment', () => {
    assert.equal(buildRecords(row, [lead])[0].section, 'web');
    assert.equal(buildRecords({ ...row, path: '/' }, [lead])[0].section, 'root');
  });

  it('rolls lastModified up to the newest fragment', () => {
    const [record] = buildRecords(row, [lead], [1785470599, 1778101972]);
    assert.equal(record.lastModified, 1785470599);
  });

  it('keeps the page lastModified when it is newest', () => {
    const [record] = buildRecords(row, [lead], [1000]);
    assert.equal(record.lastModified, 1782763749);
  });

  it('does not emit an external field', () => {
    assert.equal('external' in buildRecords(row, [lead])[0], false);
  });

  it('returns nothing for a page with no sections', () => {
    assert.deepEqual(buildRecords(row, []), []);
  });

  it('throws a descriptive error when row has no path', () => {
    const noPath = { title: 'No Path', lastModified: 1 };
    assert.throws(
      () => buildRecords(noPath, [lead]),
      (err) => {
        assert.equal(err instanceof Error, true);
        assert.match(err.message, /Row must have a non-empty path string/);
        return true;
      },
    );
  });

  it('throws a descriptive error when path is not a string', () => {
    const badPath = { path: 123, title: 'Bad', lastModified: 1 };
    assert.throws(
      () => buildRecords(badPath, [lead]),
      (err) => {
        assert.equal(err instanceof Error, true);
        assert.match(err.message, /Row must have a non-empty path string/);
        return true;
      },
    );
  });
});
