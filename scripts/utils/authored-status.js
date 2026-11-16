import { getConfig } from '../ak.js';
import { STATUSES } from './status-model.js';

export const STATUS_PILLS = [
  { kind: 'dev', label: 'Code' },
  { kind: 'design', label: 'Design', column: 'figma' },
];

const snapshots = new WeakMap();

function parseRows(el) {
  const rows = [...el.children];
  if (!rows.length) {
    getConfig().log(new Error('Invalid component-status content: expected two-cell rows.'), el);
    return [];
  }
  const statuses = Object.values(STATUSES);
  const statusPattern = new RegExp(`\\b(?:${statuses.map((status) => status.label.toLowerCase()).join('|')})\\b`, 'g');
  return rows.flatMap((row, index) => {
    const [labelCell, linkCell] = row.children;
    const text = labelCell?.textContent.trim() ?? '';
    const label = text.replace(/\s+/g, ' ').toLowerCase();
    const kinds = STATUS_PILLS.filter((entry) => new RegExp(`\\b${entry.label}\\b`, 'i').test(label));
    const [pill] = kinds;
    const statusLabels = label.match(statusPattern) ?? [];
    const status = statusLabels.length === 1
      ? statuses.find((entry) => entry.label.toLowerCase() === statusLabels[0]) : null;
    const anchors = [...(linkCell?.querySelectorAll('a') ?? [])];
    const [anchor] = anchors;
    const invalidLink = anchor
      ? !anchor.getAttribute('href')?.trim() || !['http:', 'https:'].includes(anchor.protocol)
      : Boolean(linkCell?.textContent.trim());
    if (row.tagName !== 'DIV' || row.children.length !== 2 || kinds.length !== 1 || !status
      || anchors.length > 1 || invalidLink) {
      getConfig().log(new Error(
        `Invalid component-status row ${index + 1}: expected one Code/Design kind, one status, and an optional HTTP(S) link.`,
      ), el);
      return [];
    }
    return [{
      ...pill,
      text,
      status: status.id,
      link: anchor ? {
        href: anchor.href,
        dest: anchor.textContent.trim() || `${pill.label} resource`,
      } : null,
    }];
  });
}

/** Read each source once, retaining rows after either consumer decorates or removes the block. */
export function getAuthoredStatusBlocks(root) {
  if (!snapshots.has(root)) { snapshots.set(root, new Map()); }
  const snapshot = snapshots.get(root);
  const blocks = root.matches('main')
    ? [...root.querySelectorAll('.component-status')] : [root];
  blocks.forEach((block) => {
    if (snapshot.has(block)) { return; }
    // null is automatic; an empty array still records authored intent.
    const rows = block.children.length || block.textContent.trim() ? parseRows(block) : null;
    snapshot.set(block, rows);
  });
  return new Map([...snapshot].filter(([, rows]) => rows !== null));
}
