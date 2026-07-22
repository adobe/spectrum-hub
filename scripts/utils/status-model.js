/**
 * Unified component-status model and per-implementation mapping.
 *
 * Defines the unified statuses once (label, color token, legend definition) and maps
 * each implementation's own status vocabulary onto them. Downstream surfaces (the
 * combined status table, per-component pages, the build-time index) bind to these
 * unified statuses, never to raw implementation values — so a change in an upstream
 * vocabulary is absorbed here and never reaches the UI.
 *
 * See deps/docs/DATA-CONTRACT.md (SPDOCS-351) for how the raw RSP/SWC values are sourced.
 *
 * Mapping is keyed by implementation source (`rsp`, `swc`, ...). A new platform's
 * implementations add their own entry without touching existing mappings.
 */

/**
 * The unified statuses, in legend display order.
 *
 * `color` is the name of a Spectrum 2 color token defined in styles/styles.css; it
 * resolves for light and dark mode via `light-dark()`. Consumers wrap it in `var()`.
 *
 * @typedef {Object} UnifiedStatus
 * @property {string} id - Stable machine key (also usable as a CSS/JSON hook).
 * @property {string} label - Human-readable label.
 * @property {string} color - Spectrum 2 color token custom-property name.
 * @property {string} definition - Legend definition text.
 */

/** @type {Record<string, UnifiedStatus>} */
export const STATUSES = {
  available: {
    id: 'available',
    label: 'Available',
    color: '--s2-green-900',
    definition: 'Ready for use. Fidelity may vary.',
  },
  experimental: {
    id: 'experimental',
    label: 'Experimental',
    color: '--s2-blue-900',
    definition: 'Available for exploration and testing, but not recommended for production use.',
  },
  'not-available': {
    id: 'not-available',
    label: 'Not available',
    color: '--s2-gray-500',
    definition: 'Not currently available or applicable for this implementation or design library.',
  },
  deprecated: {
    id: 'deprecated',
    label: 'Deprecated',
    color: '--s2-orange-900',
    definition: 'Still available today, but scheduled for removal.',
  },
  removed: {
    id: 'removed',
    label: 'Removed',
    color: '--s2-red-900',
    definition: 'No longer supported or maintained. Use an alternative component instead.',
  },
};

const NOT_AVAILABLE = 'not-available';

/**
 * Per-source vocabulary → unified status.
 *
 * Each entry is `{ status: <STATUSES id>, context?: <Level 2 label> }`. The `context`
 * is an optional Level 2 label that preserves the source's own term (e.g. an
 * `Available` component that is specifically `Beta`).
 *
 * `deprecated → Deprecated` is stays dormant until an upstream marker appears or the
 * override file sets it (see deps/docs/DATA-CONTRACT.md). Any value not listed here falls
 * back to Not available.
 */
const SOURCE_MAPPINGS = {
  // React Spectrum (S2) doc maturity.
  rsp: {
    stable: { status: 'available', context: 'Stable' },
    beta: { status: 'available', context: 'Beta' },
    rc: { status: 'available', context: 'RC' },
    alpha: { status: 'available', context: 'Alpha' },
    deprecated: { status: 'deprecated' },
  },
  // `internal` is intentionally unmapped and dropped (see excludeInternalSwc)
  swc: {
    stable: { status: 'available', context: 'Stable' },
    deprecated: { status: 'deprecated' },
    preview: { status: 'available', context: 'Preview' },
  },
};

/**
 * Resolves an implementation's raw status value to a unified status.
 *
 * @param {string} source - Implementation source id (`rsp`, `swc`, ...).
 * @param {string | null | undefined} value - The implementation's raw status value.
 * @returns {{ status: UnifiedStatus, context: string | null }} The unified status and
 *   an optional Level 2 context label. Unknown sources, unknown values, and absent
 *   values resolve to Not available (with a null context) without throwing.
 */
export function getUnifiedStatus(source, value) {
  const entry = value == null ? undefined : SOURCE_MAPPINGS[source]?.[value];
  if (!entry) {
    return { status: STATUSES[NOT_AVAILABLE], context: null };
  }
  return { status: STATUSES[entry.status], context: entry.context ?? null };
}
