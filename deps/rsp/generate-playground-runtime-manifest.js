import {
  readFileSync, writeFileSync,
} from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildRuntimeManifest } from './build-playground-runtime-manifest.js';
import { RSP_RUNTIME_SOURCE_CONFIG } from './playground-runtime-sources.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const COMPONENTS_PATH = join(__dirname, 'components.json');
const OUTPUT_PATH = join(__dirname, 'playground/runtime-manifest.json');

function exactReactVersion(range) {
  const version = range?.match(/\d+(?:\.\d+){0,2}(?:-[0-9A-Za-z.-]+)?/)?.[0];
  if (!version) throw new Error(`Unable to resolve a React version from "${range ?? ''}"`);
  return version;
}

function entryPath(component, config, packageFiles, publicRootSource) {
  const direct = `/dist/exports/${component}.mjs`;
  if (packageFiles.includes(direct)) return direct;
  const shared = `/dist/exports/${config.file ?? component}.mjs`;
  if (packageFiles.includes(shared)) return shared;
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
  if (!packageMetadata?.version) throw new Error('RSP package metadata has no version.');
  const files = [...new Set(packageFiles)].sort((a, b) => a.localeCompare(b));
  const entries = Object.fromEntries(Object.entries(components)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([component, config]) => [
      component,
      entryPath(component, config, files, publicRootSource),
    ])
    .filter(([, path]) => path));
  for (const [tagName, external] of Object.entries(sourceConfig.externalModules)) {
    if (!files.includes(external.entryPath)) {
      throw new Error(`${tagName} has no runtime entry in the concrete package listing.`);
    }
  }
  return {
    packageName: sourceConfig.packageName,
    packageVersion: packageMetadata.version,
    reactVersion: exactReactVersion(packageMetadata.peerDependencies?.react),
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
  const version = manifest?.sources?.[sourceId]?.packageVersion;
  if (!/^\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?$/.test(version ?? '')) {
    throw new Error(`Runtime source "${sourceId}" has no valid package version.`);
  }
  return version;
}

export function writeManifestArtifact(path, manifest, { check = false } = {}) {
  const output = serializeManifest(manifest);
  if (check) {
    let committed;
    try {
      committed = readFileSync(path, 'utf8');
    } catch {
      throw new Error(`Runtime manifest is missing. Run node deps/rsp/generate-playground-runtime-manifest.js to regenerate it.`);
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
  if (!response.ok) throw new Error(`HTTP ${response.status} for ${url}`);
  return response.json();
}

async function fetchTextWithFallback(urls, fetchImpl) {
  let lastError;
  for (const url of urls) {
    try {
      // eslint-disable-next-line no-await-in-loop
      const response = await fetchImpl(url);
      if (response.ok) return response.text();
      lastError = new Error(`HTTP ${response.status} for ${url}`);
    } catch (error) {
      lastError = error;
    }
  }
  throw lastError ?? new Error(`Failed to fetch ${urls[0]}`);
}

function metadataUrl(config, lockedVersion) {
  if (!lockedVersion) return config.metadataUrl;
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
  for (const [sourceId, config] of Object.entries(RSP_RUNTIME_SOURCE_CONFIG)) {
    const lockedVersion = committed ? runtimeSourceVersion(committed, sourceId) : null;
    // eslint-disable-next-line no-await-in-loop
    const packageMetadata = await fetchJson(metadataUrl(config, lockedVersion), fetchImpl);
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
  if (locked && check) throw new Error('Use either --locked or --check, not both.');
  await generateRuntimeManifest({ locked, check });
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
  });
}
