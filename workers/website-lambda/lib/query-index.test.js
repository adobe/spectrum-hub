import { describe, it, expect } from 'vitest';
import { filterPrivateEntries, compactEntries, collectPrivatePaths } from './query-index.js';

const index = (...data) => ({
  total: data.length,
  offset: 0,
  limit: 500,
  columns: ['path', 'title', 'audience', 'content'],
  data,
});

const row = (path, audience = '') => ({
  path, title: path.split('/').pop(), audience, content: `body of ${path}`,
});

describe('filterPrivateEntries', () => {
  it('drops audience:private rows and keeps the rest', () => {
    const out = filterPrivateEntries(index(
      row('/a'), row('/secret', 'private'), row('/b'),
    ));
    expect(out.data.map((r) => r.path)).toEqual(['/a', '/b']);
  });

  it('updates total to the filtered length', () => {
    const out = filterPrivateEntries(index(row('/a'), row('/secret', 'private')));
    expect(out.total).toBe(1);
  });

  it('strips the audience property from every surviving row', () => {
    const out = filterPrivateEntries(index(row('/a'), row('/b')));
    expect(out.data.every((r) => !('audience' in r))).toBe(true);
    // Other columns are untouched.
    expect(out.data[0]).toMatchObject({ path: '/a', title: 'a' });
    expect(out.data[0]).toHaveProperty('content');
  });

  it('removes the audience entry from the columns list', () => {
    const out = filterPrivateEntries(index(row('/a')));
    expect(out.columns).toEqual(['path', 'title', 'content']);
  });

  it('drops malformed (null / non-object) rows', () => {
    const out = filterPrivateEntries(index(row('/a'), null, 'nope', row('/b')));
    expect(out.data.map((r) => r.path)).toEqual(['/a', '/b']);
    expect(out.total).toBe(2);
  });

  it('does not mutate the input', () => {
    const src = index(row('/a'), row('/secret', 'private'));
    filterPrivateEntries(src);
    expect(src.data).toHaveLength(2);
    expect(src.data[0]).toHaveProperty('audience');
  });

  it('filters every sheet of a multi-sheet payload', () => {
    const multi = {
      ':names': ['pages', 'posts'],
      ':type': 'multi-sheet',
      pages: index(row('/a'), row('/secret', 'private')),
      posts: index(row('/p'), row('/hidden', 'private')),
    };
    const out = filterPrivateEntries(multi);
    expect(out.pages.data.map((r) => r.path)).toEqual(['/a']);
    expect(out.posts.data.map((r) => r.path)).toEqual(['/p']);
    expect(out.pages.columns).not.toContain('audience');
  });

  it('fails closed (returns null) for shapes that are not a recognizable index', () => {
    expect(filterPrivateEntries({ foo: 1 })).toBe(null);
    expect(filterPrivateEntries(null)).toBe(null);
    expect(filterPrivateEntries('nope')).toBe(null);
    // A multi-sheet envelope whose sheets carry no data array is unusable too.
    expect(filterPrivateEntries({ ':names': ['x'], x: { note: 'no data' } })).toBe(null);
  });

  it('handles an empty index', () => {
    const out = filterPrivateEntries(index());
    expect(out.data).toEqual([]);
    expect(out.total).toBe(0);
  });
});

describe('compactEntries', () => {
  it('projects every row to just path and title', () => {
    const out = compactEntries(index(row('/a'), row('/b')));
    expect(out.data).toEqual([
      { path: '/a', title: 'a' },
      { path: '/b', title: 'b' },
    ]);
  });

  it('narrows the columns list', () => {
    const out = compactEntries(index(row('/a')));
    expect(out.columns).toEqual(['path', 'title']);
  });

  it('drops content and other heavy fields', () => {
    const out = compactEntries(index(row('/a')));
    expect(out.data[0]).not.toHaveProperty('content');
    expect(out.data[0]).not.toHaveProperty('audience');
  });

  it('is null-row tolerant', () => {
    const out = compactEntries({ ...index(row('/a')), data: [null, row('/b')] });
    expect(out.data).toEqual([
      { path: undefined, title: undefined },
      { path: '/b', title: 'b' },
    ]);
  });

  it('passes through a payload without a data array', () => {
    expect(compactEntries({ foo: 1 })).toEqual({ foo: 1 });
    expect(compactEntries(null)).toBe(null);
  });
});

describe('filterPrivateEntries + compactEntries composed', () => {
  it('removes private rows then projects the survivors (order used by index.js)', () => {
    const out = compactEntries(filterPrivateEntries(index(
      row('/a'), row('/secret', 'private'), row('/b'),
    )));
    expect(out.data).toEqual([
      { path: '/a', title: 'a' },
      { path: '/b', title: 'b' },
    ]);
    expect(out.columns).toEqual(['path', 'title']);
  });
});

describe('collectPrivatePaths', () => {
  it('returns the paths of audience:private rows', () => {
    const out = collectPrivatePaths(index(row('/a'), row('/secret', 'private'), row('/x', 'private')));
    expect([...out.paths]).toEqual(['/secret', '/x']);
    expect(out.complete).toBe(true);
  });

  it('ignores malformed rows and rows without a string path', () => {
    const out = collectPrivatePaths(index(null, 'nope', { audience: 'private' }, row('/s', 'private')));
    expect([...out.paths]).toEqual(['/s']);
  });

  it('reports incomplete when total exceeds offset + rows on this page', () => {
    const page = { ...index(row('/a'), row('/s', 'private')), total: 5, offset: 0 };
    expect(collectPrivatePaths(page).complete).toBe(false);
    expect(collectPrivatePaths({ ...page, offset: 3 }).complete).toBe(true);
  });

  it('collects across every sheet of a multi-sheet payload', () => {
    const out = collectPrivatePaths({
      ':names': ['pages', 'posts'],
      pages: index(row('/a'), row('/s1', 'private')),
      posts: index(row('/s2', 'private')),
    });
    expect([...out.paths].sort()).toEqual(['/s1', '/s2']);
    expect(out.complete).toBe(true);
  });

  it('returns null for shapes that are not a recognizable index', () => {
    expect(collectPrivatePaths(null)).toBe(null);
    expect(collectPrivatePaths({ foo: 1 })).toBe(null);
    expect(collectPrivatePaths({ ':names': ['x'], x: { note: 'no data' } })).toBe(null);
  });
});
