import { expect } from '@esm-bundle/chai';
import {
  IMPLEMENTATIONS,
  ALL_OPTION,
  getImplementationById,
  getOtherImplementations,
} from '../../../scripts/utils/implementations.js';

describe('scripts/utils/implementations.js', () => {
  describe('IMPLEMENTATIONS', () => {
    it('exposes React Spectrum and Spectrum Web Components in that order', () => {
      expect(IMPLEMENTATIONS).to.have.lengthOf(2);
      expect(IMPLEMENTATIONS[0]).to.deep.equal({ id: 'rsp', label: 'React Spectrum' });
      expect(IMPLEMENTATIONS[1]).to.deep.equal({ id: 'swc', label: 'Spectrum Web Components' });
    });
  });

  describe('ALL_OPTION', () => {
    it('represents the cross-implementation overview', () => {
      expect(ALL_OPTION).to.deep.equal({ id: 'all', label: 'All' });
    });
  });

  describe('getImplementationById', () => {
    it('returns the matching implementation when the id is known', () => {
      expect(getImplementationById('rsp')).to.deep.equal({ id: 'rsp', label: 'React Spectrum' });
      expect(getImplementationById('swc')).to.deep.equal({ id: 'swc', label: 'Spectrum Web Components' });
    });

    it('returns null when the id is unknown', () => {
      expect(getImplementationById('does-not-exist')).to.be.null;
    });
  });

  describe('getOtherImplementations', () => {
    it('returns all implementations except the current one', () => {
      const result = getOtherImplementations('rsp');
      expect(result).to.have.lengthOf(1);
      expect(result[0].id).to.equal('swc');
    });

    it('returns the full list when the current id matches no implementation', () => {
      const result = getOtherImplementations('unknown');
      expect(result).to.have.lengthOf(2);
    });
  });
});
