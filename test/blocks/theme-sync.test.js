import { expect } from '@esm-bundle/chai';
// Importing the module registers its window 'message' listener (side effect).
import '../../deps/swc/playground/theme-sync.js';

function sendTheme(scheme) {
  window.dispatchEvent(new MessageEvent('message', { data: { type: 'theme-update', scheme } }));
}

describe('theme-sync', () => {
  afterEach(() => {
    document.body.className = '';
    document.body.style.colorScheme = '';
  });

  it('applies a dark scheme: colorScheme + swc-theme--dark', () => {
    sendTheme('dark');
    expect(document.body.style.colorScheme).to.equal('dark');
    expect(document.body.classList.contains('swc-theme--dark')).to.be.true;
    expect(document.body.classList.contains('swc-theme--light')).to.be.false;
  });

  it('applies a light scheme: colorScheme + swc-theme--light', () => {
    sendTheme('light');
    expect(document.body.style.colorScheme).to.equal('light');
    expect(document.body.classList.contains('swc-theme--light')).to.be.true;
    expect(document.body.classList.contains('swc-theme--dark')).to.be.false;
  });

  it('treats a null scheme (no override) as light with cleared colorScheme', () => {
    sendTheme('dark');
    sendTheme(null);
    expect(document.body.style.colorScheme).to.equal(''); // falls back to OS
    expect(document.body.classList.contains('swc-theme--light')).to.be.true;
    expect(document.body.classList.contains('swc-theme--dark')).to.be.false;
  });

  it('flips dark -> light on a follow-up message', () => {
    sendTheme('dark');
    sendTheme('light');
    expect(document.body.classList.contains('swc-theme--dark')).to.be.false;
    expect(document.body.classList.contains('swc-theme--light')).to.be.true;
  });

  it('ignores non-theme-update messages', () => {
    document.body.classList.add('swc-theme--light');
    document.body.style.colorScheme = 'light';
    window.dispatchEvent(new MessageEvent('message', { data: { type: 'prop-update', value: 'x' } }));
    expect(document.body.classList.contains('swc-theme--light')).to.be.true;
    expect(document.body.style.colorScheme).to.equal('light');
  });
});
