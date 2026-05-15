import { IMPLEMENTATIONS } from '../../scripts/utils/implementations.js';

// Counts the authored component pages under `/platforms/<implId>/components/`.
// Returns 0 when the index isn't reachable or has no entries for that impl.
function countComponentsForImpl(queryData, implId) {
  if (!queryData?.data) {
    return 0;
  }
  const prefix = `/platforms/${implId}/components/`;
  return queryData.data.filter(({ path }) => path.startsWith(prefix)).length;
}

async function fetchQueryIndex() {
  try {
    const resp = await fetch('/query-index.json');
    if (!resp.ok) {
      return null;
    }
    return await resp.json();
  } catch {
    return null;
  }
}

function buildCard(impl, count) {
  const card = document.createElement('a');
  card.className = 'implementation-card';
  card.href = `/platforms/${impl.id}/overview`;
  card.setAttribute('aria-label', `${impl.label}: ${count} ${count === 1 ? 'component' : 'components'}`);

  const title = document.createElement('h2');
  title.className = 'implementation-card-title';
  title.textContent = impl.label;

  const countEl = document.createElement('p');
  countEl.className = 'implementation-card-count';
  // Status ratio visual is in the plan but deferred — the manifest can drive
  // it once design lands on the breakdown shape (badge cluster vs. stacked bar
  // vs. percentage). For now the count alone matches the v1 cards.
  countEl.textContent = `${count} ${count === 1 ? 'component' : 'components'}`;

  card.append(title, countEl);
  return card;
}

export default async function init(el) {
  const queryData = await fetchQueryIndex();

  const list = document.createElement('div');
  list.className = 'implementation-cards-list';

  IMPLEMENTATIONS.forEach((impl) => {
    const count = countComponentsForImpl(queryData, impl.id);
    list.append(buildCard(impl, count));
  });

  el.append(list);
}
