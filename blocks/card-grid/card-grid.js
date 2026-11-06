/*
 * Generates one card per eligible page from the selected query index. The
 * authored block is a table of filters; the rendered block is a list of cards.
 * See .ai/docs/specs/2026-11-02-card-grid-design.md for the data model.
 */

import { toClassName, getConfig } from '../../scripts/ak.js';
import { getData } from '../../scripts/utils/data-store.js';
import { statusForPath } from '../../scripts/utils/status-lookup.js';
import { STATUSES } from '../../scripts/utils/status-model.js';
import { implAndSlugFromPath } from '../../scripts/utils/component-path.js';
import { buildCardItem } from './card-grid-item.js';

// The authored `content` value picks the index that backs the grid. A value
// with no entry renders nothing rather than falling back, so a typo cannot
// quietly show another collection's content.
const CONTENT_INDEXES = {
  web: '/web/components/query-index.json',
  'web-rsp': '/web/rsp/components/query-index.json',
  'web-swc': '/web/swc/components/query-index.json',
  mobile: '/mobile/components/query-index.json',
  patterns: '/patterns/query-index.json',
};

// An unauthored `content` value selects the web roll-up index.
const DEFAULT_CONTENT = 'web';

const STATUS_INDEX = '/deps/status-index.json';

// The badges each card carries, in the order they render. `card-steward` is
// private: the edge strips that column for an anonymous viewer, so the badge
// is simply absent rather than empty.
const BADGE_FIELDS = ['card-team', 'card-subject', 'card-steward'];

// Authored keys that narrow the index. Every card field carries the `card-`
// prefix in the block table and in the index alike, so one key reads both.
// `implementation` is the exception: it comes from each row's path, not a
// column, because the column is empty on design-only rows.
const FILTERS = ['card-subject', 'card-team', 'card-category', 'implementation', 'card-status'];

// An authored `All` means no filter, not a value named "all".
const NO_FILTER = 'all';

/** Reads the authored filter table by label text and removes it from the DOM. */
const readConfig = (el) => {
  const config = {};

  [...el.querySelectorAll(':scope > div')].forEach((row) => {
    const [label, value] = [...row.querySelectorAll(':scope > div')];
    const key = toClassName(label?.textContent ?? '');
    if (key) { config[key] = value?.textContent?.trim() ?? ''; }
    row.remove();
  });

  return config;
};

/** A cell's values, lowercased — a column may hold a comma-separated list. */
const cellValues = (value) => value
  .split(',')
  .map((part) => part.trim().toLowerCase())
  .filter(Boolean);

/*
 * One rule for every authored value read off a row: the trimmed text, or ''
 * when the column is absent, blank, or holds something that is not authored
 * text. Anything non-string is treated as absent rather than coerced, so a
 * `card-title` that arrived as a number falls back to the page title instead
 * of rendering as a bare numeral.
 */
const rowValue = (row, key) => {
  const value = row?.[key];
  return typeof value === 'string' ? value.trim() : '';
};

/*
 * An authored status, for rows the status index cannot address. A patterns
 * path has no `components` segment, so implAndSlugFromPath finds no slug and
 * statusForPath returns null for every one of them - no entry in
 * deps/status-index.json can change that.
 *
 * `toClassName` turns the authored wording into an id to look up in STATUSES,
 * the same way it reads the block's filter labels. `Not available` and
 * `not-available` both land on the same key; a missing entry is logged.
 */
const cardStatus = (row) => {
  const authored = rowValue(row, 'card-status');
  if (!authored) { return null; }

  const id = toClassName(authored);
  if (STATUSES[id]) { return id; }

  const { log } = getConfig();
  log(`Card grid ignored card-status "${authored}" on ${row.path}: expected one of ${Object.keys(STATUSES).join(', ')}.`);
  return null;
};

/*
 * An indexed status takes precedence over the authored column. The column
 * fills the gap for pattern paths and component paths with no matching status.
 * Automating pattern statuses also requires extending the path lookup; adding
 * status-index entries alone does not make pattern paths resolvable.
 */
