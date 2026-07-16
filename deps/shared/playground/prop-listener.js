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
