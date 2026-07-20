import { loadFragment } from '../fragment/fragment.js';

// Authored once with every widget option; page-nav renders the subset the
// current URL calls for (see renderWidgets).
const WIDGETS_FRAGMENT = '/fragments/drafts/page-nav';

// Widgets shown on every interior page.
const GLOBAL_WIDGETS = new Set(['copy-markdown']);

export function isComponentPath(pathname) {
  return pathname.split('/').includes('components');
}

export function shouldRenderWidget(name, isComponentPage) {
  return isComponentPage || GLOBAL_WIDGETS.has(name);
}

// Loads the shared widgets fragment and appends the URL-appropriate widget
// buttons below the nav's table of contents.
async function renderWidgets(el) {
  const { fragment } = await loadFragment(WIDGETS_FRAGMENT);
  if (!fragment) { return; }

  const isComponentPage = isComponentPath(window.location.pathname);
  const widgets = [...fragment.querySelectorAll('[data-widget]')].filter(
    ({ dataset }) => shouldRenderWidget(dataset.widget, isComponentPage),
  );
  if (!widgets.length) { return; }

  const group = document.createElement('div');
  group.className = 'page-nav-widgets';
  group.append(...widgets);
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

  const setActive = (id) => {
    if (id === activeId) {
      return;
    }
    if (activeId && linkById.get(activeId)) {
      linkById.get(activeId).removeAttribute('aria-current');
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

  const observer = new IntersectionObserver((entries) => {
    entries.forEach((e) => {
      if (e.isIntersecting) {
        visible.add(e.target);
      } else {
        visible.delete(e.target);
      }
    });
    if (!visible.size) {
      return;
    }
    const topmost = [...visible].sort(
      (a, b) => a.getBoundingClientRect().top - b.getBoundingClientRect().top,
    )[0];
    setActive(topmost.id);
  }, { rootMargin });

  headings.forEach((h) => observer.observe(h));
}

export default async function init(el) {
  // Guard against a second decoration
  if (el.dataset.pageNav) {
    return;
  }

  const headings = [...document.querySelectorAll('main h2')].filter(
    (h) => !el.contains(h),
  );
  if (!headings.length) {
    return;
  }
  el.dataset.pageNav = 'ready';

  // Assign ids and make headings focusable. Tabindex="-1" is set
  // on every heading so clicking a page-nav link moves focus to the target
  const usedIds = new Set();
  headings.forEach((h) => {
    if (!h.id) {
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

  // Append the back-to-top item after the section links.
  if (h1) {
    const topLi = document.createElement('li');
    const topLink = document.createElement('a');
    topLink.href = `#${h1.id}`;
    topLink.textContent = 'Back to top';
    topLi.append(topLink);
    list.append(topLi);
  }

  el.append(list);

  // URL-scoped widgets (copy markdown, and later see-in-figma / go-to-impl)
  // sit below the table of contents.
  await renderWidgets(el);

  // The nav is a desktop-only side rail (see detail template grid at >=900px).
  // Below that it is removed from the DOM and the accessibility tree entirely: a
  // comment placeholder holds its slot so the <nav> can be restored in place when
  // the viewport widens again.
  const desktopMql = window.matchMedia('(width >= 900px)');
  const placeholder = document.createComment('page-nav');
  const syncPresence = () => {
    if (desktopMql.matches && placeholder.parentNode) {
      placeholder.replaceWith(el);
    } else if (!desktopMql.matches && el.parentNode) {
      el.replaceWith(placeholder);
    }
  };
  syncPresence();
  desktopMql.addEventListener('change', syncPresence);

  watchScrollSpy(h1 ? [...headings, h1] : headings, linkById);
}
