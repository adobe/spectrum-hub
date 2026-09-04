import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { classifyLink, normalizeUrl } from './crawl.js';

const ORIGIN = 'https://main--spectrum-hub--adobe.aem.live';
const PAGE = `${ORIGIN}/foundations/color`;

describe('classifyLink', () => {
  it('skips empty, bare-hash, and javascript: hrefs', () => {
    assert.deepEqual(classifyLink('', PAGE, ORIGIN), { kind: 'skip' });
    assert.deepEqual(classifyLink(null, PAGE, ORIGIN), { kind: 'skip' });
    assert.deepEqual(classifyLink('#', PAGE, ORIGIN), { kind: 'skip' });
    // eslint-disable-next-line no-script-url
    assert.deepEqual(classifyLink('javascript:void(0)', PAGE, ORIGIN), { kind: 'skip' });
  });

  it('skips mailto and tel links, which HTTP checks cannot validate', () => {
    assert.deepEqual(classifyLink('mailto:hello@adobe.com', PAGE, ORIGIN), { kind: 'skip' });
    assert.deepEqual(classifyLink('tel:+15555550100', PAGE, ORIGIN), { kind: 'skip' });
  });

  it('treats a same-page hash link as a fragment to validate on the current DOM', () => {
    assert.deepEqual(classifyLink('#usage', PAGE, ORIGIN), { kind: 'hash', id: 'usage' });
  });

  it('resolves a relative internal link against its source page', () => {
    assert.deepEqual(
      classifyLink('typography', PAGE, ORIGIN),
      { kind: 'internal', url: `${ORIGIN}/foundations/typography` },
    );
  });

  it('resolves a root-relative internal link', () => {
    assert.deepEqual(
      classifyLink('/getting-started', PAGE, ORIGIN),
      { kind: 'internal', url: `${ORIGIN}/getting-started` },
    );
  });

  it('strips the hash off an internal link before dedup', () => {
    assert.deepEqual(
      classifyLink('/foundations/color#usage', PAGE, ORIGIN),
      { kind: 'internal', url: `${ORIGIN}/foundations/color` },
    );
  });

  it('classifies a different-origin link as external', () => {
    assert.deepEqual(
      classifyLink('https://github.com/adobe/spectrum-hub', PAGE, ORIGIN),
      { kind: 'external', url: 'https://github.com/adobe/spectrum-hub' },
    );
  });

  it('flags an unparseable href as invalid rather than throwing', () => {
    assert.deepEqual(classifyLink('http://', PAGE, ORIGIN), { kind: 'invalid', href: 'http://' });
  });
});

describe('normalizeUrl', () => {
  it('resolves a path against the base URL', () => {
    assert.equal(normalizeUrl('/foo', ORIGIN), `${ORIGIN}/foo`);
  });

  it('strips a hash fragment', () => {
    assert.equal(normalizeUrl('/foo#bar', ORIGIN), `${ORIGIN}/foo`);
  });
});
