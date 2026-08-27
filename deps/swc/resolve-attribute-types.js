/**
 * Resolves SWC attribute types that are bare named aliases (e.g. "ButtonVariant") to
 * their real literal union, using the real TypeScript compiler over CDN-fetched
 * .d.ts files (see cdn-resolve.js / ts-cdn-host.js) — the same problem
 * deps/rsp/extract-props.js already solved for RSP, brought to the CEM-based SWC
 * pipeline, which has no compiler in the loop at all by default (it just copies out
 * whatever bare type name the custom-elements-manifest analyzer recorded).
 *
 * Motivating bug: the playground's SWC Button page was offering "premium"/"genai"
 * as `variant` options — values SWC's real `ButtonVariant` (imported from
 * @adobe/spectrum-wc-core) doesn't support at all — because with no way to resolve
 * SWC's own type, the playground borrowed RSP's (wider) inline union instead. See
 * .ai/docs/specs/2026-08-27-swc-type-resolution-design.md.
 *
 * Scope: this resolves ONE named property at a time. For an own attribute, it reads
 * the component's own declaring file (from the CEM's `mod.path`) directly. For an
 * inherited one, it does NOT walk the full class/mixin heritage chain — Lit's mixin
 * composition pattern (`class X extends X_base` where `X_base` is a `declare const`
 * variable of an intersection type, not a plain class/interface name) defeats the
 * TypeScript checker's own heritage resolution (confirmed: `type.getBaseTypes()`
 * returns an empty array for every SWC component class checked this way — own body
 * members resolve fine regardless of that). Instead it checks ONE level up first —
 * the component's own direct superclass (from the CEM's `componentDecl.superclass`,
 * e.g. Button -> ButtonBase), since a subclass commonly *narrows* an inherited mixin
 * property (Button's own `size: ButtonSize` narrows SizedMixin's generic
 * `size: ElementSize`) and the CEM attributes the property to the mixin either way —
 * and only falls back to the CEM-attributed mixin file (`inheritedFrom.module`,
 * rebased onto the core package) when the direct superclass doesn't declare that
 * member itself. A narrowing two or more hops up the chain (not just one) is a
 * known remaining imprecision, not a regression — the alternative before this
 * pipeline existed was no resolution at all (a bare, unusable alias name).
 */

import ts from 'typescript';
import { componentEntryPath, rebaseInheritedModule } from './cdn-resolve.js';
import { crawl, buildProgram } from './ts-cdn-host.js';

// A bare named-alias type this pipeline can try to resolve, optionally unioned with
// undefined (e.g. "ButtonStaticColor | undefined"). Already-resolvable shapes
// (primitives, inline unions, function types, generics) are left untouched — this
// pipeline only exists to turn an alias INTO one of those shapes.
const BARE_ALIAS_RE = /^[A-Za-z_$][A-Za-z0-9_$]*(\s*\|\s*undefined)?$/;
const NEVER_RESOLVE = new Set(['boolean', 'string', 'number', 'undefined', 'any', 'unknown']);

