import { getConfig } from '../../scripts/ak.js';
// TODO: uncomment this import once we've decided on the approach for page-nav
// deep linking to tab panel content
// import { PAGE_NAV_REVEAL_EVENT } from '../../scripts/utils/nav-events.js';
import { getTabsMetadata } from '../section-metadata/section-metadata.js';
import '../../deps/components/dist/swc-tabs/index.js';

const { log } = getConfig();

function getPanelSections(sections, el) {
  const groups = [];
  for (const section of sections) {
    const metadata = [...section.querySelectorAll(':scope > .block-content > .section-metadata, :scope > .section-metadata')]
      .flatMap(getTabsMetadata);
    const classes = [...section.classList]
      .filter((name) => name.startsWith('tabs-'))
      .map((name) => name.slice('tabs-'.length));
    const markers = [...metadata, ...classes];
    if (markers.some((marker) => marker !== 'start' && marker !== 'end')) {
      log('Tabs section metadata only supports "start" and "end".', el);
      return null;
    }
    if (markers.includes('start')) { groups.push([]); }
    if (groups.length) { groups.at(-1).push(section); }
    if (markers.includes('end')) {
      if (groups.length) { return groups; }
      log('Tabs section metadata requires a "start" before "end".', el);
      return null;
    }
  }
  if (!groups.length) { return sections.map((section) => [section]); }
  log('Tabs section metadata requires an "end" on the final section of the group.', el);
  return null;
}

export default async function init(el) {
  const parent = el.closest('.fragment-content, main');
  const currSection = el.closest('.section');
  if (!parent || currSection?.parentElement !== parent) {
    log('Tabs must be inside a section of main or a fragment.', el);
    return;
  }

  const list = el.querySelector('ul');
  if (!list) {
    log('Please add an unordered list of tab labels to the tabs block.', el);
    return;
  }

  const labels = [...list.querySelectorAll(':scope > li')]
    .map((item) => item.textContent.trim());
  const siblings = [...parent.querySelectorAll(':scope > .section')];
  const following = siblings.slice(siblings.indexOf(currSection) + 1);
  const nextTabs = following.findIndex((section) => section.querySelector(':scope > .block-content > .tabs, :scope > .tabs'));
  const sections = nextTabs === -1 ? following : following.slice(0, nextTabs);
  const groups = getPanelSections(sections, el);
  if (!groups) { return; }
  if (!labels.length || labels.some((label) => !label) || labels.length !== groups.length) {
    log('Tabs require one nonempty label for each tab panel.', el);
    return;
  }

  const tabs = document.createElement('swc-tabs');
  tabs.setAttribute('accessible-label', el.getAttribute('aria-label') || 'Content tabs');
  const hashTarget = document.getElementById(window.location.hash.slice(1));
  const selectedIndex = Math.max(0, groups.findIndex(
    (group) => group.some((section) => section.contains(hashTarget)),
  ));
  tabs.selected = `tab-${selectedIndex + 1}`;

  const panels = groups.map((group, index) => {
    const tab = document.createElement('swc-tab');
    tab.tabId = `tab-${index + 1}`;
    tab.textContent = labels[index];
    tabs.append(tab);

    const panel = document.createElement('swc-tab-panel');
    panel.tabId = tab.tabId;
    panel.selected = index === selectedIndex;
    panel.append(...group);
    return panel;
  });
  tabs.append(...panels);
  // TODO: uncomment this import once we've decided on the approach for page-nav
  // deep linking to tab panel content
  // tabs.addEventListener(PAGE_NAV_REVEAL_EVENT, (event) => {
  //   const panel = panels.find((candidate) => candidate.contains(event.target));
  //   if (!panel) { return; }
  //   tabs.selected = panel.tabId;
  //   event.detail.waitUntil(tabs.updateComplete);
  // });
  list.replaceWith(tabs);
  await tabs.updateComplete;
}
