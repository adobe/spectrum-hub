(async function lazyHash() {
  const id = window.localStorage.getItem('lazyhash');
  if (!id) { return; }
  window.localStorage.removeItem('lazyhash');
  // Instant, not the page's global smooth scroll-behavior: an animated jump
  // travels visibly over any section whose images are still `loading="lazy"`,
  // pulling them in and growing the page mid-scroll so it lands short of a
  // target that kept moving out from under it.
  window.document.getElementById(id)?.scrollIntoView({ block: 'start', behavior: 'instant' });
}());