export function needsResolution(typeText) {
  if (!typeText) return false;
  const trimmed = typeText.trim();
  if (NEVER_RESOLVE.has(trimmed)) return false;
  return BARE_ALIAS_RE.test(trimmed);
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

// Finds `memberName` among the OWN (non-inherited) members of any top-level
// class/interface declaration in `sourceFile` — not a specific one by name, since a
// mixin file's actual member-holding construct varies (an interface for a plain
// mixin, a class for a component's own base class).
// checker.typeToString() prefers printing a type's OWN alias name (e.g.
// "ButtonVariant") when the type carries one — which a plain `type X = "a" | "b"`
// alias does (unlike the `(typeof CONST_ARRAY)[number]` indexed-access idiom real
// SWC source actually uses, which happens not to retain that alias tag through
// evaluation). Stringifying each union member individually sidesteps the alias
// entirely rather than depending on which shape the source happens to use.
function typeToDisplayString(checker, type) {
  const format = ts.TypeFormatFlags.NoTruncation;
  if (type.isUnion?.()) {
    return type.types.map((member) => checker.typeToString(member, undefined, format)).join(' | ');
  }
  return checker.typeToString(type, undefined, format);
}

function findMemberType(checker, sourceFile, memberName) {
  let found;
  ts.forEachChild(sourceFile, (node) => {
    if (found) return;
    if (!ts.isClassDeclaration(node) && !ts.isInterfaceDeclaration(node)) return;
    if (!node.name) return;
    const symbol = checker.getSymbolAtLocation(node.name);
    if (!symbol) return;
    const type = checker.getDeclaredTypeOfSymbol(symbol);
    const propSymbol = checker.getPropertiesOfType(type).find((p) => p.name === memberName);
    if (propSymbol) found = checker.getTypeOfSymbol(propSymbol);
  });
  return found;
}

// Searches every already-crawled source file for a class/interface declaration
// named `className` (e.g. "ButtonBase") and, if found, `memberName` among its OWN
// members — the component's direct superclass, wherever the shared crawl happened
// to fetch it (reached transitively via the component's own entry file's import
// graph, not resolved as a separate file lookup).
function findNamedDeclarationMember(checker, program, className, memberName) {
  // eslint-disable-next-line no-restricted-syntax
  for (const sourceFile of program.getSourceFiles()) {
    let found;
    ts.forEachChild(sourceFile, (node) => {
      if (found) return;
      if (!ts.isClassDeclaration(node) && !ts.isInterfaceDeclaration(node)) return;
      if (node.name?.text !== className) return;
      const symbol = checker.getSymbolAtLocation(node.name);
      if (!symbol) return;
      const type = checker.getDeclaredTypeOfSymbol(symbol);
      const propSymbol = checker.getPropertiesOfType(type).find((p) => p.name === memberName);
      if (propSymbol) found = checker.getTypeOfSymbol(propSymbol);
    });
    if (found) return found;
  }
  return undefined;
}

/**
 * Resolves every target in one shared crawl + one shared ts.Program — callers
 * should batch ALL targets across an entire extraction run into one call (not one
 * per component), since most declaring files (mixins, the shared `element` base,
 * lit itself) are reused across many components. `fileCache`/`resolutionCache` are
 * required and are mutated in place by crawl() — pass the same pair across an
 * entire run.
 *
 * @returns {Promise<Map<string, string>>} key -> resolved type string, containing
 *   only targets that resolved to a real (non-`any`) type. A target missing from
 *   the result failed to resolve; the caller should keep that attribute's original
 *   bare type text.
 */
export async function resolveTargets(targets, {
  fileCache, resolutionCache, onSkip, fetchImpl,
} = {}) {
  const resolved = new Map();
  if (!targets.length) return resolved;

  // ownEntryPath is always crawled too, even for a target whose primary
  // declaringPath is a mixin file — that's what pulls the component's direct
  // superclass file into the shared program for the superclassName check below,
  // via the component's own already-existing import graph (no separate resolution
  // step needed).
  const entryPaths = [...new Set(targets.flatMap((t) => [t.declaringPath, t.ownEntryPath].filter(Boolean)))];
  await crawl(entryPaths, { cache: fileCache, resolutionCache, ...(fetchImpl && { fetchImpl }) });
  const { program, checker } = buildProgram(fileCache, resolutionCache, entryPaths);

  // eslint-disable-next-line no-restricted-syntax
  for (const target of targets) {
    let type = target.superclassName
      ? findNamedDeclarationMember(checker, program, target.superclassName, target.memberName)
      : undefined;

    if (!type) {
      const sourceFile = program.getSourceFile(target.declaringPath);
      if (!sourceFile) {
        onSkip?.(`${target.key}: couldn't fetch ${target.declaringPath} — left unresolved.`);
        continue;
      }
      type = findMemberType(checker, sourceFile, target.memberName);
    }

    // eslint-disable-next-line no-bitwise
    if (!type || (type.flags & ts.TypeFlags.Any)) {
      onSkip?.(`${target.key}: no resolvable "${target.memberName}" member found in ${target.declaringPath} — left unresolved.`);
      continue;
    }
    resolved.set(target.key, typeToDisplayString(checker, type));
  }

  return resolved;
}
