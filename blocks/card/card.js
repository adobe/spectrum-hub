export function decorateCard(inner, hashAware = false) {
  inner.classList.add('card-inner');

  const [imageCol, titleCol, descCol, buttonLinkCol, linkOutCol] = [...inner.children];

  // First EDS column: image
  if (imageCol) {
    const pic = imageCol.querySelector('picture');
    if (pic) {
      imageCol.classList.add('card-picture-container');
      const picPara = pic.closest('p');
      if (picPara) {
        imageCol.prepend(pic);
        picPara.remove();
      }
    } else {
      imageCol.remove();
    }
  }

  // Second + third EDS columns: title and description merged into one content container
  if (!titleCol) return;
  const contentContainer = document.createElement('div');
  contentContainer.classList.add('card-content-container');
  contentContainer.append(...titleCol.childNodes);
  if (descCol) contentContainer.append(...descCol.childNodes);
  titleCol.replaceWith(contentContainer);
  descCol?.remove();

  // Fourth EDS column: internal button link (mutually exclusive with external link)
  if (buttonLinkCol) {
    const a = buttonLinkCol.querySelector('a');
    if (a) {
      if (hashAware) {
        a.href = `${a.getAttribute('href')}${window.location.hash}`;
      }
      a.classList.add('card-button');
      buttonLinkCol.classList.add('card-button-container');
      linkOutCol?.remove();
    } else {
      buttonLinkCol.remove();
    }
  }

  // Fifth EDS column: external link (opens in new tab)
  if (linkOutCol) {
    const a = linkOutCol.querySelector('a');
    if (a) {
      a.target = '_blank';
      a.rel = 'noopener noreferrer';
      linkOutCol.classList.add('card-external-link-container');
    } else {
      linkOutCol.remove();
    }
  }
}

export default function init(el) {
  const inner = el.querySelector(':scope > div');
  if (!inner) return;
  decorateCard(inner, el.classList.contains('hash-aware'));
}
