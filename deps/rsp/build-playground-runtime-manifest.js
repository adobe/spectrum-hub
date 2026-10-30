import { posix } from 'node:path';

const RUNTIME_SPECIFIER_RE = /(?:import|export)(?:\s+[^'";]*?\bfrom\s*)?\(?\s*['"]([^'"]+)['"]\s*\)?/g;

export function extractRuntimeSpecifiers(source) {
  return [...source.matchAll(RUNTIME_SPECIFIER_RE)].map((match) => match[1]);
}

function sortUnique(values) {
  return [...new Set(values)].sort((a, b) => a.localeCompare(b));
}

function resolvePackagePath(specifier, fromPath) {
  if (!specifier.startsWith('.')) return null;
  return `/${posix.normalize(posix.join(posix.dirname(fromPath), specifier)).replace(/^\/+/, '')}`;
}

async function collectStyles(sourceId, entryPath, source, loadModule) {
  const packageFiles = new Set(source.packageFiles);
  const visited = new Set();
  const styles = new Set(source.pageStyles);
  const queue = [entryPath];

  while (queue.length) {
    const path = queue.shift();
    if (visited.has(path)) continue;
    visited.add(path);

    // eslint-disable-next-line no-await-in-loop
    const moduleSource = await loadModule(sourceId, path);
    for (const specifier of extractRuntimeSpecifiers(moduleSource)) {
      const resolved = resolvePackagePath(specifier, path);
      if (!resolved) continue;
      if (!packageFiles.has(resolved)) {
        throw new Error(`${sourceId}:${path} references missing package module ${resolved}`);
      }
      if (resolved.endsWith('.css')) styles.add(resolved);
      else if (/\.[cm]?js$/.test(resolved) && !visited.has(resolved)) queue.push(resolved);
    }
  }

  return sortUnique(styles);
}

function runtimeDeps(source) {
  return `react@${source.reactVersion},react-dom@${source.reactVersion}`;
}

function rootModule(source, exportName) {
  return {
    exportName,
    url: `https://esm.sh/${source.packageName}@${source.packageVersion}?bundle&exports=${exportName}&deps=${runtimeDeps(source)}`,
  };
}

function externalModule(source, external) {
  const versioned = external.specifier.replace(
    source.packageName,
    `${source.packageName}@${source.packageVersion}`,
  );
  return {
    exportName: external.exportName,
    url: `https://esm.sh/${versioned}?deps=${runtimeDeps(source)}`,
  };
}

async function buildSource(sourceId, source, loadModule) {
  const exports = {};
  for (const exportName of Object.keys(source.entries).sort((a, b) => a.localeCompare(b))) {
    // eslint-disable-next-line no-await-in-loop
    const styles = await collectStyles(sourceId, source.entries[exportName], source, loadModule);
    exports[exportName] = {
      modules: [rootModule(source, exportName)],
      styles,
    };
  }

  const externalModules = {};
  for (const tagName of Object.keys(source.externalModules).sort((a, b) => a.localeCompare(b))) {
    const external = source.externalModules[tagName];
    // eslint-disable-next-line no-await-in-loop
    const styles = await collectStyles(sourceId, external.entryPath, source, loadModule);
    externalModules[tagName] = {
      modules: [externalModule(source, external)],
      styles,
    };
  }

  for (const [exportName, requiredStyles] of Object.entries(source.canaries)) {
    const actual = exports[exportName]?.styles ?? [];
    for (const required of requiredStyles) {
      if (!actual.includes(required)) {
        throw new Error(`${sourceId}:${exportName} lost required stylesheet canary ${required}`);
      }
    }
  }

  return {
    packageName: source.packageName,
    packageVersion: source.packageVersion,
    reactVersion: source.reactVersion,
    imports: {
      react: `https://esm.sh/react@${source.reactVersion}`,
      reactDom: `https://esm.sh/react-dom@${source.reactVersion}/client`,
    },
    pageStyles: sortUnique(source.pageStyles),
    allStyles: sortUnique(source.packageFiles.filter((path) => path.endsWith('.css'))),
    exports,
    externalModules,
  };
}

export async function buildRuntimeManifest(sources, { loadModule }) {
  const builtSources = {};
  for (const sourceId of Object.keys(sources).sort((a, b) => a.localeCompare(b))) {
    // eslint-disable-next-line no-await-in-loop
    builtSources[sourceId] = await buildSource(sourceId, sources[sourceId], loadModule);
  }
  return { schemaVersion: 1, sources: builtSources };
}
