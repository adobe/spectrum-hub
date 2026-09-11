import { getSvgRef } from '../../scripts/utils/svg.js';
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

function makeWidgetElement(tag, name, label, icon) {
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

  const elements = candidates.map(
    ({ tag, name, label, icon }) => makeWidgetElement(tag, name, label, icon),
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

  ['wheel', 'touchstart', 'keydown'].forEach((type) => {
    window.addEventListener(type, () => { suppressed = false; }, { passive: true });
  });

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

  const observer = new IntersectionObserver((entries) => {
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

  headings.forEach((h) => observer.observe(h));

  return { setActive, suppress: () => { suppressed = true; } };
}

// Jump immediately so navigation feels responsive, then briefly correct any
// drift caused by incomplete images before the target. Manual scrolling always
// cancels correction so page-nav never fights the visitor.
const PAGE_NAV_IMAGE_TIMEOUT = 1000;
const PAGE_NAV_POSITION_TOLERANCE = 2;
const SCROLL_KEYS = new Set([
  'ArrowUp',
  'ArrowDown',
  'PageUp',
  'PageDown',
  'Home',
  'End',
  ' ',
]);

let activeNavigation;

function getExpectedHeadingTop(heading) {
  const scrollMargin = Number.parseFloat(getComputedStyle(heading).scrollMarginBlockStart);
  if (Number.isFinite(scrollMargin)) {
    return scrollMargin;
  }
  const headerHeight = Number.parseFloat(
    getComputedStyle(document.documentElement).getPropertyValue('--sh-header-height'),
  );
  return Number.isFinite(headerHeight) ? headerHeight : 56;
}

function isEditableTarget(target) {
  return target instanceof Element
    && (target.isContentEditable
      || target.closest('input, textarea, select, button, [contenteditable]:not([contenteditable="false"])'));
}

function navigateToHeading(heading) {
  activeNavigation?.cancel();

  heading.scrollIntoView({ block: 'start', behavior: 'instant' });
  heading.focus({ preventScroll: true });

  const pendingImages = [...document.images].filter((image) => (
    image.complete === false
    && heading.compareDocumentPosition(image) === Node.DOCUMENT_POSITION_PRECEDING
  ));
  if (!pendingImages.length) {
    activeNavigation = undefined;
    return;
  }

  let active = true;
  let timeoutId;
  const imageListeners = [];
  const interactionListeners = [];
  const cleanup = () => {
    imageListeners.forEach(({ image, settle }) => {
      image.removeEventListener('load', settle);
      image.removeEventListener('error', settle);
    });
    imageListeners.length = 0;
    interactionListeners.forEach(({ type, listener, options }) => {
      window.removeEventListener(type, listener, options);
    });
    interactionListeners.length = 0;
  };
  const cancel = () => {
    if (!active) {
      return;
    }
    active = false;
    clearTimeout(timeoutId);
    cleanup();
    if (activeNavigation?.cancel === cancel) {
      activeNavigation = undefined;
    }
  };
  const correctPosition = () => {
    const expectedTop = getExpectedHeadingTop(heading);
    if (Math.abs(heading.getBoundingClientRect().top - expectedTop)
      > PAGE_NAV_POSITION_TOLERANCE) {
      heading.scrollIntoView({ block: 'start', behavior: 'instant' });
    }
  };
  const cancelOnInteraction = () => cancel();
  const cancelOnKeydown = (event) => {
    if (SCROLL_KEYS.has(event.key) && !isEditableTarget(event.target)) {
      cancel();
    }
  };
  [
    { type: 'wheel', listener: cancelOnInteraction, options: { passive: true } },
    { type: 'touchstart', listener: cancelOnInteraction, options: { passive: true } },
    { type: 'keydown', listener: cancelOnKeydown },
  ].forEach(({ type, listener, options }) => {
    window.addEventListener(type, listener, options);
    interactionListeners.push({ type, listener, options });
  });
  activeNavigation = { cancel };

  let remaining = pendingImages.length;
  const settleImage = () => {
    if (!active) {
      return;
    }
    remaining -= 1;
    correctPosition();
    if (!remaining) {
      cancel();
    }
  };
  pendingImages.forEach((image) => {
    let settled = false;
    const settle = () => {
      if (settled || !active) {
        return;
      }
      settled = true;
      settleImage();
    };
    image.addEventListener('load', settle, { once: true });
    image.addEventListener('error', settle, { once: true });
    imageListeners.push({ image, settle });
    if (image.complete) {
      settle();
    }
  });
  if (active) {
    timeoutId = setTimeout(cancel, PAGE_NAV_IMAGE_TIMEOUT);
  }
}

(() => {
  const pageNav = document.createElement('nav');
  pageNav.className = 'page-nav';
  pageNav.setAttribute('aria-label', 'On this page');
  document.body.append(pageNav);

  const headings = [...document.querySelectorAll('main h2')].filter(
    (h) => !pageNav.contains(h),
  );
  if (!headings.length) {
    return;
  }
  pageNav.dataset.pageNav = 'ready';

  // Assign ids and make headings focusable. Tabindex="-1" is set
  // on every heading so clicking a page-nav link moves focus to the target
  const usedIds = new Set();
  headings.forEach((h) => {
    if (h.id) {
      // Strip an authored `size-*-` modifier
      h.id = h.id.replace(/^size-[a-z0-9]+-/, '');
    } else {
      const base = slugify(h.textContent);
      let id = base;
      let suffix = 2;
      while (usedIds.has(id) || document.getElementById(id)) {
        id = `${base}-${suffix}`;
        suffix += 1;
      }
      h.id = id;
    }
    usedIds.add(h.id);
    h.setAttribute('tabindex', '-1');
    // .page-nav-target opts the heading into scroll-margin compensation
    // so anchor scrolls clear the sticky header/sitenav
    h.classList.add('page-nav-target');
  });

  // The page's h1 acts as the "top" of the page for the back-to-top link.
  // Same id/tabindex/class treatment as the h2 targets so anchor scroll,
  // focus, and scroll-margin all behave the same way.
  const h1 = document.querySelector('main h1');
  if (h1) {
    if (!h1.id) {
      const base = slugify(h1.textContent);
      let id = base;
      let suffix = 2;
      while (usedIds.has(id) || document.getElementById(id)) {
        id = `${base}-${suffix}`;
        suffix += 1;
      }
      h1.id = id;
    }
    usedIds.add(h1.id);
    h1.setAttribute('tabindex', '-1');
    h1.classList.add('page-nav-target');
  }

  const list = document.createElement('ul');
  const linkById = new Map();
  headings.forEach((h) => {
    const li = document.createElement('li');
    const a = document.createElement('a');
    a.href = `#${h.id}`;
    a.textContent = h.textContent;
    li.append(a);
    list.append(li);
    linkById.set(h.id, a);
  });

  // TODO: Revisit the back-to-top items after the section links. if we have a back-to-top,
  // it'll be treated differently.
  // if (h1) {
  //   const topLi = document.createElement('li');
  //   const topLink = document.createElement('a');
  //   topLink.href = `#${h1.id}`;
  //   topLink.textContent = 'Back to top';
  //   topLi.append(topLink);
  //   list.append(topLi);
  // }

  pageNav.append(list);

  // URL-scoped widgets (copy markdown / see-in-figma / go-to-impl)
  // sit below the table of contents.
  renderWidgets(pageNav);

  // The nav is a desktop-only side rail (see detail template grid at >=1200px).
  // Below that it is removed from the DOM and the accessibility tree entirely: a
  // comment placeholder holds its slot so the <nav> can be restored in place when
  // the viewport widens again.
  const desktopMql = window.matchMedia('(width >= 1200px)');
  const placeholder = document.createComment('page-nav');
  const syncPresence = () => {
    if (desktopMql.matches && placeholder.parentNode) {
      placeholder.replaceWith(pageNav);
    } else if (!desktopMql.matches && pageNav.parentNode) {
      pageNav.replaceWith(placeholder);
    }
  };
  syncPresence();
  desktopMql.addEventListener('change', syncPresence);

  const { setActive, suppress } = watchScrollSpy(h1 ? [...headings, h1] : headings, linkById);

  const lastId = headings[headings.length - 1].id;
  // Resolved against our own collected headings rather than a document-wide
  // getElementById: some other element elsewhere on the page (e.g. the sitenav,
  // which slugifies its own category names into ids the same way) can happen to
  // share the same id, and getElementById would silently return that instead.
  const targetById = new Map((h1 ? [...headings, h1] : headings).map((h) => [h.id, h]));

  // Clicking a link shouldn't have to wait on the IntersectionObserver to confirm
  // it: mark it current immediately. This also covers the last heading, which
  // can sit too close to the document's end to ever cross into the observer's
  // (bottom -50%) active band on its own — `.is-current` is a visual-only
  // stand-in for that one case, since the page genuinely can't scroll it under
  // the header, so it doesn't earn aria-current the way the others do.
  //
  // The jump itself is handled here too (preventDefault + navigateToHeading)
  // rather than left to the browser's native fragment-navigation.
  linkById.forEach((a, id) => {
    a.addEventListener('click', (event) => {
      // Leave modifier/non-primary clicks (new tab, new window, etc.) and
      // already-handled clicks alone — only the plain, default-bound click
      // actually lands on this page and needs the jump.
      if (event.defaultPrevented || event.button !== 0
        || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) {
        return;
      }
      event.preventDefault();
      suppress();
      setActive(id);
      if (id === lastId) {
        a.classList.add('is-current');
      }
      window.history.pushState(null, '', `#${id}`);
      navigateToHeading(targetById.get(id));
    });
  });

  // history.pushState (used above) doesn't scroll on its own, so back/forward
  // through page-nav's own pushes needs its own handler to keep matching the
  // native-anchor behavior this replaced.
  window.addEventListener('popstate', () => {
    activeNavigation?.cancel();
    const id = window.location.hash.slice(1);
    const heading = targetById.get(id);
    if (!heading) {
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
