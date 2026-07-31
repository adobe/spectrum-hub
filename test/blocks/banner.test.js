import { expect } from '@esm-bundle/chai';
import init from '../../blocks/banner/banner.js';

function makeEl(html) {
  const el = document.createElement('div');
  el.innerHTML = html;
  return el;
}

const WITH_BUTTON = `
  <div>
    <p>New release available.</p>
    <p><a href="/whats-new" class="btn primary">Learn more</a></p>
  </div>
`;

const TEXT_ONLY = `
  <div>
    <p>Just an announcement, no link.</p>
  </div>
`;

describe('banner block', () => {
  afterEach(() => {
    document.body.innerHTML = '';
    document.head.querySelectorAll('link[href$="/deps/se/buttons.css"]').forEach((link) => link.remove());
  });

  it('does nothing when there is no button link', async () => {
    const el = makeEl(TEXT_ONLY);
    await init(el);
    expect(el.querySelector('.se-button')).to.be.null;
    expect(document.head.querySelector('link[href$="/deps/se/buttons.css"]')).to.be.null;
  });

  it('adds se-button and size-m to the button link\'s wrapping div', async () => {
    const el = makeEl(WITH_BUTTON);
    await init(el);
    const wrapper = el.querySelector('a.btn').closest('div');
    expect(wrapper.classList.contains('se-button')).to.be.true;
    expect(wrapper.classList.contains('size-m')).to.be.true;
  });

  it('leaves the button link\'s own classes untouched', async () => {
    const el = makeEl(WITH_BUTTON);
    await init(el);
    const link = el.querySelector('a.btn');
    expect(link.classList.contains('primary')).to.be.true;
  });

  it('loads the shared button stylesheet when a button link is present', async () => {
    const el = makeEl(WITH_BUTTON);
    await init(el);
    expect(document.head.querySelector('link[href$="/deps/se/buttons.css"]')).to.not.be.null;
  });
});
