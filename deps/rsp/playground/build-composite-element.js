// Both functions take any element-shaped object (tagName, attributes,
// children, textContent) — a real parsed DOM Element satisfies this directly.

// So the caller knows which @react-spectrum/s2 sub-component exports to
// request from esm.sh (which tree-shakes to exactly what's asked for).
export function collectFragmentTagNames(root) {
  const tags = [];
  const seen = new Set();
  (function walk(node) {
    if (!seen.has(node.tagName)) {
      seen.add(node.tagName);
      tags.push(node.tagName);
    }
    [...node.children].forEach(walk);
  }(root));
  return tags;
}

// Resolves each tag to its real component reference (e.g. RSP.TabList)
// rather than treating the tag name as a literal HTML tag string.
export function buildCompositeElement(node, componentsByTag, createElement) {
  const Component = componentsByTag[node.tagName];
  const props = Object.fromEntries(
    [...node.attributes].map((attr) => [attr.name, attr.value === '' ? true : attr.value]),
  );
  const childNodes = [...node.children];
  if (!childNodes.length) {
    return createElement(Component, props, node.textContent);
  }
  return createElement(
    Component,
    props,
    ...childNodes.map((child) => buildCompositeElement(child, componentsByTag, createElement)),
  );
}
