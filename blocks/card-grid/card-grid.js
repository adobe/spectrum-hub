import { decorateCard } from '../card/card.js';

export default function init(el) {
  const wrapper = document.createElement('div');
  wrapper.className = 'card-grid-wrapper';
  el.replaceWith(wrapper);
  wrapper.append(el);

  for (const item of el.children) {
    item.classList.add('card-grid-item', 'card');

    // Wrap columns in a div so the structure mirrors a standalone card,
    // keeping .card and .card-inner on separate elements for CSS nesting to work
    const inner = document.createElement('div');
    inner.append(...item.children);
    item.append(inner);

    decorateCard(inner);
  }
}
