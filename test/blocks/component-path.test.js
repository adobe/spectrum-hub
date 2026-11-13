import { expect } from '@esm-bundle/chai';
import * as paths from '../../scripts/utils/component-path.js';

describe('platform-specific component routes', () => {
  for (const [pathname, expected] of [
    ['/web/rsp/components/button', { platform: 'web', impl: 'rsp', slug: 'button' }],
    ['/web/design-only/components/chat', { platform: 'web', impl: 'design-only', slug: 'chat' }],
    ['/mobile/ios/components/button', { platform: 'ios', impl: 'ios', slug: 'button' }],
    ['/mobile/android/components/button', { platform: 'android', impl: 'android', slug: 'button' }],
    ['/mobile/unknown/components/button', null],
    ['/unknown/rsp/components/button', null],
    ['/web/rsp/get-started', null],
  ]) {
    it(`resolves ${pathname} without guessing a platform`, () => {
      expect(paths.componentContextFromPath).to.be.a('function');
      expect(paths.componentContextFromPath(pathname)).to.deep.equal(expected);
    });
  }
});
