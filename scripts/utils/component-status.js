export function getComponentStatus(component, impl, data) {
  const entry = data.components[component];
  if (!entry) {
    return null;
  }

  const override = data.overrides[component];

  if (impl === 'swc') {
    if (entry.second_gen) {
      return override || data.generations.second_gen.default_status;
    }
    if (entry.first_gen) {
      return override || data.generations.first_gen.default_status;
    }
    return null;
  }

  return override || data.package.default_status;
}
