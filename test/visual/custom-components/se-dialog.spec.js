import { defineVisualFixture } from '../visual-test.js';

defineVisualFixture({
  name: 'se-dialog',
  path: '/test/a11y/fixtures/custom-components/se-dialog.html',
  readySelector: 'se-dialog dialog[open]',
  visualRoot: '.test-container',
  prepare: async (page) => {
    await page.waitForFunction(() => {
      const dialog = document.querySelector('se-dialog')?.shadowRoot?.querySelector('dialog');
      return dialog && getComputedStyle(dialog).opacity === '1';
    });
  },
});
