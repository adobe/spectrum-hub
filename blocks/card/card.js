function buildLinkOut(linkCell) {
  const link = linkCell.querySelector('a');
  if (!link) { return null; }

  [...link.childNodes].forEach((node) => {
    if (node.nodeType === Node.TEXT_NODE && node.textContent.trim()) {
      const span = document.createElement('span');
      span.className = 'visually-hidden';
      span.textContent = node.textContent;
      node.replaceWith(span);
    }
  });

  link.querySelectorAll('.icon').forEach((icon) => icon.setAttribute('aria-hidden', 'true'));

  const div = document.createElement('div');
  div.className = 'card-link-out';
  div.append(link);
  return div;
}

function buildCardLink(linkCell, hashAware) {
  const link = linkCell.querySelector('a');
  if (!link) { return null; }
  const href = hashAware
    ? `${link.getAttribute('href')}${window.location.hash}`
    : link.getAttribute('href');
  const a = document.createElement('a');
  a.href = href;
  a.className = 'card-link';
  return a;
}

export default function init(el) {
  const hashAware = el.classList.contains('hash-aware');
  const rows = [...el.querySelectorAll(':scope > div')];
  let linkOut = null;
  let cardLink = null;
  let contentCell = null;
  let picContainer = null;

  rows.forEach((row) => {
    const cells = [...row.querySelectorAll(':scope > div')];
    const key = cells.length > 1 ? cells[0].textContent.trim().toLowerCase() : '';

    if (key === 'link-out') {
      linkOut = buildLinkOut(cells[1]);
    } else if (key === 'card-link') {
      cardLink = buildCardLink(cells[1], hashAware);
    } else {
      // Image may be in its own column (in horizontal orientations)
      // or share a column with text (vertical)
      const picCell = cells.find((cell) => cell.querySelector('picture, img'));
      if (picCell) {
        const pic = picCell.querySelector('picture, img');
        const picPara = pic.closest('p');
        picContainer = document.createElement('div');
        picContainer.className = 'card-picture-container';
        picContainer.append(pic);
        if (picPara) { picPara.remove(); }
      }
      // If multi-column, text is in the non-image cell; if single-column, reuse the same cell
      contentCell = cells.find((cell) => cell !== picCell) || picCell;
      if (contentCell) { contentCell.classList.add('card-text-container'); }
    }
    // remove the link-out and card-link divs from DOM
    row.remove();
  });

  const content = document.createElement('div');
  content.className = 'card-content-container';

  if (picContainer) { content.append(picContainer); }
  if (contentCell) {
    const textContent = document.createElement('div');
    textContent.className = 'card-text-content';
    textContent.append(...contentCell.childNodes);
    contentCell.append(textContent);
    // Suppress link-out when card-link is present — nesting <a> inside <a> is invalid HTML
    if (linkOut && !cardLink) { contentCell.append(linkOut); }
    content.append(contentCell);
  }
  if (cardLink) {
    const heading = contentCell?.querySelector('h1, h2, h3, h4, h5, h6');
    if (heading) { cardLink.setAttribute('aria-label', heading.textContent.trim()); }
    cardLink.append(content);
    el.append(cardLink);
  } else {
    el.append(content);
  }
}
