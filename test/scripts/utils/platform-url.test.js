import { expect } from '@esm-bundle/chai';
import {
  getImplementationFromPath,
  getComponentFromPath,
  buildImplementationPath,
  isOnPlatformComponentPage,
  resolveTargetUrl,
  getSectionPrefix,
  getPlatformSectionSuffix,
} from '../../../scripts/utils/platform-url.js';

describe('platform-url', () => {
  describe('getImplementationFromPath', () => {
    it('returns the impl segment from a /platforms/[impl]/... path', () => {
      expect(getImplementationFromPath('/platforms/rsp/components/button')).to.equal('rsp');
    });

    it('returns the impl segment from an impl landing page path', () => {
      expect(getImplementationFromPath('/platforms/swc')).to.equal('swc');
    });

    it('returns null for a non-platform path', () => {
      expect(getImplementationFromPath('/components')).to.be.null;
    });

    it('returns null for the root path', () => {
      expect(getImplementationFromPath('/')).to.be.null;
    });

    it('returns null for a foundations path', () => {
      expect(getImplementationFromPath('/foundations/color')).to.be.null;
    });
  });

  describe('getComponentFromPath', () => {
    it('returns the component slug from a component detail path', () => {
      expect(getComponentFromPath('/platforms/rsp/components/button')).to.equal('button');
    });

    it('returns null for an impl landing page', () => {
      expect(getComponentFromPath('/platforms/rsp')).to.be.null;
    });

    it('returns null for a non-platform path', () => {
      expect(getComponentFromPath('/components')).to.be.null;
    });

    it('returns null for a section path without a component', () => {
      expect(getComponentFromPath('/platforms/rsp/components')).to.be.null;
    });

    it('returns null for a non-components section', () => {
      expect(getComponentFromPath('/platforms/rsp/foundations/accessibility')).to.be.null;
    });
  });

  describe('buildImplementationPath', () => {
    it('builds a path for a given impl id and suffix', () => {
      expect(buildImplementationPath('swc', '/components/button')).to.equal('/platforms/swc/components/button');
    });

    it('builds a bare impl landing path when suffix is empty', () => {
      expect(buildImplementationPath('rsp', '')).to.equal('/platforms/rsp');
    });

    it('does not double the leading slash on the suffix', () => {
      expect(buildImplementationPath('swc', '/components/button')).to.equal('/platforms/swc/components/button');
    });
  });

  describe('isOnPlatformComponentPage', () => {
    it('returns true for a component detail page', () => {
      expect(isOnPlatformComponentPage('/platforms/rsp/components/button')).to.be.true;
    });

    it('returns false for an impl landing page', () => {
      expect(isOnPlatformComponentPage('/platforms/rsp')).to.be.false;
    });

    it('returns false for /components', () => {
      expect(isOnPlatformComponentPage('/components')).to.be.false;
    });

    it('returns false for a section page without a component', () => {
      expect(isOnPlatformComponentPage('/platforms/rsp/components')).to.be.false;
    });

    it('returns false for a non-components section', () => {
      expect(isOnPlatformComponentPage('/platforms/rsp/foundations/accessibility')).to.be.false;
    });
  });

  describe('resolveTargetUrl', () => {
    it('navigates to the sibling impl preserving the path-after-impl', () => {
      expect(resolveTargetUrl('/platforms/rsp/components/button', 'swc')).to.equal('/platforms/swc/components/button');
    });

    it('navigates to the sibling impl landing when on an impl landing', () => {
      expect(resolveTargetUrl('/platforms/rsp', 'swc')).to.equal('/platforms/swc');
    });

    it('returns /components when the target is "all"', () => {
      expect(resolveTargetUrl('/platforms/rsp/components/button', 'all')).to.equal('/components');
    });

    it('returns /components when "all" is selected from any path', () => {
      expect(resolveTargetUrl('/platforms/rsp', 'all')).to.equal('/components');
    });
  });

  describe('getSectionPrefix', () => {
    it('returns the /platforms/[impl] prefix for a platform path', () => {
      expect(getSectionPrefix('/platforms/rsp/components/button')).to.equal('/platforms/rsp');
    });

    it('returns the /platforms/[impl] prefix for a landing path', () => {
      expect(getSectionPrefix('/platforms/swc')).to.equal('/platforms/swc');
    });

    it('returns null for a non-platform path', () => {
      expect(getSectionPrefix('/foundations/color')).to.be.null;
    });
  });

  describe('getPlatformSectionSuffix', () => {
    it('returns the path after the impl segment', () => {
      expect(getPlatformSectionSuffix('/platforms/rsp/components/button')).to.equal('/components/button');
    });

    it('returns an empty string for an impl landing page', () => {
      expect(getPlatformSectionSuffix('/platforms/rsp')).to.equal('');
    });

    it('returns null for a non-platform path', () => {
      expect(getPlatformSectionSuffix('/components')).to.be.null;
    });
  });
});
