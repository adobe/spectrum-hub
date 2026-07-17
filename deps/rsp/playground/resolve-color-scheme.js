// `colorScheme` only accepts 'light'/'dark', no "follow OS" value. `prefersDark`
// is injected (matchMedia('(prefers-color-scheme: dark)').matches, in
// practice) so this is testable without mocking a browser global.
export function resolveColorScheme(currentScheme, prefersDark) {
  return currentScheme ?? (prefersDark ? 'dark' : 'light');
}
