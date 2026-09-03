// Collapses a group of controls into a single tab stop: one member carries
// tabindex="0", the rest -1, and arrow keys move between them.
//
// The member list is recomputed per keystroke rather than cached, so there is no
// stale-cache window and no MutationObserver to keep in sync — the tree is tens of
// elements and this runs once per keypress.

const FOCUSABLE = 'a[href], button:not([disabled])';

// A bare checkVisibility() ignores visibility:hidden, which is exactly how collapsed
// flyouts are hidden — without this the group would include every closed menu.
export const isFocusable = (el) => el.checkVisibility({ visibilityProperty: true });

export const focusableIn = (root) => [...root.querySelectorAll(FOCUSABLE)].filter(isFocusable);

/**
 * @param {Element} container element the group's listeners are delegated to. May be wider
 *   than the group itself — events on non-members are ignored — which lets a group whose
 *   members are hidden at init still re-sync when an ancestor reveals them.
 * @param {object} [options]
 * @param {() => Element[]} [options.items] ordered, currently focusable members
 * @param {(items: Element[]) => Element} [options.initial] which member starts as the tab stop
 * @param {Record<string, (el: Element, items: Element[]) => Element|boolean>} [options.keys]
 *   extra key handlers. Return an element to move to it, `true` to swallow the key
 *   without moving, or a falsy value to leave the key to the browser.
 * @param {AbortSignal} [options.signal] removes the listeners when aborted
 * @returns {{ sync: () => void }}
 */
export default function rovingTabindex(container, {
  items = () => focusableIn(container),
  initial = (list) => list[0],
  keys = {},
  signal,
} = {}) {
  let anchor = null;

  const sync = () => {
    const list = items();
    if (!list.length) { return; }
    if (!list.includes(anchor)) { anchor = initial(list) ?? list[0]; }
    list.forEach((el) => { el.tabIndex = el === anchor ? 0 : -1; });
  };

  const move = (el) => {
    anchor = el;
    sync();
    el.focus();
  };

  container.addEventListener('focusin', ({ target }) => {
    if (!items().includes(target)) { return; }
    anchor = target;
    sync();
  }, { signal });

  // Expanding or collapsing a menu changes which members are focusable, so the tab
  // stop has to be re-picked before focus ever leaves the group.
  container.addEventListener('click', sync, { signal });

  container.addEventListener('keydown', (e) => {
    if (e.altKey || e.ctrlKey || e.metaKey) { return; }
    const list = items();
    const index = list.indexOf(e.target);
    if (index === -1) { return; }

    const handler = keys[e.key];
    if (handler) {
      const result = handler(e.target, list);
      if (!result) { return; }
      e.preventDefault();
      if (result === true) {
        sync();
        return;
      }
      move(result);
      return;
    }

    const next = {
      ArrowDown: list[index + 1],
      ArrowUp: list[index - 1],
      Home: list[0],
      End: list.at(-1),
    }[e.key];
    if (!next) { return; }
    e.preventDefault();
    move(next);
  }, { signal });

  sync();
  return { sync };
}
