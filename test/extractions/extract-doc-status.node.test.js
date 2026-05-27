import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  fetchComponentDocStatus,
  parseStatusFromHtml,
  parseStatusFromMdx,
} from '../../deps/rsp/extract-doc-status.js';

describe('parseStatusFromMdx', () => {
  it('returns prerelease when export const version is set', () => {
    const mdx = "export const version = 'rc';\n# Autocomplete\n";
    assert.equal(parseStatusFromMdx(mdx), 'rc');
  });

  it('returns stable when no version export exists', () => {
    assert.equal(parseStatusFromMdx('# Button\n'), 'stable');
  });
});

describe('parseStatusFromHtml', () => {
  it('returns prerelease when the docs badge is present', () => {
    assert.equal(parseStatusFromHtml('<span>rc</span>'), 'rc');
    assert.equal(parseStatusFromHtml('>alpha<'), 'alpha');
  });

  it('returns stable when no badge is present', () => {
    assert.equal(parseStatusFromHtml('<h1>Button</h1>'), 'stable');
  });
});

describe('fetchComponentDocStatus', () => {
  it('returns stable for a published S2 component without a badge', async () => {
    const status = await fetchComponentDocStatus('Button');
    assert.equal(status, 'stable');
  });

  it('returns null when there is no doc page', async () => {
    const status = await fetchComponentDocStatus('DefinitelyNotAComponent12345');
    assert.equal(status, null);
  });
});
