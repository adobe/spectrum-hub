import { crawl } from 'https://da.live/nx/public/utils/tree.js';

function getOpts(token, method = 'GET') {
  return {
    method,
    headers: { Authorization: `Bearer ${token}` },
  };
}

const getMetadata = (el) => [...el.childNodes].reduce((rdx, row) => {
  if (row.children) {
    const key = row.children[0].textContent.trim().toLowerCase();
    const content = row.children[1];
    const text = content.textContent.trim().toLowerCase();
    if (key && text) rdx[key] = { text };
  }
  return rdx;
}, {});

async function fetchDoc(path, token) {
  const opts = getOpts(token);
  const resp = await fetch(`https://admin.da.live/source${path}`, opts);
  if (!resp.ok) return { message: 'Could not fetch doc.', status: resp.status };
  const html = await resp.text();
  return { html };
}

async function loadPageTags(path, token) {
  const { html } = await fetchDoc(path, token);
  if (!html) return [];
  const doc = new DOMParser().parseFromString(html, 'text/html');
  const metaEl = doc.querySelector('.metadata');
  if (metaEl) {
    const { tags } = getMetadata(metaEl);
    if (tags) {
      return tags.text.split(',').map((tag) => tag.trim().toLowerCase());
    }
  }
  return [];
}

export default async function loadTags(path, token, setStatus) {
  const callback = async (item) => {
    if (item.ext !== 'html') return;
    item.uiPath = item.path.replace('.html', '');
    setStatus(`Loading ${item.uiPath}`);
    item.tags = await loadPageTags(item.path, token);
  };

  const { results } = crawl({ path, callback, throttle: 10 });
  // Wait for results to finish
  const fullfilled = await results;

  // Reduce down to our desired format
  return fullfilled.reduce((acc, item) => {
    if (item.tags?.length > 0) {
      // De-dupe tags
      const uniqueTags = [...new Set(item.tags)];

      // loop through each page tag
      uniqueTags.forEach((pageTag) => {
        // find the tag in the existing accumulator
        const foundTag = acc.find((tag) => tag.name === pageTag);

        if (foundTag) {
          foundTag.pages.push(item);
        } else {
          const newTag = { name: pageTag, pages: [item] };
          acc.push(newTag);
        }
      });
    }
    return acc;
  }, []);
}
