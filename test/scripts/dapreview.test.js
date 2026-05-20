import { expect } from '@esm-bundle/chai';

// Set query param before importing scripts module so the dapreview IIFE fires
const originalUrl = window.location.href;
window.history.pushState({}, '', '?dapreview=true');

// Now import - module will see the dapreview param and trigger the da.js dynamic import
await import('../../scripts/scripts.js');

describe('dapreview', () => {
  after(() => {
    window.history.pushState({}, '', originalUrl);
  });

  it('should detect dapreview query parameter', () => {
    const url = new URL(window.location.href);
    const dapreview = url.searchParams.get('dapreview');
    expect(dapreview).to.equal('true');
  });

  it('loads da.js when dapreview param is present', async () => {
    // scripts.js fires import('../tools/da/da.js') without awaiting it, so we observe
    // the PerformanceObserver resource timeline instead of polling. buffered:true catches
    // entries that landed before the observer was attached.
    await new Promise((resolve, reject) => {
      const timeout = setTimeout(() => reject(new Error('da.js not loaded within 3 s')), 3000);
      const observer = new PerformanceObserver((list) => {
        if (list.getEntries().some((e) => e.name.includes('tools/da/da.js'))) {
          clearTimeout(timeout);
          observer.disconnect();
          resolve();
        }
      });
      observer.observe({ type: 'resource', buffered: true });
    });
  });
});
