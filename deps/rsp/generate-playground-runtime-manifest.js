import {
  readFileSync, writeFileSync,
} from 'node:fs';
import { dirname, join, posix } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildRuntimeManifest } from './build-playground-runtime-manifest.js';
import { RSP_RUNTIME_SOURCE_CONFIG } from './playground-runtime-sources.js';

const directory = dirname(fileURLToPath(import.meta.url));
const COMPONENTS_PATH = join(directory, 'components.json');
const OUTPUT_PATH = join(directory, 'playground/runtime-manifest.json');

function requireExactVersion(version, name) {
  if (!/^\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?$/.test(version ?? '')) {
    throw new Error(`${name} has no valid exact version.`);
  }
  return version;
}

function exactReactVersion(range) {
  const version = range?.match(/\d+(?:\.\d+){0,2}(?:-[0-9A-Za-z.-]+)?/)?.[0];
  if (!version) { throw new Error(`Unable to resolve a React version from "${range ?? ''}"`); }
  return version;
}

function entryPath(component, config, packageFiles, publicRootSource) {
  if (component === 'PixelLoader' && config.package === 'ai'
    && packageFiles.includes('/dist/exports/loader.mjs')) {
    return '/dist/exports/loader.mjs';
  }
  const direct = `/dist/exports/${component}.mjs`;
  if (packageFiles.includes(direct)) { return direct; }
  const shared = `/dist/exports/${config.file ?? component}.mjs`;
  if (packageFiles.includes(shared)) { return shared; }
  const privatePath = `/dist/private/${config.file ?? component}.mjs`;
  if (packageFiles.includes(privatePath)
    && new RegExp(`\\bas\\s+${component}\\b`).test(publicRootSource)) {
    return privatePath;
  }
  return null;
}

export function createRspRuntimeSource({
  packageMetadata,
  packageFiles,
  components,
  publicRootSource = '',
  sourceConfig = RSP_RUNTIME_SOURCE_CONFIG.s2,
}) {
  const packageVersion = requireExactVersion(packageMetadata?.version, 'RSP package');
  const files = [...new Set(packageFiles)].sort((a, b) => a.localeCompare(b));
  const entries = Object.fromEntries(Object.entries(components)
    .filter(([, config]) => (config.package ?? 's2')
      === (sourceConfig.packageName === '@react-spectrum/ai' ? 'ai' : 's2'))
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([component, config]) => [
      component,
      entryPath(component, config, files, publicRootSource),
    ])
    .filter(([, path]) => path));
  if (sourceConfig.packageName === '@react-spectrum/s2') {
    const origins = new Map();
    for (const match of publicRootSource.matchAll(/import\s*\{([^}]+)\}\s*from\s*["']([^"']+)["']/g)) {
      const path = posix.join('/dist/exports', match[2]);
      match[1].split(',').forEach((name) => {
        const alias = name.trim().split(/\s+as\s+/).at(-1);
        origins.set(alias, path);
      });
    }
    for (const match of publicRootSource.matchAll(/([\w$]+)\s+as\s+(\w+)/g)) {
      const path = origins.get(match[1]);
      if (path && files.includes(path)) { entries[match[2]] = path; }
    }
    for (const name of ['Provider', 'Text']) {
      const path = entryPath(name, {}, files, publicRootSource);
      if (path) { entries[name] = path; }
    }
  }
  for (const [tagName, external] of Object.entries(sourceConfig.externalModules)) {
    if (!files.includes(external.entryPath)) {
      throw new Error(`${tagName} has no runtime entry in the concrete package listing.`);
    }
  }
  return {
    packageName: sourceConfig.packageName,
    packageVersion,
    reactVersion: exactReactVersion(packageMetadata.peerDependencies?.react),
    ...(packageMetadata.dependencies?.['@react-spectrum/s2'] ? {
      dependencies: { '@react-spectrum/s2': packageMetadata.dependencies['@react-spectrum/s2'] },
    } : {}),
    modulePaths: sourceConfig.packageName === '@react-spectrum/ai' ? { PixelLoader: '/loader' } : {},
    supportEntry: sourceConfig.packageName === '@react-spectrum/ai'
      ? '/dist/exports/index.mjs' : null,
    entries,
    externalModules: sourceConfig.externalModules,
    pageStyles: sourceConfig.pageStyles,
    packageFiles: files,
    canaries: sourceConfig.canaries,
  };
}

function serializeManifest(manifest) {
  return `${JSON.stringify(manifest, null, 2)}\n`;
}

export function runtimeSourceVersion(manifest, sourceId) {
  return requireExactVersion(manifest?.sources?.[sourceId]?.packageVersion, `Runtime source "${sourceId}"`);
}

