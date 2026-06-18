import ENV from './utils/env.js';

async function loadSidekick() {
  const getSk = () => document.querySelector('aem-sidekick');

  const sk = getSk() || await new Promise((resolve) => {
    document.addEventListener('sidekick-ready', () => resolve(getSk()));
  });
  if (sk) { import('../tools/sidekick/sidekick.js').then((mod) => mod.default(sk)); }
}

function loadSpectrumTheme() {
  if (!document.body) return;
  const theme = document.createElement('sp-theme');
  theme.setAttribute('system', 'spectrum-two');
  theme.setAttribute('scale', 'medium');
  theme.style.display = 'contents';

  const syncColor = () => {
    theme.setAttribute('color', document.body.classList.contains('dark-scheme') ? 'dark' : 'light');
  };
  syncColor();
  new MutationObserver(syncColor).observe(document.body, { attributeFilter: ['class'] });

  while (document.body.firstChild) theme.append(document.body.firstChild);
  document.body.append(theme);
}

(function loadLazy() {
  import('./utils/lazyhash.js');
  import('./utils/favicon.js');
  import('./utils/footer.js').then(({ default: footer }) => footer());
  import('./utils/global-sidenav.js').then(({ default: globalSidenav }) => {
    loadSpectrumTheme();
    globalSidenav();
  });

  // Author facing tools
  if (ENV !== 'prod') {
    import('../tools/scheduler/scheduler.js');
    loadSidekick();
  }
}());
