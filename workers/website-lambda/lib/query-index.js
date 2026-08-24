/*
 * Pure transforms for the AEM query-index JSON, applied by index.js before an
 * anonymous visitor receives it. No Request/Response here.
 *
 * An index is one or more sheets of the shape { total, offset, limit, columns,
 * data } where `data` is an array of row objects keyed by `columns`. A response
 * is either a single sheet (top-level `data`) or multi-sheet
 * ({ ':names': [...], <name>: { data }, ... }). `filterPrivateEntries` returns
 * null when it recognizes neither, so the caller can fail closed rather than
 * serve an unfiltered index to an anonymous visitor.
 */

// Filter one sheet: drop rows a page marked private (and any malformed,
// non-object rows), and remove the `audience` column entirely - both the value
// on every row and its entry in `columns` - so an anonymous client can neither
// read a private entry nor tell which public ones were ever marked private.
// Returns null when there is no `data` array to filter.
const filterSheet = (sheet) => {
  if (!sheet || typeof sheet !== 'object' || !Array.isArray(sheet.data)) { return null; }
  const data = sheet.data
    .filter((row) => row && typeof row === 'object' && row.audience !== 'private')
    .map(({ audience, ...rest }) => rest);
  const filtered = { ...sheet, data, total: data.length };
  if (Array.isArray(sheet.columns)) {
    filtered.columns = sheet.columns.filter((column) => column !== 'audience');
  }
  return filtered;
};

// Remove private entries and the audience column from an index. Handles a
// single sheet or a multi-sheet payload; returns null for anything that is not
// a recognizable index (the caller turns that into a 404 for anonymous users).
export const filterPrivateEntries = (json) => {
  if (!json || typeof json !== 'object') { return null; }

  // Single-sheet index: { columns, data, total, ... }
  if (Array.isArray(json.data)) { return filterSheet(json); }

  // Multi-sheet index: { ':names': [...], <name>: { data }, ... }
  // Fail closed: EVERY sheet named in ':names' must be a filterable data sheet.
  // If any one isn't, we can't be sure it's free of private rows, so refuse the
  // whole index (404 for anon) rather than pass that sheet through unfiltered.
  if (Array.isArray(json[':names']) && json[':names'].length > 0) {
    const out = { ...json };
    for (const name of json[':names']) {
      const filtered = filterSheet(out[name]);
      if (!filtered) { return null; }
      out[name] = filtered;
    }
    return out;
  }

  return null;
};

// Project every row down to just the columns the site nav needs (path + title),
// shrinking the payload ~90%. Opt-in (index.js only applies it for
// ?compact=true) so the default index keeps its full column set for other
// consumers. Single-sheet only - the nav fetches the default sheet.
export const compactEntries = (json) => {
  if (!json || !Array.isArray(json.data)) { return json; }
  const data = json.data.map((row) => ({ path: row?.path, title: row?.title }));
  return { ...json, columns: ['path', 'title'], data };
};
