import { loadBlock } from '../../scripts/ak.js';

export default async function init() {
  const main = document.querySelector('main');

  const wrapper = document.createElement('div');
  wrapper.className = 'template-wrapper';

  // Left rail: picker (above) + sitenav (below).
  // INTERIM: picker and sitenav are siblings inside `.left-rail`, but the
  // platform-picker plan calls for them to share one `<details>` disclosure on
  // mobile (picker hidden until the visitor expands the section menu). Today
  // the sitenav owns its own internal disclosure; folding the picker inside it
  // requires migrating disclosure ownership out of the sitenav block. Deferred
  // to the unified-mobile-drawer ticket (see unified-mobile-drawer-ticket.temp.md).
  // Once that lands, the disclosure moves up to this template and wraps both
  // children, matching the plan's mobile UX. The picker block self-gates on
  // URL, so the empty `.picker` element is harmless on non-platform pages.
  const leftRail = document.createElement('div');
  leftRail.className = 'left-rail';

  const picker = document.createElement('div');
  picker.className = 'picker';

  const sitenav = document.createElement('nav');
  sitenav.className = 'sitenav';
  sitenav.setAttribute('aria-label', 'Second-level site navigation');

  leftRail.append(picker, sitenav);

  // Right rail: page-nav (anchors) on top, related-resources below, per the
  // plan's layout. Related-resources also self-gates on URL — no-op outside
  // platform component pages.
  const rightRail = document.createElement('div');
  rightRail.className = 'right-rail';

  const pageNav = document.createElement('nav');
  pageNav.className = 'page-nav';
  pageNav.setAttribute('aria-label', 'On this page');

  const relatedResources = document.createElement('aside');
  relatedResources.className = 'related-resources';

  rightRail.append(pageNav, relatedResources);

  await Promise.all([
    loadBlock(picker),
    loadBlock(sitenav),
    loadBlock(pageNav),
    loadBlock(relatedResources),
  ]);

  main.replaceWith(wrapper);
  // Main between the rails so screen readers read content before right-rail
  // chrome. (Previous template put pageNav before main; revisit if tab order
  // ergonomics need it back.)
  wrapper.append(leftRail, main, rightRail);
}
