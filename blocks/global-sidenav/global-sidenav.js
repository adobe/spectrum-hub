import '../../deps/uec-sidenav/dist/index.js';
import { getConfig } from '../../scripts/ak.js';

const { locale, codeBase } = getConfig();

const RAIL_FRAGMENT = '/fragments/nav/global-sidenav';

function pathToId(path) {
  return path.replace(/\//g, '-').replace(/^-/, '');
}

function createIcon(src) {
  const icon = document.createElement('span');
  icon.slot = 'icon';
  icon.setAttribute('aria-hidden', 'true');
  icon.style.cssText = `
    display: inline-block;
    inline-size: 20px;
    block-size: 20px;
    background-color: currentcolor;
    mask-image: url('${src}');
    mask-repeat: no-repeat;
    mask-position: center;
    mask-size: contain;
  `;
  return icon;
}

async function parseRailFragment(path) {
  const resp = await fetch(path);
  if (!resp.ok) { return null; }
  const html = await resp.text();
  const doc = new DOMParser().parseFromString(html, 'text/html');
  return [...doc.querySelectorAll('main li')].map((li) => {
    const link = li.querySelector('a');
    if (!link) { return null; }
    const iconSpan = li.querySelector('span.icon');
    const iconName = iconSpan?.classList[1]?.substring(5);
    return {
      href: link.getAttribute('href'),
      label: link.textContent.trim(),
      iconPath: iconName ? `${codeBase}/img/icons/s2-icon-${iconName}-20-n.svg` : null,
    };
  }).filter(Boolean);
}

export default async function init(el) {
  const sidenav = document.createElement('ue-sidenav');
  sidenav.setAttribute('accessible-label', 'Top-level site navigation');
  sidenav.isOpen = false;
  el.append(sidenav);

  const mq = window.matchMedia('(width < 900px)');
  const updateDisplayMode = () => {
    sidenav.setAttribute('display-mode', mq.matches ? 'overlay' : 'self-managed');
  };
  updateDisplayMode();
  mq.addEventListener('change', () => {
    sidenav.isOpen = false;
    updateDisplayMode();
  });

  const fragmentPath = `${locale.prefix}${RAIL_FRAGMENT}`;
  const items = await parseRailFragment(fragmentPath);
  if (!items) { return; }

  items.forEach(({ href, label, iconPath }) => {
    const item = document.createElement('ue-sidenav-item');
    item.id = pathToId(href);
    item.setAttribute('label', label);
    item.setAttribute('href', href);
    if (iconPath) {
      item.append(createIcon(iconPath));
    }
    sidenav.append(item);
  });
}
