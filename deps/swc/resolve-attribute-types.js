/**
 * Decides which SWC attributes need their declared type resolved, and where to look
 * for each one — the CEM records an unexpanded alias name (e.g. "ButtonVariant")
 * rather than the literal union behind it.
 *
 * Planning only: pure, no network or filesystem. Reading the types themselves lands
 * in the next commit, which adds resolveTargets() alongside this.
 *
 * Design history: .ai/docs/specs/2026-08-27-swc-type-resolution-design.md
 */

import { componentEntryPath, rebaseInheritedModule } from './cdn-resolve.js';

// A bare alias this pipeline can expand, optionally unioned with undefined.
const BARE_ALIAS_RE = /^[A-Za-z_$][A-Za-z0-9_$]*(\s*\|\s*undefined)?$/;
// "string" is absent deliberately: a JSDoc `@property {string}` overrides the real
// declaration in the CEM, masking a literal union. boolean/number cannot mask one.
const NEVER_RESOLVE = new Set(['boolean', 'number', 'undefined', 'any', 'unknown']);

// Resolved despite needing no expansion: `values` must come from the checker, not
// from re-parsing the type string.
const LITERAL_UNION_RE = /^(['"][^'"]*['"]|-?\d+)(\s*\|\s*(['"][^'"]*['"]|-?\d+|undefined|null))*$/;

export function needsResolution(typeText) {
  if (!typeText) return false;
  const trimmed = typeText.trim();
  if (NEVER_RESOLVE.has(trimmed)) return false;
  return BARE_ALIAS_RE.test(trimmed) || LITERAL_UNION_RE.test(trimmed);
}

/**
 * Pure — no network/filesystem. Figures out, for each of a component's raw CEM
 * attributes, whether its type needs resolving and which file(s) to look in.
 * `rawAttrs` are CEM's own attribute objects (component.attributes), not the
 * already-formatted rows collectComponentData() returns — this needs
 * `inheritedFrom.module`, which the formatted rows don't carry. `superclassName`
 * (the CEM's `componentDecl.superclass?.name`, e.g. "ButtonBase") lets an inherited
 * attribute check the component's own direct base class for a narrower override
 * before falling back to the mixin file — see this file's doc comment.
 *
 * @returns {{ key: string, memberName: string, declaringPath: string,
 *   superclassName?: string, ownEntryPath: string }[]} one target per resolvable
 *   attribute; `key` is what the attribute should be looked up by in
 *   resolveTargets()'s returned Map. `ownEntryPath` is carried on every target (even
 *   an inherited one) so resolveTargets() always crawls it — that's what pulls the
 *   direct superclass's file into the shared program for free, via the component's
 *   own existing import graph.
 */
export function collectResolutionTargets(rawAttrs, {
  modPath, wcVersion, corePkgName, coreVersion, superclassName, keyPrefix = '', onSkip,
} = {}) {
  const ownEntryPath = componentEntryPath(modPath, wcVersion);
  const targets = [];

  // eslint-disable-next-line no-restricted-syntax
  for (const attr of rawAttrs) {
    const typeText = attr.type?.text;
    if (!needsResolution(typeText)) continue;

    const inheritedModule = typeof attr.inheritedFrom === 'object' ? attr.inheritedFrom?.module : undefined;
    if (!inheritedModule) {
      targets.push({
        key: `${keyPrefix}${attr.name}`, memberName: attr.fieldName, declaringPath: ownEntryPath, ownEntryPath,
      });
      continue;
    }

    const mixinPath = rebaseInheritedModule(inheritedModule, corePkgName, coreVersion);
    if (!mixinPath) {
      onSkip?.(`"${attr.name}": inheritedFrom.module "${inheritedModule}" doesn't match the known rebase shape — left unresolved.`);
      continue;
    }

    targets.push({
      key: `${keyPrefix}${attr.name}`, memberName: attr.fieldName, declaringPath: mixinPath, superclassName, ownEntryPath,
    });
  }

  return targets;
}
