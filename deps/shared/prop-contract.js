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
  if (type.isUnion?.()) {
    return type.types.map((member) => checker.typeToString(member, undefined, format)).join(' | ');
  }
  return checker.typeToString(type, undefined, format);
}

/**
 * A union's selectable values as real JSON — numbers stay numbers. Empty unless every
 * non-nullish member is a literal: one mixing literals with an open type
 * (`"a" | (string & {})`) has no fixed option set, and offering only the literal half
 * would be a plausible, wrong list. Nullish is dropped, never offered — "none" is a
 * control-layer sentinel.
 *
 * Order is the checker's (unions interned by type ID), not source order.
 */
export function typeToValues(type) {
  if (!type.isUnion?.()) return [];
  const members = type.types.filter((member) => !isNullish(member));
  if (!members.length || !members.every((member) => member.isLiteral?.())) return [];
  return members.map((member) => member.value);
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
