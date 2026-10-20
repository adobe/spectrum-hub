import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { normalizeVisualCase } from './visual-test.js';

describe('normalizeVisualCase', () => {
  it('requires a name', () => {
    assert.throws(
      () => normalizeVisualCase({
        path: '/test/a11y/fixtures/card.html',
        visualRoot: '.card',
      }),
      /Visual case requires name/,
    );
  });

  it('requires a fixture path and visual root', () => {
    assert.throws(
      () => normalizeVisualCase({ name: 'card' }),
      /card.*path.*visualRoot/i,
    );
  });

  it('preserves deterministic fixture metadata', () => {
    assert.deepEqual(
      normalizeVisualCase({
        name: 'card',
        path: '/test/a11y/fixtures/card.html',
        readySelector: '.card-content-container',
        visualRoot: '.card',
      }),
      {
        name: 'card',
        path: '/test/a11y/fixtures/card.html',
        readySelector: '.card-content-container',
        routes: [],
        visualRoot: '.card',
        prepare: undefined,
        screenshotOptions: {},
      },
    );
  });
});
