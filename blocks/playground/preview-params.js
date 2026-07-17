// Shared by every playground preview shell (RSP, SWC, and this block's
// generic ios/android shell).
export function showError(message) {
  document.body.textContent = message;
}

// `component` gates a relative fetch for markup fragments in the SWC/RSP
// shells, so it's restricted to a safe custom-element charset.
export function resolvePreviewParams() {
  const params = new URLSearchParams(window.location.search);
  const component = params.get('component')?.toLowerCase().trim();
  const implementation = params.get('implementation')?.toLowerCase().trim();

  if (!component || !implementation) {
    showError('Missing required query params: component, implementation');
    throw new Error('Missing required query params');
  }

  if (!/^[a-z0-9-]+$/.test(component)) {
    showError(`Invalid component name: ${component}`);
    throw new Error(`Invalid component name: ${component}`);
  }

  return { component, implementation };
}
