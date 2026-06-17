function isExternal(href) {
  try {
    return new URL(href, window.location.href).hostname !== window.location.hostname;
  } catch {
    return false;
  }
}

// link-out container + icon
function buildLinkOut() {
  const div = document.createElement('div');
  div.className = 'card-link-out';
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svg.setAttribute('aria-hidden', 'true');
  const use = document.createElementNS('http://www.w3.org/2000/svg', 'use');
  use.setAttribute('href', '/img/icons/s2-icon-openin-20-n.svg#icon'); // TODO: do we want this to stay hard-coded or make it authorable?
  svg.append(use);
  div.append(svg);
  return div;
}

function buildCardLink(contentCell, hashAware) {
  const paragraphs = [...contentCell.querySelectorAll('p')];
  // last paragraph should have the link
  const linkPara = [...paragraphs].reverse().find((p) => {
    const a = p.querySelector('a');
    return a && p.textContent.trim() === a.textContent.trim();
  });
  if (!linkPara) { return null; }

  // the link in the last paragraph is the one we use as the full card link
  const cardLink = linkPara.querySelector('a');
  let href = cardLink.getAttribute('href') || '';
  const forceBlank = href.endsWith('#_blank');
  if (forceBlank) {
    href = href.slice(0, -7);
  }
  if (!href) { return null; }

  if (hashAware) { href += window.location.hash; }
  const external = isExternal(href);
  const blank = forceBlank || external;

  linkPara.classList.add('visually-hidden');
  linkPara.setAttribute('aria-hidden', 'true');
  // Remove the original anchor to avoid a nested <a> inside the card-link anchor (invalid HTML)
  cardLink.replaceWith(cardLink.textContent);

  const label = blank
    ? `${cardLink.textContent.trim()} (opens in new tab)`
    : cardLink.textContent.trim();

  const link = document.createElement('a');
  link.href = href;
  link.className = 'card-link';
  link.setAttribute('aria-label', label);
  if (blank) {
    link.target = '_blank';
    link.rel = 'noopener noreferrer';
  }
  return { cardLink: link, linkOut: external ? buildLinkOut() : null };
}

function detectPortrait(el, img) {
  const imgWidth = parseInt(img.getAttribute('width'), 10);
  const imgHeight = parseInt(img.getAttribute('height'), 10);
  if (imgWidth && imgHeight) {
    if (imgWidth < imgHeight) { el.classList.add('vertical'); }
    return;
  }
  const check = () => {
    if (img.naturalWidth > 0 && img.naturalWidth < img.naturalHeight) {
      el.classList.add('vertical');
    }
  };
  if (img.complete && img.naturalWidth > 0) {
    check();
  } else {
    img.addEventListener('load', check, { once: true });
  }
}

export default function init(el) {
  const rows = [...el.querySelectorAll(':scope > div')];
  let contentCell = null;
  let picContainer = null;

  rows.forEach((row) => {
    const cells = [...row.querySelectorAll(':scope > div')];
    const picCell = cells.find((cell) => cell.querySelector('picture, img'));
    if (picCell) {
      const pic = picCell.querySelector('picture, img');
      const picPara = pic.closest('p');
      picContainer = document.createElement('div');
      picContainer.className = 'card-picture-container';
      picContainer.append(pic);
      if (picPara) { picPara.remove(); }
    }
    contentCell = cells.find((cell) => cell !== picCell) || picCell;
    if (contentCell) { contentCell.classList.add('card-text-container'); }
    row.remove();
  });

  const hashAware = el.classList.contains('hash-aware');
  const { cardLink, linkOut } = (contentCell && buildCardLink(contentCell, hashAware)) || {};

  const content = document.createElement('div');
  content.className = 'card-content-container';

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

  const img = el.querySelector('img');
  if (img) { detectPortrait(el, img); }
}
