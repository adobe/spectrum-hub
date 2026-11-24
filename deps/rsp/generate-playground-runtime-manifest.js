import fs from 'node:fs';
import { randomUUID } from 'node:crypto';
import { dirname, join, posix } from 'node:path';
import { fileURLToPath } from 'node:url';
// eslint-disable-next-line import/no-extraneous-dependencies -- Developer tooling only.
import { satisfies, valid, validRange } from 'semver';
import { buildRuntimeManifest } from './build-playground-runtime-manifest.js';
import { RSP_RUNTIME_SOURCE_CONFIG } from './playground-runtime-sources.js';

const directory = dirname(fileURLToPath(import.meta.url));
const COMPONENTS_PATH = join(directory, 'components.json');
const OUTPUT_PATH = join(directory, 'playground/runtime-manifest.json');
const VERSION_PATH = join(directory, 'version.json');

function requireExactVersion(version, name) {
  if (typeof version !== 'string' || valid(version) !== version) {
    throw new Error(`${name} has no valid exact version: ${JSON.stringify(version)}.`);
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

function readVersionPins(path) {
  const pins = JSON.parse(fs.readFileSync(path, 'utf8'));
  return Object.fromEntries(['s2', 'ai', 'react'].map((name) => [
    name, requireExactVersion(pins?.[name], `version.json "${name}"`),
  ]));
}

function requireMetadataVersion(metadata, pin, name) {
  const version = requireExactVersion(metadata.version, name);
  if (version !== pin) {
    throw new Error(`${name} metadata version ${version} does not match the requested pin ${pin}.`);
  }
}

function requireReactCompatibility(metadata, reactVersion, name) {
  const peers = ['react', ...('react-dom' in (metadata.peerDependencies ?? {}) ? ['react-dom'] : [])];
  for (const peer of peers) {
    const range = metadata.peerDependencies?.[peer];
    if (typeof range !== 'string' || !validRange(range)) {
      throw new Error(`${name} has no valid ${peer} peer range: ${JSON.stringify(range)}.`);
    }
    if (!satisfies(reactVersion, range)) {
      throw new Error(`${name}: ${peer} ${reactVersion} does not satisfy peer range "${range}".`);
    }
  }
}

function writeRuntimeArtifacts(artifacts) {
  const staged = [];
  const published = [];
  const recoveryFiles = new Set();
  try {
    for (const [path, body] of artifacts) {
      const temporary = `${path}.${randomUUID()}.tmp`;
      const backup = `${path}.${randomUUID()}.bak`;
      const entry = {
        path, temporary, backup, existed: true,
      };
      staged.push(entry);
      let previous;
      try {
        previous = fs.readFileSync(path);
      } catch (error) {
        if (error.code !== 'ENOENT') { throw error; }
        entry.existed = false;
      }
      if (entry.existed) { fs.writeFileSync(backup, previous, { flag: 'wx' }); }
      fs.writeFileSync(temporary, body, { flag: 'wx' });
    }
    for (const entry of staged) {
      fs.renameSync(entry.temporary, entry.path);
      published.push(entry);
    }
  } catch (error) {
    const errors = [error];
    for (const entry of published.reverse()) {
      try {
        if (entry.existed) {
          fs.renameSync(entry.backup, entry.path);
        } else {
          fs.rmSync(entry.path);
        }
      } catch (rollbackError) {
        recoveryFiles.add(entry.backup);
        errors.push(new Error(`Failed to restore ${entry.path}; backup: ${entry.backup}`, { cause: rollbackError }));
      }
    }
    if (errors.length > 1) { throw new AggregateError(errors, 'Runtime artifact publication and rollback failed.'); }
    throw error;
  } finally {
    for (const { temporary, backup } of staged) {
      fs.rmSync(temporary, { force: true });
      if (!recoveryFiles.has(backup)) { fs.rmSync(backup, { force: true }); }
    }
  }
}

export function writeManifestArtifact(path, manifest, { check = false } = {}) {
  const output = serializeManifest(manifest);
  if (check) {
    let committed;
    try {
      committed = fs.readFileSync(path, 'utf8');
    } catch (error) {
      if (error.code !== 'ENOENT') { throw error; }
      throw new Error('Runtime manifest is missing. Run node deps/rsp/generate-playground-runtime-manifest.js to regenerate it.');
    }
    if (committed !== output) {
      throw new Error('Runtime manifest is stale. Run node deps/rsp/generate-playground-runtime-manifest.js to regenerate it.');
    }
    return;
  }
  fs.writeFileSync(path, output);
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
  versionPath = VERSION_PATH,
} = {}) {
  if (locked && check) { throw new Error('Use either --locked or --check, not both.'); }
  const components = JSON.parse(fs.readFileSync(componentsPath, 'utf8'));
  const pins = locked || check ? readVersionPins(versionPath) : null;

  const sources = {};
  const aiConfig = RSP_RUNTIME_SOURCE_CONFIG.ai;
  const aiVersion = pins?.ai;
  const aiMetadata = await fetchJson(metadataUrl(aiConfig, aiVersion), fetchImpl);
  const resolvedAiVersion = requireExactVersion(aiMetadata.version, aiConfig.packageName);
  if (pins) { requireMetadataVersion(aiMetadata, pins.ai, aiConfig.packageName); }
  const supportVersion = requireExactVersion(aiMetadata.dependencies?.['@react-spectrum/s2'], 'AI S2 dependency');
  if (pins && pins.s2 !== supportVersion) {
    throw new Error(`Selected S2 pin ${pins.s2} does not match the AI dependency ${supportVersion}.`);
  }
  const reactRange = aiMetadata.peerDependencies?.react;
  if (typeof reactRange !== 'string' || !validRange(reactRange)) {
    throw new Error(`AI has no valid react peer range: ${JSON.stringify(reactRange)}.`);
  }
  const reactMetadata = await fetchJson(
    `https://esm.sh/react@${pins?.react ?? reactRange}/package.json`,
    fetchImpl,
  );
  const reactVersion = requireExactVersion(reactMetadata.version, 'React');
  if (pins) { requireMetadataVersion(reactMetadata, pins.react, 'React'); }
  const resolvedPins = { s2: supportVersion, ai: resolvedAiVersion, react: reactVersion };
  for (const [sourceId, config] of Object.entries(RSP_RUNTIME_SOURCE_CONFIG)) {
    const lockedVersion = resolvedPins[sourceId];
    // eslint-disable-next-line no-await-in-loop
    const packageMetadata = sourceId === 'ai'
      ? aiMetadata
      : await fetchJson(metadataUrl(config, lockedVersion), fetchImpl);
    requireMetadataVersion(packageMetadata, lockedVersion, config.packageName);
    requireReactCompatibility(packageMetadata, reactVersion, config.packageName);
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
  if (check) {
    writeManifestArtifact(outputPath, manifest, { check: true });
  } else {
    const artifacts = [[outputPath, serializeManifest(manifest)]];
    if (!locked) { artifacts.push([versionPath, serializeManifest(resolvedPins)]); }
    writeRuntimeArtifacts(artifacts);
  }
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
    // eslint-disable-next-line no-console -- Report CLI generation failures.
    console.error(error);
    process.exitCode = 1;
  });
}
