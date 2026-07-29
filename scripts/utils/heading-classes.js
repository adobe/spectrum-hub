// Matches a trailing Pandoc-style attribute list, e.g. "Heading text {.heading-size-l}"
// or "Heading text {.heading-size-l.text-center}" / "{.heading-size-l .text-center}"
const ATTR_LIST_RE = /\s*\{\.([\w.\s-]+)\}\s*$/;

/**
 * Pulls a trailing `{.class-name}` attribute list off a heading's text content.
 * @param {string} text
 * @returns {{ classes: string[], text: string } | null}
 */
export function extractHeadingClasses(text) {
  const match = text.match(ATTR_LIST_RE);
  if (!match) { return null; }
  const classes = match[1].trim().split(/[.\s]+/).filter(Boolean);
  if (!classes.length) { return null; }
  return { classes, text: text.slice(0, match.index) };
}

/**
 * Lets authors append a class utility list to a heading, e.g. `## My heading {.heading-size-l}`.
 * Strips the marker and applies the class(es) to the heading element.
 * @param {ParentNode} area
 */
export default function decorateHeadingClasses(area) {
  area.querySelectorAll('h1, h2, h3, h4, h5, h6').forEach((heading) => {
    const walker = document.createTreeWalker(heading, NodeFilter.SHOW_TEXT);
    let lastText;
    for (let node = walker.nextNode(); node; node = walker.nextNode()) { lastText = node; }
    if (!lastText) { return; }

    const result = extractHeadingClasses(lastText.textContent);
    if (!result) { return; }

    lastText.textContent = result.text;
    heading.classList.add(...result.classes);
  });
}
