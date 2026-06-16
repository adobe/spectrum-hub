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
// sync with the heading the visitor is reading.
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
    .getPropertyValue('--sh-header-height').trim() || '56px';
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

  const details = document.createElement('details');
  const summary = document.createElement('summary');
  summary.classList.add('page-nav-summary');
  // TODO: VoiceOver announces a <summary> twice on navigation: once via
  // its computed accessible name (e.g. "Button, summary, collapsed") and
  // once via the descendant text node. Could be silenced with aria-label
  // on the summary + aria-hidden on the inner span. Tradeoff would be to
  // duplicate the label string across an attribute and the DOM. This is the
  // same "accepted-as-is" stance as the sitenav's segment summaries.
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

  // Append the back-to-top item after the section links.
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

  const desktopMql = window.matchMedia('(width >= 1200px)');
  const syncDisclosure = () => {
    details.open = desktopMql.matches;
  };
  syncDisclosure();
  desktopMql.addEventListener('change', syncDisclosure);

  // Close the overlay after a link is clicked at small screens
  details.addEventListener('click', (e) => {
    const a = e.target.closest('a[href^="#"]');
    if (!a) {
      return;
    }
    if (!desktopMql.matches) {
      details.open = false;
    }
  });

  document.addEventListener('click', (e) => {
    if (details.open && !desktopMql.matches && !el.contains(e.target)) {
      details.open = false;
    }
  });

  watchScrollSpy(h1 ? [...headings, h1] : headings, currentLabel, linkById, pageName);
}
