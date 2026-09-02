import { getConfig } from '../ak.js';

const { env, cdnEnv } = getConfig();

const IMS_CLIENT_ID = 'spectrumhub';
const IMS_SCOPES = 'AdobeID,openid';

// Set just before an explicit sign-in redirect. When we return and establish
// the server session, it signals a one-time page reload so the current path
// re-fetches with the new cookie - the page may still be showing the gated/404
// content that rendered before the cookie existed. sessionStorage survives the
// IMS round-trip, and clearing it after the reload prevents a loop.
const SIGN_IN_RELOAD = 'spectrum-ims-signin-reload';

// One-shot per-tab guards for the two silent reconciliation reloads below -
// keyed separately so establishing a new session and tearing down a stale one
// never suppress each other. Each survives the reload it triggers, so a
// cookie/token desync can never turn into a reload loop. The explicit sign-in
// reload does NOT use these: it has its own SIGN_IN_RELOAD one-shot and must
// fire every time, even if a reconcile already ran earlier in this tab.
const ESTABLISH_RELOAD = 'spectrum-ims-establish-reload';
const TEARDOWN_RELOAD = 'spectrum-ims-teardown-reload';

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

// The token params imslib puts in the return fragment. imslib normally removes
// them asynchronously, but our reloads fire from inside onReady - before that
// cleanup completes - and location.reload() would otherwise carry them forward
// into the reloaded page, where no fresh IMS redirect exists to clean them up.
const IMS_HASH_KEYS = ['access_token', 'token_type', 'expires_in'];

// Reload the current path, first stripping only the IMS token params from the
// fragment. Any other hash - a page-navigation anchor, say - is preserved.
const reloadClean = () => {
  const params = new URLSearchParams(window.location.hash.replace(/^#/, ''));
  if (IMS_HASH_KEYS.some((key) => params.has(key))) {
    IMS_HASH_KEYS.forEach((key) => params.delete(key));
    const rest = params.toString();
    const url = window.location.pathname + window.location.search + (rest ? `#${rest}` : '');
    window.history.replaceState(null, '', url);
  }
  window.location.reload();
};

// Reload the current path at most once per tab for the given guard key. The key
// survives the reload, so if the cookie, IMS token, and page state are still
// mismatched afterwards we do not loop.
const reloadOnce = (key) => {
  if (sessionStorage.getItem(key)) { return false; }
  sessionStorage.setItem(key, '1');
  reloadClean();
  return true;
};

// Presence of the readable companion cookie means a live server session exists;
// its value is the clamped expiry. Returns null when no session cookie is set.
// Exported for unit tests.
export const readHintExpiry = () => {
  const match = document.cookie.match(/(?:^|;\s*)spectrum_session_active=([^;]+)/);
  const expiresAt = match ? Number(match[1]) : NaN;
  return Number.isFinite(expiresAt) ? expiresAt : null;
};

export function handleSignIn() {
  sessionStorage.setItem(SIGN_IN_RELOAD, '1');
  window.adobeIMS.signIn();
}

export async function handleSignOut() {
  // Do before the browser takes user to IMS for sign out. The DELETE clears
  // both the session cookie and its readable companion.
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

// No session cookie (so nothing to lose by minting one) or one inside the
// refresh window both mean "send the POST"; only a comfortably future cookie
// skips it. Reading the companion cookie rather than a localStorage proxy is
// what lets setSession self-heal: if the real cookie is gone, the hint is gone
// too, so we re-mint instead of trusting a stale marker. Exported for unit tests.
export const dueForRefresh = () => {
  const expiresAt = readHintExpiry();
  if (expiresAt === null) { return true; }
  return Date.now() >= expiresAt - SESSION_REFRESH_WINDOW_MS;
};

// Returns true only when it successfully (re)established the server session
// with a fresh cookie, so the caller can decide whether a post-sign-in reload
// is warranted.
const setSession = async (accessToken) => {
  if (cdnEnv !== true || !dueForRefresh()) { return false; }

  // Hash the EXACT bytes we send: CloudFront's OAC forwards this as the
  // signed payload hash (x-amz-content-sha256), and the Function URL recomputes
  // it over the received body - any difference fails SigV4 with a signature
  // mismatch. So `body` must be both what we hash and what we POST.
  const body = JSON.stringify({ access_token: accessToken.token });
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(body));
  const hashHex = [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, '0')).join('');

  const opts = {
    method: 'POST',
    credentials: 'include',
    headers: {
      'content-type': 'application/json',
      'x-amz-content-sha256': hashHex,
    },
    body,
  };
  try {
    const resp = await fetch('/auth/session', opts);
    if (!resp.ok) { return false; }
    // The worker sets the readable spectrum_session_active cookie on success;
    // dueForRefresh reads that, so there is nothing to persist here.
    return true;
  } catch (e) {
    // Best-effort: onReady calls this without awaiting it, so a network
    // failure here must not become an unhandled rejection. No cookie was set,
    // so dueForRefresh() stays true and the next onReady tries again.
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
        // loadIms only distinguishes SIGNED-OUT ({ anonymous: true }) from
        // SIGNED-IN (full details). Whether a signed-in user is AUTHORIZED is a
        // separate, server-owned fact: setSession mints the spectrum_session
        // cookie (and its readable companion), and the CDN enforces it on gated
        // paths.
        const accessToken = window.adobeIMS.getAccessToken();
        if (accessToken) {
          // Whether a live session cookie existed BEFORE this POST - the signal
          // for "the page was already fetched with the cookie" vs "it was
          // fetched anonymously and needs a reload to reveal gated content".
          const hadSession = readHintExpiry() !== null;
          const established = await setSession(accessToken);
          // The page was fetched before the cookie existed, so the server
          // rendered its anonymous view (a gated path is the 404 page; a public
          // page has had its audience-private blocks stripped). A single reload
          // re-fetches the same URL with the cookie and fixes either.
          const pendingReload = sessionStorage.getItem(SIGN_IN_RELOAD);
          sessionStorage.removeItem(SIGN_IN_RELOAD);
          if (established && pendingReload) {
            // Explicit sign-in: reload directly. SIGN_IN_RELOAD (set on the
            // click, cleared just above) already makes this fire exactly once,
            // and it must not be suppressed by an earlier reconcile in this tab.
            clearTimeout(timeout);
            reloadClean();
            return;
          }
          if (established && !hadSession && reloadOnce(ESTABLISH_RELOAD)) {
            // Silent IMS auto-login onto a page with no prior session: same
            // anonymous-view problem, but no click to key off. Guarded so a
            // cookie the browser refuses to store cannot loop the reload.
            clearTimeout(timeout);
            return;
          }
          loadDetails(IMS_CLIENT_ID, accessToken).then((details) => resolve(details));
        } else if (cdnEnv === true && readHintExpiry() !== null) {
          // IMS is signed out, yet a server session cookie lingers - e.g. the
          // user signed out of IMS in another tab/site on this domain. Tear it
          // down so gated content the user is no longer entitled to disappears,
          // then reload once into the anonymous view. reloadOnce prevents a loop
          // (and the DELETE clears the companion cookie regardless).
          await fetch('/auth/session', { method: 'DELETE', credentials: 'include' }).catch(() => {});
          if (reloadOnce(TEARDOWN_RELOAD)) {
            clearTimeout(timeout);
            return;
          }
          resolve({ anonymous: true });
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
