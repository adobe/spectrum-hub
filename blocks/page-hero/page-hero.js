/**
 * Composed by scripts.js's `buildPageHeader` before section decoration runs (see
 * scripts.js), out of whatever the author placed near the page's <h1>: an optional
 * .breadcrumbs block, the <h1> itself, an optional following description paragraph, and
 * an optional .component-status block. Because those become nested inside this block
 * rather than direct children of the section, the generic section-decoration loop never
 * reaches them — this init loads them itself.
 */
import { loadBlock } from '../../scripts/ak.js';

export default async function init(el) {
  const nested = [...el.querySelectorAll(':scope > .breadcrumbs, :scope > .component-status')];
  await Promise.all(nested.map((block) => loadBlock(block)));
}
