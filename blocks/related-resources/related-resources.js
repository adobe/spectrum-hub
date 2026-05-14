import { getOtherImplementations } from '../../scripts/utils/implementations.js';
import {
  buildImplementationPath,
  getComponentFromPath,
  getImplementationFromPath,
  isOnPlatformComponentPage,
} from '../../scripts/utils/platform-url.js';

function buildSiblingList(currentImpl, currentComponent) {
  const list = document.createElement('ul');
  list.className = 'related-resources-list';
  getOtherImplementations(currentImpl).forEach((impl) => {
    const li = document.createElement('li');
    const a = document.createElement('a');
    a.href = buildImplementationPath(impl.id, currentComponent);
    a.textContent = impl.label;
    li.append(a);
    list.append(li);
  });
  return list;
}

export default async function init(el) {
  const path = window.location.pathname;
  if (!isOnPlatformComponentPage(path)) {
    return;
  }

  const currentImpl = getImplementationFromPath(path);
  const currentComponent = getComponentFromPath(path);
  const siblings = getOtherImplementations(currentImpl);
  if (!siblings.length) {
    return;
  }

  const heading = document.createElement('h2');
  heading.className = 'related-resources-title';
  heading.id = 'related-resources-title';
  heading.textContent = 'Other implementations';

  el.setAttribute('aria-labelledby', heading.id);
  el.append(heading, buildSiblingList(currentImpl, currentComponent));
}
