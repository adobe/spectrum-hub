export default async function init() {
  const resp = await fetch('/query-index.json');
  if (!resp.ok) return;
  const json = await resp.json();
  console.log(json.data);
}
