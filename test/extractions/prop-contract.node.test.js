import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import ts from 'typescript';

import { typeToValues, declaredValueOrder } from '../../deps/shared/prop-contract.js';
import { buildProgram } from '../../deps/rsp/build-ts-checker.js';

// Both catalogs' size and variant unions come from the `(typeof CONST)[number]` idiom.
// The checker interns a union by type ID — first encounter across the whole program —
// so a component that narrows or widens a shared alias gets the shared alias's order
// with its own extra members appended. Live symptoms this fixture reproduces:
// RSP ActionMenu.size and SWC action-button/icon.size read "s, m, l, xl, xs".
const SOURCE = [
  'export declare const BUTTON_SIZES: readonly ["s", "m", "l", "xl"];',
  'export type ButtonSize = (typeof BUTTON_SIZES)[number];',
  // Declared second, so BUTTON_SIZES' members are already interned when this resolves.
  'export declare const MENU_SIZES: readonly ["xs", "s", "m", "l", "xl"];',
  'export type MenuSize = (typeof MENU_SIZES)[number];',
  'export interface Props {',
  '  button: ButtonSize;',
  '  menu: MenuSize;',
  '  inline: "one" | "two";',
  '  open: string;',
  '}',
].join('\n');

function propsOf(source, interfaces = ['Props']) {
  const { program, checker } = buildProgram(new Map([['f.d.ts', source]]), ['f.d.ts']);
  const sourceFile = program.getSourceFile('f.d.ts');
  const decls = new Map();
  ts.forEachChild(sourceFile, (node) => {
    if (ts.isInterfaceDeclaration(node) && interfaces.includes(node.name.text)) {
      decls.set(node.name.text, node);
    }
  });
  // Keyed bare for a single interface, qualified when several are in play.
  const byName = new Map();
  decls.forEach((decl, name) => {
    checker.getPropertiesOfType(checker.getTypeAtLocation(decl)).forEach((symbol) => {
      byName.set(interfaces.length > 1 ? `${name}.${symbol.name}` : symbol.name, symbol);
    });
  });
  return { checker, byName };
}

describe('typeToValues — declaration order', () => {
  const { checker, byName } = propsOf(SOURCE);
  // Resolve the shared alias FIRST, so its members are interned before MenuSize is
  // ever read. Without this the checker hands back MenuSize's own order by luck and
  // the assertions below pass whether or not the reordering works.
  typeToValues(checker.getTypeOfSymbol(byName.get('button')));

  const valuesFor = (name, ordered) => {
    const symbol = byName.get(name);
    const type = checker.getTypeOfSymbol(symbol);
    return ordered ? typeToValues(type, declaredValueOrder(checker, symbol)) : typeToValues(type);
  };

  // Interning happens on first resolution, so the shared alias has to be resolved
  // first for the bug to appear at all — which is exactly the real condition: Button
  // is extracted before ActionMenu in a run that shares one program.
  it('reproduces the interning bug without an order (the state being fixed)', () => {
    const fresh = propsOf(SOURCE);
    const resolve = (name) => typeToValues(fresh.checker.getTypeOfSymbol(fresh.byName.get(name)));
    assert.deepEqual(resolve('button'), ['s', 'm', 'l', 'xl']);
    assert.deepEqual(resolve('menu'), ['s', 'm', 'l', 'xl', 'xs'], 'expected the interned order');
  });

  it('recovers the declared order of a narrowed alias', () => {
    assert.deepEqual(valuesFor('menu', true), ['xs', 's', 'm', 'l', 'xl']);
  });

  it('leaves an already-correct union alone', () => {
    assert.deepEqual(valuesFor('button', true), ['s', 'm', 'l', 'xl']);
  });

  it('leaves an inline union alone — it has no const tuple to read', () => {
    assert.deepEqual(valuesFor('inline', true), ['one', 'two']);
  });

  it('still offers nothing for a type with no fixed option set', () => {
    assert.deepEqual(valuesFor('open', true), []);
  });

  // The invariant that makes this safe to run over both catalogs: ordering may change,
  // membership may not. Reordering is a sort of the resolved values, never a re-read.
  it('never adds or drops a value when reordering', () => {
    ['button', 'menu', 'inline', 'open'].forEach((name) => {
      assert.deepEqual(
        [...valuesFor(name, true)].sort(),
        [...valuesFor(name, false)].sort(),
        `membership changed for ${name}`,
      );
    });
  });
});

