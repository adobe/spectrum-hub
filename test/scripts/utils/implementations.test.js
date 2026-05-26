import { expect } from '@esm-bundle/chai';
import {
  IMPLEMENTATIONS,
  ALL_OPTION,
  getImplementationById,
  getOtherImplementations,
} from '../../../scripts/utils/implementations.js';

describe('implementations', () => {
  describe('IMPLEMENTATIONS', () => {
    it('is an array with rsp and swc entries', () => {
      expect(IMPLEMENTATIONS).to.be.an('array');
      expect(IMPLEMENTATIONS.map((i) => i.id)).to.include.members(['rsp', 'swc']);
    });

    it('each entry has id and label properties', () => {
      IMPLEMENTATIONS.forEach((impl) => {
        expect(impl).to.have.property('id').that.is.a('string');
        expect(impl).to.have.property('label').that.is.a('string');
      });
    });

    it('does not include an "all" entry', () => {
      expect(IMPLEMENTATIONS.map((i) => i.id)).to.not.include('all');
    });
  });

  describe('ALL_OPTION', () => {
    it('has id "all"', () => {
      expect(ALL_OPTION).to.have.property('id', 'all');
    });

    it('has a label property', () => {
      expect(ALL_OPTION).to.have.property('label').that.is.a('string');
    });
  });

  describe('getImplementationById', () => {
    it('returns the matching implementation for a known id', () => {
      const result = getImplementationById('rsp');
      expect(result).to.not.be.undefined;
      expect(result.id).to.equal('rsp');
    });

    it('returns undefined for an unknown id', () => {
      expect(getImplementationById('unknown')).to.be.undefined;
    });

    it('returns undefined for "all"', () => {
      expect(getImplementationById('all')).to.be.undefined;
    });
  });

  describe('getOtherImplementations', () => {
    it('returns all implementations except the given id', () => {
      const others = getOtherImplementations('rsp');
      expect(others.map((i) => i.id)).to.not.include('rsp');
      expect(others.map((i) => i.id)).to.include('swc');
    });

    it('returns all implementations when given "all"', () => {
      const others = getOtherImplementations('all');
      expect(others).to.deep.equal(IMPLEMENTATIONS);
    });

    it('returns an empty array when there is only one implementation and it is excluded', () => {
      const others = getOtherImplementations('rsp');
      expect(others).to.be.an('array');
    });
  });
});
