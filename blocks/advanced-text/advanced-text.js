const getMetadata = (el) => [...el.childNodes].reduce((rdx, row) => {
  if (row.children?.length > 1) {
    const key = row.children[0].textContent.trim().toLowerCase();
    const content = row.children[1];
    const text = content.textContent.trim().toLowerCase();
    if (key && content) rdx[key] = text;
    row.remove();
  }
  return rdx;
}, {});

export default function init(el) {
  const props = getMetadata(el);
  for (const [key, value] of Object.entries(props)) {
    if (key.startsWith('heading')) {
      const heading = document.querySelector('h1, h2, h3, h4, h5, h6');
      heading.classList.add(`${key}-${value}`);
    }
  }
}
