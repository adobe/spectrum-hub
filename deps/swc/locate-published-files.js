/**
 * Module-specifier resolution for the SWC .d.ts crawl used by extract-cem-components.js
 * to resolve named-alias attribute types (e.g. "ButtonVariant") to their real literal
 * union, the same way deps/rsp/extract-props.js already does for RSP via the real
 * TypeScript checker.
 *
 * Unlike deps/rsp/cdn-resolve.js (a small hand-maintained PACKAGE_BASES table of a few
 * known peer packages), this resolves bare specifiers dynamically from each package's
 * own published `exports` map. That's deliberate: @adobe/spectrum-wc's own peer
 * "core" package has already been renamed once between versions
 * (@spectrum-web-components/core -> @adobe/spectrum-wc-core) — a static table would
 * have silently gone stale across that rename. Only two packages are ever resolved
 * this way: @adobe/spectrum-wc itself and whichever `@adobe/*`-scoped dependency it
 * declares as its "core" peer (discovered from its own package.json, not hardcoded).
 *
 * Third-party runtime libraries (`lit`, `@lit-labs/observers`, `@floating-ui/dom`,
 * `colorjs.io`) are deliberately left UNRESOLVED — resolveSpecifier returns null for
 * them, same graceful-skip behavior deps/rsp/cdn-resolve.js already has for any bare
 * specifier outside its own known set. This is safe here because the enum-like
 * attribute types this pipeline cares about (e.g. Button's `variant`, `size`) never
 * themselves depend on lit — confirmed by direct inspection of the published .d.ts
 * files: e.g. Button.types.d.ts and sized-mixin.d.ts's ELEMENT_SIZES/ButtonVariant-
 * style declarations have zero imports of their own. Lit types appear only on
 * unrelated members (render(), styles) that this pipeline never needs to resolve.
 * Only exports-map wildcard patterns (e.g. "./components/*") are unsupported — only
 * literal keys are resolved, which is everything actually observed in these packages'
 * public entry points to date. An unresolvable specifier (wildcard-only match, or a
 * package outside the known set) degrades to the bare alias name being left
 * unresolved, same as today's pre-rewrite behavior.
 *
 * Canonical paths here are `${pkgName}::${version}/${filePath}` — "::" (not "@",
 * which scoped package names already contain) separates the package+version prefix
 * from the file path, so it can be split back out unambiguously.
 */

const manifestCache = new Map(); // `${name}@${versionOrRange}` -> Promise<manifest>

// Test-only: clears the module-level manifest cache so each test starts clean
// instead of reusing another test's mocked manifest for the same package+version.
export function clearManifestCache() {
  manifestCache.clear();
}

async function fetchManifest(name, versionOrRange, { fetchImpl = fetch } = {}) {
  const key = `${name}@${versionOrRange}`;
  if (!manifestCache.has(key)) {
    manifestCache.set(key, (async () => {
      const url = `https://unpkg.com/${name}@${versionOrRange}/package.json`;
      const res = await fetchImpl(url);
      if (!res.ok) throw new Error(`HTTP ${res.status} for ${url}`);
      const manifest = await res.json();
      // Cache under the concrete resolved version too, so a later call with the
      // exact version (e.g. from a different dependent) hits cache instead of
      // re-fetching the same manifest under a different key.
      manifestCache.set(`${name}@${manifest.version}`, Promise.resolve(manifest));
      return manifest;
    })());
  }
  return manifestCache.get(key);
}

/** The `@adobe/*`-scoped dependency @adobe/spectrum-wc declares besides itself — its
 * "core" peer, wherever the published package currently names it. Not hardcoded: this
 * package has been renamed before and may be again. */
export function findCorePackageName(wcManifest) {
  const deps = wcManifest.dependencies ?? {};
  return Object.keys(deps).find((name) => name.startsWith('@adobe/') && name !== wcManifest.name) ?? null;
}

function splitCanonical(canonicalPath) {
  // Find "::" first, then the first "/" after it — a scoped package name (e.g.
  // "@adobe/spectrum-wc") already contains a "/", so searching for the file path's
  // separator from the start of the string would split inside the package name.
  const sepIdx = canonicalPath.indexOf('::');
  const versionStart = sepIdx + 2;
  const slash = canonicalPath.indexOf('/', versionStart);
  return {
    pkgName: canonicalPath.slice(0, sepIdx),
    version: canonicalPath.slice(versionStart, slash),
    filePath: canonicalPath.slice(slash + 1),
  };
}

export function makeCanonicalPath(pkgName, version, filePath) {
  return `${pkgName}::${version}/${filePath}`;
}

// Collapses "." and ".." segments, same as deps/rsp/cdn-resolve.js's normalizeSegments.
function normalizeSegments(path) {
  const stack = [];
  for (const part of path.split('/')) {
    if (part === '' || part === '.') continue;
    if (part === '..') stack.pop();
    else stack.push(part);
  }
  return stack.join('/');
}

function splitBareSpecifier(specifier) {
  const parts = specifier.split('/');
  const pkgName = specifier.startsWith('@') ? parts.slice(0, 2).join('/') : parts[0];
  const subpath = specifier.slice(pkgName.length + 1); // '' when importing the package root
  return { pkgName, subpath };
}

