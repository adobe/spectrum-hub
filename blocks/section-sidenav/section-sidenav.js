import '../../deps/uec-sidenav/dist/index.js';
import { getConfig } from '../../scripts/ak.js';

const { locale } = getConfig();

function getTopSection() {
  const { pathname } = window.location;
  const stripped = pathname.startsWith(locale.prefix)
    ? pathname.slice(locale.prefix.length) : pathname;
  const [, section] = stripped.split('/');
  return section || null;
}

function formatLabel(key) {
  return key.charAt(0).toUpperCase() + key.slice(1).replace(/-/g, ' ');
}

function pathToId(path) {
  return path.replace(/\//g, '-').replace(/^-/, '');
}

async function fetchSectionTree(topSection) {
  const resp = await fetch('/query-index.json');
  if (!resp.ok) return null;
  const { data } = await resp.json();

  const pages = data.filter(({ path }) => path.startsWith(`/${topSection}/`));
  if (!pages.length) return null;

  const root = { children: new Map() };
  pages.forEach(({ path, title }) => {
    const parts = path.split('/').filter(Boolean);
    let node = root;
    for (let i = 1; i < parts.length; i += 1) {
      const key = parts[i];
      if (!node.children.has(key)) {
        node.children.set(key, {
          key,
          path: `/${parts.slice(0, i + 1).join('/')}`,
          title: null,
          children: new Map(),
        });
      }
      node = node.children.get(key);
    }
    node.title = title;
  });

  function flatten(node) {
    return {
      path: node.path,
      label: node.title || formatLabel(node.key),
      children: [...node.children.values()].map(flatten),
    };
  }

  return [...root.children.values()].map(flatten);
}

function createItem(node) {
  const item = document.createElement('ue-sidenav-item');
  item.id = pathToId(node.path);
  item.setAttribute('label', node.label);
  if (node.path) item.setAttribute('href', node.path);
  node.children.forEach((child) => item.append(createItem(child)));
  return item;
}

export default async function init(el) {
  const topSection = getTopSection();
  if (!topSection) return;

  const sidenav = document.createElement('ue-sidenav');
  sidenav.setAttribute('accessible-label', `${formatLabel(topSection)} navigation`);
  el.append(sidenav);

  const mq = window.matchMedia('(width < 900px)');
  const updateDisplayMode = () => {
    if (mq.matches) {
      sidenav.setAttribute('display-mode', 'overlay');
      sidenav.isOpen = false;
    } else {
      sidenav.setAttribute('display-mode', 'self-managed');
      sidenav.isOpen = true;
    }
  };
  updateDisplayMode();

  mq.addEventListener('change', updateDisplayMode);

  const tree = await fetchSectionTree(topSection);
  if (!tree) return;

  tree.forEach((node) => sidenav.append(createItem(node)));
}
