import { expect } from '@esm-bundle/chai';
import { init } from '../../blocks/playground/preview/image-preview.js';
import { NONE_OPTION } from '../../deps/shared/playground/unset-control-options.js';

describe('image preview adapter', () => {
  it('sorts variants, omits unset values, and falls back to the default image', async () => {
    document.body.innerHTML = `
      <div id="image-viewer"><img id="preview-image" alt=""></div>
    `;
    const viewer = document.getElementById('image-viewer');
    const image = viewer.querySelector('img');
    const adapter = await init({
      model: {
        component: 'button',
        implementation: 'ios',
        values: { size: 'large', treatment: 'fill' },
      },
      imageViewer: viewer,
      ownerDocument: document,
    });

    expect(image.src).to.include('/playground/button/images/ios/size-large--treatment-fill.png');
    adapter.update({ property: 'size', value: NONE_OPTION });
    expect(image.src).to.include('/playground/button/images/ios/treatment-fill.png');
    expect(image.alt).to.equal('button — treatment: fill');

    image.onerror();
    expect(image.src).to.include('/playground/button/images/ios/default.png');
    adapter.destroy();
    expect(image.onerror).to.equal(null);
  });
});
