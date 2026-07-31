/**
 * Algolia index settings, applied before every rebuild so the index is
 * reproducible from code. replaceAllObjects copies settings from the target
 * index to its temporary index, so these must be applied to the target first.
 *
 * Deep frozen to prevent accidental mutation: the object and all nested arrays
 * are immutable, so no caller can silently change indexing behaviour for the
 * rest of the run.
 */

export const INDEX_SETTINGS = Object.freeze({
  // Priority order. title is first because it is the only text the UI shows and
  // must be searchable for _highlightResult.title to exist at all. It already
  // contains hierarchy.lvl0 and the section heading, so only lvl1 — the middle
  // context a two-segment title drops — needs listing. The pill fields come
  // last: typing "iOS" should find iOS pages without outranking a real match.
  searchableAttributes: Object.freeze([
    'title',
    'hierarchy.lvl1',
    'content',
    'tags',
    'description',
    'implementation',
    'platform',
  ]),
  attributesToHighlight: Object.freeze(['title']),
  attributesForFaceting: Object.freeze([
    'platform',
    'implementation',
    'section',
    'tags',
  ]),
  // One row per page: the best-matching section wins and deep-links to itself.
  attributeForDistinct: 'path',
  distinct: 1,
  // Textual relevance is applied first, so this only breaks ties, favouring
  // higher-level and earlier sections.
  customRanking: Object.freeze(['asc(level)', 'asc(position)']),
});
