import { expect } from '@esm-bundle/chai';
import { formatLabel, slugify } from '../../../scripts/utils/strings.js';

describe('strings', () => {
  describe('formatLabel', () => {
    it('capitalizes the first letter and replaces hyphens with spaces', () => {
      expect(formatLabel('react-spectrum')).to.equal('React spectrum');
    });

    it('handles a single word slug', () => {
      expect(formatLabel('button')).to.equal('Button');
    });

    it('handles multiple hyphens', () => {
      expect(formatLabel('spectrum-web-components')).to.equal('Spectrum web components');
    });

    it('returns an empty string for an empty input', () => {
      expect(formatLabel('')).to.equal('');
    });
  });

  describe('slugify', () => {
    it('lowercases and replaces spaces with hyphens', () => {
      expect(slugify('React Spectrum')).to.equal('react-spectrum');
    });

    it('strips non-alphanumeric characters', () => {
      expect(slugify('Action Button!')).to.equal('action-button');
    });

    it('trims leading and trailing whitespace', () => {
      expect(slugify('  hello  ')).to.equal('hello');
    });

    it('collapses multiple separators into one hyphen', () => {
      expect(slugify('foo  bar')).to.equal('foo-bar');
    });

    it('returns an empty string for an empty input', () => {
      expect(slugify('')).to.equal('');
    });
  });
});
