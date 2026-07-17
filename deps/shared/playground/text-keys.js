// Property names that stand in for a component's slot/children text content
// rather than a real named prop. Shared by the text pipeline (playground.js's
// snippet builders, playground-data.js's resolveControl) and the live-preview
// pipeline (deps/rsp/playground/apply-rsp-prop.js) — both need the same
// answer to "is this property flat text, not a real attribute/prop?".
export const TEXT_KEYS = new Set(['text', 'label', 'children']);
