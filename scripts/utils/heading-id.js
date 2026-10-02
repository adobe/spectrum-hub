export default function normalizeHeadingId(id) {
  return id
    .replace(/^size-[a-z0-9]+-/, '')
    .replace(/-size-[a-z0-9]+$/, '');
}
