// Bypass-blocks links for the header and the sitenav. Both point at <main>, so the
// target lives here rather than in either caller.
const MAIN_ID = 'main-content';

/**
 * Builds a skip link and prepares its target.
 * @param {string} text visible label
 * @returns {HTMLAnchorElement}
 */
export default function createSkipLink(text = 'Skip to main content') {
  const main = document.querySelector('main');
  const id = main?.id || MAIN_ID;
  if (main) {
    main.id = id;
    // A bare <main> isn't focusable, so Safari scrolls without moving focus and the
    // next Tab resumes from the nav the user just skipped.
    main.tabIndex = -1;
  }

  const link = document.createElement('a');
  link.classList.add('skip-link', 'visually-hidden');
  link.href = `#${id}`;
  link.textContent = text;
  return link;
}
