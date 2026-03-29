async function loadLivePreview(origin, loadPage) {
  const mod = await import(`${origin}/scripts/dapreview.js`);
  mod.default(loadPage);
}

export default function daPreview(loadPage) {
  const { search } = window.location;
  const ref = new URLSearchParams(search).get('dapreview');
  if (!ref) return;
  let origin;
  if (ref === 'on') origin = 'https://da.live';
  if (ref === 'local') origin = 'http://localhost:3000';
  if (!origin) origin = `https://${ref}--da-live--adobe.aem.live`;
  loadLivePreview(origin, loadPage);
}
