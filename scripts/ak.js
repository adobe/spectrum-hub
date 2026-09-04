/*
 * Copyright 2026 Adobe. All rights reserved.
 * This file is licensed to you under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License. You may obtain a copy
 * of the License at http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software distributed under
 * the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR REPRESENTATIONS
 * OF ANY KIND, either express or implied. See the License for the specific language
 * governing permissions and limitations under the License.
 */

const LOG = async (ex, el) => (await import('./utils/error.js')).default(ex, el);

export function getMetadata(name) {
  const attr = name && name.includes(':') ? 'property' : 'name';
  const meta = document.head.querySelector(`meta[${attr}="${name}"]`);
  return meta && meta.content;
}

export function getScheme() {
  const stored = localStorage.getItem('color-scheme');
  if (stored === 'dark-scheme' || stored === 'light-scheme') { return stored; }
  return matchMedia('(prefers-color-scheme: dark)').matches
    ? 'dark-scheme'
    : 'light-scheme';
}

export function setScheme(el, scheme) {
  // Only persist an explicit selection
  if (el === document.body && scheme) {
    localStorage.setItem('color-scheme', scheme);
  }
  const newScheme = scheme || getScheme();
  if (el) {
    el.classList.remove('dark-scheme', 'light-scheme');
    el.classList.add(newScheme);
  }
  return newScheme;
}

export function getLocale(locales = { '': {} }) {
  const { pathname } = window.location;
  const matches = Object.keys(locales).filter((locale) => pathname.startsWith(`${locale}/`));
  const prefix = getMetadata('locale') || matches.sort((a, b) => b.length - a.length)?.[0] || '';
  if (locales[prefix].lang) { document.documentElement.lang = locales[prefix].lang; }
  return { prefix, ...locales[prefix] };
}

export const [setConfig, getConfig] = (() => {
  let config;
  return [
    (conf = {}) => {
      config = {
        ...conf,
        log: conf.log || LOG,
        locale: getLocale(conf.locales),
        codeBase: `${import.meta.url.replace('/scripts/ak.js', '')}`,
      };
      return config;
    },
    () => (config || setConfig()),
  ];
})();

const isImsHash = () => {
  const { hash } = window.location;
  const hashKeys = ['access_token', 'old_hash', 'ld_hash'];
  return hashKeys.some((key) => hash.includes(key));
};

// The readable companion to the HttpOnly spectrum_session cookie, set by the
// worker in lockstep with it (see DEFAULT_SESSION_HINT_COOKIE_NAME). Its
// presence in document.cookie means a live server session exists; unlike a
// localStorage proxy it expires and clears with the real cookie, so it cannot
// drift out of sync.
const hasStoredSession = () => document.cookie.includes('spectrum_session_active=');

export const checkIms = async () => {
  // Soft check: not returning from IMS and no session marker => anonymous.
  if (!isImsHash() && !hasStoredSession()) { return { anonymous: true }; }

  // Hard check: loadIms returns { anonymous: true } or the full details.
  const { loadIms } = await import('./utils/ims.js');
  return loadIms();
};

export const removeForAudience = async ({ publicEl, privateEl }) => {
  // Off-CDN (authoring/preview): always show the private/gated content.
  if (!getConfig().cdnEnv) {
    publicEl?.remove();
    return;
  }

  // On-CDN: only an authorized session keeps the private el; anonymous and
  // signed-in-without-access both report anonymous here and keep the public el.
  const { anonymous } = await checkIms();
  if (anonymous) {
    privateEl?.remove();
  } else {
    publicEl?.remove();
  }
};

// Class-based counterpart to removeForAudience for whole blocks marked with an
// `audience-public` / `audience-private` class. On the production CDN the worker
// strips these server-side, so this is the authoritative pass only where the
// worker is bypassed - notably the aem.page staging origin - and defense in
// depth elsewhere. It follows the same rule as removeForAudience: off-CDN shows
// the gated (private) content; on-CDN it keys off IMS. Runs before blocks load
// so a hidden block is never fetched or decorated.
export const decorateAudience = async (area) => {
  const publicEls = [...area.querySelectorAll('.audience-public')];
  const privateEls = [...area.querySelectorAll('.audience-private')];
  if (!publicEls.length && !privateEls.length) { return; }

  const remove = (els) => els.forEach((el) => el.remove());

  // Off-CDN (authoring/preview): show the gated content, drop the public copy.
  if (!getConfig().cdnEnv) {
    remove(publicEls);
    return;
  }

  // On-CDN these are usually already gone (worker-stripped); if not, honour IMS.
  const { anonymous } = await checkIms();
  remove(anonymous ? privateEls : publicEls);
};

