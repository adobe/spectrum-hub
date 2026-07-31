/**
 * Turns a query-index row plus its extracted sections into Algolia records.
 *
 * The search UI renders a highlighted title and a row of pills, and nothing
 * else, so title is pre-formatted here rather than assembled in the UI. Pill
 * fields keep their authored casing and stay separate, letting the UI compose
 * and reorder them without a reindex.
 */

const TITLE_SEPARATOR = ' › ';
const MAX_TITLE_LENGTH = 80;

/**
 * Converts a last-modified header to epoch seconds, matching the units the
 * query index uses.
 * @param {string} value an HTTP date
 * @returns {number|null} epoch seconds, or null when unusable
 */
export function httpDateToEpochSeconds(value) {
  if (!value) { return null; }
  const parsed = Date.parse(value);
  return Number.isNaN(parsed) ? null : Math.floor(parsed / 1000);
}

const asString = (value) => (typeof value === 'string' ? value : '');

/** Authors may leave tags empty, or supply a single value rather than a list. */
function asTags(value) {
  if (Array.isArray(value)) { return value; }
  return typeof value === 'string' && value ? [value] : [];
}

function displayTitle(pageTitle, section) {
  const title = section.level === 1 || !section.heading || section.heading === pageTitle
    ? pageTitle
    : `${pageTitle}${TITLE_SEPARATOR}${section.heading}`;
  let result = title.slice(0, MAX_TITLE_LENGTH);
  result = result.replace(/\s*›\s*$/, '').trimEnd();
  return result;
}

/**
 * @param {object} row a query-index.json row
 * @param {object[]} sections output of splitSections
 * @param {number[]} fragmentTimes epoch seconds for each inlined fragment
 * @returns {object[]} Algolia records
 * @throws {Error} when row has no usable path
 */
export function buildRecords(row, sections, fragmentTimes = []) {
  if (!row.path || typeof row.path !== 'string') {
    throw new Error(`Row must have a non-empty path string: ${JSON.stringify(row)}`);
  }

  const pageTitle = asString(row.title);
  const section = row.path.split('/').filter(Boolean)[0] || 'root';
  const lastModified = Math.max(Number(row.lastModified) || 0, ...fragmentTimes);

  return sections.map((entry) => {
    const id = entry.anchor ? `${row.path}#${entry.anchor}` : row.path;
    return {
      objectID: id,
      url: id,
      path: row.path,

      title: displayTitle(pageTitle, entry),
      implementation: asString(row.implementation),
      platform: asString(row.platform),
      tags: asTags(row.tags),

      hierarchy: entry.hierarchy,
      content: entry.content,
      description: asString(row.description),
      pageTitle,

      section,
      level: entry.level,
      position: entry.position,
      lastModified,
    };
  });
}
