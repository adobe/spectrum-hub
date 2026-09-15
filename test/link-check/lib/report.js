/**
 * Escapes pipes/newlines so a broken link's own text or reason can't corrupt the
 * Markdown table it's reported in.
 * @param {unknown} value a report cell value
 * @returns {string} a Markdown-table-safe string
 */
function cell(value) {
  return String(value ?? '').replace(/\|/g, '\\|').replace(/\n/g, ' ');
}

/**
 * @param {Array<{sourcePage: string, href: string, text?: string, kind: string,
 *   status: string|number, reason?: string}>} rows broken-link rows
 * @returns {string[]} Markdown lines: a table header plus one row per broken link
 */
function table(rows) {
  const lines = [
    '| Source page | Link text | Href | Kind | Status | Reason |',
    '| --- | --- | --- | --- | --- | --- |',
  ];
  rows.forEach(({
    sourcePage, text, href, kind, status, reason,
  }) => {
    lines.push(`| ${cell(sourcePage)} | ${cell(text)} | ${cell(href)} | ${cell(kind)} | ${cell(status)} | ${cell(reason)} |`);
  });
  return lines;
}

/**
 * Renders the crawl result as Markdown. Internal breakage (our own pages, hash
 * targets, malformed hrefs) is reported separately from external breakage, because
 * only the former fails the run — a third-party WAF hiccup or rate limit shouldn't
 * redden a scheduled crawl or bury a real internal problem under third-party noise.
 * @param {{internal?: object[], external?: object[]}} broken partitioned broken links
 * @param {{pagesVisited: number, linksChecked: number, truncated?: boolean}} stats
 * @returns {string} a human-readable Markdown report, useful whether or not anything broke
 */
export function toMarkdown(broken, stats) {
  const internal = broken.internal ?? [];
  const external = broken.external ?? [];

  const lines = [
    '# Navigation link check report',
    '',
    `- Pages crawled: ${stats.pagesVisited}`,
    `- Links checked: ${stats.linksChecked}`,
    `- Broken internal links found: ${internal.length}`,
    `- Broken external links found: ${external.length}`,
  ];

  if (stats.truncated) {
    lines.push(
      '- ⚠️ Crawl hit the page cap before exhausting the queue — increase '
      + '`LINKCHECK_MAX_PAGES` for full coverage.',
    );
  }

  lines.push('', '## Internal links');
  lines.push('', ...(internal.length === 0
    ? ['No broken internal links found.']
    : table(internal)));

  lines.push('', '## External links');
  lines.push('', '_External failures are listed for visibility but do not fail the run._');
  lines.push('', ...(external.length === 0
    ? ['No broken external links found.']
    : table(external)));

  return lines.join('\n');
}
