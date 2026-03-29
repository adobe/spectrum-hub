(async function lazyHash() {
  const id = window.localStorage.getItem('lazyhash');
  if (!id) return;
  window.localStorage.removeItem('lazyhash');
  window.document.getElementById(id)?.scrollIntoView();
}());
