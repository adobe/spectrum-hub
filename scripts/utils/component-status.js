// Resolves a component's status from an implementation's S2 manifest.
// Both `rsp` (@react-spectrum/s2) and `swc` (@adobe/spectrum-wc) manifests
// share the same shape: { package: { default_status }, components: { id: bool },
// overrides: { id: status } }. Returns null when the component isn't in the
// manifest (or is in the manifest with a falsy value) — i.e. the implementation
// doesn't ship it yet.
export function getComponentStatus(component, data) {
  if (!data.components[component]) {
    return null;
  }
  return data.overrides[component] || data.package.default_status;
}
