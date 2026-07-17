/**
 * Minimal CSV helpers.
 */

/** Escapes a single field per RFC 4180. */
function escapeField(value) {
  const str = value == null ? '' : String(value);
  return /[",\r\n]/.test(str) ? `"${str.replace(/"/g, '""')}"` : str;
}

/**
 * Serializes rows of fields to a CSV string.
 *
 * @param {Array<Array<string | number | null | undefined>>} rows
 * @returns {string}
 */
export function toCsv(rows) {
  return rows.map((row) => row.map(escapeField).join(',')).join('\r\n');
}

/**
 * Triggers a client-side download of CSV text.
 *
 * @param {string} filename
 * @param {string} content
 */
export function downloadCsv(filename, content) {
  const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}
