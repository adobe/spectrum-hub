/**
 * Builds a real ts.Program/TypeChecker over CDN-fetched .d.ts files, for resolving
 * @adobe/spectrum-wc's named-alias attribute types (e.g. "ButtonVariant") to their
 * real literal union — without installing @adobe/spectrum-wc / @adobe/spectrum-wc-core
 * as real npm packages.
 *
 * Structurally identical to deps/rsp/build-ts-checker.js (crawl() then buildProgram(), same
 * two-phase async-then-sync split, same reasoning for reading TS's own lib.*.d.ts from
 * disk rather than the CDN) — duplicated rather than shared, because this pipeline's
 * resolveSpecifier is async (bare-specifier resolution needs each package's own
 * published manifest, fetched on demand — see locate-published-files.js), while RSP's is a
 * synchronous lookup into a small hardcoded table. Sharing would mean either making
 * RSP's proven, already-relied-upon pipeline async for no reason it needs, or a
 * resolver-injection refactor of that working file — both riskier than this small
 * duplication for what's a self-contained ~150-line module.
 */
import ts from 'typescript';
import { readFileSync } from 'fs';
import { dirname, join } from 'path';
import { createRequire } from 'module';
import { resolveSpecifier, cdnUrlsForCanonicalPath } from './locate-published-files.js';

const require = createRequire(import.meta.url);
const TS_LIB_DIR = join(dirname(require.resolve('typescript/package.json')), 'lib');

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
 * Crawls the import graph starting from `entryCanonicalPaths`, fetching and caching
 * every reachable .d.ts file. Returns `{ fileCache, resolutionCache }`:
 *   - fileCache: Map<canonicalPath, sourceText|null> (null = failed to fetch)
 *   - resolutionCache: Map<"fromCanonicalPath specifier", canonicalPath|null> —
 *     every specifier resolution crawl() performed, precomputed so
 *     createCdnCompilerHost's resolveModuleNameLiterals (a synchronous TS API) can
 *     look up the same answer without re-running the async resolveSpecifier.
 *
 * A file that fails to fetch, or a specifier this pipeline can't/won't resolve (see
 * locate-published-files.js's doc comment — third-party runtime libs are skipped by design), is
 * simply not added to the queue; TypeScript treats a missing/unresolved import as
 * effectively `any` rather than erroring the whole program.
 *
 * `cache`/`resolutionCache` (options) let a caller extracting many components share
 * one pair of Maps across calls instead of re-fetching and re-resolving identical
 * shared files (mixins, the `element` base class, ...) once per component.
 */
export async function crawl(entryCanonicalPaths, {
  fetchImpl = fetch, concurrency = 20, cache, resolutionCache,
} = {}) {
  const fileCache = cache ?? new Map();
  const resolutions = resolutionCache ?? new Map();
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

    // eslint-disable-next-line no-restricted-syntax
    for (const [canonicalPath, source] of results) {
      fileCache.set(canonicalPath, source);
      if (source == null) continue;
      // eslint-disable-next-line no-restricted-syntax
      for (const specifier of extractImportSpecifiers(source)) {
        const resolutionKey = `${canonicalPath} ${specifier}`;
        if (resolutions.has(resolutionKey)) continue;
        // eslint-disable-next-line no-await-in-loop
        const resolved = await resolveSpecifier(specifier, canonicalPath, { fetchImpl });
        resolutions.set(resolutionKey, resolved);
        if (resolved && !queued.has(resolved)) {
          queued.add(resolved);
          queue.push(resolved);
        }
      }
    }
  }

  return { fileCache, resolutionCache: resolutions };
}

function isLibFileName(fileName) {
  return /^lib\.[\w.-]*\.?d\.ts$/.test(fileName) || fileName === 'lib.d.ts';
}

function readLibFile(fileName) {
  return readFileSync(join(TS_LIB_DIR, fileName), 'utf8');
}

/**
 * Builds a fully synchronous ts.CompilerHost from a pre-populated fileCache +
 * resolutionCache (both from crawl()). Lib files are read from the local `typescript`
 * install; everything else must already be in fileCache - nothing async happens from
 * here on. Module resolution here is a plain resolutionCache lookup (crawl() already
 * ran the real, async resolveSpecifier for every specifier it found), never
 * resolveSpecifier itself again.
 */
export function createCdnCompilerHost(fileCache, resolutionCache, compilerOptions) {
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
    resolveModuleNameLiterals: (moduleLiterals, containingFile) => moduleLiterals.map((literal) => {
      const resolved = resolutionCache.get(`${containingFile} ${literal.text}`);
      if (process.env.DEBUG_RESOLVE) {
        console.log('[resolveModuleNameLiterals]', JSON.stringify(containingFile), JSON.stringify(literal.text), '=>', resolved, 'hasFile=', resolved ? fileCache.has(resolved) : null);
      }
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

/** Builds a real ts.Program + TypeChecker from a pre-populated fileCache +
 * resolutionCache. rootNames must be canonical paths crawl() already fetched (or
 * synthetic in-memory paths added to fileCache directly by the caller). */
export function buildProgram(fileCache, resolutionCache, rootNames, compilerOptionsOverride = {}) {
  const compilerOptions = {
    target: ts.ScriptTarget.ES2020,
    module: ts.ModuleKind.ESNext,
    moduleResolution: ts.ModuleResolutionKind.Bundler,
    skipLibCheck: true,
    ...compilerOptionsOverride,
  };
  const host = createCdnCompilerHost(fileCache, resolutionCache, compilerOptions);
  const program = ts.createProgram({ rootNames, options: compilerOptions, host });
  return { program, checker: program.getTypeChecker() };
}
