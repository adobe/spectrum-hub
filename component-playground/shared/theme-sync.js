/**
 * Mirrors the parent page's forced color scheme into this document so the
 * `light-dark()` background here resolves the same way as the site's
 * `--se-body-background-color`. The playground block posts
 * `{ type: 'theme-update', scheme }` on load and whenever the site's
 * light/dark toggle changes; `scheme` is 'light', 'dark', or null when no
 * override is active (falls back to `color-scheme: light dark` in CSS,
 * which follows the OS preference).
 */
window.addEventListener('message', (event) => {
  if (event.data?.type !== 'theme-update') { return; }
  document.body.style.colorScheme = event.data.scheme ?? '';
});
