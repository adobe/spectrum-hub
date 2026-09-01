/**
 * Pure module-specifier resolution for the .d.ts files this repo's RSP extraction
 * pipeline needs — no network, no filesystem. A "canonical path" uniquely identifies
 * one .d.ts file as `${packageName}/${pathWithinPackage}`, e.g.
 * "@react-spectrum/s2/dist/types/src/Button.d.ts" — this doubles as the exact unpkg
 * URL suffix, so resolving a specifier and building a fetch URL are the same string.
 *
 * The single place module specifiers become CDN URLs, shared by discover-components.js,
 * extract-props.js, and extract-base-props.js into one place, shared by build-ts-checker.js's
 * import-graph crawl.
 */

// Where each known package's public .d.ts tree actually lives, for resolving a BARE
// specifier (e.g. "react-aria-components/Tree") discovered inside another file's source.
//
// react-aria-components publishes its real declarations under dist/types/src/, but its
// package.json "exports" map (the actual node-resolution contract) routes every public
// subpath through dist/types/exports/<name>.d.ts — a thin per-file wrapper that re-exports
// from "../src/<realName>" (verified live: "react-aria-components/slots" has no
// dist/types/src/slots.d.ts at all; it's dist/types/exports/slots.d.ts, which re-exports
// from ../src/utils — the subpath name and the internal filename aren't always the same).
// Going through exports/ and letting the wrapper's own relative import resolve normally
// is what actually reflects the package's public contract, instead of guessing at its
// internal layout.
//
// @react-types/shared ships types straight from src/, no dist/types/ prefix (no runtime
// build of its own) and no exports map — its package.json `types` field points directly
// at src/index.d.ts.
//
// @react-spectrum/s2 has the same exports-map indirection as react-aria-components in
// principle, but this pipeline only ever fetches ITS OWN component files directly by known
// internal path (dist/types/src/<Component>.d.ts, unchanged from the current pipeline) —
// never resolves a bare cross-package specifier INTO @react-spectrum/s2, so it isn't listed
// here. If a future component's source needs to resolve a bare `@react-spectrum/s2/...`
// specifier, add it here pointed at dist/types/exports, matching the same reasoning as RAC.
export const PACKAGE_BASES = {
  'react-aria-components': 'dist/types/exports',
  'react-aria': 'dist/types/exports',
  // react-stately follows the same exports-map pattern as react-aria/react-aria-components.
  // @internationalized/date has no exports-map indirection — same direct dist/types/src/
  // layout as @react-types/shared. Both found by scanning real RAC files (Select, ListBox,
  // Popover, DatePicker, Calendar, Table, GridList, Dialog) for bare specifiers this
  // resolver didn't recognize — same "Omit<> collapses to nothing" failure mode as the
  // react-aria/@types/react gap already documented below, just surfacing on a different
  // component cluster (Picker/ComboBox/DatePicker/SelectBoxGroup/SideNav/ListView/TableView/
  // Tooltip all lost their overlay-trigger and collection props until these were added).
  'react-stately': 'dist/types/exports',
  '@internationalized/date': 'dist/types/src',
  '@react-types/shared': 'src',
  '@types/react': '',
};

// `react`'s own package ships no .d.ts of its own — its types live in the separate
// DefinitelyTyped `@types/react` package. Needed for real (not just "unresolved, but
// harmless") correctness: several RAC/S2 interfaces use `React.JSX.IntrinsicElements`
// in a *generic constraint position* (e.g. RAC's `RenderProps<T, E extends keyof
// React.JSX.IntrinsicElements = 'div'>`) — left unresolved, that constraint corrupts
// getPropertiesOfType() for the whole interface it's used in (verified: reproducing with
// real RAC/shared/S2 source and no react — RACButtonProps's Omit chain resolves to zero
// properties; adding just @types/react fixes it, confirmed no other change needed).
const RUNTIME_TO_TYPES_PACKAGE = { react: '@types/react' };

// @react-spectrum/s2 component files are fetched directly by known internal path (matching
// the current pipeline's convention), never resolved from a bare specifier — so it's not in
// PACKAGE_BASES, but crawl() still needs to build its canonical entry path the same way.
export const S2_COMPONENT_BASE = '@react-spectrum/s2/dist/types/src';

/** The canonical path for a known package's own entry point (its `index.d.ts`). */
export function packageEntryPath(pkg) {
  const base = PACKAGE_BASES[pkg];
  if (base === undefined) return null;
  return base ? `${pkg}/${base}/index.d.ts` : `${pkg}/index.d.ts`;
}

// Collapses "." and ".." segments the same way path.posix.normalize would, without
// pulling in the `path` module (keeps this file usable as-is in a fetched/CDN context
// later, and trivially unit-testable with plain strings).
function normalizeSegments(path) {
  const stack = [];
  for (const part of path.split('/')) {
    if (part === '' || part === '.') continue;
    if (part === '..') stack.pop();
    else stack.push(part);
  }
  return stack.join('/');
}

/**
 * Resolves a module specifier found inside the source at `fromCanonicalPath` to another
 * canonical path. Returns null for specifiers this pipeline doesn't crawl (bare runtime
 * packages like "react" that aren't one of PACKAGE_BASES — nothing about their .d.ts tree
 * is needed, only RSP/RAC/shared's type declarations are).
 *
 * @param {string} specifier - e.g. "./Foo", "../shared/Bar", "react-aria-components",
 *   "react-aria-components/Tree", "@react-types/shared"
 * @param {string} fromCanonicalPath - the canonical path of the file containing `specifier`
 * @returns {string | null}
 */
export function resolveSpecifier(specifier, fromCanonicalPath) {
  if (specifier.startsWith('.')) {
    const slashIndex = fromCanonicalPath.lastIndexOf('/');
    const dir = slashIndex === -1 ? '' : fromCanonicalPath.slice(0, slashIndex);
    const resolved = normalizeSegments(`${dir}/${specifier}`);
    return resolved.endsWith('.d.ts') ? resolved : `${resolved}.d.ts`;
  }

  // Runtime package name -> its separate @types/* declaration package (e.g. "react" has
  // no .d.ts of its own; "react/jsx-runtime" -> "@types/react/jsx-runtime").
  let effectiveSpecifier = specifier;
  for (const [runtimePkg, typesPkg] of Object.entries(RUNTIME_TO_TYPES_PACKAGE)) {
    if (specifier === runtimePkg || specifier.startsWith(`${runtimePkg}/`)) {
      effectiveSpecifier = typesPkg + specifier.slice(runtimePkg.length);
      break;
    }
  }

  const pkgName = Object.keys(PACKAGE_BASES)
    .filter((p) => effectiveSpecifier === p || effectiveSpecifier.startsWith(`${p}/`))
    .sort((a, b) => b.length - a.length)[0];
  if (!pkgName) return null;

  const base = PACKAGE_BASES[pkgName];
  const subpath = effectiveSpecifier === pkgName ? 'index' : effectiveSpecifier.slice(pkgName.length + 1);
  return base ? `${pkgName}/${base}/${subpath}.d.ts` : `${pkgName}/${subpath}.d.ts`;
}

/** unpkg first, jsdelivr fallback — same order/pattern as the rest of this pipeline. */
export function cdnUrlsForCanonicalPath(canonicalPath) {
  return [
    `https://unpkg.com/${canonicalPath}`,
    `https://cdn.jsdelivr.net/npm/${canonicalPath}`,
  ];
}
