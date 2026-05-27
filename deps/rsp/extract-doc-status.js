/**
 * Fetches component prerelease status from published S2 documentation.
 *
 * Status is authored in s2-docs MDX (`export const version`) and rendered as a
 * VersionBadge on the live site. It is not present in @react-spectrum/s2 .d.ts files.
 *
 * Usage: node deps/rsp/extract-doc-status.js [ComponentName ...]
 */

import { fileURLToPath } from 'url';

export const S2_DOCS_BASE = 'https://react-spectrum.adobe.com';
export const s2MdxUrl = (component) =>
  `https://cdn.jsdelivr.net/gh/adobe/react-spectrum@main/packages/dev/s2-docs/pages/s2/${component}.mdx`;
const VERSION_EXPORT = /export\s+const\s+version\s*=\s*['"](alpha|beta|rc)['"]/;
const HTML_BADGE = />(alpha|beta|rc)</;

async function fetchText(url) {
  const res = await fetch(url);
  if (!res.ok) return { ok: false, status: res.status, text: null };
  return { ok: true, status: res.status, text: await res.text() };
}

/** @returns {'alpha' | 'beta' | 'rc' | 'stable' | null} */
export function parseStatusFromMdx(mdx) {
  const match = VERSION_EXPORT.exec(mdx);
  if (match) return match[1];
  return 'stable';
}

/** @returns {'alpha' | 'beta' | 'rc' | 'stable' | null} */
export function parseStatusFromHtml(html) {
  const match = HTML_BADGE.exec(html);
  if (match) return match[1];
  return 'stable';
}

/**
 * Resolves doc maturity for an S2 component name.
 *
 * - `alpha` | `beta` | `rc` when the docs site shows a prerelease badge
 * - `stable` when a doc page exists but has no prerelease badge
 * - `null` when there is no published doc page for that name
 */
export async function fetchComponentDocStatus(componentName) {
  const htmlUrl = `${S2_DOCS_BASE}/${componentName}.html`;
  const html = await fetchText(htmlUrl);

  if (html.ok) {
    return parseStatusFromHtml(html.text);
  }

  if (html.status !== 404) {
    return null;
  }

  const mdx = await fetchText(s2MdxUrl(componentName));
  if (!mdx.ok) return null;

  return parseStatusFromMdx(mdx.text);
}

async function main() {
  const names = process.argv.slice(2);
  if (!names.length) {
    console.error('Usage: node deps/rsp/extract-doc-status.js <Component> [...]');
    process.exit(1);
  }

  for (const name of names) {
    const status = await fetchComponentDocStatus(name);
    console.log(`${name}: ${status ?? 'no doc'}`);
  }
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  main().catch((err) => {
    console.error(err);
    process.exit(1);
  });
}
