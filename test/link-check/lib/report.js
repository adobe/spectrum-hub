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
 *   status: string|number, reason?: string}>} brokenLinks
 * @param {{pagesVisited: number, linksChecked: number, truncated?: boolean}} stats
 * @returns {string} a human-readable Markdown report, useful whether or not anything broke
 */
export function toMarkdown(brokenLinks, stats) {
  const lines = [
    '# Navigation link check report',
    '',
    `- Pages crawled: ${stats.pagesVisited}`,
    `- Links checked: ${stats.linksChecked}`,
    `- Broken links found: ${brokenLinks.length}`,
  ];

  if (stats.truncated) {
    lines.push(
      '- ⚠️ Crawl hit the page cap before exhausting the queue — increase '
      + '`LINKCHECK_MAX_PAGES` for full coverage.',
    );
  }

  lines.push('');

  if (brokenLinks.length === 0) {
    lines.push('No broken navigation found.');
    return lines.join('\n');
  }

  lines.push('| Source page | Link text | Href | Kind | Status | Reason |');
  lines.push('| --- | --- | --- | --- | --- | --- |');
  brokenLinks.forEach(({
    sourcePage, text, href, kind, status, reason,
  }) => {
    lines.push(`| ${cell(sourcePage)} | ${cell(text)} | ${cell(href)} | ${cell(kind)} | ${cell(status)} | ${cell(reason)} |`);
  });

  return lines.join('\n');
}
