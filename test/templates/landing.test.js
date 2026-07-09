import { expect } from '@esm-bundle/chai';
import init from '../../templates/landing/landing.js';

// The landing template is currently a no-op placeholder: decoratePage (scripts.js)
// builds the shared page scaffold, and landing adds nothing of its own yet.
describe('landing template', () => {
  afterEach(() => {
    document.body.innerHTML = '';
  });

  it('runs without throwing and leaves main in place', async () => {
    document.body.innerHTML = '<main><div><p>Page content</p></div></main>';
    await init();
    expect(document.querySelector('main p')).to.not.be.null;
  });

  it('does not create a template-wrapper — that is decoratePage\'s responsibility', async () => {
    document.body.innerHTML = '<main><p>x</p></main>';
    await init();
    expect(document.querySelector('.template-wrapper')).to.be.null;
  });
});
