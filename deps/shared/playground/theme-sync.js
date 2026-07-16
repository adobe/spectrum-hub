// Mirrors the parent page's forced color scheme (`scheme`: 'light'/'dark'/null)
// into `color-scheme` (for light-dark() CSS) and swc-theme--light/dark (for
// swc.css). A null scheme falls back to following the OS.
window.addEventListener('message', (event) => {
  if (event.data?.type !== 'theme-update') { return; }
  const scheme = event.data.scheme ?? '';
  document.body.style.colorScheme = scheme;
  const dark = scheme === 'dark';
  document.body.classList.toggle('swc-theme--dark', dark);
  document.body.classList.toggle('swc-theme--light', !dark);
});
