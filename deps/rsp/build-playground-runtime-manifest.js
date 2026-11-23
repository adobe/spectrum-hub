import { posix } from 'node:path';

const RUNTIME_SPECIFIER_RE = /(?:import|export)(?:\s+[^'";]*?\bfrom\s*)?\(?\s*['"]([^'"]+)['"]\s*\)?/g;

export function extractRuntimeSpecifiers(source) {
  return [...source.matchAll(RUNTIME_SPECIFIER_RE)].map((match) => match[1]);
}

function sortUnique(values) {
  return [...new Set(values)].sort((a, b) => a.localeCompare(b));
}

function resolvePackagePath(specifier, fromPath) {
  if (!specifier.startsWith('.')) { return null; }
  return `/${posix.normalize(posix.join(posix.dirname(fromPath), specifier)).replace(/^\/+/, '')}`;
}

async function collectStyles(sourceId, entryPath, source, loadModule) {
  const packageFiles = new Set(source.packageFiles);
  const visited = new Set();
  const styles = new Set(source.pageStyles);
  const supportExports = new Set();
  const supportSpecifiers = new Set();
  const queue = [entryPath];

  while (queue.length) {
    const path = queue.shift();
    if (!visited.has(path)) {
      visited.add(path);

      // eslint-disable-next-line no-await-in-loop
      const moduleSource = await loadModule(sourceId, path);
      for (const specifier of extractRuntimeSpecifiers(moduleSource)) {
        if (specifier === '@react-spectrum/s2' || specifier.startsWith('@react-spectrum/s2/')) {
          supportSpecifiers.add(specifier);
        }
      }
      for (const match of moduleSource.matchAll(/import\s*\{([^}]+)\}\s*from\s*['"]@react-spectrum\/s2(?:\/[^'"]+)?['"]/g)) {
        match[1].split(',').map((name) => name.trim().split(/\s+as\s+/)[0])
          .forEach((name) => supportExports.add(name));
      }
      for (const specifier of extractRuntimeSpecifiers(moduleSource)) {
        const resolved = resolvePackagePath(specifier, path);
        if (resolved) {
          if (!packageFiles.has(resolved)) {
            throw new Error(`${sourceId}:${path} references missing package module ${resolved}`);
          }
          if (resolved.endsWith('.css')) {
            styles.add(resolved);
          } else if (/\.[cm]?js$/.test(resolved) && !visited.has(resolved)) {
            queue.push(resolved);
          }
        }
      }
    }
  }

  return {
    styles: sortUnique(styles),
    supportExports: sortUnique(supportExports),
    supportSpecifiers: sortUnique(supportSpecifiers),
  };
}

function runtimeDeps(source) {
  const support = source.dependencies?.['@react-spectrum/s2'];
  const supportDep = support ? `,@react-spectrum/s2@${support}` : '';
  return `react@${source.reactVersion},react-dom@${source.reactVersion}${supportDep}`;
}

function rootModule(source, exportName) {
  const specifier = source.modulePaths?.[exportName] ?? '';
  return {
    exportName,
    ...(specifier ? { specifier } : {}),
    url: `https://esm.sh/${source.packageName}@${source.packageVersion}${specifier}?bundle&exports=${exportName}&deps=${runtimeDeps(source)}`,
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
  const support = source.supportEntry
    ? await collectStyles(sourceId, source.supportEntry, source, loadModule)
    : null;
  const exports = {};
  for (const exportName of Object.keys(source.entries).sort((a, b) => a.localeCompare(b))) {
    // eslint-disable-next-line no-await-in-loop
    const { styles, supportExports, supportSpecifiers } = await collectStyles(
      sourceId,
      source.entries[exportName],
      source,
      loadModule,
    );
    exports[exportName] = {
      modules: [rootModule(source, exportName)],
      styles,
      ...(supportExports.length ? { supportExports } : {}),
      ...(supportSpecifiers.length ? { supportSpecifiers } : {}),
    };
  }

  const externalModules = {};
  for (const tagName of Object.keys(source.externalModules).sort((a, b) => a.localeCompare(b))) {
    const external = source.externalModules[tagName];
    // eslint-disable-next-line no-await-in-loop
    const { styles } = await collectStyles(sourceId, external.entryPath, source, loadModule);
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
    ...(source.dependencies ? { dependencies: source.dependencies } : {}),
    ...(support ? {
      supportExports: support.supportExports,
      supportSpecifiers: support.supportSpecifiers,
    } : {}),
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
