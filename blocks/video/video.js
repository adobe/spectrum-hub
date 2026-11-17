import { getConfig } from '../../scripts/ak.js';
import {
  getAuthoredCells,
  getCellLinkHref,
  getCellMedia,
  getCellText,
  toSafeHttpUrl,
} from '../../scripts/utils/cells.js';

const YOUTUBE_ID_RE = /^[A-Za-z0-9_-]{11}$/;
const YOUTUBE_HOSTS = ['youtube.com', 'm.youtube.com', 'youtube-nocookie.com'];
const YOUTUBE_ID_PATHS = ['embed', 'shorts', 'live', 'v'];
const DEFAULT_PLAY_LABEL = 'Play video';
const YOUTUBE_POSTER_PLACEHOLDER_WIDTH = 120;
const ADOBE_VIDEO_ORIGIN = 'https://video.tv.adobe.com';
const ADOBE_VIDEO_HOST = 'video.tv.adobe.com';
const ADOBE_POSTER_HOST = 'images-tv.adobe.com';
/** Numeric id with an optional registered tracking suffix, e.g. 3477418t1. */
const ADOBE_VIDEO_PATH_RE = /^\/v\/(\d+(?:t\d+)?)(?:\/|$)/;
const TRANSCRIPT_LABEL = 'View transcript';
const SVG_NS = 'http://www.w3.org/2000/svg';

let transcriptCount = 0;

const PLAY_ICON_SVG = `
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 12 12" width="12" height="12" focusable="false">
    <path fill="currentColor" d="M9.95 5.079c.467.269.467.943 0 1.212L3.05 10.275C2.583 10.544 2 10.207 2 9.668V1.701c0-.539.583-.876 1.05-.606z"/>
  </svg>
`.trim();

/**
 * Extracts an 11-character YouTube video id from a URL.
 * Supports watch, youtu.be, embed, shorts, live, and `/v/` URLs.
 *
 * @param {string} href Candidate URL
 * @returns {string} Video id, or an empty string
 */
export function getYoutubeId(href) {
  if (!href) { return ''; }
  try {
    const url = new URL(href);
    const host = url.hostname.replace(/^www\./, '');
    let id = '';

    if (host === 'youtu.be') {
      [id] = url.pathname.split('/').filter(Boolean);
    } else if (YOUTUBE_HOSTS.includes(host)) {
      id = url.searchParams.get('v') || '';
      if (!id) {
        const parts = url.pathname.split('/').filter(Boolean);
        if (YOUTUBE_ID_PATHS.includes(parts[0])) { [, id] = parts; }
      }
    }

    return YOUTUBE_ID_RE.test(id) ? id : '';
  } catch {
    return '';
  }
}

/**
 * Extracts an Adobe Video Publishing Cloud id from a video.tv.adobe.com URL.
 * Supports `/v/{id}`, a trailing slash, extra path segments, and a query
 * string. The `t{n}` tracking suffix is kept, because it is part of a valid
 * embed URL rather than decoration on the id.
 *
 * @param {string} href Candidate URL
 * @returns {string} Video id such as `3503885` or `3477418t1`, or an empty string
 */
export function getAdobeVideoId(href) {
  if (!href) { return ''; }
  try {
    const url = new URL(href);
    if (!['http:', 'https:'].includes(url.protocol)) { return ''; }
    if (url.hostname.toLowerCase() !== ADOBE_VIDEO_HOST) { return ''; }
    return url.pathname.match(ADOBE_VIDEO_PATH_RE)?.[1] || '';
  } catch {
    return '';
  }
}

/**
 * Identifies the video provider and id for an authored URL.
 *
 * @param {string} href Candidate URL
 * @returns {{ provider: string, id: string, params: URLSearchParams }|null}
 * Provider, video id, and the author's query params; null when unsupported
 */
export function getVideoSource(href) {
  const youtubeId = getYoutubeId(href);
  if (youtubeId) { return { provider: 'youtube', id: youtubeId, params: new URLSearchParams() }; }
  const adobeId = getAdobeVideoId(href);
  if (adobeId) { return { provider: 'adobe', id: adobeId, params: new URL(href).searchParams }; }
  return null;
}