const resolveStatus = (row, statusIndex) => statusForPath(row.path, statusIndex)
  ?? cardStatus(row);

const matchesFilter = (row, key, authored, statusIndex) => {
  const wanted = String(authored ?? '').trim().toLowerCase();
  if (!wanted || wanted === NO_FILTER) { return true; }

  // Two keys are resolved rather than read: `implementation` comes from the
  // path, `card-status` from the pipeline with the column behind it. Reading
  // either column directly would filter on something the card does not show.
  if (key === 'implementation') {
    return (implAndSlugFromPath(row.path).impl ?? '') === wanted;
  }
  if (key === 'card-status') {
    return (resolveStatus(row, statusIndex) ?? '') === toClassName(wanted);
  }

  return cellValues(rowValue(row, key)).includes(wanted);
};

/** A card value: the `card-` column, with the legacy unprefixed one behind it. */
const cardField = (row, field) => rowValue(row, `card-${field}`) || rowValue(row, field);

const selectRows = (rows, config, statusIndex) => {
  const { log } = getConfig();
  const eligible = rows.filter((row) => {
    const hasPath = typeof row?.path === 'string' && /^\/(?!\/)[^\s\\?#]*$/.test(row.path);
    if (hasPath && cardField(row, 'title')) { return true; }

    const path = typeof row?.path === 'string' ? row.path : '(missing or invalid path)';
    log(`Card grid skipped ${path}: a nonblank title and a site-root-relative page path are required.`);
    return false;
  });
  const matching = eligible.filter(
    (row) => FILTERS.every((key) => matchesFilter(row, key, config[key], statusIndex)),
  );

  const limit = Number.parseInt(config.count, 10);
  return Number.isFinite(limit) && limit > 0 ? matching.slice(0, limit) : matching;
};

/* The badges a row can show, keeping the field each value came from so the
 * renderer has a hook and a test can tell them apart. A row that carries none
 * yields an empty list and the card renders no badge row. */
const badgesFromRow = (row) => BADGE_FIELDS
  .map((field) => ({ field, value: rowValue(row, field) }))
  .filter(({ value }) => value);

const toCardData = (row, statusIndex) => {
  const image = cardField(row, 'image');

  return {
    path: row.path,
    title: cardField(row, 'title'),
    description: cardField(row, 'description'),
    image: image ? new URL(image, new URL(row.path, window.location.origin)).href : '',
    implementation: implAndSlugFromPath(row.path).impl ?? '',
    status: resolveStatus(row, statusIndex),
    badges: badgesFromRow(row),
  };
};

/** Collapse only empty containers, without hiding neighboring blocks or copy. */
const setHidden = (el, hidden) => {
  el.hidden = hidden;
  let parent = el.parentElement;
  while (parent?.matches('.block-content, .section')) {
    const empty = [...parent.children].every(
      (child) => child.hidden || child.classList.contains('card-grid-empty'),
    );
    parent.classList.toggle('card-grid-empty', empty);
    parent = parent.parentElement;
  }
};

export default async function init(el) {
  const config = readConfig(el);
  el.replaceChildren();

  const content = (config.content || DEFAULT_CONTENT).trim().toLowerCase();
  const endpoint = CONTENT_INDEXES[content];
  if (!endpoint) {
    setHidden(el, true);
    return;
  }

  const [index, statusIndex] = await Promise.all([
    getData(endpoint),
    getData(STATUS_INDEX),
  ]);

  if (!index) {
    setHidden(el, true);
    return;
  }

  const rows = selectRows(index.data ?? [], config, statusIndex);
  if (!rows.length) {
    setHidden(el, true);
    return;
  }

  const list = document.createElement('ul');
  list.className = 'card-grid-list';
  list.setAttribute('role', 'list');

  rows.forEach((row) => {
    const item = document.createElement('li');
    buildCardItem(toCardData(row, statusIndex), item);
    list.append(item);
  });

  el.replaceChildren(list);
  setHidden(el, false);
}
