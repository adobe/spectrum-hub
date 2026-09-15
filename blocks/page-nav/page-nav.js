import { getMetadata } from '../../scripts/ak.js';

// Widgets shown on every interior page.
const GLOBAL_WIDGETS = new Set(['copy-markdown']);

export function isComponentPath(pathname) {
  return pathname.split('/').includes('components');
}

// A page is "private" when it carries <meta name="audience" content="private">.
export function isPrivatePage() {
  return getMetadata('audience') === 'private';
}

export function shouldRenderWidget(widget, isComponentPage, isPrivate) {
  // A private widget is only offered on a private page. The backend does not
  // strip it at runtime, so this client check is the gate that keeps it out of
  // the public view.
  if (widget.private && !isPrivate) { return false; }
  return isComponentPage || GLOBAL_WIDGETS.has(widget.name);
}

function makeWidgetElement(tag, name, label, icon, getSvgRef) {
  const widgetEl = document.createElement(tag);
  widgetEl.className = 'action-button action-button-quiet';
  widgetEl.dataset.widget = name;
  widgetEl.append(getSvgRef(icon, 'icon'));
  const span = document.createElement('span');
  span.textContent = label;
  widgetEl.append(span);
  return widgetEl;
}

// Each widget's per-page decoration
async function decorateCopyMarkdown(button) {
  const { handleCopyMarkdown } = await import('../../scripts/utils/copy-md.js');
  button.addEventListener('click', handleCopyMarkdown);
}

async function decorateGoToImplWidget(a) {
  const { decorateGoToImpl } = await import('../../scripts/utils/go-to-impl.js');
  await decorateGoToImpl(a, a.querySelector('span'));
}

async function decorateSeeInFigmaWidget(a) {
  const { decorateSeeInFigma } = await import('../../scripts/utils/figma.js');
  await decorateSeeInFigma(a, a.querySelector('span'));
}

const WIDGETS = [
  {
    name: 'copy-markdown',
    tag: 'button',
    label: 'Copy markdown',
    icon: 'copy',
    decorate: decorateCopyMarkdown,
  },
  {
    name: 'go-to-impl',
    tag: 'a',
    label: 'Go to implementation',
    icon: 'openin',
    decorate: decorateGoToImplWidget,
  },
  {
    name: 'see-in-figma',
    tag: 'a',
    label: 'See in Figma',
    icon: 'vectordraw',
    decorate: decorateSeeInFigmaWidget,
    private: true,
  },
];

// Builds and decorates the URL-appropriate widget buttons/links and appends
// them below the nav's table of contents. Widgets decorate themselves away
async function renderWidgets(el) {
  const isComponentPage = isComponentPath(window.location.pathname);
  const isPrivate = isPrivatePage();
  const candidates = WIDGETS.filter(
    (widget) => shouldRenderWidget(widget, isComponentPage, isPrivate),
  );
  if (!candidates.length) { return; }

  const group = document.createElement('div');
  group.className = 'page-nav-widgets';
  const { getSvgRef } = await import('../../scripts/utils/svg.js');

  const elements = candidates.map(
    ({ tag, name, label, icon }) => makeWidgetElement(tag, name, label, icon, getSvgRef),
  );
  group.append(...elements);

  await Promise.all(candidates.map(({ decorate }, i) => decorate(elements[i])));

  if (!group.children.length) { return; }
  el.append(group);
}

