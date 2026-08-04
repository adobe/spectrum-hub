// Shared postMessage contract between the playground block and every preview shell.
export function listenForPropUpdates(handler) {
  window.addEventListener('message', (event) => {
    if (event.data?.type !== 'prop-update') { return; }
    const { property, attribute, value } = event.data;
    handler({ property, attribute, value });
  });
}

// Call only once listenForPropUpdates is registered — the iframe's `load`
// event fires before that, so the parent can't push on `load` alone.
export function notifyPreviewReady() {
  window.parent.postMessage({ type: 'preview-ready' }, '*');
}

// Asks the parent (blocks/playground/playground.js) for the snippet markup it
// already fetched, instead of the shell fetching the same file a second time.
// Resolves with '' when the parent has none (a 404/failed fetch on its side) —
// callers treat that the same way they'd treat their own failed fetch.
export function requestMarkup() {
  return new Promise((resolve) => {
    function onMessage(event) {
      if (event.source !== window.parent) { return; }
      if (event.data?.type !== 'markup-response') { return; }
      window.removeEventListener('message', onMessage);
      resolve(event.data.markup ?? '');
    }
    window.addEventListener('message', onMessage);
    window.parent.postMessage({ type: 'markup-request' }, '*');
  });
}