/**
 * YouTube thumbnail URL for a video id.
 *
 * @param {string} id YouTube video id
 * @param {'maxresdefault'|'hqdefault'} [quality] Thumbnail size
 * @returns {string}
 */
function youtubePosterUrl(id, quality = 'maxresdefault') {
  return `https://img.youtube.com/vi/${encodeURIComponent(id)}/${quality}.jpg`;
}

/**
 * Poster image served by the YouTube image CDN.
 *
 * @param {string} id YouTube video id
 * @returns {HTMLImageElement}
 */
function buildYoutubePoster(id) {
  const img = document.createElement('img');
  img.src = youtubePosterUrl(id);
  img.alt = '';
  img.width = 1280;
  img.height = 720;
  img.decoding = 'async';
  img.loading = 'lazy';

  // Not every video has a maxres thumbnail. A missing one either fails
  // outright or returns a tiny grey placeholder, so check both.
  let fallbackApplied = false;
  const useHqDefault = () => {
    if (fallbackApplied) { return; }
    fallbackApplied = true;
    img.src = youtubePosterUrl(id, 'hqdefault');
  };

  img.addEventListener('error', useHqDefault);
  img.addEventListener('load', () => {
    if (img.naturalWidth <= YOUTUBE_POSTER_PLACEHOLDER_WIDTH) { useHqDefault(); }
  });

  return img;
}

/**
 * Adobe Video Publishing Cloud poster. The `format=jpeg` frame is small, so it
 * shows first and is replaced by the oEmbed thumbnail when one is available.
 *
 * @param {string} id Adobe video id
 * @returns {HTMLImageElement}
 */
function buildAdobePoster(id) {
  const img = document.createElement('img');
  img.src = `${ADOBE_VIDEO_ORIGIN}/v/${encodeURIComponent(id)}?format=jpeg`;
  img.alt = '';
  img.width = 1280;
  img.height = 720;
  img.decoding = 'async';
  img.loading = 'lazy';
  return img;
}

/**
 * Adobe oEmbed thumbnail URL, accepted only when it is an https image on the
 * Adobe video image CDN. The payload is third-party data, so the host is
 * checked rather than trusted.
 *
 * @param {unknown} value Candidate thumbnail URL from oEmbed
 * @returns {string}
 */
function getAdobeThumbnailUrl(value) {
  if (typeof value !== 'string') { return ''; }
  try {
    const url = new URL(value);
    return url.protocol === 'https:' && url.hostname === ADOBE_POSTER_HOST ? url.href : '';
  } catch {
    return '';
  }
}

/** Per-provider poster builder and player settings. */
const PROVIDERS = {
  youtube: {
    buildPoster: buildYoutubePoster,
    embedSrc(id) {
      const params = new URLSearchParams({ rel: '0', cc_load_policy: '1', autoplay: '1' });
      return `https://www.youtube-nocookie.com/embed/${encodeURIComponent(id)}?${params}`;
    },
    allow: 'accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; fullscreen',
    oembedUrl(id) {
      const url = new URL('https://www.youtube.com/oembed');
      url.searchParams.set('format', 'json');
      url.searchParams.set('url', `https://www.youtube.com/watch?v=${id}`);
      return url;
    },
  },
  adobe: {
    buildPoster: buildAdobePoster,
    embedSrc(id, authorParams) {
      // Keep authored player options such as `t` and `learn`; always autoplay,
      // since the viewer reached the player by pressing play.
      const params = new URLSearchParams(authorParams);
      if (!params.has('hidetitle')) { params.set('hidetitle', '1'); }
      if (!params.has('captions')) { params.set('captions', '1'); }
      params.set('autoplay', '1');
      return `${ADOBE_VIDEO_ORIGIN}/v/${encodeURIComponent(id)}/?${params}`;
    },
    allow: 'autoplay; encrypted-media; picture-in-picture; fullscreen',
    oembedUrl(id) {
      const url = new URL(`${ADOBE_VIDEO_ORIGIN}/oembed`);
      url.searchParams.set('format', 'json');
      url.searchParams.set('url', `${ADOBE_VIDEO_ORIGIN}/v/${id}/`);
      return url;
    },
    // The default frame is too small to use as a poster on its own.
    upgradesPoster: true,
  },
};

