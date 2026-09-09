/*
 * Cache contract for the synchronously-injected page chrome (the sitenav rail and
 * the header). Kept deliberately side-effect-free so scripts.js can import it at
 * first paint WITHOUT pulling in the sitenav/header block modules, which run build
 * side effects on import.
 *
 * Each entry is a page-agnostic serialization of the fully-decorated chrome,
 * keyed by audience and stamped with a version. It is only a first-paint
 * accelerator: the authoritative async build runs on every load and overwrites
 * the entry, so any staleness self-heals within one navigation. Bump the
 * `version` whenever the chrome markup or its CSS contract changes so a shell
 * serialized by an older deploy is never injected against newer CSS/JS.
 */

export const SITENAV_CACHE = { key: 'sitenav-cache', version: 'v1' };
export const HEADER_CACHE = { key: 'header-cache', version: 'v1' };

// Loose bound: the authoritative build re-caches on every load, so this only
// caps how long a shell may survive with the tab closed between visits.
const TTL_MS = 24 * 60 * 60 * 1000;

export const writeChromeCache = ({ key, version }, html, audience) => {
  try {
    sessionStorage.setItem(key, JSON.stringify({
      html, v: version, audience, t: Date.now(),
    }));
  } catch {
    // sessionStorage unavailable (e.g. Safari private mode): skip caching. The
    // async build still runs on every load, so nothing breaks.
  }
};

export const readChromeCache = ({ key, version }, audience) => {
  try {
    const raw = sessionStorage.getItem(key);
    if (!raw) { return null; }
    const entry = JSON.parse(raw);
    if (entry.v !== version || entry.audience !== audience) { return null; }
    if (Date.now() - entry.t > TTL_MS) { return null; }
    return entry.html;
  } catch {
    return null;
  }
};
