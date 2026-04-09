export default function init() {
  const heading = document.querySelector('h1');
  heading.classList.add('heading-size-xxxxl');

  const parent = heading.closest('div');
  parent.className = 'home-column';
  parent.nextElementSibling.append(parent);
}