// An exports-map entry's condition value can itself be a nested conditions object
// (e.g. { import: { node: {...}, default: "./foo.js" } }) rather than a plain
// string — walks down to the first string leaf found, in object-key order.
function firstStringLeaf(node) {
  if (typeof node === 'string') return node;
  if (node && typeof node === 'object') {
    // eslint-disable-next-line no-restricted-syntax
    for (const value of Object.values(node)) {
      const leaf = firstStringLeaf(value);
      if (leaf) return leaf;
    }
  }
  return null;
}

// Literal-key resolution only (no "./foo/*" wildcard support — see file doc comment).
function exportsTypesPath(manifest, subpath) {
  const key = subpath ? `./${subpath}` : '.';
  const entry = manifest.exports?.[key];
  if (!entry) return null;
  if (typeof entry === 'string') return entry;
  const typesPath = firstStringLeaf(entry.types);
  if (typesPath) return typesPath;
  const importPath = firstStringLeaf(entry.import) ?? firstStringLeaf(entry.default) ?? firstStringLeaf(entry);
  return importPath?.endsWith('.js') ? importPath.replace(/\.js$/, '.d.ts') : importPath;
}

/**
 * Resolves a module specifier found inside the file at `fromCanonicalPath` to another
 * canonical path, or null when it can't be resolved (relative import outside any known
 * package's tree, or a bare specifier this pipeline doesn't know how to follow — see
 * file doc comment). Async because bare-specifier resolution needs each package's own
 * published manifest.
 */
export async function resolveSpecifier(specifier, fromCanonicalPath, { fetchImpl = fetch } = {}) {
  const { pkgName: fromPkg, version: fromVersion, filePath: fromFile } = splitCanonical(fromCanonicalPath);

  if (specifier.startsWith('.')) {
    const dir = fromFile.includes('/') ? fromFile.slice(0, fromFile.lastIndexOf('/')) : '';
    const resolved = normalizeSegments(`${dir}/${specifier}`);
    const withExt = resolved.endsWith('.d.ts') ? resolved : `${resolved.replace(/\.js$/, '')}.d.ts`;
    return makeCanonicalPath(fromPkg, fromVersion, withExt);
  }

  const { pkgName: targetPkg, subpath } = splitBareSpecifier(specifier);

  let targetVersion;
  if (targetPkg === fromPkg) {
    targetVersion = fromVersion;
  } else {
    const fromManifest = await fetchManifest(fromPkg, fromVersion, { fetchImpl });
    const range = fromManifest.dependencies?.[targetPkg];
    if (!range) return null; // not a dependency this file's own package declares - e.g. lit
    const targetManifestByRange = await fetchManifest(targetPkg, range, { fetchImpl });
    targetVersion = targetManifestByRange.version;
  }

  const targetManifest = await fetchManifest(targetPkg, targetVersion, { fetchImpl });
  const typesPath = exportsTypesPath(targetManifest, subpath);
  if (!typesPath) return null;
  return makeCanonicalPath(targetPkg, targetVersion, typesPath.replace(/^\.\//, ''));
}

export function cdnUrlsForCanonicalPath(canonicalPath) {
  const { pkgName, version, filePath } = splitCanonical(canonicalPath);
  return [
    `https://unpkg.com/${pkgName}@${version}/${filePath}`,
    `https://cdn.jsdelivr.net/npm/${pkgName}@${version}/${filePath}`,
  ];
}

/** Canonical entry path for a component's own declaring file, from the CEM's `mod.path`
 * (e.g. "components/button/Button.ts") — a direct dist-tree path, not resolved through
 * @adobe/spectrum-wc's own (wildcard-only) exports map. CDNs serve arbitrary package
 * files regardless of the package's "exports" map, which only gates real import
 * resolution — confirmed this direct path is fetchable independent of that map. */
export function componentEntryPath(modPath, wcVersion) {
  const distPath = `dist/${modPath.replace(/\.ts$/, '.d.ts')}`;
  return makeCanonicalPath('@adobe/spectrum-wc', wcVersion, distPath);
}

// The one prefix every `inheritedFrom.module` value uses across the whole current
// catalog (verified against every mixin and every `*.base.ts` component-base file
// the live CEM references, not just Button's) — a monorepo-relative path climbing
// out of @adobe/spectrum-wc's own source tree into @adobe/spectrum-wc-core's.
const INHERITED_MODULE_PREFIX = '../core/';

/** Rebases a CEM `inheritedFrom.module` value (e.g.
 * "../core/mixins/sized-mixin.ts") onto the core package's published dist tree.
 * Returns null for any other shape — that's the only one confirmed across the
 * current catalog, so an unrecognized shape degrades safely (caller leaves the
 * original alias text unresolved) rather than guessing at an unverified rebase. */
export function rebaseInheritedModule(inheritedModule, corePkgName, coreVersion) {
  if (!inheritedModule.startsWith(INHERITED_MODULE_PREFIX)) return null;
  const rest = inheritedModule.slice(INHERITED_MODULE_PREFIX.length).replace(/\.ts$/, '.d.ts');
  return makeCanonicalPath(corePkgName, coreVersion, `dist/${rest}`);
}

export { fetchManifest };
