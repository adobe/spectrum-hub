/**
 * Splits a page's <main> into section-level chunks for indexing.
 *
 * Headings are not assumed to sit at any fixed depth: published pages wrap
 * content in EDS section divs, so a heading is typically several levels down,
 * and authored content can nest one deeper still. The walk is therefore
 * depth-first over the whole subtree, and any h1/h2/h3 found anywhere starts a
 * new section. Text is gathered from text nodes only, never from an element's
 * aggregate text, so nesting cannot count a passage twice.
 */

const HEADING_TAGS = new Set(['h1', 'h2', 'h3']);
const MAX_CONTENT_LENGTH = 8000;
const TEXT_NODE = 3;
const ELEMENT_NODE = 1;

/** Blocks that hold configuration or media rather than prose. Tune freely. */
export const NOISE_SELECTORS = ['.playground', '.section-metadata', 'picture', 'img'];

const normalize = (value) => value.replace(/\s+/g, ' ').trim();

/**
 * Removes non-prose nodes from a <main> in place.
 * @param {object} main the parsed main element
 */
export function stripNoise(main) {
  NOISE_SELECTORS.forEach((selector) => {
    main.querySelectorAll(selector).forEach((el) => el.remove());
  });

  // Authors link data and fragments by pasting the URL as the link text. Those
  // anchors carry no prose, so drop them rather than index a URL.
  main.querySelectorAll('a').forEach((anchor) => {
    if (/^https?:\/\//i.test(anchor.text.trim())) { anchor.remove(); }
  });
}

/**
 * Splits a <main> into ordered sections.
 * @param {object} main the parsed main element
 * @returns {object[]} sections in document order
 */
export function splitSections(main) {
  const collected = [];
  let current = { heading: '', level: 1, anchor: '', parts: [] };

  const walk = (node) => {
    if (node.nodeType === TEXT_NODE) {
      current.parts.push(node.text);
      return;
    }
    if (node.nodeType !== ELEMENT_NODE) { return; }

    const tag = (node.rawTagName || '').toLowerCase();
    if (HEADING_TAGS.has(tag)) {
      collected.push(current);
      current = {
        heading: normalize(node.text),
        level: Number(tag[1]),
        anchor: node.getAttribute('id') || '',
        parts: [],
      };
      // Do not descend: the heading's own text is not body content.
      return;
    }

    node.childNodes.forEach(walk);
  };

  main.childNodes.forEach(walk);
  collected.push(current);

  // A leading run of content before the first heading belongs to that heading's
  // section, not to a headingless record of its own.
  if (collected.length > 1 && !collected[0].heading) {
    collected[1].parts = [...collected[0].parts, ...collected[1].parts];
    collected.shift();
  }

  const levels = [];
  return collected
    .map((section) => ({
      ...section,
      content: normalize(section.parts.join(' ')).slice(0, MAX_CONTENT_LENGTH),
    }))
    // Hierarchy is computed across every section, before any are dropped. A
    // content-less parent still contributes its heading to its children's
    // hierarchy — which is the whole reason dropping it is safe.
    .map((section) => {
      levels[section.level - 1] = section.heading;
      levels.length = section.level;
      return {
        ...section,
        hierarchy: { lvl0: levels[0] || '', lvl1: levels[1] || '', lvl2: levels[2] || '' },
      };
    })
    // The first section is always kept so every page stays findable by title.
    // Later sections need content: a heading whose prose lives in its own
    // sub-sections adds no searchable text of its own.
    .filter((section, index) => (
      index === 0 ? section.heading || section.content : section.content
    ))
    .map((section, index) => ({
      heading: section.heading,
      level: section.level,
      anchor: section.anchor,
      content: section.content,
      position: index,
      hierarchy: section.hierarchy,
    }));
}
