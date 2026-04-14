export default function init(el) {
  console.log(el.className)
  const rows = el.querySelectorAll(':scope > div')
  console.log(rows)
}
