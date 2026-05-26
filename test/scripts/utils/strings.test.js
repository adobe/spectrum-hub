import { expect } from '@esm-bundle/chai';
import { formatLabel, slugify } from '../../../scripts/utils/strings.js';

describe('strings', () => {
  describe('formatLabel', () => {
    it('converts a hyphenated slug to title case', () => {
      expect(formatLabel('react-spectrum')).to.equal('React Spectrum');
    });

    it('handles a single word slug', () => {
      expect(formatLabel('button')).to.equal('Button');
    });

    it('handles multiple hyphens', () => {
      expect(formatLabel('spectrum-web-components')).to.equal('Spectrum Web Components');
    });

    it('returns an empty string for an empty input', () => {
      expect(formatLabel('')).to.equal('');
    });
  });

  describe('slugify', () => {
    it('lowercases and replaces spaces with hyphens', () => {
      expect(slugify('React Spectrum')).to.equal('react-spectrum');
    });

    it('handles multiple spaces', () => {
      expect(slugify('Spectrum Web Components')).to.equal('spectrum-web-components');
    });

    it('returns a single word lowercased', () => {
      expect(slugify('Button')).to.equal('button');
    });

    it('returns an empty string for an empty input', () => {
      expect(slugify('')).to.equal('');
    });
  });
});
