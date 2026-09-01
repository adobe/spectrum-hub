import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { readFileSync, readdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

// Guards the committed catalog itself, not a function: the playground builds controls
// from `kind`/`values`, so a run that silently degrades a row (an unresolved alias, a
// kind with no values behind it) would only surface as a missing control in a browser.
const DATA_DIR = join(dirname(fileURLToPath(import.meta.url)), '../../deps/swc/data');

const KINDS = new Set(['enum', 'boolean', 'text', 'number', 'unknown']);

const rows = readdirSync(DATA_DIR)
  .filter((file) => file.endsWith('.json'))
  .flatMap((file) => JSON.parse(readFileSync(join(DATA_DIR, file), 'utf8'))
    .map((row) => ({ ...row, id: `${file.replace(/^swc-|\.json$/g, '')}.${row.attribute}` })));

describe('deps/swc/data contract', () => {
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
    const bad = rows.filter((row) => row.values.some((v) => v === null || v === undefined || v === 'undefined' || v === 'null'));
    assert.deepEqual(bad.map((row) => row.id), []);
  });

  // A bare identifier left in `type` means resolution silently failed for that row.
  it('leaves no unresolved alias behind an enum-shaped attribute', () => {
    const unresolved = rows.filter((row) => row.kind === 'unknown'
      && /^[A-Z][A-Za-z0-9_$]*$/.test(String(row.type ?? '').trim()));
    assert.deepEqual(unresolved.map((row) => `${row.id}=${row.type}`), []);
  });
});
