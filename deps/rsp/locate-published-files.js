/**
 * Pure module-specifier resolution for the .d.ts files this repo's RSP extraction
 * pipeline needs — no network, no filesystem. A "canonical path" uniquely identifies
 * one .d.ts file as `${packageName}/${pathWithinPackage}`, e.g.
 * "@react-spectrum/s2/dist/types/src/Button.d.ts" — this doubles as the exact unpkg
 * URL suffix, so resolving a specifier and building a fetch URL are the same string.
 *
 * The single place module specifiers become CDN URLs, shared by discover-components.js,
 * extract-props.js, and build-ts-checker.js's import-graph crawl.
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
// @react-spectrum/s2 has the same exports-map indirection as react-aria-components, and is
// listed for the reason the previous note anticipated: @react-spectrum/ai's components
// import bare `@react-spectrum/s2`, `@react-spectrum/s2/Menu` and `@react-spectrum/s2/Popover`
// specifiers. S2's own files are still fetched directly by internal path
// (dist/types/src/<Component>.d.ts), which is relative resolution and unaffected by this
// entry. Its `./style` subpath is the one exception — see SUBPATH_OVERRIDES.
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
  '@react-spectrum/s2': 'dist/types/exports',
};

// Subpaths whose package `exports` map does not follow that package's own base. S2 routes
// "./style" to dist/types/style/index.d.ts; there is no dist/types/exports/style.d.ts at
// all, so resolving it like every other subpath yields a 404. That matters more than a
// missing file usually would: every @react-spectrum/ai component imports StyleString from
// this subpath, and an unresolved heritage member collapses an entire Omit<> chain to zero
// properties with no error (see the react-aria/@types/react note above — same failure).
const SUBPATH_OVERRIDES = {
  '@react-spectrum/s2': { style: 'dist/types/style/index' },
};

// Subpath prefixes a package publishes at its ROOT rather than under its base. S2's
// exports map routes "./icons/*" and "./illustrations/*" to "./icons/*.d.ts" and
// "./illustrations/*.d.ts". These carry no props — nothing inherits from an icon — so
// resolving them correctly buys no prop data; it stops every icon import in the AI package
// from becoming a failed fetch and a warning, which would bury a real one.
const ROOT_SUBPATH_PREFIXES = {
  '@react-spectrum/s2': ['icons/', 'illustrations/'],
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

// Component files are fetched directly by known internal path, keyed by the roster entry's
// `package` (deps/rsp/components.json). This is the path the file is published at, which is
// not the `exports`-map subpath PACKAGE_BASES resolves a bare specifier through — both
// packages publish their real declarations under dist/types/src.
const COMPONENT_BASES = {
  s2: '@react-spectrum/s2/dist/types/src',
  ai: '@react-spectrum/ai/dist/types/src',
};

export const S2_COMPONENT_BASE = COMPONENT_BASES.s2;

/**
 * The canonical path of the `.d.ts` file declaring a component, from its roster entry.
 *
 * `file` names the declaring file when it differs from the component (`ThreadItem` lives in
 * `Chat.d.ts`), and `package` names the publishing package when it is not S2. An unknown
 * package falls back to S2 rather than building a path into a package that does not exist.
 *
 * @param {string} component - the component name.
 * @param {{ file?: string, package?: string }} entry - its deps/rsp/components.json entry.
 * @returns {string}
 */
export function componentEntryPath(component, entry = {}) {
  const base = COMPONENT_BASES[entry.package] ?? COMPONENT_BASES.s2;
  return `${base}/${entry.file ?? component}.d.ts`;
}

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
  const override = SUBPATH_OVERRIDES[pkgName]?.[subpath];
  if (override) { return `${pkgName}/${override}.d.ts`; }
  if (ROOT_SUBPATH_PREFIXES[pkgName]?.some((prefix) => subpath.startsWith(prefix))) {
    return `${pkgName}/${subpath}.d.ts`;
  }
  return base ? `${pkgName}/${base}/${subpath}.d.ts` : `${pkgName}/${subpath}.d.ts`;
}

/** unpkg first, jsdelivr fallback — same order/pattern as the rest of this pipeline. */
export function cdnUrlsForCanonicalPath(canonicalPath) {
  return [
    `https://unpkg.com/${canonicalPath}`,
    `https://cdn.jsdelivr.net/npm/${canonicalPath}`,
  ];
}
