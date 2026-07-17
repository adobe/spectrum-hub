export function capitalize(word) {
  return word.charAt(0).toUpperCase() + word.slice(1);
}

// "action-button" -> "ActionButton"
export function pascalCase(name) {
  return name.split('-').map(capitalize).join('');
}