export function writeManifestArtifact(path, manifest, { check = false } = {}) {
  const output = serializeManifest(manifest);
  if (check) {
    let committed;
    try {
      committed = readFileSync(path, 'utf8');
    } catch (error) {
      if (error.code !== 'ENOENT') { throw error; }
      throw new Error('Runtime manifest is missing. Run node deps/rsp/generate-playground-runtime-manifest.js to regenerate it.');
    }
    if (committed !== output) {
      throw new Error('Runtime manifest is stale. Run node deps/rsp/generate-playground-runtime-manifest.js to regenerate it.');
    }
    return;
  }
  writeFileSync(path, output);
}

async function fetchJson(url, fetchImpl) {
  const response = await fetchImpl(url);
  if (!response.ok) { throw new Error(`HTTP ${response.status} for ${url}`); }
  return response.json();
}

async function fetchTextWithFallback(urls, fetchImpl) {
  let lastError;
  for (const url of urls) {
    try {
      // eslint-disable-next-line no-await-in-loop
      const response = await fetchImpl(url);
      if (response.ok) { return response.text(); }
      lastError = new Error(`HTTP ${response.status} for ${url}`);
    } catch (error) {
      lastError = error;
    }
  }
  throw lastError ?? new Error(`Failed to fetch ${urls[0]}`);
}

function metadataUrl(config, lockedVersion) {
  if (!lockedVersion) { return config.metadataUrl; }
  return `https://esm.sh/${config.packageName}@${lockedVersion}/package.json`;
}

export async function generateRuntimeManifest({
  locked = false,
  check = false,
  fetchImpl = fetch,
  componentsPath = COMPONENTS_PATH,
  outputPath = OUTPUT_PATH,
} = {}) {
  const components = JSON.parse(readFileSync(componentsPath, 'utf8'));
  let committed = null;
  if (locked || check) {
    committed = JSON.parse(readFileSync(outputPath, 'utf8'));
  }

  const sources = {};
  const aiConfig = RSP_RUNTIME_SOURCE_CONFIG.ai;
  const aiVersion = committed ? runtimeSourceVersion(committed, 'ai') : null;
  const aiMetadata = await fetchJson(metadataUrl(aiConfig, aiVersion), fetchImpl);
  const supportVersion = requireExactVersion(aiMetadata.dependencies?.['@react-spectrum/s2'], 'AI S2 dependency');
  if (committed && runtimeSourceVersion(committed, 's2') !== supportVersion) {
    throw new Error('Runtime manifest S2 version does not match the AI dependency.');
  }
  const resolvedReactVersion = committed?.sources.ai.reactVersion ?? (await fetchJson(
    `https://esm.sh/react@${aiMetadata.peerDependencies?.react ?? '19'}/package.json`,
    fetchImpl,
  )).version;
  const reactVersion = requireExactVersion(resolvedReactVersion, 'React');
  for (const [sourceId, config] of Object.entries(RSP_RUNTIME_SOURCE_CONFIG)) {
    const lockedVersion = sourceId === 's2' ? supportVersion : aiVersion;
    // eslint-disable-next-line no-await-in-loop
    const packageMetadata = sourceId === 'ai'
      ? aiMetadata
      : await fetchJson(metadataUrl(config, lockedVersion), fetchImpl);
    if (lockedVersion && packageMetadata.version !== lockedVersion) {
      throw new Error(`${config.packageName} version does not match the requested pin.`);
    }
    const listingUrl = config.listingUrl.replace('{version}', packageMetadata.version);
    // eslint-disable-next-line no-await-in-loop
    const listing = await fetchJson(listingUrl, fetchImpl);
    const packageKey = `${config.packageName}@${packageMetadata.version}`;
    // eslint-disable-next-line no-await-in-loop
    const publicRootSource = await fetchTextWithFallback([
      `https://unpkg.com/${packageKey}/dist/exports/index.mjs`,
      `https://cdn.jsdelivr.net/npm/${packageKey}/dist/exports/index.mjs`,
    ], fetchImpl);
    sources[sourceId] = createRspRuntimeSource({
      packageMetadata,
      packageFiles: listing.files?.map((file) => file.name) ?? [],
      components,
      publicRootSource,
      sourceConfig: config,
    });
    sources[sourceId].reactVersion = reactVersion;
  }

  const moduleCache = new Map();
  const manifest = await buildRuntimeManifest(sources, {
    loadModule: async (sourceId, path) => {
      const source = sources[sourceId];
      const key = `${source.packageName}@${source.packageVersion}${path}`;
      if (!moduleCache.has(key)) {
        moduleCache.set(key, fetchTextWithFallback([
          `https://unpkg.com/${key}`,
          `https://cdn.jsdelivr.net/npm/${key}`,
        ], fetchImpl));
      }
      return moduleCache.get(key);
    },
  });
  writeManifestArtifact(outputPath, manifest, { check });
  return manifest;
}

export async function main(argv = process.argv.slice(2)) {
  const locked = argv.includes('--locked');
  const check = argv.includes('--check');
  if (locked && check) { throw new Error('Use either --locked or --check, not both.'); }
  await generateRuntimeManifest({ locked, check });
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
  });
}
