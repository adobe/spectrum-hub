/**
 * The contract every extractor writes into deps/<impl>/data/*.json, so no consumer
 * ever re-parses a type string.
 *
 *   type    display only — what blocks/table/table.js renders. Nothing may branch on it.
 *   kind    enum | boolean | text | number | unknown — what control the row can back.
 *   values  the selectable options as real JSON; non-empty if and only if kind is enum.
 *
 * Shared by RSP and SWC because both read the same TypeScript checker; only how they
 * find a declaration differs. Optionality is deliberately NOT here: it is `required`
 * for RSP (3% of props — TS props are optional by default) and `optional` for SWC
 * (13% of attributes — SWC declares them required by default), so each side records
 * the signal that is actually informative for it.
 */
import ts from 'typescript';

// eslint-disable-next-line no-bitwise
const isNullish = (t) => Boolean(t.flags & (ts.TypeFlags.Undefined | ts.TypeFlags.Null | ts.TypeFlags.Void));

/**
 * The rendered type. Union members are stringified individually because
 * typeToString() prefers a type's own alias name over expanding it, and
 * NoTruncation is required — the default silently renders a long union as
 * `"a" | "b" | ... 12 more ...`, which reads as valid and is not.
 */
export function typeToDisplayString(checker, type) {
  const format = ts.TypeFormatFlags.NoTruncation;
  // TypeScript's `boolean` is itself the union `false | true`. Expanding it member-wise
  // would render that in place of the primitive, and propKind would recognise no kind.
  // eslint-disable-next-line no-bitwise
  if (type.flags & ts.TypeFlags.Boolean) return 'boolean';
  if (type.isUnion?.()) {
    return type.types.map((member) => checker.typeToString(member, undefined, format)).join(' | ');
  }
  return checker.typeToString(type, undefined, format);
}

/**
 * The literal values of `types` in the order given, or null if any member is not a
 * literal — a partial order would sort some values and strand the rest.
 * Nullish members are skipped, matching typeToValues.
 */
function literalOrder(types) {
  if (!types?.length) return null;
  const members = types.filter((member) => !isNullish(member));
  if (!members.length || !members.every((member) => member.isLiteral?.())) return null;
  return members.map((member) => member.value);
}

/**
 * The type-alias declaration a type reference names, following an import alias to the
 * real declaration — SWC keeps its const tuples in a separate *.types.d.ts, so the
 * symbol at the annotation is usually an ImportSpecifier rather than the alias itself.
 */
function aliasDeclarationFor(checker, typeName) {
  let symbol = checker.getSymbolAtLocation(typeName);
  // eslint-disable-next-line no-bitwise
  if (symbol && symbol.flags & ts.SymbolFlags.Alias) symbol = checker.getAliasedSymbol(symbol);
  return symbol?.declarations?.find(ts.isTypeAliasDeclaration);
}

/**
 * Declaration order for a union, read from the type NODE rather than the resolved type.
 * The resolved type cannot supply it: the checker interns a union by type ID — first
 * encounter anywhere in the program — so a component that narrows or widens a shared
 * union inherits that union's order with its own extra members appended (ActionMenu's
 * size read "S, M, L, XL, XS"), and neither idiom below retains an aliasSymbol.
 *
 * Handles the shapes both catalogs actually use:
 *
 *   RSP   `size?: 'XS' | 'S' | 'M' | 'L' | 'XL'`          the union node is the order
 *   SWC   `size?: ElementSize`                            follow the reference...
 *         `type ElementSize = (typeof ELEMENT_SIZES)[number]`   ...to the const tuple
 *   SWC   `static readonly VALID_SIZES: readonly Size[]`   unwrap to the element type
 *
 * Returns null for anything else, so the caller keeps the checker's order.
 */
export function declaredValueOrder(checker, symbolOrNode) {
  const node = symbolOrNode?.getDeclarations?.()?.[0]?.type ?? symbolOrNode?.type;
  return orderFromTypeNode(checker, node);
}

function orderFromTypeNode(checker, node, depth = 0) {
  // Bounded because each unwrap can re-enter: `readonly T[]` -> T -> alias -> ...
  if (!node || depth > 4) return null;

  if (ts.isParenthesizedTypeNode(node)) return orderFromTypeNode(checker, node.type, depth + 1);
  // `readonly T[]` is a TypeOperator wrapping an ArrayType; both unwrap to T.
  if (ts.isTypeOperatorNode(node)) return orderFromTypeNode(checker, node.type, depth + 1);
  if (ts.isArrayTypeNode(node)) return orderFromTypeNode(checker, node.elementType, depth + 1);

  if (ts.isUnionTypeNode(node)) {
    return literalOrder(node.types.map((member) => checker.getTypeAtLocation(member)));
  }
  if (ts.isTupleTypeNode(node)) {
    return literalOrder(checker.getTypeArguments(checker.getTypeAtLocation(node)));
  }
  if (ts.isIndexedAccessTypeNode(node)) {
    // `(typeof CONST)[number]` — the order is the tuple `typeof CONST` resolves to.
    return literalOrder(checker.getTypeArguments(checker.getTypeAtLocation(node.objectType)))
      ?? orderFromTypeNode(checker, node.objectType, depth + 1);
  }
  if (!ts.isTypeReferenceNode(node)) return null;

  const alias = aliasDeclarationFor(checker, node.typeName);
  return alias ? orderFromTypeNode(checker, alias.type, depth + 1) : null;
}

/**
 * A union's selectable values as real JSON — numbers stay numbers. Empty unless every
 * non-nullish member is a literal: one mixing literals with an open type
 * (`"a" | (string & {})`) has no fixed option set, and offering only the literal half
 * would be a plausible, wrong list. Nullish is dropped, never offered — "none" is a
 * control-layer sentinel.
 *
 * Pass `order` — declaration-ordered values from declaredValueOrder() — to get them in
 * the order they were declared rather than the order the checker interned them. This only ever SORTS the resolved values: a value `order`
 * does not mention keeps its relative position at the end, so ordering can change and
 * membership cannot.
 */
export function typeToValues(type, order) {
  if (!type.isUnion?.()) return [];
  const members = type.types.filter((member) => !isNullish(member));
  if (!members.length || !members.every((member) => member.isLiteral?.())) return [];
  const values = members.map((member) => member.value);

  if (!order?.length || values.length < 2) return values;
  const rank = new Map(order.map((value, index) => [value, index]));
  return values
    .map((value, index) => ({ value, index }))
    .sort((a, b) => (rank.get(a.value) ?? Infinity) - (rank.get(b.value) ?? Infinity) || a.index - b.index)
    .map((entry) => entry.value);
}

/**
 * What control this row's data can back. `values` decides "enum" on its own — a
 * resolved union is an enum whatever its type text says. Anything else falls through
 * to "unknown", which draws no control and keeps the consumer's skip warning rather
 * than guessing.
 */
export function propKind(typeText, values) {
  if (values?.length) return 'enum';
  // A nullable primitive is just that primitive — nullish is stripped everywhere.
  const bare = String(typeText ?? '').replace(/\s*\|\s*(null|undefined)\b/g, '').trim();
  switch (bare) {
    case 'boolean': return 'boolean';
    case 'string': return 'text';
    case 'number': return 'number';
    default: return 'unknown';
  }
}
