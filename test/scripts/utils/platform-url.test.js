import { expect } from '@esm-bundle/chai';
import {
  getImplementationFromPath,
  getComponentFromPath,
  buildImplementationPath,
  isOnPlatformPage,
  isOnComponentsOverview,
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
});