/**
 * Fetches public oEmbed metadata. Returns empty fields on network or payload
 * failure, so the play control and poster keep their fallbacks.
 *
 * @param {URL} url oEmbed endpoint URL
 * @returns {Promise<{ title: string, thumbnailUrl: unknown }>}
 */
async function fetchOembed(url) {
  const empty = { title: '', thumbnailUrl: '' };
  try {
    const resp = await window.fetch(url);
    if (!resp.ok) { return empty; }
    const payload = await resp.json();
    return {
      title: typeof payload.title === 'string' ? payload.title.replace(/\s+/g, ' ').trim() : '',
      thumbnailUrl: payload.thumbnail_url,
    };
  } catch {
    return empty;
  }
}

/**
 * Whether `text` names the video rather than repeating its URL.
 *
 * @param {string} text Authored link or cell text
 * @param {string} href Authored URL
 * @returns {boolean}
 */
function isCustomText(text, href) {
  return Boolean(text) && text !== href && !/^https?:\/\//i.test(text);
}

/**
 * Accessible name for the play control. Uses the authored text when it names
 * the video; otherwise falls back to the id until oEmbed supplies a title.
 *
 * @param {string} text Authored link or cell text
 * @param {string} href Authored URL
 * @param {string} id Video id
 * @returns {string}
 */
function getPlayLabel(text, href, id) {
  if (isCustomText(text, href)) { return `${DEFAULT_PLAY_LABEL}: ${text}`; }
  return id ? `${DEFAULT_PLAY_LABEL} ${id}` : DEFAULT_PLAY_LABEL;
}

/**
 * Reads the authored fields from a link-triggered instance.
 *
 * @param {HTMLAnchorElement} a The auto-blocked anchor
 * @returns {object} Authored href, source, play label, and custom-label flag
 */
function getLinkData(a) {
  const { href } = a;
  const text = a.textContent.trim();
  const source = getVideoSource(href);
  return {
    href,
    source,
    playLabel: getPlayLabel(text, href, source?.id),
    hasCustomPlayLabel: isCustomText(text, href),
    posterMedia: null,
    transcriptCell: undefined,
  };
}

/**
 * First picture or image in the block that is not in the URL cell.
 *
 * @param {Element} block The video block
 * @param {Element} [urlCell] URL value cell to skip
 * @returns {Element|null}
 */
function getAuthoredPosterMedia(block, urlCell) {
  return [...block.children]
    .flatMap((row) => [...row.children])
    .filter((cell) => cell !== urlCell)
    .map(getCellMedia)
    .find(Boolean) || null;
}

/**
 * Reads the authored fields from a table-authored block.
 *
 * @param {Element} block The video block
 * @returns {object} Authored href, source, play label, custom-label flag,
 * poster media, and transcript cell
 */
function getBlockData(block) {
  const cells = getAuthoredCells(block);
  const urlCell = cells['video-url'] ?? cells['youtube-url'];
  const href = getCellLinkHref(urlCell) || toSafeHttpUrl(getCellText(urlCell));
  const text = getCellText(urlCell);
  const source = getVideoSource(href);
  return {
    href,
    source,
    playLabel: getPlayLabel(text, href, source?.id),
    hasCustomPlayLabel: isCustomText(text, href),
    posterMedia: getAuthoredPosterMedia(block, urlCell),
    transcriptCell: cells.transcript,
  };
}

/**
 * Right-pointing chevron for the transcript disclosure.
 *
 * @returns {HTMLSpanElement}
 */
