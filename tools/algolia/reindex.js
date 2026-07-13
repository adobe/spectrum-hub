/**
 * Reindex job: push the EDS query-index.json feed into an Algolia index.
 *
 * The frontend search block reads from Algolia at query time; this job keeps
 * that index in sync with the site's query-index. It is a build-time / CI
 * script, not browser code.
 */

/**
 * Shape of a record in the EDS query-index.json feed.
 * @typedef {object} QueryIndexRecord
 * @property {string} path
 * @property {string} [title]
 * @property {string} [description]
 * @property {string} [header]
 * @property {string} [image]
 */

/** Fields copied from the query index into each Algolia record. */
export const INDEXED_FIELDS = ['path', 'title', 'description', 'header', 'image'];

/**
 * Index-level relevance settings, applied once per reindex run.
 *
 * Mirrors the old block's two-tier matching: title and header rank equally and
 * ahead of description (comma-joined attributes share a priority tier in
 * Algolia). `path` and `image` are retrieved for rendering but not searched.
 */
export const INDEX_SETTINGS = {
  searchableAttributes: ['title,header', 'description'],
  attributesToHighlight: ['title', 'header', 'description'],
  attributesToRetrieve: ['path', 'title', 'description', 'header', 'image'],
};

/**
 * Map a single query-index record to an Algolia record.
 *
 * Uses `path` as the stable `objectID` so re-running the job upserts existing
 * records instead of creating duplicates. Records without a usable `path`
 * cannot be addressed in Algolia and are treated as invalid.
 *
 * @param {QueryIndexRecord} record
 * @returns {Record<string, string> | null} the Algolia record, or null if unusable
 */
export function mapRecord(record) {
  if (!record || typeof record.path !== 'string' || !record.path.trim()) {
    return null;
  }

  const mapped = { objectID: record.path };
  INDEXED_FIELDS.forEach((field) => {
    const value = record[field];
    if (typeof value === 'string' && value.length) {
      mapped[field] = value;
    }
  });

  return mapped;
}

/**
 * Map and validate a query-index data array into Algolia records.
 * Records without a usable `path` are skipped.
 *
 * @param {QueryIndexRecord[]} data
 * @returns {Record<string, string>[]}
 */
export function mapRecords(data) {
  if (!Array.isArray(data)) {
    throw new TypeError('query-index data must be an array');
  }
  return data.map(mapRecord).filter(Boolean);
}
