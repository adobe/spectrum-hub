import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { resolveColorScheme } from '../../deps/rsp/playground/resolve-color-scheme.js';

describe('resolveColorScheme', () => {
  it('prefers an explicit forced scheme over the OS preference', () => {
    assert.equal(resolveColorScheme('dark', false), 'dark');
    assert.equal(resolveColorScheme('light', true), 'light');
  });

  it('falls back to "dark" when there is no forced scheme and the OS prefers dark', () => {
    assert.equal(resolveColorScheme(null, true), 'dark');
  });

  it('falls back to "light" when there is no forced scheme and the OS does not prefer dark', () => {
    assert.equal(resolveColorScheme(null, false), 'light');
  });
});
