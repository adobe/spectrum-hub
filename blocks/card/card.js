function buildLinkOut(linkInAEM) {
  const link = linkInAEM.querySelector('a');
  if (!link) { return null; }

  [...link.childNodes].forEach((node) => {
    if (node.nodeType === Node.TEXT_NODE && node.textContent.trim()) {
      const span = document.createElement('span');
      span.className = 'visually-hidden';
      span.textContent = node.textContent;
      node.replaceWith(span);
    }
  });

  const div = document.createElement('div');
  div.className = 'card-link-out';
  div.append(link);
  return div;
}

function buildInternalLink(linkInAEM, hashAware) {
  const link = linkInAEM.querySelector('a');
  if (!link) { return null; }
  if (hashAware) {
    link.href = `${link.getAttribute('href')}${window.location.hash}`;
  }
  const p = document.createElement('p');
  p.className = 'card-button-container';
  p.append(link);
  return p;
}

export default function init(el) {
  const hashAware = el.classList.contains('hash-aware');
  const rows = [...el.querySelectorAll(':scope > div')];
  let linkOut = null;
  let button = null;
  let contentCell = null;

  rows.forEach((row) => {
    const cells = [...row.querySelectorAll(':scope > div')];
    const key = cells.length > 1 ? cells[0].textContent.trim().toLowerCase() : '';
    const linkInAEM = cells.length > 1 ? cells[1] : cells[0];

    if (key === 'link-out') {
      linkOut = buildLinkOut(linkInAEM);
    } else if (key === 'button') {
      button = buildInternalLink(linkInAEM, hashAware);
    } else {
      contentCell = linkInAEM;
    }
    row.remove();
  });

  let picContainer = null;
  if (contentCell) {
    const pic = contentCell.querySelector('picture');
    if (pic) {
      const picPara = pic.closest('p');
      picContainer = document.createElement('div');
      picContainer.className = 'card-picture-container';
      picContainer.append(pic);
      if (picPara) { picPara.remove(); }
    }
    contentCell.classList.add('card-text-container');
  }

  const content = document.createElement('div');
  content.className = 'card-content';

  if (picContainer) { content.append(picContainer); }
  if (contentCell) { content.append(contentCell); }
  if (linkOut) { content.append(linkOut); }
  if (button) { content.append(button); }

  el.append(content);
}
