/* Follows Disclosure Navigation Menu APG: https://www.w3.org/WAI/ARIA/apg/patterns/disclosure/examples/disclosure-navigation/ */

import { slugify } from '../../scripts/utils/strings.js';

// How long the MutationObserver keeps watching <main> after the last
// heading-change. Resets on each h2 mutation; once it fires, the observer
// disconnects so the page doesn't pay for idle DOM-change notifications
// after fragments have settled.
const OBSERVER_STABILITY_MS = 3000;

function getPageName() {
  const h1 = document.querySelector('main h1');
  return h1?.textContent.trim() || document.title;
}

// Keeps the summary's current-section label and each link's aria-current in
// sync with the heading the visitor is reading. Returns the IntersectionObserver
// so the caller can disconnect it before re-rendering, and reports active-id
// changes via onActiveChange so the caller can survive a rebuild without
// losing the highlighted item.
function watchScrollSpy(headings, currentLabel, linkById, fallbackLabel, onActiveChange) {
  let activeId = null;

  const setActive = (id) => {
    if (id === activeId) {
      return;
    }
    if (activeId && linkById.get(activeId)) {
      linkById.get(activeId).removeAttribute('aria-current');
    }
    activeId = id;
    onActiveChange?.(id);
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
  return observer;
}

// Decorate a heading: assign an id (slugified, deduped), make it programmatic-
// focus-able, and tag it with .page-nav-target so anchor scrolls clear the
// sticky chrome. Idempotent — safe to call on the same heading twice across
// re-renders.
function decorateHeading(h, usedIds) {
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
  h.classList.add('page-nav-target');
}

function setsEqual(a, b) {
  if (a.size !== b.size) {
    return false;
  }
  for (const item of a) {
    if (!b.has(item)) {
      return false;
    }
  }
  return true;
}

export default async function init(el) {
  const desktopMql = window.matchMedia('(width >= 900px)');
  let scrollSpyObserver = null;
  // Identity of the h2 set the TOC currently reflects. Used to short-circuit
  // re-renders when a mutation churns DOM but doesn't actually change the
  // heading set (sections decoration, image lazy-swaps, block init, etc.).
  let lastHeadingSet = new Set();
  // The id of the heading the visitor was reading at the last scroll-spy fire.
  // Survives rebuilds so we can re-apply aria-current right after a rebuild
  // instead of flashing the visitor's place out of view until the next
  // IntersectionObserver tick.
  let activeId = null;

  // Returns true if a real rebuild happened. Used by the caller to decide
  // whether to reset the observer-stability timer.
  const render = () => {
    const headings = [...document.querySelectorAll('main h2')].filter(
      (h) => !el.contains(h),
    );
    const currentSet = new Set(headings);

    // Cheap identity check: if the h2 element set hasn't changed since the
    // last render, skip the rebuild entirely. Most observer fires on a busy
    // page (block decoration, lazy images, etc.) land here.
    if (setsEqual(currentSet, lastHeadingSet)) {
      return false;
    }
    lastHeadingSet = currentSet;

    // Preserve user state across the rebuild so it doesn't flash:
    //   - disclosure open/closed state
    //   - active-link highlighting (re-applied below if the id still exists)
    const previousDetails = el.querySelector('details');
    const wasOpen = previousDetails ? previousDetails.open : desktopMql.matches;
    const previousActiveId = activeId;

    if (scrollSpyObserver) {
      scrollSpyObserver.disconnect();
      scrollSpyObserver = null;
    }
    el.replaceChildren();

    if (!headings.length) {
      return true;
    }

    const usedIds = new Set();
    headings.forEach((h) => decorateHeading(h, usedIds));

    // The page's h1 acts as the "top" of the page for the back-to-top link.
    const h1 = document.querySelector('main h1');
    if (h1) {
      decorateHeading(h1, usedIds);
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

    details.open = wasOpen;

    details.addEventListener('click', (e) => {
      const a = e.target.closest('a[href^="#"]');
      if (!a) {
        return;
      }
      if (!desktopMql.matches) {
        details.open = false;
      }
    });

    // Re-apply active highlight if the previously active heading still exists
    // in the new set. Avoids a flash where aria-current is empty until the
    // next scroll-spy tick.
    if (previousActiveId && linkById.get(previousActiveId)) {
      linkById.get(previousActiveId).setAttribute('aria-current', 'location');
      currentLabel.textContent = (
        document.getElementById(previousActiveId)?.textContent || pageName
      );
    }

    scrollSpyObserver = watchScrollSpy(
      h1 ? [...headings, h1] : headings,
      currentLabel,
      linkById,
      pageName,
      (id) => {
        activeId = id;
      },
    );
    activeId = previousActiveId;

    return true;
  };

  // One-time: keep details.open in sync with the desktop breakpoint. Looks up
  // the live details on each fire so re-renders pick up the new element.
  desktopMql.addEventListener('change', () => {
    const details = el.querySelector('details');
    if (details) {
      details.open = desktopMql.matches;
    }
  });

  render();

  // Watch <main> for late-arriving h2 elements (fragments load asynchronously
  // and inject content after page-nav has already run). Each h2-affecting
  // mutation schedules a single rebuild on the next animation frame so back-
  // to-back mutations coalesce. After OBSERVER_STABILITY_MS without an
  // h2 change, the observer disconnects so the page stops paying for idle
  // DOM-change notifications.
  const main = document.querySelector('main');
  if (!main) {
    return;
  }

  let stabilityTimer = null;
  let rerenderScheduled = false;
  let observer = null;

  const scheduleStabilityDisconnect = () => {
    if (stabilityTimer) {
      clearTimeout(stabilityTimer);
    }
    stabilityTimer = setTimeout(() => {
      observer?.disconnect();
      observer = null;
    }, OBSERVER_STABILITY_MS);
  };

  const scheduleRerender = () => {
    if (rerenderScheduled) {
      return;
    }
    rerenderScheduled = true;
    requestAnimationFrame(() => {
      rerenderScheduled = false;
      if (render()) {
        scheduleStabilityDisconnect();
      }
    });
  };

  observer = new MutationObserver((mutations) => {
    const headingChange = mutations.some((m) => (
      [...m.addedNodes, ...m.removedNodes].some((n) => {
        if (n.nodeType !== Node.ELEMENT_NODE) {
          return false;
        }
        if (n.tagName === 'H2') {
          return true;
        }
        return !!n.querySelector?.('h2');
      })
    ));
    if (headingChange) {
      scheduleRerender();
    }
  });
  observer.observe(main, { childList: true, subtree: true });

  // Start the stability timer even when no fragments are pending — if main
  // never mutates, we shouldn't keep the observer alive indefinitely.
  scheduleStabilityDisconnect();
}
