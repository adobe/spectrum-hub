/*
 * The card fields that carry private information: a component's steward,
 * design resources and contact. Authored as page metadata, so each value
 * reaches the edge as HTML <head> tags, Markdown Metadata rows, and a column
 * on every card query index once the index config selects it. All three are
 * stripped before an anonymous viewer sees them.
 *
 * Stripping by field name rather than by row value is deliberate: these are
 * private wherever they appear, so nothing on the page has to mark them and
 * an unmarked page cannot leak them.
 *
 * This is the only definition, and the Lambda could not share one with the
 * site anyway: deploy.sh ships index.js, handlers/ and lib/ and nothing else,
 * so nothing under scripts/ is importable from here. The browser needs no
 * copy - card-grid names the fields it renders, and the edge decides what a
 * row carries. A new private field goes here and in the index config, and
 * nowhere else.
 */

// Metadata names, which double as the query-index column names: AEM spells a
// column exactly as its property is named in the index config.
export const PRIVATE_CARD_FIELDS = [
  'card-steward',
  'card-design-resources',
  'card-contact',
];
