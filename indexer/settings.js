/**
 * Algolia index settings, applied before every rebuild so the index is
 * reproducible from code. replaceAllObjects copies settings from the target
 * index to its temporary index, so these must be applied to the target first.
 */

export const INDEX_SETTINGS = {
  // Priority order. title is first because it is the only text the UI shows and
  // must be searchable for _highlightResult.title to exist at all. It already
  // contains hierarchy.lvl0 and the section heading, so only lvl1 — the middle
  // context a two-segment title drops — needs listing. The pill fields come
  // last: typing "iOS" should find iOS pages without outranking a real match.
  searchableAttributes: [
    'title',
    'hierarchy.lvl1',
    'content',
    'tags',
    'description',
    'implementation',
    'platform',
  ],
  attributesToHighlight: ['title'],
  attributesForFaceting: ['platform', 'implementation', 'section', 'tags'],
  // One row per page: the best-matching section wins and deep-links to itself.
  attributeForDistinct: 'path',
  distinct: 1,
  // Textual relevance is applied first, so this only breaks ties, favouring
  // higher-level and earlier sections.
  customRanking: ['asc(level)', 'asc(position)'],
};
