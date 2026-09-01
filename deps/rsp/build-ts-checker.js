/**
 * Builds a real ts.Program/TypeChecker over CDN-fetched .d.ts files, without installing
 * @react-spectrum/s2 / react-aria-components / @react-types/shared as real npm packages.
 *
 * ts.CompilerHost's getSourceFile/readFile/fileExists are synchronous, but fetching from a
 * CDN is async, and the import graph isn't known upfront - so this works in two phases:
 *   1. crawl() - async, walks import/export specifiers starting from a set of entry files,
 *      fetching and caching each one, until nothing new is discovered.
 *   2. buildProgram() - takes the now-fully-populated cache and builds a fully synchronous
 *      CompilerHost from it (no network happens after this point), then a real ts.Program.
 *
 * Standard-library types (Array, Promise, Omit, Pick, Partial, Record, ...) are NOT part of
 * the CDN crawl - .d.ts files reference them constantly, but they're TypeScript's own
 * ambient globals, already available locally from the installed `typescript` package
 * (node_modules/typescript/lib/lib.*.d.ts). Reading those from disk instead of CDN avoids
 * fetching+caching megabytes of unrelated lib content and guarantees Omit<>/Pick<>/etc.
 * resolve correctly (the current regex pipeline can't resolve these types at all - it just
 * skips over the token name).
 */
import ts from 'typescript';
import { readFileSync } from 'fs';
import { dirname, join } from 'path';
import { createRequire } from 'module';
import { resolveSpecifier, cdnUrlsForCanonicalPath } from './locate-published-files.js';

const require = createRequire(import.meta.url);
const TS_LIB_DIR = join(dirname(require.resolve('typescript/package.json')), 'lib');

// Matches a bare/relative module specifier in an import or export-from statement.
// Cheap and deliberately not a real parse - only used to discover *which* files exist,
// real type information comes from the ts.Program built in phase 2.
const IMPORT_SPECIFIER_RE = /(?:import|export)(?:\s+type)?(?:[^'";]*?\bfrom\b)?\s*['"]([^'"]+)['"]/g;

export function extractImportSpecifiers(source) {
  const specifiers = new Set();
  for (const m of source.matchAll(IMPORT_SPECIFIER_RE)) {
    specifiers.add(m[1]);
  }
  return [...specifiers];
}

async function fetchWithFallback(canonicalPath, fetchImpl) {
  let lastErr;
  for (const url of cdnUrlsForCanonicalPath(canonicalPath)) {
    try {
      const res = await fetchImpl(url);
      if (res.ok) return res.text();
      lastErr = new Error(`HTTP ${res.status} for ${url}`);
    } catch (err) {
      lastErr = err;
    }
  }
  throw lastErr ?? new Error(`Failed to fetch ${canonicalPath}`);
}

/**
 * Crawls the import graph starting from `entryCanonicalPaths`, fetching and caching every
 * reachable .d.ts file. Returns a Map<canonicalPath, sourceText>. A file that fails to fetch
 * is recorded as `null` (rather than omitted) so callers/tests can tell "not reachable" from
 * "fetch failed" without re-attempting it mid-crawl.
 *
 * `cache` lets a caller extracting many components share one Map across calls instead of
 * re-fetching the same ~200 base files (react-aria-components, @react-types/shared, ...) once
 * per component — those are identical across every component's crawl. Passed in AND returned;
 * already-cached entries (including prior failures) are never re-fetched.
 */
export async function crawl(entryCanonicalPaths, { fetchImpl = fetch, concurrency = 20, cache } = {}) {
  const fileCache = cache ?? new Map();
  const queued = new Set(fileCache.keys());
  let queue = entryCanonicalPaths.filter((p) => !queued.has(p));
  queue.forEach((p) => queued.add(p));

  while (queue.length) {
    const batch = queue.slice(0, concurrency);
    queue = queue.slice(concurrency);

    // eslint-disable-next-line no-await-in-loop
    const results = await Promise.all(batch.map(async (canonicalPath) => {
      try {
        return [canonicalPath, await fetchWithFallback(canonicalPath, fetchImpl)];
      } catch (err) {
        console.warn(`  Warning: could not fetch ${canonicalPath}: ${err.message}`);
        return [canonicalPath, null];
      }
    }));

    for (const [canonicalPath, source] of results) {
      fileCache.set(canonicalPath, source);
      if (source == null) continue;
      for (const specifier of extractImportSpecifiers(source)) {
        const resolved = resolveSpecifier(specifier, canonicalPath);
        if (resolved && !queued.has(resolved)) {
          queued.add(resolved);
          queue.push(resolved);
        }
      }
    }
  }

  return fileCache;
}

function isLibFileName(fileName) {
  return /^lib\.[\w.-]*\.?d\.ts$/.test(fileName) || fileName === 'lib.d.ts';
}

function readLibFile(fileName) {
  return readFileSync(join(TS_LIB_DIR, fileName), 'utf8');
}

/**
 * Builds a fully synchronous ts.CompilerHost from a pre-populated fileCache (from crawl()).
 * Lib files are read from the local `typescript` install; everything else must already be
 * in fileCache - nothing async happens from here on.
 */
export function createCdnCompilerHost(fileCache, compilerOptions) {
  const sourceFileCache = new Map();

  function readSource(fileName) {
    if (isLibFileName(fileName)) return readLibFile(fileName);
    return fileCache.get(fileName) ?? undefined;
  }

  function getOrCreateSourceFile(fileName) {
    if (sourceFileCache.has(fileName)) return sourceFileCache.get(fileName);
    const text = readSource(fileName);
    const sourceFile = text !== undefined
      ? ts.createSourceFile(fileName, text, compilerOptions.target ?? ts.ScriptTarget.ES2020, true)
      : undefined;
    sourceFileCache.set(fileName, sourceFile);
    return sourceFile;
  }

  return {
    getSourceFile: (fileName) => getOrCreateSourceFile(fileName),
    getDefaultLibFileName: (options) => ts.getDefaultLibFileName(options),
    writeFile: () => {},
    getCurrentDirectory: () => '',
    getCanonicalFileName: (fileName) => fileName,
    useCaseSensitiveFileNames: () => true,
    getNewLine: () => '\n',
    fileExists: (fileName) => isLibFileName(fileName) || fileCache.has(fileName),
    readFile: (fileName) => readSource(fileName),
    // Bare/relative .d.ts-only specifiers on a virtual, non-node "filesystem" - resolve via
    // our own crawl-time resolver instead of node-style module resolution.
    resolveModuleNameLiterals: (moduleLiterals, containingFile) => moduleLiterals.map((literal) => {
      const resolved = resolveSpecifier(literal.text, containingFile);
      if (!resolved || !fileCache.has(resolved)) return { resolvedModule: undefined };
      return {
        resolvedModule: {
          resolvedFileName: resolved,
          extension: ts.Extension.Dts,
          isExternalLibraryImport: false,
        },
      };
    }),
  };
}

/** Builds a real ts.Program + TypeChecker from a pre-populated fileCache. */
export function buildProgram(fileCache, rootNames, compilerOptionsOverride = {}) {
  const compilerOptions = {
    target: ts.ScriptTarget.ES2020,
    module: ts.ModuleKind.ESNext,
    moduleResolution: ts.ModuleResolutionKind.Bundler,
    skipLibCheck: true,
    ...compilerOptionsOverride,
  };
  const host = createCdnCompilerHost(fileCache, compilerOptions);
  const program = ts.createProgram({ rootNames, options: compilerOptions, host });
  return { program, checker: program.getTypeChecker() };
}
