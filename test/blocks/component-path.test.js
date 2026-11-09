import { expect } from '@esm-bundle/chai';
import * as paths from '../../scripts/utils/component-path.js';

describe('platform-specific component routes', () => {
  for (const [pathname, expected] of [
    ['/web/rsp/components/button', { platform: 'web', impl: 'rsp', slug: 'button' }],
    ['/web/design-only/components/chat', { platform: 'web', impl: 'design-only', slug: 'chat' }],
    ['/mobile/ios/components/button', { platform: 'ios', impl: 'ios', slug: 'button' }],
    ['/mobile/android/components/button', { platform: 'android', impl: 'android', slug: 'button' }],
    ['/web/swc/patterns/conversational-ai/response-status', { platform: 'web', impl: 'swc', slug: 'response-status' }],
    ['/web/swc/patterns/ai-toolkit/response-status/response-status-step', { platform: 'web', impl: 'swc', slug: 'response-status-step' }],
    ['/web/rsp/patterns/ai-toolkit/prompt-field', { platform: 'web', impl: 'rsp', slug: 'prompt-field' }],
    ['/web/swc/patterns', null],
    ['/web/swc/patterns/ai-toolkit', null],
    ['/patterns/ai-toolkit/response-status', null],
    ['/mobile/ios/patterns/ai-toolkit/button', null],
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

describe('implementation route parsing', () => {
  it('keeps the existing component route result shape', () => {
    expect(paths.implAndSlugFromPath('/web/swc/components/button')).to.deep.equal({
      impl: 'swc', slug: 'button',
    });
  });

  it('uses the final slug of a nested pattern path without deriving documentation metadata', () => {
    expect(paths.implAndSlugFromPath('/web/swc/patterns/conversational-ai/response-status/response-status-step'))
      .to.deep.equal({ impl: 'swc', slug: 'response-status-step' });
  });

  it('does not interpret the pattern group itself as a component', () => {
    expect(paths.implAndSlugFromPath('/web/swc/patterns/ai-toolkit'))
      .to.deep.equal({ impl: null, slug: null });
  });
});
