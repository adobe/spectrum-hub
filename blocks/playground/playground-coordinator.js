const FREEFORM_CONTROLS = new Set(['textfield', 'slider']);

function forcedScheme(themeRoot) {
  if (themeRoot.classList.contains('dark-scheme')) { return 'dark'; }
  if (themeRoot.classList.contains('light-scheme')) { return 'light'; }
  return null;
}

function normalizedValue(value, controlType) {
  if (FREEFORM_CONTROLS.has(controlType)) { return value; }
  if (value === 'yes') { return true; }
  if (value === 'no') { return false; }
  return value;
}

export function createPlaygroundCoordinator({
  hostWindow = window,
  themeRoot = document.body,
  fetchImpl = (...args) => fetch(...args),
  createObserver = (callback) => new MutationObserver(callback),
} = {}) {
  const cache = new Map();
  const frames = new Map();

  function cached(url, read) {
    if (!cache.has(url)) {
      cache.set(url, Promise.resolve()
        .then(() => fetchImpl(url))
        .then((response) => {
          if (!response.ok) {
            throw new Error(`Failed to fetch ${url}: ${response.status}`);
          }
          return read(response);
        })
        .catch((error) => {
          cache.delete(url);
          throw error;
        }));
    }
    return cache.get(url);
  }

  function post(iframe, message) {
    iframe.contentWindow?.postMessage({
      ...message,
      frameId: frames.get(iframe)?.frameId,
    }, '*');
  }

  function postUpdate(iframe, {
    property, attribute, value, controlType,
  }) {
    if (value === undefined) { return; }
    post(iframe, {
      type: 'prop-update',
      property,
      attribute,
      value: normalizedValue(value, controlType),
    });
  }

  function prune() {
    for (const iframe of frames.keys()) {
      if (!iframe.isConnected) { frames.delete(iframe); }
    }
  }

  function broadcastTheme() {
    prune();
    const scheme = forcedScheme(themeRoot);
    for (const iframe of frames.keys()) {
      post(iframe, { type: 'theme-update', scheme });
    }
  }

  function recordForSource(source) {
    return [...frames.entries()].find(([iframe]) => iframe.contentWindow === source);
  }

  function sendInit(iframe, state) {
    if (state.initSent) { return; }
    state.initSent = true;
    Promise.resolve(state.init ?? state.initPromise)
      .then((init) => {
        if (init) { post(iframe, { type: 'preview-init', ...init }); }
      })
      .catch((error) => state.onError?.({
        type: 'preview-error',
        phase: 'initialization',
        message: error.message,
      }));
  }

  hostWindow.addEventListener('message', (event) => {
    const match = recordForSource(event.source);
    if (!match) { return; }
    const [iframe, state] = match;
    if (event.data?.frameId !== state.frameId) { return; }
    switch (event.data?.type) {
      case 'shell-ready':
        sendInit(iframe, state);
        break;
      case 'preview-mounted':
        state.onMounted?.(event.data);
        break;
      case 'preview-error':
        state.onError?.(event.data);
        break;
      case 'preview-diagnostic':
        state.onDiagnostic?.(event.data);
        break;
      default:
        break;
    }
  });

  const observer = createObserver((records) => {
    if (records.some((record) => record.type === 'childList')) { prune(); }
    if (records.some((record) => record.type === 'attributes')) { broadcastTheme(); }
  });
  observer.observe(themeRoot, {
    attributes: true,
    attributeFilter: ['class'],
    childList: true,
    subtree: true,
  });

  return {
    json: (url) => cached(url, (response) => response.json()),
    text: (url) => cached(url, (response) => response.text()),
    register(iframe, state) {
      frames.set(iframe, state);
      iframe.addEventListener?.('load', () => {
        post(iframe, { type: 'theme-update', scheme: forcedScheme(themeRoot) });
      });
      return () => frames.delete(iframe);
    },
    update: postUpdate,
    broadcastTheme,
    clearResources: () => cache.clear(),
    get size() {
      prune();
      return frames.size;
    },
  };
}

export const playgroundCoordinator = createPlaygroundCoordinator();
