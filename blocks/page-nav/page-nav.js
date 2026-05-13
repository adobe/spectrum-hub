/* Follows Disclosure Navigation Menu APG: https://www.w3.org/WAI/ARIA/apg/patterns/disclosure/examples/disclosure-navigation/ */

function slugify(text) {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

function getPageName() {
  const h1 = document.querySelector('main h1');
  return h1?.textContent.trim() || document.title;
}

// Keeps the summary's current-section label and each link's aria-current in
// sync with the heading the visitor is reading. The topmost heading inside
// the rootMargin band is considered active.
function watchScrollSpy(headings, currentLabel, linkById, fallbackLabel) {
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
      currentLabel.textContent = document.getElementById(id)?.textContent || fallbackLabel;
    } else {
      currentLabel.textContent = fallbackLabel;
    }
  };

  // Top offset matches the site header so a heading registers as "active"
  // the moment it scrolls under the sticky chrome. Bottom -50% keeps it
  // from activating until it's well into the viewport.
  const navHeight = getComputedStyle(document.documentElement)
    .getPropertyValue('--sh-nav-height').trim() || '80px';
  const rootMargin = `-${navHeight} 0px -50% 0px`;

  const observer = new IntersectionObserver((entries) => {
    const visible = entries.filter((e) => e.isIntersecting).map((e) => e.target);
    if (!visible.length) {
      return;
    }
    visible.sort((a, b) => a.getBoundingClientRect().top - b.getBoundingClientRect().top);
    setActive(visible[0].id);
  }, { rootMargin });

  headings.forEach((h) => observer.observe(h));
}

export default async function init(el) {
  const headings = [...document.querySelectorAll('main h2')].filter(
    (h) => !el.contains(h),
  );
  if (!headings.length) {
    return;
  }

  // Assign ids and make headings focusable. Slugify-with-dedupe so two
  // headings with the same text don't collide on a shared id (which would
  // route both anchor links to the first occurrence). tabindex="-1" is set
  // on every heading — including those with pre-existing ids — so clicking
  // an page-nav link moves focus to the target section, not just the
  // scroll position.
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
    // so anchor scrolls clear the sticky header (and, at mobile, the sticky
    // summary bar) instead of landing under them.
    h.classList.add('page-nav-target');
  });

  // The page's h1 acts as the "top" of the page for the back-to-top link.
  // Same id/tabindex/class treatment as the h2 targets so anchor scroll,
  // focus, and scroll-margin all behave the same way. Not added to
  // linkById — scroll-spy then treats arriving at the h1 as "no section
  // active" and resets the summary to the page name.
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

  // Build the disclosure shell. At mobile the summary is the visible bar
  // showing the current section name (page name when no section is active
  // yet); at desktop the summary is hidden via CSS and the matchMedia
  // listener below forces the details open so the list always renders
  // inline in the rail.
  const details = document.createElement('details');
  const summary = document.createElement('summary');
  summary.classList.add('page-nav-summary');
  // TODO: VoiceOver announces a <summary> twice on navigation: once via
  // its computed accessible name (e.g. "Button, summary, collapsed") and
  // once via the descendant text node. Could be silenced with aria-label
  // on the summary + aria-hidden on the inner span. Tradeoff is to
  // duplicate the label string across an attribute and the DOM. Same
  // accepted-as-is stance as the sitenav's segment summaries.
  const currentLabel = document.createElement('span');
  currentLabel.classList.add('page-nav-current');
  const pageName = getPageName();
  currentLabel.textContent = pageName;
  summary.append(currentLabel);
  details.append(summary);

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

  // Append the back-to-top item after the section links. Anchors to the h1
  // so the existing close-on-click handler (a[href^="#"]) and the focus +
  // scroll-margin treatment from the h1's tabindex/class apply for free.
  if (h1) {
    const topLi = document.createElement('li');
    const topLink = document.createElement('a');
    topLink.href = `#${h1.id}`;
    topLink.textContent = 'Back to top';
    topLi.append(topLink);
    list.append(topLi);
  }

  details.append(list);
  el.append(details);

  const desktopMql = window.matchMedia('(width >= 900px)');
  const syncDisclosure = () => {
    details.open = desktopMql.matches;
  };
  syncDisclosure();
  desktopMql.addEventListener('change', syncDisclosure);

  // Close the overlay after a link is clicked at mobile, so the visitor
  // sees the target section instead of the still-open menu over it. Gated
  // on !desktopMql.matches because at desktop the details is force-opened
  // and closing it would empty the rail.
  details.addEventListener('click', (e) => {
    const a = e.target.closest('a[href^="#"]');
    if (!a) {
      return;
    }
    if (!desktopMql.matches) {
      details.open = false;
    }
  });

  // Observe h1 alongside h2s so scroll-spy resets the summary to the page
  // name when the visitor returns to the top of the page.
  watchScrollSpy(h1 ? [...headings, h1] : headings, currentLabel, linkById, pageName);
}
