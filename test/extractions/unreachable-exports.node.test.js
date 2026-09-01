import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import { describe, it } from 'node:test';

import { UNREACHABLE_RSP_EXPORTS } from '../../deps/rsp/playground/unreachable-exports.js';

// Keyed by the authored slug, like every other playground lookup. A slug that names no
// snippet is a typo or a stale entry left behind by a rename — either way the block
// would suppress a preview for a route that doesn't exist, or fail to suppress one that
// does, and neither shows up until someone loads the page.
describe('UNREACHABLE_RSP_EXPORTS', () => {
  it('names a real snippet for every entry', () => {
    assert.ok(UNREACHABLE_RSP_EXPORTS.size > 0);
    [...UNREACHABLE_RSP_EXPORTS].forEach((slug) => {
      const path = new URL(`../../deps/rsp/playground/snippets/${slug}.jsx`, import.meta.url);
      assert.ok(existsSync(path), `no snippet for unreachable slug "${slug}"`);
    });
  });

  // CloseButton is exported; ClearButton is not. One letter apart, opposite outcomes.
  it('does not suppress a component whose export does exist', () => {
    ['close-button', 'button', 'popover', 'text-field'].forEach((slug) => {
      assert.equal(UNREACHABLE_RSP_EXPORTS.has(slug), false, slug);
    });
  });
});
