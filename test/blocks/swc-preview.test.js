import { expect } from '@esm-bundle/chai';
import sinon from 'sinon';
import { init } from '../../deps/swc/playground/swc-preview.js';

describe('SWC preview adapter', () => {
  it('mounts fragments, defines family tags, and applies updates', async () => {
    document.body.innerHTML = '<div id="mount"></div>';
    const define = sinon.stub().resolves();
    const adapter = await init({
      model: {
        component: 'tabs',
        snippetMarkup: '<swc-tabs><swc-tab>First</swc-tab></swc-tabs>',
      },
      mount: document.getElementById('mount'),
      reportError: sinon.spy(),
      define,
      ownerDocument: document,
    });

    expect(define.calledWith('tabs')).to.be.true;
    expect(define.calledWith('tab')).to.be.true;
    expect(document.body.classList.contains('swc-theme')).to.be.true;
    expect(document.body.classList.contains('swc-theme--sizeM')).to.be.true;
    adapter.update({ property: 'label', attribute: null, value: 'Updated' });
    expect(document.querySelector('swc-tabs').textContent).to.equal('Updated');
    adapter.updateTheme('dark');
    expect(document.body.classList.contains('swc-theme--dark')).to.be.true;
    adapter.destroy();
    expect(document.getElementById('mount').children).to.have.length(0);
  });

  it('keeps secondary family-definition failures nonfatal', async () => {
    document.body.innerHTML = '<div id="mount"></div>';
    const define = sinon.stub();
    define.withArgs('tabs').resolves();
    define.withArgs('tab').rejects(new Error('secondary failed'));

    const adapter = await init({
      model: {
        component: 'tabs',
        snippetMarkup: '<swc-tabs><swc-tab>First</swc-tab></swc-tabs>',
      },
      mount: document.getElementById('mount'),
      reportError: sinon.spy(),
      define,
      ownerDocument: document,
    });
    expect(adapter.update).to.be.a('function');
  });
});