export async function loadStyle(path) {
  const href = path.startsWith('/') ? `${getConfig().codeBase}${path}` : path;

  return new Promise((resolve) => {
    if (!document.querySelector(`head > link[href="${href}"]`)) {
      const link = document.createElement('link');
      link.rel = 'stylesheet';
      link.href = href;
      link.onload = resolve;
      link.onerror = resolve;
      document.head.append(link);
    } else {
      resolve();
    }
  });
}

export async function loadExperience(el, type, name, style) {
  const { codeBase } = getConfig();
  const path = `${codeBase}/${type}/${name}/${name}`;
  const loading = [new Promise((resolve) => {
    (async () => {
      try {
        await (await import(`${path}.js`)).default(el);
      } catch (ex) {
        getConfig().log(ex, el);
      }
      resolve();
    })();
  })];
  if (style) { loading.push(loadStyle(`${path}.css`)); }
  await Promise.all(loading);
  return el;
}

export async function loadBlock(block) {
  const { components } = getConfig();
  const [name] = block.classList;
  block.dataset.blockName = name;
  const style = !components.some((cmp) => name === cmp);
  await loadExperience(block, 'blocks', name, style);
  return block;
}

export const makePicture = (path, opts = {}) => {
  const { format = 'webp', loading = 'lazy', sizes = [1000, 2000] } = opts;
  const url = path.startsWith('/') ? new URL(path, window.location.origin) : new URL(path);
  const base = `${url.origin}${url.pathname}`;

  // DNF will give a picture without any optimizations
  const makeUrl = (params) => `${base}?${new URLSearchParams(params)}`;

  // Smallest rendition is served at reduced quality
  // doubles as mobile <source> and the <img> fallback.
  const mobile = opts.dnf ? base : makeUrl({ width: 750, format, quality: 80 });

  const picture = document.createElement('picture');
  if (opts.class) { picture.className = opts.class; }

  const img = document.createElement('img');
  img.alt = opts.alt ?? '';
  if (loading) { img.loading = loading; }
  if (opts.width) { img.width = opts.width; }
  if (opts.height) { img.height = opts.height; }
  img.src = mobile;

  if (!opts.dnf) {
    img.sizes = 'auto';
    img.srcset = [
      `${mobile} 750w`,
      ...sizes.map((size) => `${makeUrl({ width: size, format, quality: 80 })} ${size}w`),
    ].join(',');

    const source = document.createElement('source');
    source.media = '(width < 600px)';
    source.srcset = mobile;
    picture.append(source);
  }

  picture.append(img);
  return picture;
};

