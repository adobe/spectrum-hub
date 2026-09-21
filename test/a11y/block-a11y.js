// Shared utilities for per-block a11y spec files (test/a11y/blocks/<name>.spec.js).

export function formatViolations(violations) {
  return violations
    .map(({ id, impact, description, nodes }) => `[${impact}] ${id}: ${description}\n${nodes.map((n) => `  ${n.html}`).join('\n')}`)
    .join('\n\n');
}
