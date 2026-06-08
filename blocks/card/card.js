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

function createCardGrid(el) {
  let gridClass;
  if (el.classList.contains('grid-2')) {
    gridClass = 'grid-2';
  } else if (el.classList.contains('grid-3')) {
    gridClass = 'grid-3';
  } else if (el.classList.contains('grid-4')) {
    gridClass = 'grid-4';
  }
  if (!gridClass) { return; }

  const wrapperClass = `card-${gridClass}`;
  if (el.parentElement?.classList.contains(wrapperClass)) { return; }

  const group = [el];
  let prev = el.previousElementSibling;
  while (prev?.classList.contains('card') && prev.classList.contains(gridClass)) {
    group.unshift(prev);
    prev = prev.previousElementSibling;
  }
  let next = el.nextElementSibling;
  while (next?.classList.contains('card') && next.classList.contains(gridClass)) {
    group.push(next);
    next = next.nextElementSibling;
  }

  const wrapper = document.createElement('div');
  wrapper.classList.add(wrapperClass);
  group[0].before(wrapper);
  group.forEach((col) => wrapper.append(col));
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
  content.className = 'card-content';

  if (picContainer) { content.append(picContainer); }
  if (contentCell) {
    const textContent = document.createElement('div');
    textContent.className = 'card-text-content';
    textContent.append(...contentCell.childNodes);
    contentCell.append(textContent);
    if (linkOut) { contentCell.append(linkOut); }
    content.append(contentCell);
  }
  if (cardLink) {
    cardLink.append(content);
    el.append(cardLink);
  } else {
    el.append(content);
  }
  createCardGrid(el);
}
