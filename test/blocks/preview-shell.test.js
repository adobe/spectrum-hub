import { expect } from '@esm-bundle/chai';
import sinon from 'sinon';

async function shellSource(importHook, frameId) {
  const source = await fetch('/blocks/playground/preview/index.html').then((response) => response.text());
  return source.replace(
    '<script>',
    `<script>window.__playgroundImport = ${importHook};</script><script>`,
  ).replace(
    "const frameId = new URLSearchParams(location.search).get('frame');",
    `const frameId = '${frameId}';`,
  );
}

function waitForMessage(type, frameId) {
  return new Promise((resolve) => {
    function listener(event) {
      if (event.data?.type !== type || event.data?.frameId !== frameId) { return; }
      window.removeEventListener('message', listener);
      resolve(event.data);
    }
    window.addEventListener('message', listener);
  });
}

describe('shared preview shell', () => {
  afterEach(() => {
    delete window.__adapterInit;
    document.querySelectorAll('iframe[data-preview-shell-test]').forEach((iframe) => iframe.remove());
  });

  it('queues targeted updates and imports exactly one adapter', async () => {
    const update = sinon.spy();
    const updateTheme = sinon.spy();
    const destroy = sinon.spy();
    window.__adapterInit = sinon.stub().resolves({ update, updateTheme, destroy });
    const iframe = document.createElement('iframe');
    iframe.dataset.previewShellTest = '';
    iframe.srcdoc = await shellSource(
      'async (url) => { parent.__importedAdapterUrl = url; return { init: parent.__adapterInit }; }',
      'frame-a',
    );
    const ready = waitForMessage('shell-ready', 'frame-a');
    document.body.append(iframe);
    await ready;

    iframe.contentWindow.postMessage({
      type: 'prop-update', frameId: 'other-frame', property: 'ignored', value: true,
    }, '*');
    iframe.contentWindow.postMessage({
      type: 'prop-update', frameId: 'frame-a', property: 'first', value: 1,
    }, '*');
    iframe.contentWindow.postMessage({
      type: 'prop-update', frameId: 'frame-a', property: 'second', value: 2,
    }, '*');
    iframe.contentWindow.postMessage({
      type: 'theme-update', frameId: 'frame-a', scheme: 'dark',
    }, '*');
    const mounted = waitForMessage('preview-mounted', 'frame-a');
    iframe.contentWindow.postMessage({
      type: 'preview-init',
      frameId: 'frame-a',
      adapterUrl: '/adapter.js',
      model: {},
    }, '*');
    await mounted;

    expect(window.__adapterInit.calledOnce).to.be.true;
    expect(window.__importedAdapterUrl).to.equal('/adapter.js');
    expect(update.args.map(([message]) => message.property)).to.deep.equal(['first', 'second']);
    expect(updateTheme.calledOnceWith('dark')).to.be.true;

    iframe.contentWindow.postMessage({
      type: 'preview-init', frameId: 'frame-a', adapterUrl: '/second.js',
    }, '*');
    await Promise.resolve();
    expect(window.__adapterInit.calledOnce).to.be.true;
  });

  it('reports adapter loading failures with a stable phase', async () => {
    const iframe = document.createElement('iframe');
    iframe.dataset.previewShellTest = '';
    iframe.srcdoc = await shellSource(
      'async () => { throw new Error("adapter unavailable"); }',
      'frame-b',
    );
    const ready = waitForMessage('shell-ready', 'frame-b');
    document.body.append(iframe);
    await ready;
    const failed = waitForMessage('preview-error', 'frame-b');
    iframe.contentWindow.postMessage({
      type: 'preview-init', frameId: 'frame-b', adapterUrl: '/missing.js',
    }, '*');

    expect((await failed).phase).to.equal('adapter-load');
  });
});