export const toClassName = (name) => (typeof name === 'string'
  ? name
    .toLowerCase()
    .replace(/[^0-9a-z]/gi, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
  : '');

function decoratePictures(el) {
  const pngSelect = '.png?width=2000&format=webply&optimize=medium';
  const pngReplace = '.png?width=2000&format=png';

  const pics = el.querySelectorAll('picture:has([loading])');
  for (const pic of pics) {
    const desktopPngSrc = pic.querySelector(`[srcset*="${pngSelect}"]`);
    if (desktopPngSrc) {
      desktopPngSrc.srcset = desktopPngSrc.srcset.replace(pngSelect, pngReplace);
      desktopPngSrc.type = 'image/png';
    } else {
      const source = pic.querySelector('source');
      const clone = source.cloneNode();
      const [pathname, params] = clone.getAttribute('srcset').split('?');
      const search = new URLSearchParams(params);
      search.set('width', 3000);
      clone.setAttribute('srcset', `${pathname}?${search.toString()}`);
      clone.setAttribute('media', '(min-width: 1440px)');
      pic.prepend(clone);
    }
  }
}

function decorateButton(link) {
  // Property detection
  const { title } = link;
  if (title && title.includes(':')) {
    title.split('|').forEach((kv) => {
      const [key, val] = kv.replaceAll(' ', '').split(':');
      link.dataset[key] = val;
    });
    link.removeAttribute('title');

    // async for perf, will be left detached from doc
    const { audience } = link.dataset;
    if (audience) {
      removeForAudience({
        privateEl: audience === 'private' ? link : null,
        publicEl: audience === 'public' ? link : null,
      });
    }
  }

  const isEm = link.closest('em');
  const isStrong = link.closest('strong');
  const isStrike = link.closest('del');
  const isUnder = link.querySelector('u');
  if (!(isEm || isStrong || isStrike || isUnder)) { return; }
  const trueParent = link.closest('p, li, div');
  if (!trueParent) { return; }
  const siblings = [...trueParent.childNodes];

  const hasSibling = siblings.every(
    (el) => el.nodeName === 'A'
    || el.nodeName === 'EM'
    || el.nodeName === 'STRONG'
    || el.nodeName === 'DEL'
    || !el.textContent.trim(),
  );
  if (!hasSibling) { return; }

  // Always add the se-button wrapper and load buttons.css
  trueParent.classList.add('btn-group', 'se-button');
  loadStyle('/deps/se/buttons.css');

  link.classList.add('btn');
  if (isStrike) {
    link.classList.add('negative');
  } else if (isEm && isStrong) {
    link.classList.add('accent');
  } else if (isStrong) {
    link.classList.add('primary');
  } else if (isEm) {
    link.classList.add('secondary');
  }
  if (isUnder) {
    link.classList.add('outline');
    link.innerHTML = isUnder.innerHTML;
    isUnder.remove();
  }
  const toReplace = [isEm, isStrong, isStrike].find((el) => el?.parentNode === trueParent);
  if (toReplace) { toReplace.replaceWith(link); }
}

export function localizeUrl({ config, url }) {
  const { locales, locale } = config;

  // If in root locale, do nothing
  if (locale.prefix === '') { return null; }

  const { origin, pathname, search, hash } = url;

  // If the link is already localized, do nothing
  if (pathname.startsWith(`${locale.prefix}/`)) { return null; }

  const localized = Object.keys(locales).some(
    (key) => key !== '' && pathname.startsWith(`${key}/`),
  );
  if (localized) { return null; }

  return new URL(`${origin}${locale.prefix}${pathname}${search}${hash}`);
}

function decorateHash(a, url) {
  const { hash } = url;
  if (!hash || hash === '#') { return {}; }

  const findHash = (name) => {
    const found = hash.includes(name);
    if (found) { a.href = a.href.replace(name, ''); }
    return found;
  };

  const blank = findHash('#_blank');
  if (blank) { a.target = '_blank'; }

  const dnt = findHash('#_dnt');
  const dnb = findHash('#_dnb');
  return { dnt, dnb };
}

export function decorateLink(config, a) {
  try {
    const url = new URL(a.href);
    const hostMatch = config.hostnames.some((host) => url.hostname === host);
    if (hostMatch) { a.href = a.href.replace(url.origin, ''); }

    const isRelative = a.getAttribute('href').startsWith('/');
    const { dnt, dnb } = decorateHash(a, url);
    if (isRelative && !dnt) {
      const localized = localizeUrl({ config, url });
      if (localized) { a.href = localized.href; }
    }
    decorateButton(a);
    if (!dnb) {
      const { href } = a;
      const found = config.linkBlocks.some((pattern) => {
        const key = Object.keys(pattern)[0];
        if (!href.includes(pattern[key])) { return false; }
        a.classList.add(key, 'auto-block');
        return true;
      });
      if (found) { return a; }
    }
  } catch (ex) {
    config.log('Could not decorate link', ex);
  }
  return null;
}

function decorateLinks(el) {
  const config = getConfig();
  const anchors = [...el.querySelectorAll('a')];
  return anchors.reduce((acc, a) => {
    const decorated = decorateLink(config, a);
    if (decorated) { acc.push(decorated); }
    return acc;
  }, []);
}

function loadIcons(el) {
  const icons = [...el.querySelectorAll('span.icon')];
  if (!icons.length) { return; }
  const svgs = icons.reduce((acc, icon) => {
    const lastClass = Array.from(icon.classList).pop();
    if (lastClass.startsWith('icon-size-')) {
      const prefix = icon.parentElement.nodeName.startsWith('H') ? 'heading' : 'text';
      icon.parentElement.classList.add(lastClass.replace('icon', prefix));
      icon.remove();
    } else {
      acc.push(icon);
    }
    return acc;
  }, []);
  import('./utils/svg.js').then((mod) => mod.default(svgs));
}

function groupChildren(section) {
  const children = section.querySelectorAll(':scope > *');
  const groups = [];
  let currentGroup = null;
  for (const child of children) {
    const isDiv = child.tagName === 'DIV';
    const currentType = currentGroup?.classList.contains('block-content');

    if (!currentGroup || currentType !== isDiv) {
      currentGroup = document.createElement('div');
      currentGroup.className = isDiv
        ? 'block-content' : 'default-content';
      groups.push(currentGroup);
    }

    currentGroup.append(child);
  }
  return groups;
}

function decorateSections(parent, isDoc) {
  const selector = isDoc ? 'main > div' : ':scope > div';
  return [...parent.querySelectorAll(selector)].map((section) => {
    const groups = groupChildren(section);
    section.append(...groups);
    section.classList.add('section');
    section.dataset.status = 'decorated';
    section.linkBlocks = decorateLinks(section);
    section.blocks = [...section.querySelectorAll('.block-content > div[class]')];
    return section;
  });
}

function decorateHeader() {
  const header = document.querySelector('header');
  if (!header) { return; }
  const meta = getMetadata('header') || 'header';
  if (meta === 'off') {
    document.body.classList.add('no-header');
    header.remove();
    return;
  }
  header.className = meta;
}

export async function loadNav() {
  const template = getMetadata('template');
  const sitenav = getMetadata('sitenav');
  const pagenav = getMetadata('pagenav');

  if (sitenav !== 'off') {
    await Promise.all([
      loadStyle('/blocks/sitenav/sitenav.css'),
      import('../blocks/sitenav/sitenav.js'),
    ]);
  }

  if (template !== 'marketing') {
    if (pagenav !== 'off') {
      await Promise.all([
        loadStyle('/blocks/page-nav/page-nav.css'),
        import('../blocks/page-nav/page-nav.js'),
      ]);
    }
  }
}

function decorateDoc() {
  decorateHeader();

  const pageId = window.location.hash?.replace('#', '');
  if (pageId) { localStorage.setItem('lazyhash', pageId); }
}

async function loadSession() {
  sessionStorage.setItem('session', true);
  document.body.classList.add('session');
  const header = document.querySelector('header');
  if (header) { loadBlock(header); }
  if (!document.body.classList.contains('is-returning')) {
    loadNav();
  }
}

export async function loadArea({ area } = { area: document }) {
  const isDoc = area === document;
  const isSession = sessionStorage.getItem('session');
  if (isDoc) { decorateDoc(isSession); }
  const { decorateArea } = getConfig();
  if (decorateArea) { decorateArea({ area }); }
  // Resolve audience-gated blocks before decorating/loading, so a block this
  // viewer must not see is never fetched. On the CDN the worker already did
  // this; it matters where the worker is bypassed (e.g. the aem.page staging
  // origin).
  await decorateAudience(area);
  decoratePictures(area);
  const sections = decorateSections(area, isDoc);
  if (isDoc && isSession) { loadSession(); }
  for (const [idx, section] of sections.entries()) {
    loadIcons(section);
    await Promise.all(section.linkBlocks.map((block) => loadBlock(block)));
    await Promise.all(section.blocks.map((block) => loadBlock(block)));
    delete section.dataset.status;
    if (isDoc && idx === 0) {
      if (!isSession) { loadSession(); }
    }
  }
  if (isDoc) { import('./lazy.js'); }
}
