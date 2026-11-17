import { toClassName } from '../ak.js';

/**
 * Reads the labelled rows of an authored block.
 * Each row is `label cell` + `value cell`; the label becomes the map key.
 *
 * @param {Element} block The block element
 * @returns {Object<string, Element>} Map of field name to value cell
 */
export function getAuthoredCells(block) {
  const cells = {};
  [...block.children].forEach((row) => {
    const [label, cell] = row.children;
    if (!label || !cell) { return; }
    cells[toClassName(label.textContent)] = cell;
  });
  return cells;
}

/**
 * Text of `node`, skipping `.visually-hidden` subtrees. Those nodes are
 * screen-reader hints such as "(opens in a new tab)"; `textContent` would
 * fold them into the visible value.
 *
 * @param {Node} node Node to read
 * @returns {string}
 */
function textExcludingVisuallyHidden(node) {
  if (node.nodeType === Node.TEXT_NODE) { return node.textContent; }
  if (node.nodeType !== Node.ELEMENT_NODE) { return ''; }
  if (node.classList.contains('visually-hidden')) { return ''; }
  return [...node.childNodes].map(textExcludingVisuallyHidden).join('');
}

/**
 * Trimmed text of an authored cell, ignoring visually hidden hints.
 *
 * @param {Element} [cell] The value cell
 * @returns {string}
 */
export function getCellText(cell) {
  if (!cell) { return ''; }
  return textExcludingVisuallyHidden(cell).trim();
}

/**
 * Href of the first link in an authored cell.
 *
 * @param {Element} [cell] The value cell
 * @returns {string}
 */
export function getCellLinkHref(cell) {
  return cell?.querySelector('a[href]')?.href || '';
}

/**
 * Picture or image element in an authored media cell.
 *
 * @param {Element} [cell] The value cell
 * @returns {Element|null}
 */
export function getCellMedia(cell) {
  if (!cell) { return null; }
  return cell.querySelector('picture') || cell.querySelector('img');
}

/**
 * Absolute http(s) URL for a value, or an empty string when it is missing or
 * uses another protocol (`javascript:`, `data:`, and so on).
 *
 * @param {string} value Candidate URL, possibly relative
 * @returns {string}
 */
export function toSafeHttpUrl(value) {
  if (!value) { return ''; }
  try {
    const url = new URL(value, window.location.href);
    if (url.protocol === 'http:' || url.protocol === 'https:') { return url.href; }
  } catch {
    /* not a URL */
  }
  return '';
}
