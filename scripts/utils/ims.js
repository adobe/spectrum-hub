import { getConfig } from '../ak.js';

const { env, cdnEnv } = getConfig();

const IMS_CLIENT_ID = 'spectrumhub';
const IMS_SCOPES = 'AdobeID,openid';

// The server's answer to POST /auth/session, not the client's own claim
const IMS_SERVER_EXPIRE = 'spectrum-ims-server-expire';

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

export function handleSignIn() {
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

const setSession = async (accessToken) => {
  if (cdnEnv !== true || !dueForRefresh()) { return; }

  const opts = {
    method: 'POST',
    credentials: 'include',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ access_token: accessToken.token }),
  };
  try {
    const resp = await fetch('/auth/session', opts);
    if (!resp.ok) { return; }
    const { expiresAt } = await resp.json();
    if (Number.isFinite(expiresAt)) {
      localStorage.setItem(IMS_SERVER_EXPIRE, String(expiresAt));
    }
  } catch (e) {
    // Best-effort: onReady calls this without awaiting it, so a network
    // failure here must not become an unhandled rejection. Nothing stored
    // means dueForRefresh() tries again on the next onReady.
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
      onReady: () => {
        const accessToken = window.adobeIMS.getAccessToken();
        if (accessToken) {
          setSession(accessToken);
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
