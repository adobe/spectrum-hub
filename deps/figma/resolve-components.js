import { FIGMA_SOURCES } from '../../scripts/utils/figma-sources.js';

/**
 * Selects one design per platform/canonical component. Aliases never erase source identity.
 * The canonicalizer is injected to keep this module independent of the index builder.
 */
export function resolveFigmaComponents(rows, {
  aliases = {}, overrides = {}, excludes = [], canonicalize,
}) {
  const excluded = new Set(excludes);
  const identities = new Set();
  const entries = rows.map((row) => {
    const legacy = row.source === undefined && row.platform === undefined
      && row.figmaFile === undefined;
    const source = FIGMA_SOURCES.find((entry) => entry.id === (legacy ? 's2-web' : row.source));
    if (!source || (!legacy && (row.platform !== source.platform
      || row.figmaFile !== source.fileKey))
      || typeof row.name !== 'string' || !row.name.trim()
      || typeof row.figmaPageId !== 'string' || !/^\d+:\d+$/.test(row.figmaPageId)) {
      throw new Error(`Invalid Figma source/file/platform/node identity for "${row.name}"`);
    }
    const identity = `${source.id}:${row.figmaPageId}`;
    if (identities.has(identity)) {
      throw new Error(`Duplicate Figma identity ${identity}`);
    }
    identities.add(identity);
    const sourceAliases = aliases.figmaSources?.[source.id] ?? {};
    const applicableAliases = source.id === 's2-web'
      ? { ...aliases.figma, ...sourceAliases } : sourceAliases;
    return {
      ...row,
      source: source.id,
      platform: source.platform,
      figmaFile: source.fileKey,
      canonical: canonicalize(row.name, applicableAliases),
    };
  });
  const targets = new Map();
  const addTarget = (name, platform) => {
    if (platform !== 'web' || !excluded.has(name)) {
      targets.set(`${platform}:${name}`, { name, platform });
    }
  };
  for (const entry of entries) { addTarget(entry.canonical, entry.platform); }
  for (const [name, platforms] of Object.entries(overrides)) {
    for (const [platform, cells] of Object.entries(platforms)) {
      const cell = cells.figma;
      if (cell?.figmaPageSource || cell?.figmaSource || cell?.figmaNodeId) {
        addTarget(name, platform);
      }
    }
  }
  return [...targets.values()].map(({ name, platform }) => {
    const selection = overrides[name]?.[platform]?.figma ?? {};
    let candidates = entries.filter((entry) => entry.platform === platform
      && (selection.figmaPageSource
        ? entry.name === selection.figmaPageSource : entry.canonical === name));
    if (selection.figmaSource) {
      candidates = candidates.filter((entry) => entry.source === selection.figmaSource);
    }
    if (selection.figmaNodeId) {
      candidates = candidates.filter((entry) => entry.figmaPageId === selection.figmaNodeId);
    }
    if (!candidates.length) {
      throw new Error(`Unmatched Figma selection for ${platform}/${name}; check source, name, and node selectors.`);
    }
    if (candidates.length > 1) {
      const choices = candidates.map((entry) => `${entry.source}/${entry.name}/${entry.figmaPageId}`);
      throw new Error(`Ambiguous Figma selection for ${platform}/${name}: ${choices.join(', ')}. Add an explicit override.`);
    }
    return { name, platform, design: candidates[0] };
  });
}
