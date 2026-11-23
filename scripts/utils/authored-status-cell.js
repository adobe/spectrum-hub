import { getConfig } from '../ak.js';

const sources = new WeakMap();
const snapshots = new WeakMap();
const observers = new WeakMap();

function parseRows(el) {
  const rows = [...el.children];
  if (!rows.length) {
    getConfig().log(new Error('Invalid component-status content: expected rows of status cells.'), el);
    return [];
  }
  return rows.flatMap((row, index) => {
    if (row.tagName !== 'DIV' || !row.children.length) {
      getConfig().log(new Error(`Invalid component-status row ${index + 1}: expected status cells.`), el);
      return [];
    }
    return [...row.children].flatMap((cell, cellIndex) => {
      const anchors = [...cell.querySelectorAll('a')];
      const invalidLink = anchors.some((anchor) => (
        !anchor.getAttribute('href')?.trim() || !['http:', 'https:'].includes(anchor.protocol)
      ));
      if (cell.tagName !== 'DIV' || invalidLink) {
        getConfig().log(new Error(
          `Invalid component-status cell ${index + 1}.${cellIndex + 1}: expected a content cell with HTTP(S) links.`,
        ), el);
        return [];
      }
      return cell.textContent.trim() || cell.children.length ? [cell] : [];
    });
  });
}

function readSource(block) {
  if (!sources.has(block)) {
    const authored = Boolean(block.children.length || block.textContent.trim());
    sources.set(block, {
      mode: authored ? 'authored' : 'automatic',
      rows: authored ? parseRows(block) : [],
    });
  }
  return sources.get(block);
}

/** Retain authored cells across decoration, removal, and moves between containers. */
export function getAuthoredStatusBlocks(root) {
  if (!snapshots.has(root)) { snapshots.set(root, new Map()); }
  const snapshot = snapshots.get(root);
  const ordered = new Map();
  const blocks = root.matches('main')
    ? [...root.querySelectorAll('.component-status')] : [root];
  blocks.forEach((block) => {
    const source = readSource(block);
    if (source.mode === 'authored') {
      snapshot.set(block, source.rows);
      ordered.set(block, source.rows);
    }
  });
  if (root.matches('main') && snapshot.size) { root.dataset.authoredComponentStatus = ''; }
  return new Map([...ordered, ...snapshot]);
}

/** Share one observer per page; ignore pill decoration and unrelated DOM changes. */
export function observeAuthoredStatusBlocks(page, onChange) {
  if (!observers.has(page)) {
    const listeners = new Set();
    let sourceCount = getAuthoredStatusBlocks(page).size;
    const observer = new MutationObserver((records) => {
      const statusAdded = records.some(({ addedNodes }) => [...addedNodes].some((node) => (
        node.nodeType === Node.ELEMENT_NODE
        && (node.matches('.component-status') || node.querySelector('.component-status'))
      )));
      if (!statusAdded) { return; }
      const authored = getAuthoredStatusBlocks(page);
      if (authored.size === sourceCount) { return; }
      sourceCount = authored.size;
      listeners.forEach((listener) => listener());
    });
    observer.observe(page, { childList: true, subtree: true });
    observers.set(page, { observer, listeners });
  }
  const { observer, listeners } = observers.get(page);
  listeners.add(onChange);
  return () => {
    listeners.delete(onChange);
    if (!listeners.size) {
      observer.disconnect();
      observers.delete(page);
    }
  };
}
