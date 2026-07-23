/**
 * Source of truth for the platforms and the implementations under each that the docs site
 * surfaces.
 *
 * Onboarding a new implementation — or a whole new platform (mobile, desktop) — is meant to
 * be a single edit to PLATFORMS here: every block that lists or links implementations
 * (picker, sitenav, related resources, status table, implementation cards) reads from this
 * file, and the derived exports + helpers below update automatically.
 *
 * Each implementation `id` matches its data-extraction directory under `deps/` (e.g. `rsp` →
 * `deps/rsp/`) and its per-implementation source key in status-model.js. Each platform `id`
 * matches the platform key in the status index (`platforms.web`) and the component route
 * grammar `/<platform>/<impl>/components/<slug>`.
 */

export const PLATFORMS = [
  {
    id: 'web',
    label: 'Web',
    implementations: [
      { id: 'rsp', label: 'React Spectrum' },
      { id: 'swc', label: 'Spectrum Web Components' },
    ],
  },
  // Future platforms slot in here as pure data, e.g.
  // { id: 'mobile', label: 'Mobile',
  //   implementations: [{ id: 'ios', label: 'iOS' }, { id: 'android', label: 'Android' }] },
  // { id: 'desktop', label: 'Desktop',
  //   implementations: [{ id: 'drover', label: 'Drover' }, { id: 'qt', label: 'Qt' }] },
];

/**
 * Flat list of every implementation across all platforms, each tagged with its `platform`
 * id. Derived from PLATFORMS for callers that don't need the grouping.
 */
export const IMPLEMENTATIONS = PLATFORMS.flatMap(
  (platform) => platform.implementations.map((impl) => ({ ...impl, platform: platform.id })),
);

/**
 * The combined, all-implementations view option. This is a picker/view concept, not a data
 * source — never pass its id to status-model or a data fetch.
 */
export const ALL_OPTION = { id: 'all', label: 'All' };

/**
 * @param {string} id
 * @returns {{ id: string, label: string, implementations: object[] } | null}
 */
export function getPlatformById(id) {
  return PLATFORMS.find((platform) => platform.id === id) || null;
}

/**
 * The implementations belonging to one platform, in declared order.
 * @param {string} platformId
 * @returns {{ id: string, label: string, platform: string }[]}
 */
export function getImplementationsByPlatform(platformId) {
  return IMPLEMENTATIONS.filter((impl) => impl.platform === platformId);
}

/**
 * @param {string} id
 * @returns {{ id: string, label: string, platform: string } | null}
 */
export function getImplementationById(id) {
  return IMPLEMENTATIONS.find((impl) => impl.id === id) || null;
}

/**
 * The sibling implementations on the same platform as `currentId` (everything on that
 * platform except itself). Falls back to every implementation when `currentId` isn't a known
 * implementation (e.g. the ALL_OPTION view) so pickers can still list the full set.
 * @param {string} currentId
 * @returns {{ id: string, label: string, platform: string }[]}
 */
export function getOtherImplementations(currentId) {
  const current = getImplementationById(currentId);
  const pool = current ? getImplementationsByPlatform(current.platform) : IMPLEMENTATIONS;
  return pool.filter((impl) => impl.id !== currentId);
}
