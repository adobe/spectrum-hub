/**
 * Normalizes extracted component JSON and resolves a single component-level status.
 *
 * - RSP (`deps/rsp/data/*.json`): `{ props: [...], status?: "stable" | "alpha" | "beta" | "rc" }`
 *   where `status` is doc maturity from the S2 docs site (see extract-doc-status.js).
 * - SWC (`deps/swc/data/*.json`): a flat prop array; when CEM includes `since`, status is
 *   derived from those fields (`internal` when every released prop is internal-only).
 *
 * Prop-level `status: "internal"` on SWC rows is not the same field as RSP top-level `status`.
 */

const SWC_PRERELEASE = new Set(['alpha', 'beta', 'rc']);

/**
 * @param {unknown} data Raw JSON from a component extraction file.
 * @returns {{ props: object[], docStatus: string | null }}
 */
export function normalizeComponentExtraction(data) {
  if (Array.isArray(data)) {
    return { props: data, docStatus: null };
  }

  if (data && typeof data === 'object' && Array.isArray(data.props)) {
    return {
      props: data.props,
      docStatus: typeof data.status === 'string' ? data.status : null,
    };
  }

  return { props: [], docStatus: null };
}

/** @param {object[]} props */
export function getSwcComponentStatus(props) {
  const released = props.filter((prop) => prop.since);
  if (!released.length) { return null; }
  const isInternal = released.every((prop) => prop.status === 'internal');
  return isInternal ? 'internal' : 'stable';
}

/**
 * @param {unknown} data Raw extraction JSON (RSP object or SWC array).
 * @returns {string | null} Component-level status for display, or null when unknown.
 */
export function getComponentStatus(data) {
  const { props, docStatus } = normalizeComponentExtraction(data);

  if (docStatus !== null) {
    return docStatus;
  }

  if (props.length) {
    return getSwcComponentStatus(props);
  }

  return null;
}

/**
 * @param {unknown} data Raw extraction JSON.
 * @returns {object[]} Prop rows for tables and comparisons.
 */
export function getComponentProps(data) {
  return normalizeComponentExtraction(data).props;
}

/**
 * @param {string | null} status
 * @returns {boolean}
 */
export function isPrereleaseStatus(status) {
  return SWC_PRERELEASE.has(status);
}