// RSP does not use the const-tuple idiom at all — it declares unions inline
// (`size?: 'XS' | 'S' | 'M' | 'L' | 'XL'` on ActionButtonProps), and interning reorders
// those just the same. That is the live ActionMenu.size symptom: ActionMenu picks the
// prop off ActionButtonProps, so the declaration it lands on is that union node.
const INLINE_SOURCE = [
  'export interface ButtonProps { size?: "s" | "m" | "l" | "xl"; }',
  'export interface MenuProps { size?: "xs" | "s" | "m" | "l" | "xl"; }',
].join('\n');

describe('typeToValues — declaration order for an inline union', () => {
  const { checker, byName } = propsOf(INLINE_SOURCE, ['ButtonProps', 'MenuProps']);
  // Intern the narrower union first, exactly as a real run does.
  typeToValues(checker.getTypeOfSymbol(byName.get('ButtonProps.size')));

  const menu = byName.get('MenuProps.size');
  const menuType = checker.getTypeOfSymbol(menu);

  it('reproduces the interning bug on an inline union', () => {
    assert.deepEqual(typeToValues(menuType), ['s', 'm', 'l', 'xl', 'xs']);
  });

  it('recovers the source order of an inline union', () => {
    assert.deepEqual(
      typeToValues(menuType, declaredValueOrder(checker, menu)),
      ['xs', 's', 'm', 'l', 'xl'],
    );
  });
});

// SWC keeps its const tuples in a separate *.types.d.ts and imports the alias, so the
// symbol at the annotation is an import alias — its declaration is the ImportSpecifier,
// not the type alias. Without following it, every SWC union keeps the interned order.
describe('typeToValues — declaration order through an imported alias', () => {
  const FILES = new Map([
    ['types.d.ts', [
      'export declare const SIZES: readonly ["xs", "s", "m", "l", "xl"];',
      'export type Size = (typeof SIZES)[number];',
    ].join('\n')],
    ['f.d.ts', [
      "import { Size } from './types';",
      'export interface ButtonProps { size?: "s" | "m" | "l" | "xl"; }',
      'export interface MenuProps { size?: Size; }',
      // Rung 1's shape: no `size` declaration at all, only the valid-values array.
      'export declare class Widget { static readonly VALID_SIZES: readonly Size[]; }',
    ].join('\n')],
  ]);

  const { program, checker } = buildProgram(FILES, ['f.d.ts']);
  const sourceFile = program.getSourceFile('f.d.ts');
  const decls = new Map();
  ts.forEachChild(sourceFile, (node) => {
    if (ts.isInterfaceDeclaration(node) || ts.isClassDeclaration(node)) {
      decls.set(node.name.text, node);
    }
  });
  const propOf = (iface, name) => checker
    .getPropertiesOfType(checker.getTypeAtLocation(decls.get(iface)))
    .find((symbol) => symbol.name === name);

  // Intern the narrower union first.
  typeToValues(checker.getTypeOfSymbol(propOf('ButtonProps', 'size')));

  it('recovers the order through an imported alias', () => {
    const symbol = propOf('MenuProps', 'size');
    assert.deepEqual(
      typeToValues(checker.getTypeOfSymbol(symbol), declaredValueOrder(checker, symbol)),
      ['xs', 's', 'm', 'l', 'xl'],
    );
  });

  it('recovers the order from a `readonly Size[]` valid-values array', () => {
    const member = decls.get('Widget').members
      .find((m) => ts.isPropertyDeclaration(m) && m.name.text === 'VALID_SIZES');
    const elementType = checker.getTypeAtLocation(member).getNumberIndexType();
    assert.deepEqual(
      typeToValues(elementType, declaredValueOrder(checker, member)),
      ['xs', 's', 'm', 'l', 'xl'],
    );
  });
});