function slugify(text) {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

function prepareHeading(heading, usedIds, normalizeSize = false) {
  const authoredId = normalizeSize
    ? heading.id.replace(/^size-[a-z0-9]+-/, '')
    : heading.id;
  const base = authoredId || slugify(heading.textContent);
  let id = base;
  let suffix = 2;
  while (usedIds.has(id)) {
    id = `${base}-${suffix}`;
    suffix += 1;
  }
  heading.id = id;
  heading.tabIndex = -1;
  heading.classList.add('page-nav-target');
  usedIds.add(id);
}

const SCROLL_KEYS = new Set([
  'ArrowUp',
  'ArrowDown',
  'PageUp',
  'PageDown',
  'Home',
  'End',
  ' ',
]);

function isEditableTarget(target) {
  return target instanceof Element
    && (target.isContentEditable
      || target.closest('input, textarea, select, button, [contenteditable]:not([contenteditable="false"])'));
}

// Keeps each link's aria-current in sync with the heading the visitor is reading.
function watchScrollSpy(headings, linkById) {
  let activeId = null;
  // A click (or the initial-hash scroll) can itself cause a heading to cross
  // the observer's band — most visibly when the target undershoots (a last
  // heading too close to the page's end) and an earlier heading is left
  // sitting in the band instead. Without this, the observer's own async
  // reaction to that scroll fires right after and steals the highlight back.
  // Suppressed until the visitor actually takes over scrolling themselves.
  let suppressed = false;

  const setActive = (id) => {
    if (id === activeId) {
      return;
    }
    if (activeId && linkById.get(activeId)) {
      linkById.get(activeId).removeAttribute('aria-current');
      linkById.get(activeId).classList.remove('is-current');
    }
    activeId = id;
    if (id && linkById.get(id)) {
      linkById.get(id).setAttribute('aria-current', 'location');
    }
  };

  // Top offset matches the site header so a heading registers as "active"
  // the moment it scrolls under the sticky chrome. Bottom -50% keeps it
  // from activating until it's well into the viewport.
  const navHeight = getComputedStyle(document.documentElement)
    .getPropertyValue('--sh-header-height').trim() || '56px';
  const rootMargin = `-${navHeight} 0px -50% 0px`;

  // Without this, clicking a link whose heading is already in the band (e.g.
  // the first section while at the top of the page) produces only an "exit"
  // event for the heading scrolling away
  const visible = new Set();

  let observer;
  const onScrollIntent = (event) => {
    if (event.type === 'keydown'
      && (!SCROLL_KEYS.has(event.key) || isEditableTarget(event.target))) {
      return;
    }
    suppressed = false;
  };
  const start = () => {
    if (observer) {
      return;
    }
    observer = new IntersectionObserver((entries) => {
      entries.forEach((e) => {
        if (e.isIntersecting) {
          visible.add(e.target);
        } else {
          visible.delete(e.target);
        }
      });
      if (suppressed || !visible.size) {
        return;
      }
      const topmost = [...visible].sort(
        (a, b) => a.getBoundingClientRect().top - b.getBoundingClientRect().top,
      )[0];
      setActive(topmost.id);
    }, { rootMargin });
    headings.forEach((heading) => observer.observe(heading));
    window.addEventListener('wheel', onScrollIntent, { passive: true });
    window.addEventListener('touchstart', onScrollIntent, { passive: true });
    window.addEventListener('keydown', onScrollIntent);
  };
  const stop = () => {
    if (!observer) {
      return;
    }
    observer.disconnect();
    observer = undefined;
    visible.clear();
    window.removeEventListener('wheel', onScrollIntent);
    window.removeEventListener('touchstart', onScrollIntent);
    window.removeEventListener('keydown', onScrollIntent);
  };

  return {
    syncActive: () => {
      if (activeId && linkById.has(activeId)) {
        linkById.get(activeId).setAttribute('aria-current', 'location');
      }
    },
    setActive,
    start,
    stop,
    suppress: () => { suppressed = true; },
    resume: () => { suppressed = false; },
  };
}

function navigateToHeading(heading) {
  heading.scrollIntoView({ block: 'start', behavior: 'instant' });
  heading.focus({ preventScroll: true });
}

(() => {
  const headings = [...document.querySelectorAll('main h2')];
  if (!headings.length) {
    return;
  }

  const h1 = document.querySelector('main h1');
  const targets = [...document.querySelectorAll('main h1, main h2')];
  const targetSet = new Set(targets);
  const usedIds = new Set(
    [...document.querySelectorAll('[id]')]
      .filter((element) => !targetSet.has(element))
      .map((element) => element.id),
  );
  targets.forEach((heading) => prepareHeading(heading, usedIds, heading.tagName === 'H2'));

  const linkById = new Map();
  const desktopMql = window.matchMedia('(width >= 1200px)');
  const placeholder = document.createComment('page-nav');
  document.body.append(placeholder);
  const scrollSpy = watchScrollSpy(h1 ? [...headings, h1] : headings, linkById);
  const {
    setActive,
    syncActive,
    suppress,
    resume,
  } = scrollSpy;

  const lastId = headings[headings.length - 1].id;
  // Resolved against our own collected headings rather than a document-wide
  // getElementById: some other element elsewhere on the page (e.g. the sitenav,
  // which slugifies its own category names into ids the same way) can happen to
  // share the same id, and getElementById would silently return that instead.
  const targetById = new Map((h1 ? [...headings, h1] : headings).map((h) => [h.id, h]));

  let pageNav;
  let widgetsStarted = false;
  const buildPageNav = () => {
    if (pageNav) {
      return pageNav;
    }
    pageNav = document.createElement('nav');
    pageNav.className = 'page-nav';
    pageNav.setAttribute('aria-label', 'On this page');
    pageNav.dataset.pageNav = 'ready';
    const list = document.createElement('ul');
    headings.forEach((heading) => {
      const li = document.createElement('li');
      const link = document.createElement('a');
      link.href = `#${heading.id}`;
      link.textContent = heading.textContent;
      link.addEventListener('click', (event) => {
        if (event.defaultPrevented || event.button !== 0
          || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) {
          return;
        }
        event.preventDefault();
        suppress();
        setActive(heading.id);
        if (heading.id === lastId) {
          link.classList.add('is-current');
        }
        window.history.pushState(null, '', `#${heading.id}`);
        navigateToHeading(heading);
      });
      li.append(link);
      list.append(li);
      linkById.set(heading.id, link);
    });
    pageNav.append(list);
    syncActive();
    return pageNav;
  };

  const syncPresence = () => {
    if (desktopMql.matches) {
      const nav = buildPageNav();
      if (placeholder.parentNode) {
        placeholder.replaceWith(nav);
      }
      scrollSpy.start();
      if (!widgetsStarted) {
        widgetsStarted = true;
        renderWidgets(nav);
      }
    } else if (pageNav?.parentNode) {
      scrollSpy.stop();
      pageNav.replaceWith(placeholder);
    }
  };
  syncPresence();
  desktopMql.addEventListener('change', syncPresence);

  // history.pushState (used above) doesn't scroll on its own, so back/forward
  // through page-nav's own pushes needs its own handler to keep matching the
  // native-anchor behavior this replaced.
  window.addEventListener('popstate', () => {
    const id = window.location.hash.slice(1);
    const heading = targetById.get(id);
    if (!heading) {
      setActive(null);
      resume();
      return;
    }
    suppress();
    setActive(linkById.has(id) ? id : null);
    navigateToHeading(heading);
  });

  // A heading's id is often assigned above (slugified from its text) rather than
  // authored in the source, so the browser's one-time, load-time fragment
  // scroll can silently no-op. Handle a resolved hash through the same
  // image-settled path as page-nav links.
  const hashId = window.location.hash ? window.location.hash.slice(1) : null;
  const initialTarget = hashId ? targetById.get(hashId) : null;
  if (initialTarget) {
    suppress();
    setActive(initialTarget.id);
    if (window.localStorage.getItem('lazyhash') === initialTarget.id) {
      window.localStorage.removeItem('lazyhash');
    }
    navigateToHeading(initialTarget);
  }
})();
