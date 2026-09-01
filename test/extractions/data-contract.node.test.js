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
