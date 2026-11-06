/*
 * Builds one card from a roll-up index row. card-grid owns this renderer and no
 * author ever places a card by hand, so it is a plain module rather than a
 * block — unlike grid-item in adobe-labs-website, which serves both callers.
 */

import { makePicture } from '../../scripts/ak.js';
import { STATUSES } from '../../scripts/utils/status-model.js';
import { getImplementationById } from '../../scripts/utils/implementations.js';

/** The card's only link. The image is decorative, so the title names the card. */
const buildTitle = ({ title, path }) => {
  if (!title) { return null; }

  const wrapper = document.createElement('p');
  wrapper.className = 'card-grid-item-title';
  const link = document.createElement('a');
  link.href = path;
  link.textContent = title;
  wrapper.append(link);
  return wrapper;
};

const buildDescription = (description) => {
  if (!description) { return null; }

  const paragraph = document.createElement('p');
  paragraph.className = 'card-grid-item-description';
  paragraph.textContent = description;
  return paragraph;
};

const buildImage = (image) => {
  if (!image) { return null; }

  const wrapper = document.createElement('div');
  wrapper.className = 'card-grid-item-image';
  wrapper.append(makePicture(image, { alt: '' }));
  return wrapper;
};

const buildImpl = (implementation) => {
  const impl = getImplementationById(implementation);
  if (!impl) { return null; }

  const label = document.createElement('span');
  label.className = 'card-grid-item-impl';
  label.textContent = impl.shortLabel;
  return label;
};

/** Mirrors the status-table badge: a data hook plus the unified label. */
const buildStatus = (status) => {
  const model = STATUSES[status];
  if (!model) { return null; }

  const badge = document.createElement('span');
  badge.className = 'card-grid-item-status';
  badge.dataset.status = model.id;
  badge.style.setProperty('--status-color', `var(${model.color})`);
  badge.textContent = model.label;
  return badge;
};

const buildMeta = ({ implementation, status }) => {
  const parts = [buildImpl(implementation), buildStatus(status)].filter(Boolean);
  if (!parts.length) { return null; }

  const meta = document.createElement('p');
  meta.className = 'card-grid-item-meta';
  meta.append(...parts);
  return meta;
};

/*
 * The card's badge row: team, subject and steward, in the order card-grid
 * supplies them. A real `ul`, because it is a list of peers - `role="list"`
 * is spelled out because `list-style: none` drops the role in Safari, the
 * same reason .card-grid-list carries it.
 */
const buildBadges = (badges) => {
  if (!badges?.length) { return null; }

  const list = document.createElement('ul');
  list.className = 'card-grid-item-badges';
  list.setAttribute('role', 'list');

  badges.forEach(({ field, value }) => {
    const item = document.createElement('li');
    item.className = 'card-grid-item-badge';
    // The field is the hook for styling or testing one badge apart from the
    // others; the viewer reads the value alone.
    item.dataset.field = field;
    item.textContent = value;
    list.append(item);
  });

  return list;
};

/**
 * Fills `root` with one card. Copy is set as text, never as markup, because
 * every value is authored.
 *
 * @param {object} data - an index row: `path` (required), `title`,
 *   `description`, `image`, `implementation`, `status`, and `badges`.
 * @param {Element} [root] - element to fill; a new `div` when omitted.
 * @returns {Element} the filled root.
 */
export const buildCardItem = (data, root = document.createElement('div')) => {
  root.classList.add('card-grid-item');

  const body = document.createElement('div');
  body.className = 'card-grid-item-body';
  body.append(...[
    buildTitle(data),
    buildDescription(data.description),
    buildMeta(data),
  ].filter(Boolean));

  root.replaceChildren(...[
    buildImage(data.image),
    body,
    buildBadges(data.badges),
  ].filter(Boolean));

  return root;
};
