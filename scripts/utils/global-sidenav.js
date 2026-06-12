import { loadBlock } from '../ak.js';

export default function loadGlobalSidenav() {
  const globalSidenav = document.createElement('div');
  globalSidenav.className = 'global-sidenav';
  const main = document.querySelector('main');
  if (main) {
    main.insertAdjacentElement('beforebegin', globalSidenav);
  } else {
    document.body.append(globalSidenav);
  }
  loadBlock(globalSidenav);
}