function buildTranscriptChevron() {
  const wrap = document.createElement('span');
  wrap.className = 'video-transcript-icon';
  wrap.setAttribute('aria-hidden', 'true');

  const svg = document.createElementNS(SVG_NS, 'svg');
  svg.setAttribute('viewBox', '0 0 10 10');
  svg.setAttribute('width', '10');
  svg.setAttribute('height', '10');
  svg.setAttribute('focusable', 'false');

  const path = document.createElementNS(SVG_NS, 'path');
  path.setAttribute('fill', 'currentColor');
  path.setAttribute(
    'd',
    'M3.25 1.22a.75.75 0 0 1 1.06 0l3.47 3.47a.75.75 0 0 1 0 1.06L4.31 9.22a.75.75 0 1 1-1.06-1.06L6.19 5.22 3.25 2.28a.75.75 0 0 1 0-1.06z',
  );
  svg.append(path);
  wrap.append(svg);
  return wrap;
}

/**
 * Closed "View transcript" disclosure built from the authored cell.
 * Returns null when the cell is missing or empty.
 *
 * @param {Element} [cell] Transcript value cell
 * @returns {HTMLDetailsElement|null}
 */
function buildTranscript(cell) {
  if (!getCellText(cell)) { return null; }

  const details = document.createElement('details');
  details.className = 'video-transcript';
  transcriptCount += 1;
  details.id = `video-transcript-${transcriptCount}`;

  const summary = document.createElement('summary');
  summary.append(buildTranscriptChevron(), document.createTextNode(TRANSCRIPT_LABEL));

  const panel = document.createElement('div');
  panel.className = 'video-transcript-panel';
  panel.append(...cell.childNodes);

  details.append(summary, panel);
  return details;
}

/**
 * Visually hidden live region used to announce the player load.
 *
 * @returns {HTMLParagraphElement}
 */
function buildStatus() {
  const status = document.createElement('p');
  status.className = 'visually-hidden';
  status.setAttribute('role', 'status');
  status.setAttribute('aria-live', 'polite');
  status.setAttribute('aria-atomic', 'true');
  return status;
}

/**
 * Iframe title derived from the play control's name.
 *
 * @param {string} playLabel Button accessible name
 * @returns {string}
 */
function getPlayerTitle(playLabel) {
  return playLabel.replace(/^Play\s+(?:video:\s+)?/i, '').trim() || 'video';
}

/**
 * Replaces the poster with the provider's player and moves focus into it.
 * Only the stage is replaced, so a transcript disclosure stays in the block.
 *
 * @param {Element} block The video block
 * @param {{ source: object, playLabel: string }} data Source and button label
 */
function loadEmbed(block, { source, playLabel }) {
  const provider = PROVIDERS[source.provider];

  const iframe = document.createElement('iframe');
  iframe.src = provider.embedSrc(source.id, source.params);
  iframe.title = getPlayerTitle(playLabel);
  iframe.allow = provider.allow;
  const transcript = block.querySelector('.video-transcript');
  if (transcript) { iframe.setAttribute('aria-describedby', transcript.id); }

  const player = document.createElement('div');
  player.className = 'video-player';
  player.append(iframe);

  const status = block.querySelector('[role="status"]');
  if (status) { status.textContent = 'Video player loaded'; }

  block.querySelector('.video-stage').replaceChildren(player);
  // Focus the player so keyboard users land on the controls they just asked for.
  iframe.focus();
}

/**
 * Builds the poster facade and writes it into `block`.
 *
 * @param {object} data Authored video fields
 * @param {Element} block The video block
 */
