export default async function init() {
  const main = document.querySelector('main');
  const heading = main.querySelector('h1');
  heading.classList.add('heading-size-xxxxl');
  const parent = heading.closest('div');
  parent.className = 'home-column';
  parent.nextElementSibling.append(parent);
}
