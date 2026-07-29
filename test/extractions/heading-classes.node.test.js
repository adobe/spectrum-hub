import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { extractHeadingClasses } from '../../scripts/utils/heading-classes.js';

describe('extractHeadingClasses', () => {
  it('returns null when there is no attribute list', () => {
    assert.equal(extractHeadingClasses('Just a heading'), null);
  });

  it('extracts a single class and strips the marker', () => {
    assert.deepEqual(extractHeadingClasses('My heading {.heading-size-l}'), {
      classes: ['heading-size-l'],
      text: 'My heading',
    });
  });

  it('extracts multiple dot-separated classes', () => {
    assert.deepEqual(extractHeadingClasses('My heading {.heading-size-l.text-center}'), {
      classes: ['heading-size-l', 'text-center'],
      text: 'My heading',
    });
  });

  it('extracts multiple space-separated classes', () => {
    assert.deepEqual(extractHeadingClasses('My heading {.heading-size-l .text-center}'), {
      classes: ['heading-size-l', 'text-center'],
      text: 'My heading',
    });
  });

  it('returns null for an empty attribute list', () => {
    assert.equal(extractHeadingClasses('My heading {.}'), null);
  });

  it('ignores braces that are not at the end of the text', () => {
    assert.equal(extractHeadingClasses('{.heading-size-l} is not a heading class'), null);
  });
});