function buildVideo(data, block) {
  const {
    source, posterMedia, hasCustomPlayLabel, transcriptCell,
  } = data;
  let { playLabel } = data;
  const provider = PROVIDERS[source.provider];
  const poster = posterMedia || provider.buildPoster(source.id);

  const button = document.createElement('button');
  button.type = 'button';
  button.className = 'video-poster';
  button.setAttribute('aria-label', playLabel);

  // The image is decorative; the button label names the video.
  const media = document.createElement('span');
  media.className = 'video-media';
  media.setAttribute('aria-hidden', 'true');
  media.append(poster);

  const icon = document.createElement('span');
  icon.className = 'video-play-icon';
  icon.setAttribute('aria-hidden', 'true');
  icon.innerHTML = PLAY_ICON_SVG;

  button.append(media, icon);
  button.addEventListener('click', () => loadEmbed(block, { source, playLabel }));

  const stage = document.createElement('div');
  stage.className = 'video-stage';
  stage.append(button);

  // Read the transcript cell before replaceChildren discards the authored rows.
  const transcript = buildTranscript(transcriptCell);
  block.replaceChildren(stage, buildStatus());
  if (transcript) {
    button.setAttribute('aria-describedby', transcript.id);
    block.append(transcript);
  }

  // Ask the provider for metadata only when something is still missing: a name
  // the author did not write, or a poster this provider serves too small.
  const canUpgradePoster = Boolean(provider.upgradesPoster) && !posterMedia;
  if (hasCustomPlayLabel && !canUpgradePoster) { return; }

  fetchOembed(provider.oembedUrl(source.id)).then(({ title, thumbnailUrl }) => {
    // The player may already have replaced the poster this describes.
    if (!block.contains(button)) { return; }
    if (title && !hasCustomPlayLabel) {
      playLabel = `${DEFAULT_PLAY_LABEL}: ${title}`;
      button.setAttribute('aria-label', playLabel);
    }
    const hiResPoster = canUpgradePoster && getAdobeThumbnailUrl(thumbnailUrl);
    if (hiResPoster) { poster.src = hiResPoster; }
  });
}

/**
 * Whether `el` is the only content of `parent`, ignoring whitespace.
 *
 * @param {Element} parent Candidate wrapper
 * @param {Element} el The element it may wrap
 * @returns {boolean}
 */
function holdsOnly(parent, el) {
  return [...parent.childNodes].every((node) => node === el
    || (node.nodeType === Node.TEXT_NODE && !node.textContent.trim()));
}

/**
 * Swaps a link-triggered anchor for a block-level container, keeping the
 * classes the auto-block put on it. An anchor is inline and cannot hold the
 * player, so this is the one case where the block makes its own root.
 *
 * @param {HTMLAnchorElement} a The auto-blocked anchor
 * @returns {HTMLDivElement} The container that replaced it
 */
function replaceLink(a) {
  const container = document.createElement('div');
  container.className = a.className;
  const parent = a.parentElement;
  // Replace the whole paragraph when the link was its only content, so the
  // player is not left nested inside a <p>. Authored markup usually puts the
  // link on its own line, so ignore the whitespace around it.
  if (parent?.tagName === 'P' && holdsOnly(parent, a)) {
    parent.replaceWith(container);
  } else {
    a.replaceWith(container);
  }
  return container;
}

/**
 * Removes an unusable instance and any container it leaves empty.
 *
 * @param {Element} el The authored anchor or block
 * @param {string} [href] Authored URL, if any
 */
function discard(el, href) {
  getConfig()?.log?.(`Video block: no playable video${href ? ` for ${href}` : ''}. Skipped rendering.`);
  const parent = el.parentElement;
  el.remove();
  if (!parent || parent.children.length || parent.textContent.trim()) { return; }
  if (parent.tagName === 'P' || parent.classList.contains('video-wrapper')) { parent.remove(); }
}

/**
 * Decorates a video instance. A YouTube URL becomes a poster image with a play
 * control that swaps in the embedded player when activated. The URL can be
 * link authored, through the `video` entry in `linkBlocks`, or table authored.
 * Unplayable URLs are not rendered.
 *
 * @param {Element} el The authored anchor or block element
 */
export default async function init(el) {
  const isLink = el.tagName === 'A';
  const data = isLink ? getLinkData(el) : getBlockData(el);
  if (!data.source) {
    discard(el, data.href);
    return;
  }
  buildVideo(data, isLink ? replaceLink(el) : el);
}
