export default function init() {
  const main = document.querySelector('main');

  const wrapper = document.createElement('div');
  wrapper.className = 'template-wrapper';

  main.replaceWith(wrapper);
  wrapper.append(main);
}
