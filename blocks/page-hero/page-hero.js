import { getMetadata, loadBlock } from '../../scripts/ak.js';

const template = getMetadata('template');

export default function init(el) {
  const h1 = el.querySelector('h1');
  if (!h1) {
    el.textContent = 'No heading found';
    return;
  }

  const breadcrumbs = el.querySelector('.breadcrumbs');
  if (breadcrumbs) { loadBlock(breadcrumbs); }

  // Only components get the rest of the hero treatment (for now)
  if (template !== 'component') { return; }

  const desc = document.createElement('p');
  desc.className = 'description';
  desc.textContent = getMetadata('description') ?? 'No description found in metadata.';

  const statusBlock = document.createElement('div');
  statusBlock.classList.add('component-status');
  loadBlock(statusBlock);

  el.append(desc, statusBlock);
}
