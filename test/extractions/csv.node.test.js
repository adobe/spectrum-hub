import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { toCsv } from '../../scripts/utils/csv.js';

describe('toCsv', () => {
  it('joins fields with commas and rows with CRLF', () => {
    assert.equal(
      toCsv([['Component', 'Figma'], ['Button', 'Available']]),
      'Component,Figma\r\nButton,Available',
    );
  });

  it('quotes a field that contains a comma', () => {
    assert.equal(toCsv([['a,b', 'c']]), '"a,b",c');
  });

  it('quotes and doubles embedded double-quotes', () => {
    assert.equal(toCsv([['say "hi"']]), '"say ""hi"""');
  });

  it('quotes a field that contains a newline', () => {
    assert.equal(toCsv([['line1\nline2']]), '"line1\nline2"');
  });

  it('renders null and undefined fields as empty', () => {
    assert.equal(toCsv([[null, undefined, 'x']]), ',,x');
  });

  it('returns an empty string for no rows', () => {
    assert.equal(toCsv([]), '');
  });
});
