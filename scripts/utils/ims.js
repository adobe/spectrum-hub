import { getConfig } from '../ak.js';

const { env, cdnEnv } = getConfig();

const IMS_CLIENT_ID = 'spectrumhub';
const IMS_SCOPES = 'AdobeID,openid';

// The server's answer to POST /auth/session, not the client's own claim
const IMS_SERVER_EXPIRE = 'spectrum-ims-server-expire';

// Set just before an explicit sign-in redirect. When we return and establish
// the server session, it signals a one-time page reload so the current path
// re-fetches with the new cookie - the page may still be showing the gated/404
// content that rendered before the cookie existed. sessionStorage survives the
// IMS round-trip, and clearing it after the reload prevents a loop.
const SIGN_IN_RELOAD = 'spectrum-ims-signin-reload';

// How long before the stored expiry we start refreshing again
const SESSION_REFRESH_WINDOW_MS = 60 * 60 * 1000;

const IMS_URL = 'https://auth.services.adobe.com/imslib/imslib.min.js';
const IMS_TIMEOUT = 5000;
const IMS_ENV = { dev: 'stg1', stage: 'stg1', prod: 'prod' };

const IMS_ENDPOINT = {
  dev: 'ims-na1-stg1.adobelogin.com',
  stage: 'ims-na1-stg1.adobelogin.com',
  prod: 'ims-na1.adobelogin.com',
};

const IO_ENV = {
  dev: 'cc-collab-stage.adobe.io',
  stage: 'cc-collab-stage.adobe.io',
  prod: 'cc-collab.adobe.io',
};

export const IMS_ORIGIN = (() => `https://${IMS_ENDPOINT[env]}`)();

// True when the current document is the site's 404 page (served by CloudFront's
// custom error response for gated or missing paths). 404.html carries this
// marker; public pages like the homepage don't, so they never need a reload -
// their own code reveals logged-in content without one.
const onErrorPage = () => document.querySelector('meta[name="error"]')?.content === '404';

export function handleSignIn() {
  sessionStorage.setItem(SIGN_IN_RELOAD, '1');
  window.adobeIMS.signIn();
}

export async function handleSignOut() {
  // Do before the browser takes user to IMS for sign out
  localStorage.removeItem(IMS_SERVER_EXPIRE);
  if (cdnEnv) {
    await fetch('/auth/session', { method: 'DELETE', credentials: 'include' }).catch(() => {});
  }
  window.adobeIMS.signOut();
}

async function loadScript(src) {
  return new Promise((resolve, reject) => {
    let script = document.querySelector(`head > script[src="${src}"]`);
    if (!script) {
      script = document.createElement('script');
      script.src = src;
      document.head.append(script);
    }
    if (!window.adobeIMS) {
      script.onload = resolve;
      script.onerror = reject;
    } else {
      resolve();
    }
  });
}

async function fetchWithToken(url, accessToken) {
  const opts = { headers: { Authorization: `Bearer ${accessToken.token}` } };
  try {
    const resp = await fetch(url, opts);
    if (!resp.ok) { return null; }
    return resp.json();
  } catch (e) {
    return null;
  }
}

const getOrgsFactory = (clientId, accessToken) => {
  let orgs;

  return () => {
    orgs ??= fetchWithToken(
      `https://${IMS_ENDPOINT[env]}/ims/account_cluster/v3?client_id=${clientId}`,
      accessToken,
    );
    return orgs;
  };
};

const getIoFactory = (accessToken) => {
  let io;

  return () => {
    io ??= fetchWithToken(`https://${IO_ENV[env]}/profile`, accessToken);
    return io;
  };
};

const getTenantId = (profile) => {
  const found = profile.projectedProductContext?.find(
    (projected) => projected.prodCtx.serviceCode === 'dma_tartan',
  );
  return found?.prodCtx.serviceCode;
};

// null (never stored), unparseable, or within the refresh window all mean
// "send the POST" - only a comfortably future stored expiry skips it.
const dueForRefresh = () => {
  const raw = localStorage.getItem(IMS_SERVER_EXPIRE);
  if (raw === null) { return true; }
  const storedExpiresAt = Number(raw);
  if (!Number.isFinite(storedExpiresAt)) { return true; }
  return Date.now() >= storedExpiresAt - SESSION_REFRESH_WINDOW_MS;
};

// Returns true only when it successfully (re)established the server session
// with a fresh cookie, so the caller can decide whether a post-sign-in reload
// is warranted.
const setSession = async (accessToken) => {
  if (cdnEnv !== true || !dueForRefresh()) { return false; }

  const body = JSON.stringify({ access_token: accessToken });
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(body));
  const hashHex = [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, '0')).join('');

  const opts = {
    method: 'POST',
    credentials: 'include',
    headers: {
      'content-type': 'application/json',
      'x-amz-content-sha256': hashHex,
    },
    body: JSON.stringify({ access_token: accessToken.token }),
  };
  try {
    const resp = await fetch('/auth/session', opts);
    if (!resp.ok) { return false; }
    const { expiresAt } = await resp.json();
    if (Number.isFinite(expiresAt)) {
      localStorage.setItem(IMS_SERVER_EXPIRE, String(expiresAt));
    }
    return true;
  } catch (e) {
    // Best-effort: onReady calls this without awaiting it, so a network
    // failure here must not become an unhandled rejection. Nothing stored
    // means dueForRefresh() tries again on the next onReady.
    return false;
  }
};

async function loadDetails(clientId, accessToken) {
  const profile = await window.adobeIMS.getProfile();
  const tenantId = getTenantId(profile);
  const getIo = getIoFactory(accessToken);
  const getOrgs = getOrgsFactory(clientId, accessToken);
  return { ...profile, tenantId, accessToken, getIo, getOrgs };
}

export const loadIms = (() => {
  let ims;

  const setup = () => new Promise((resolve, reject) => {
    const timeout = setTimeout(() => reject(new Error('IMS timeout')), IMS_TIMEOUT);

    window.adobeid = {
      client_id: IMS_CLIENT_ID,
      scope: IMS_SCOPES,
      locale: document.documentElement.lang?.replace('-', '_') || 'en_US',
      autoValidateToken: true,
      environment: IMS_ENV[env],
      useLocalStorage: true,
      onError: reject,
      onReady: async () => {
        const accessToken = window.adobeIMS.getAccessToken();
        if (accessToken) {
          const established = await setSession(accessToken);
          // After an explicit sign-in that established the session, reload once
          // ONLY if we're on the 404 page - it's showing gated content that
          // rendered before the cookie existed, and the URL is unchanged so a
          // reload re-fetches it authenticated. Public pages (e.g. the
          // homepage) reveal logged-in content on their own, so they skip this.
          const pendingReload = sessionStorage.getItem(SIGN_IN_RELOAD);
          sessionStorage.removeItem(SIGN_IN_RELOAD);
          if (established && pendingReload && onErrorPage()) {
            clearTimeout(timeout);
            window.location.reload();
            return;
          }
          loadDetails(IMS_CLIENT_ID, accessToken).then((details) => resolve(details));
        } else {
          resolve({ anonymous: true });
        }
        clearTimeout(timeout);
      },

    };
    loadScript(IMS_URL);
  });

  return () => {
    ims ??= setup();
    return ims;
  };
})();
