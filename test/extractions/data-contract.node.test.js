import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { readFileSync, readdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

// Guards the committed catalogs themselves, not a function: the playground builds
// controls from `kind`/`values`, so a run that silently degrades a row would surface
// only as a missing control in a browser. Both extractors write the same contract
// (deps/shared/prop-contract.js), so both are held to it here rather than in two
// near-identical files.
const DEPS = join(dirname(fileURLToPath(import.meta.url)), '../../deps');

const KINDS = new Set(['enum', 'boolean', 'text', 'number', 'unknown']);

// The two catalogs still differ in file naming and wrapper shape; unifying those is
// outstanding Layer 1 work. Absorbing it here keeps the assertions identical for both.
function readCatalog(impl) {
  const dir = join(DEPS, impl, 'data');
  return readdirSync(dir)
    .filter((file) => file.endsWith('.json'))
    .map((file) => {
      const parsed = JSON.parse(readFileSync(join(dir, file), 'utf8'));
      return {
        component: file.replace(/^swc-|\.json$/g, ''),
        rows: Array.isArray(parsed) ? parsed : parsed.props ?? [],
      };
    });
}

function allRows(impl) {
  return readCatalog(impl)
    .flatMap(({ component, rows }) => rows.map((row) => ({ ...row, id: `${component}.${row.property}` })));
}

for (const impl of ['rsp', 'swc']) {
  describe(`deps/${impl}/data contract`, () => {
    const rows = allRows(impl);

    it('has rows to check', () => {
      assert.ok(rows.length > 100, `expected a populated catalog, got ${rows.length} rows`);
    });

    it('gives every row a known kind', () => {
      const bad = rows.filter((row) => !KINDS.has(row.kind));
      assert.deepEqual(bad.map((row) => `${row.id}=${row.kind}`), []);
    });

    it('gives every row a values array', () => {
      const bad = rows.filter((row) => !Array.isArray(row.values));
      assert.deepEqual(bad.map((row) => row.id), []);
    });

    it('marks a row "enum" if and only if it has values', () => {
      const bad = rows.filter((row) => (row.kind === 'enum') !== (row.values.length > 0));
      assert.deepEqual(bad.map((row) => `${row.id} kind=${row.kind} values=${row.values.length}`), []);
    });

    it('never offers a nullish value', () => {
      const bad = rows.filter((row) => row.values
        .some((v) => v === null || v === undefined || v === 'undefined' || v === 'null'));
      assert.deepEqual(bad.map((row) => row.id), []);
    });
  });
}

// Each pipeline degrades silently in its own way, so each gets the canary for its own
// failure mode. A single shared assertion would only ever catch one of them.
describe('deps/swc/data pipeline canary', () => {
  // The CEM records a bare alias ("ButtonVariant") for anything not inline in the
  // source, and a separate pass expands it. One left behind means that pass missed the
  // row — invisible except as a control with no options.
  it('leaves no unexpanded CEM alias behind a row with no kind', () => {
    const unresolved = allRows('swc').filter((row) => row.kind === 'unknown'
      && /^[A-Z][A-Za-z0-9_$]*$/.test(String(row.type ?? '').trim()));
    assert.deepEqual(unresolved.map((row) => `${row.id}=${row.type}`), []);
  });
});

describe('deps/rsp/data pipeline canary', () => {
  // RSP has no alias-expansion pass to miss — the checker resolves every type, so a
  // named type here (StylesProp, SortDescriptor) is a real opaque API type, not a
  // failure. What does fail silently: `Omit<T, K>` collapses the WHOLE interface to
  // zero properties when any package in T's heritage chain was never crawled. So a
  // component reporting no props means a missing package, not a propless component.
  it('leaves no component with zero props', () => {
    const empty = readCatalog('rsp').filter(({ rows }) => rows.length === 0);
    assert.deepEqual(empty.map(({ component }) => component), []);
  });
});

// Ordering guard. `values` is contractually in declaration order (see
// declaredValueOrder in deps/shared/prop-contract.js) — the checker interns unions by
// type ID, so a component narrowing a shared union used to get that union's order with
// its own members appended. This exact check is what surfaced the original four
// symptoms (RSP ActionMenu.size, SWC action-button/icon.size, SWC status-light.variant),
// so it is known to catch the regression rather than merely to pass.
describe('values are in declaration order', () => {
  const SIZE_ORDER = ['xxs', 'xs', 's', 'm', 'l', 'xl', 'xxl'];
  const rank = new Map(SIZE_ORDER.map((size, index) => [size, index]));

  // Only size unions can be checked from the catalog alone: their declaration order is
  // knowable without a TypeScript program, because it is smallest-to-largest.
  for (const impl of ['rsp', 'swc']) {
    it(`orders every ${impl} size-like enum smallest to largest`, () => {
      const bad = allRows(impl)
        .filter((row) => row.values.length > 1
          && row.values.every((value) => typeof value === 'string' && rank.has(value.toLowerCase())))
        .filter((row) => {
          const ranks = row.values.map((value) => rank.get(value.toLowerCase()));
          return ranks.some((value, index) => index > 0 && value < ranks[index - 1]);
        });
      assert.deepEqual(bad.map((row) => `${row.id}=${row.values.join(',')}`), []);
    });
  }
});

// Completeness guard, and deliberately not part of the canary above: readCatalog only
// sees files that exist, so a component that produces NO file at all passes every
// assertion in this suite. That is the louder of the two extraction failures and was
// the unguarded one — a component can drop out of the catalog and only be noticed when
// someone opens its page and finds an empty API table.
//
// Asserted as an exact set rather than a subset so it fails in both directions: a NEW
// component going missing fails, and fixing a known gap also fails, which is the prompt
// to delete its entry here.
describe('every rostered RSP component has a data file', () => {
  const KNOWN_MISSING = [
    // discover-components.js captures the props type with `[^&>]+`, which truncates at
    // the first `>` inside a generic argument. LabeledValue is declared
    //   ForwardRefExoticComponent<LabeledValueProps<LabeledValueTypes> & RefAttributes<…>>
    // so the roster records the malformed `LabeledValueProps<LabeledValueTypes`, which
    // resolves to nothing. Fixing it needs the capture to stop at the generic's own
    // closing bracket AND extract-props to resolve a generic *type alias* — its
    // LabeledValueProps<T> is `type`, not `interface`, so the type argument has to be
    // instantiated before the checker will yield properties.
    'LabeledValue',
  ];

  it('writes one data file per roster entry', () => {
    const roster = Object.keys(JSON.parse(readFileSync(join(DEPS, 'rsp/components.json'), 'utf8')));
    const extracted = new Set(readdirSync(join(DEPS, 'rsp/data'))
      .filter((file) => file.endsWith('.json'))
      .map((file) => file.replace(/\.json$/, '')));
    const missing = roster.filter((component) => !extracted.has(component));
    assert.deepEqual(missing.sort(), [...KNOWN_MISSING].sort());
  });

  it('writes no data file without a roster entry', () => {
    const roster = new Set(Object.keys(JSON.parse(readFileSync(join(DEPS, 'rsp/components.json'), 'utf8'))));
    const orphaned = readdirSync(join(DEPS, 'rsp/data'))
      .filter((file) => file.endsWith('.json'))
      .map((file) => file.replace(/\.json$/, ''))
      .filter((component) => !roster.has(component));
    assert.deepEqual(orphaned, []);
  });
});
