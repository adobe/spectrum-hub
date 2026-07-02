/**
 * Shared postMessage contract for dev-owned static component pages.
 * The playground block sends `{ type: 'prop-update', property, attribute, value }`
 * whenever an authored control changes; this just filters/unwraps that message
 * so each static page only has to handle the (property, attribute, value) it cares about.
 */
export function listenForPropUpdates(handler) {
  window.addEventListener('message', (event) => {
    if (event.data?.type !== 'prop-update') { return; }
    const { property, attribute, value } = event.data;
    handler({ property, attribute, value });
  });
}
