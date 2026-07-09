/**
 * Mirrors the parent page's forced color scheme into this document so the
 * preview matches the site. The playground block posts
 * `{ type: 'theme-update', scheme }` on load and whenever the site's
 * light/dark toggle changes; `scheme` is 'light', 'dark', or null when no
 * override is active.
 *
 * Two things are kept in sync:
 * - `color-scheme` on the body, so the `light-dark()` background here resolves
 *   the same way as the site's `--se-body-background-color`. A null scheme
 *   falls back to `color-scheme: light dark` in CSS (follows the OS).
 * - the `swc-theme--light` / `swc-theme--dark` class, which is what SWC's
 *   `swc.css` reads to theme the component. A null scheme defaults to light.
 */
window.addEventListener('message', (event) => {
  if (event.data?.type !== 'theme-update') { return; }
  const scheme = event.data.scheme ?? '';
  document.body.style.colorScheme = scheme;
  const dark = scheme === 'dark';
  document.body.classList.toggle('swc-theme--dark', dark);
  document.body.classList.toggle('swc-theme--light', !dark);
});
