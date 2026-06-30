import { loadBlock } from '../ak.js';

export default function loadHubGlobalSidenav() {
  const globalSidenav = document.createElement('div');
  globalSidenav.className = 'hub-global-sidenav';
  const navRail = document.querySelector('.nav-rail');
  if (navRail) {
    navRail.prepend(globalSidenav);
  } else {
    const main = document.querySelector('main');
    if (main) {
      main.insertAdjacentElement('beforebegin', globalSidenav);
    } else {
      document.body.append(globalSidenav);
    }
  }
  loadBlock(globalSidenav);
}
