/**
 * Resolves a SWC attribute's declared type through the TypeScript compiler over
 * CDN-fetched .d.ts files, because the CEM records an unexpanded alias name.
 *
 * Rungs, most to least authoritative — the CEM misdescribes types in three known
 * ways, so a later rung is not reliably better:
 *   1. the component's own `static readonly VALID_<MEMBER>S`
 *   2. the direct superclass's declared member
 *   3. the CEM-attributed declaring file (a mixin, or the component's own)
 *
 * Lit's `class X extends X_base` intersection defeats `type.getBaseTypes()`, so no
 * general heritage walking happens here — the CEM's `inheritedFrom` already
 * flattened it.
 *
 * Design history: .ai/docs/specs/2026-08-27-swc-type-resolution-design.md
 */

import ts from 'typescript';
import { componentEntryPath, rebaseInheritedModule } from './locate-published-files.js';
import { crawl, buildProgram } from './ts-cdn-host.js';

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

// Members are stringified individually: typeToString() prefers a type's own alias
// name over expanding it.
function typeToDisplayString(checker, type) {
  const format = ts.TypeFormatFlags.NoTruncation;
  if (type.isUnion?.()) {
    return type.types.map((member) => checker.typeToString(member, undefined, format)).join(' | ');
  }
  return checker.typeToString(type, undefined, format);
}

// eslint-disable-next-line no-bitwise
const isNullish = (t) => Boolean(t.flags & (ts.TypeFlags.Undefined | ts.TypeFlags.Null | ts.TypeFlags.Void));

/**
 * A union's selectable values as real JSON. Empty unless every non-nullish member is
 * a literal — one mixing literals with an open type has no fixed option set. Nullish
 * is dropped, never offered; "none" is a control-layer sentinel.
 *
 * Order is the checker's (unions interned by type ID), not source order.
 */
function typeToValues(type) {
  if (!type.isUnion?.()) return [];
  const members = type.types.filter((member) => !isNullish(member));
  if (!members.length || !members.every((member) => member.isLiteral?.())) return [];
  return members.map((member) => member.value);
}

// `fixed?: FixedValues` can be absent, so its control needs a "none" option; a
// required attribute must not get one. Read from the symbol, not the type:
// strictNullChecks is off, so `?` never widens the type to include undefined.
function memberIsOptional(symbol) {
  // eslint-disable-next-line no-bitwise
  return Boolean(symbol?.flags & ts.SymbolFlags.Optional);
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
    if (propSymbol) found = { type: checker.getTypeOfSymbol(propSymbol), optional: memberIsOptional(propSymbol) };
  });
  return found;
}

// A component customising its size range via `SizedMixin(base, { validSizes })` gets
// no narrowed `size` declaration — only `static readonly VALID_SIZES`. Matched
// syntactically in the component's own class body: SizedMixin also declares
// VALID_SIZES as the generic `readonly ElementSize[]`, and inheriting it is worse.
function findOwnStaticValidValues(checker, sourceFile, memberName) {
  const staticName = `VALID_${memberName.toUpperCase()}S`;
  let found;
  ts.forEachChild(sourceFile, (node) => {
    if (found || !ts.isClassDeclaration(node)) return;
    // eslint-disable-next-line no-restricted-syntax
    for (const member of node.members) {
      if (!ts.isPropertyDeclaration(member)) continue;
      if (!member.name || !ts.isIdentifier(member.name) || member.name.text !== staticName) continue;
      if (!member.modifiers?.some((m) => m.kind === ts.SyntaxKind.StaticKeyword)) continue;
      // `readonly T[]` -> T. getNumberIndexType() covers readonly arrays and tuples.
      const elementType = checker.getTypeAtLocation(member).getNumberIndexType();
      if (elementType) { found = { type: elementType, optional: false }; return; }
    }
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
      if (propSymbol) found = { type: checker.getTypeOfSymbol(propSymbol), optional: memberIsOptional(propSymbol) };
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
 * @returns {Promise<Map<string, {type: string, values: (string|number)[], optional: boolean}>>}
 *   key -> the resolved type's display string, its selectable values (empty when the
 *   type is not a literal union), and whether the attribute may be absent. Contains only targets that resolved to a real
 *   (non-`any`) type; a target missing from the result failed to resolve, and the
 *   caller should keep that attribute's original bare type text.
 */
export async function resolveTargets(targets, {
  fileCache, resolutionCache, onSkip, fetchImpl,
} = {}) {
  const resolved = new Map();
  if (!targets.length) return resolved;

  // ownEntryPath is crawled even for a mixin-declared target: it is what pulls the
  // direct superclass's file into the shared program, via its own import graph.
  const entryPaths = [...new Set(targets.flatMap((t) => [t.declaringPath, t.ownEntryPath].filter(Boolean)))];
  await crawl(entryPaths, { cache: fileCache, resolutionCache, ...(fetchImpl && { fetchImpl }) });
  const { program, checker } = buildProgram(fileCache, resolutionCache, entryPaths);

  // Rungs, most to least authoritative — see this file's header.
  // eslint-disable-next-line no-restricted-syntax
  for (const target of targets) {
    const ownSourceFile = target.ownEntryPath ? program.getSourceFile(target.ownEntryPath) : undefined;
    let found = ownSourceFile
      ? findOwnStaticValidValues(checker, ownSourceFile, target.memberName)
      : undefined;

    if (!found && target.superclassName) {
      found = findNamedDeclarationMember(checker, program, target.superclassName, target.memberName);
    }

    if (!found) {
      const sourceFile = program.getSourceFile(target.declaringPath);
      if (!sourceFile) {
        onSkip?.(`${target.key}: couldn't fetch ${target.declaringPath} — left unresolved.`);
        continue;
      }
      found = findMemberType(checker, sourceFile, target.memberName);
    }

    const type = found?.type;
    // eslint-disable-next-line no-bitwise
    if (!type || (type.flags & ts.TypeFlags.Any)) {
      onSkip?.(`${target.key}: no resolvable "${target.memberName}" member found in ${target.declaringPath} — left unresolved.`);
      continue;
    }
    resolved.set(target.key, {
      type: typeToDisplayString(checker, type),
      values: typeToValues(type),
      optional: found.optional,
    });
  }

  return resolved;
}
