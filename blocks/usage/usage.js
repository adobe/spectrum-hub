const INDICATORS = {
  do: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" aria-hidden="true" focusable="false">
    <path d="M14.72 3.72a1 1 0 0 0-1.44 0L6 10.94 2.72 7.72A1 1 0 0 0 1.28 9.16l4 4a1 1 0 0 0 1.44 0l8-8a1 1 0 0 0 0-1.44z"/>
  </svg>`,
  dont: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" aria-hidden="true" focusable="false">
    <path d="M13.66 2.34a1 1 0 0 0-1.32 0L8 6.59 3.66 2.34A1 1 0 0 0 2.34 3.66L6.59 8l-4.25 4.34a1 1 0 0 0 1.32 1.32L8 9.41l4.34 4.25a1 1 0 0 0 1.32-1.32L9.41 8l4.25-4.34a1 1 0 0 0 0-1.32z"/>
  </svg>`,
  neutral: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" aria-hidden="true" focusable="false">
    <path d="M14 7H2a1 1 0 0 0 0 2h12a1 1 0 0 0 0-2z"/>
  </svg>`,
};

function makeIndicator(type) {
  const span = document.createElement('span');
  span.className = `do-dont-indicator do-dont-indicator-${type}`;
  span.innerHTML = INDICATORS[type];
  return span;
}

function buildPanel(type, cell) {
  const panel = document.createElement('div');
  panel.className = `do-dont-panel do-dont-panel-${type}`;
  panel.append(makeIndicator(type));

  if (!cell) return panel;

  const pic = cell.querySelector('picture');
  if (pic) {
    const wrapper = pic.closest('p');
    panel.append(pic);
    wrapper?.remove();
  }

  [...cell.querySelectorAll('p')].forEach((p) => {
    p.classList.add('do-dont-caption');
    panel.append(p);
  });

  return panel;
}

function decorateSinglePanel(el) {
  const type = ['do', 'dont', 'neutral'].find((t) => el.classList.contains(t)) ?? 'do';
  const row = el.querySelector(':scope > div');
  if (!row) return;

  const [textCell, imageCell] = [...row.children];

  const content = document.createElement('div');
  content.className = 'do-dont-content';
  if (textCell) content.append(...textCell.childNodes);

  const panel = buildPanel(type, imageCell);

  el.replaceChildren(content, panel);
}

function decorateMultiPanel(el) {
  const types = el.classList.contains('do-dont-neutral')
    ? ['do', 'dont', 'neutral']
    : ['do', 'dont'];

  const row = el.querySelector(':scope > div');
  if (!row) return;

  const cells = [...row.children];
  const panels = types.map((type, i) => buildPanel(type, cells[i]));

  el.replaceChildren(...panels);
}

export default function init(el) {
  const isSingle = ['do', 'dont', 'neutral'].some((t) => el.classList.contains(t));
  if (isSingle) {
    decorateSinglePanel(el);
  } else {
    decorateMultiPanel(el);
  }
}
