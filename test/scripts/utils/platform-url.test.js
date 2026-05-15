import { expect } from '@esm-bundle/chai';
import {
  getImplementationFromPath,
  getComponentFromPath,
  buildImplementationPath,
  isOnPlatformPage,
  isOnComponentsOverview,
  isOnPlatformComponentPage,
  resolveTargetUrl,
  getSectionPrefix,
  getPlatformSectionSuffix,
} from '../../../scripts/utils/platform-url.js';

describe('scripts/utils/platform-url.js', () => {
  describe('getImplementationFromPath', () => {
    it('returns the implementation slug from a platform path', () => {
      expect(getImplementationFromPath('/platforms/rsp/components/button')).to.equal('rsp');
    });

    it('returns null for paths outside /platforms/', () => {
      expect(getImplementationFromPath('/components/button')).to.be.null;
    });
  });

  describe('getComponentFromPath', () => {
    it('returns the component slug from a platform path', () => {
      expect(getComponentFromPath('/platforms/rsp/components/button')).to.equal('button');
    });

    it('returns null when the path has no component segment', () => {
      expect(getComponentFromPath('/platforms/rsp/components')).to.be.null;
      expect(getComponentFromPath('/foundations/principles')).to.be.null;
    });
  });

  describe('buildImplementationPath', () => {
    it('builds a /platforms/[impl]/components/[component] URL', () => {
      expect(buildImplementationPath('rsp', 'button')).to.equal('/platforms/rsp/components/button');
      expect(buildImplementationPath('swc', 'tabs')).to.equal('/platforms/swc/components/tabs');
    });
  });

  describe('isOnPlatformPage', () => {
    it('returns true for paths under /platforms/', () => {
      expect(isOnPlatformPage('/platforms/rsp/components/button')).to.be.true;
      expect(isOnPlatformPage('/platforms/swc')).to.be.true;
    });

    it('returns false for paths outside /platforms/', () => {
      expect(isOnPlatformPage('/components/button')).to.be.false;
      expect(isOnPlatformPage('/foundations/getting-started/principles')).to.be.false;
      expect(isOnPlatformPage('/')).to.be.false;
    });
  });

  describe('isOnComponentsOverview', () => {
    it('returns true for the agnostic /components overview', () => {
      expect(isOnComponentsOverview('/components')).to.be.true;
      expect(isOnComponentsOverview('/components/')).to.be.true;
    });

    it('returns true for an agnostic component detail page', () => {
      expect(isOnComponentsOverview('/components/button')).to.be.true;
    });

    it('returns false for platform-scoped paths', () => {
      expect(isOnComponentsOverview('/platforms/rsp/components/button')).to.be.false;
    });

    it('returns false for unrelated paths', () => {
      expect(isOnComponentsOverview('/foundations/principles')).to.be.false;
      expect(isOnComponentsOverview('/')).to.be.false;
    });
  });

  describe('isOnPlatformComponentPage', () => {
    it('returns true for /platforms/[impl]/components/[component] paths', () => {
      expect(isOnPlatformComponentPage('/platforms/rsp/components/button')).to.be.true;
      expect(isOnPlatformComponentPage('/platforms/swc/components/tabs')).to.be.true;
    });

    it('returns false when the component segment is missing', () => {
      expect(isOnPlatformComponentPage('/platforms/rsp/components')).to.be.false;
      expect(isOnPlatformComponentPage('/platforms/rsp/components/')).to.be.false;
    });

    it('returns false when the section is not "components"', () => {
      expect(isOnPlatformComponentPage('/platforms/rsp/foundations/icons')).to.be.false;
    });

    it('returns false for paths outside /platforms/', () => {
      expect(isOnPlatformComponentPage('/components/button')).to.be.false;
      expect(isOnPlatformComponentPage('/')).to.be.false;
    });
  });

  describe('resolveTargetUrl', () => {
    it('routes the "all" option to the cross-implementation overview', () => {
      expect(resolveTargetUrl('all', 'anything')).to.equal('/components');
    });

    it('preserves the section suffix when switching implementations', () => {
      expect(resolveTargetUrl('rsp', 'overview')).to.equal('/platforms/rsp/overview');
      expect(resolveTargetUrl('swc', 'components/button')).to.equal('/platforms/swc/components/button');
      expect(resolveTargetUrl('rsp', 'components/tabs')).to.equal('/platforms/rsp/components/tabs');
    });
  });

  describe('getPlatformSectionSuffix', () => {
    it('returns the path after /platforms/[impl]/ for platform paths', () => {
      expect(getPlatformSectionSuffix('/platforms/rsp/overview')).to.equal('overview');
      expect(getPlatformSectionSuffix('/platforms/swc/components/button')).to.equal('components/button');
    });

    it('returns an empty string for an impl root with no further path', () => {
      expect(getPlatformSectionSuffix('/platforms/rsp')).to.equal('');
      expect(getPlatformSectionSuffix('/platforms/rsp/')).to.equal('');
    });

    it('returns null for non-platform paths', () => {
      expect(getPlatformSectionSuffix('/components/button')).to.be.null;
      expect(getPlatformSectionSuffix('/foundations/principles')).to.be.null;
      expect(getPlatformSectionSuffix('/')).to.be.null;
    });
  });

  describe('getSectionPrefix', () => {
    it('returns the implementation-scoped prefix for /platforms/[impl]/* paths', () => {
      expect(getSectionPrefix('/platforms/rsp/components/button')).to.equal('/platforms/rsp/');
      expect(getSectionPrefix('/platforms/swc/components/tabs')).to.equal('/platforms/swc/');
    });

    it('returns the top-section prefix for non-platform paths', () => {
      expect(getSectionPrefix('/foundations/principles')).to.equal('/foundations/');
      expect(getSectionPrefix('/components/button')).to.equal('/components/');
    });

    it('returns null for the root path', () => {
      expect(getSectionPrefix('/')).to.be.null;
      expect(getSectionPrefix('')).to.be.null;
    });
  });
});
