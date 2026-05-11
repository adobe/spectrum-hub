function slugify(text) {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

export default async function init(el) {
  const headings = [...document.querySelectorAll('main h2')].filter(
    (h) => !el.contains(h),
  );
  if (!headings.length) {
    return;
  }

  headings.forEach((h) => {
    if (!h.id) {
      h.id = slugify(h.textContent);
    }
  });

  const labelId = 'in-page-nav-label';
  const label = document.createElement('p');
  label.id = labelId;
  label.classList.add('in-page-nav-label');
  label.textContent = 'On this page';

  const nav = document.createElement('nav');
  nav.setAttribute('aria-labelledby', labelId);

  const list = document.createElement('ul');
  headings.forEach((h) => {
    const li = document.createElement('li');
    const a = document.createElement('a');
    a.href = `#${h.id}`;
    a.textContent = h.textContent;
    li.append(a);
    list.append(li);
  });

  nav.append(list);
  el.append(label, nav);
}
