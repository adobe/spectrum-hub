export const CACHE_VERSION = 1;
export const CACHE_KEY = `spectrum-hub:sitenav:public:v${CACHE_VERSION}`;
export const MAX_STALE_MS = 7 * 24 * 60 * 60 * 1000;

const isIndexRow = (row) => row
  && typeof row.path === 'string'
  && typeof row.title === 'string';

export const isValidIndexRows = (rows) => Array.isArray(rows) && rows.every(isIndexRow);

const isSnapshot = (value) => value
  && value.version === CACHE_VERSION
  && Number.isFinite(value.savedAt)
  && typeof value.filteredListHtml === 'string'
  && value.filteredListHtml.trim()
  && isValidIndexRows(value.indexRows);

const resolveStorage = (storage) => (
  storage === undefined ? globalThis.localStorage : storage
);

export function removePublicNavCache(storage) {
  try {
    resolveStorage(storage).removeItem(CACHE_KEY);
  } catch {
    // Storage is optional; the network path remains authoritative.
  }
}

export function readPublicNavCache({
  storage,
  now = Date.now(),
} = {}) {
  try {
    const resolvedStorage = resolveStorage(storage);
    const value = JSON.parse(resolvedStorage.getItem(CACHE_KEY) ?? 'null');
    if (
      !isSnapshot(value)
      || value.savedAt > now
      || now - value.savedAt > MAX_STALE_MS
    ) {
      removePublicNavCache(resolvedStorage);
      return null;
    }
    return value;
  } catch {
    removePublicNavCache(storage);
    return null;
  }
}

export const normalizeIndexRows = (rows) => (Array.isArray(rows) ? rows : [])
  .map(({ path, title }) => ({ path: path.trim(), title: title.trim() }))
  .sort((a, b) => a.path.localeCompare(b.path) || a.title.localeCompare(b.title));

export const sameNavSource = (left, right) => Boolean(left && right)
  && isValidIndexRows(left.indexRows)
  && isValidIndexRows(right.indexRows)
  && left.filteredListHtml === right.filteredListHtml
  && JSON.stringify(normalizeIndexRows(left.indexRows))
    === JSON.stringify(normalizeIndexRows(right.indexRows));

export function writePublicNavCache(source, {
  storage,
  now = Date.now(),
  enabled,
  anonymous,
} = {}) {
  if (!enabled || !anonymous) { return false; }

  try {
    const resolvedStorage = resolveStorage(storage);
    const savedAt = Number(now);
    if (
      !source
      || typeof source.filteredListHtml !== 'string'
      || !source.filteredListHtml.trim()
      || !isValidIndexRows(source.indexRows)
      || !Number.isFinite(savedAt)
    ) {
      return false;
    }

    resolvedStorage.setItem(CACHE_KEY, JSON.stringify({
      version: CACHE_VERSION,
      savedAt,
      filteredListHtml: source.filteredListHtml,
      indexRows: normalizeIndexRows(source.indexRows),
    }));
    return true;
  } catch {
    return false;
  }
}
