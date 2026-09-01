/**
 * Normalizes extracted component JSON and resolves a single component-level status.
 *
 * - RSP (`deps/rsp/data/*.json`): `{ props: [...], status?: "stable" | "alpha" | "beta" | "rc" }`
 *   where `status` is doc maturity from the S2 docs site (see extract-doc-status.js).
 * - SWC (`deps/swc/data/*.json`): a flat prop array. The extractor stamps the component
 *   declaration's `@status` (`internal` | `preview` | `deprecated`) and `@since` onto every
 *   row (see deps/swc/extract-cem-components.js), so a released component's rows share one
 *   uniform status; a component with no `@status` is implicitly stable and public.
 *
 * Prop-level `status` on SWC rows is not the same field as RSP top-level `status`.
 */

const PRERELEASE_TAGS = new Set(['alpha', 'beta', 'rc']);

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

/**
 * Resolves the component-level SWC status from its extracted prop rows.
 *
 * @param {object[]} props
 * @returns {'internal' | 'preview' | 'deprecated' | 'stable' | null}
 */
export function getSwcComponentStatus(props) {
  const released = props.filter((prop) => prop.since);
  if (!released.length) { return null; }
  const [first] = released;
  const uniform = first.status && released.every((prop) => prop.status === first.status);
  return uniform ? first.status : 'stable';
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
  return PRERELEASE_TAGS.has(status);
}
