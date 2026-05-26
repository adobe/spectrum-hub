import { expect } from '@esm-bundle/chai';
import { IMPLEMENTATIONS, ALL_OPTION } from '../../../scripts/utils/implementations.js';
import init from '../../../blocks/picker/picker.js';

describe('picker block', () => {
  let el;

  beforeEach(() => {
    el = document.createElement('div');
    el.classList.add('picker');
    document.body.append(el);
  });

  afterEach(() => {
    el.remove();
    // restore default path
    history.pushState({}, '', '/');
  });

  // Navigation URL computation is covered by resolveTargetUrl tests in
  // test/scripts/utils/platform-url.test.js.
  // window.location.assign is non-configurable in Chrome and cannot be stubbed here.

  it('does nothing on a non-platform path (/components)', async () => {
    history.pushState({}, '', '/components');
    await init(el);
    expect(el.querySelector('hub-picker')).to.be.null;
  });

  it('does nothing on a non-platform path (/foundations/color)', async () => {
    history.pushState({}, '', '/foundations/color');
    await init(el);
    expect(el.querySelector('hub-picker')).to.be.null;
  });

  it('does nothing on the root path (/)', async () => {
    history.pushState({}, '', '/');
    await init(el);
    expect(el.querySelector('hub-picker')).to.be.null;
  });

  it('appends a hub-picker on a platform component path', async () => {
    history.pushState({}, '', '/platforms/rsp/components/button');
    await init(el);
    expect(el.querySelector('hub-picker')).to.not.be.null;
  });

  it('sets options to [ALL_OPTION, ...IMPLEMENTATIONS]', async () => {
    history.pushState({}, '', '/platforms/rsp/components/button');
    await init(el);
    const picker = el.querySelector('hub-picker');
    expect(picker.options).to.deep.equal([ALL_OPTION, ...IMPLEMENTATIONS]);
  });

  it('sets value to the current implementation id', async () => {
    history.pushState({}, '', '/platforms/swc/components/button');
    await init(el);
    const picker = el.querySelector('hub-picker');
    expect(picker.value).to.equal('swc');
  });

  it('sets a non-empty label on the picker', async () => {
    history.pushState({}, '', '/platforms/rsp/components/button');
    await init(el);
    const picker = el.querySelector('hub-picker');
    expect(picker.label).to.be.a('string').with.length.greaterThan(0);
  });

  it('sets value to the impl id on an implementation landing page', async () => {
    history.pushState({}, '', '/platforms/rsp');
    await init(el);
    const picker = el.querySelector('hub-picker');
    expect(picker.value).to.equal('rsp');
  });
});
