// Both functions take any element-shaped object (tagName, attributes,
// children, textContent) — a real parsed DOM Element satisfies this directly.

const EXTERNAL_COMPONENTS = Object.freeze({
  ImageIllustration: {
    specifier: '@react-spectrum/s2/illustrations/gradient/generic1/Image',
    exportName: 'default',
  },
});

export function resolveExternalComponent(tagName) {
  return EXTERNAL_COMPONENTS[tagName] ?? null;
}

export function buildRspImportSpecifiers(exportName, tagNames) {
  const externalSpecifiers = tagNames
    .map((tagName) => resolveExternalComponent(tagName)?.specifier)
    .filter(Boolean);
  if (!externalSpecifiers.length) { return []; }
  return [
    `@react-spectrum/s2/${exportName}`,
    '@react-spectrum/s2/Provider',
    '@react-spectrum/s2/ButtonGroup',
    ...externalSpecifiers,
  ];
}

export function parseRspAttributeValue(value) {
  if (value === '') { return true; }
  const numericExpression = value.match(/^\{(-?(?:\d+(?:\.\d+)?|\.\d+))\}$/);
  return numericExpression ? Number(numericExpression[1]) : value;
}

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
    [...node.attributes].map((attr) => [attr.name, parseRspAttributeValue(attr.value)]),
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
