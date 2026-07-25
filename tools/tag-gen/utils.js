function createMetadataBlock() {
  const metadata = document.createElement('div');
  metadata.className = 'metadata';
  return metadata;
}

function createTagRow(tags) {
  const tagRow = document.createElement('div');

  const tagKey = document.createElement('div');
  tagKey.textContent = 'tags';

  const tagVal = document.createElement('div');
  tagVal.textContent = tags.join(', ');

  tagRow.append(tagKey, tagVal);

  return tagRow;
}

function getOpts(token, method = 'GET') {
  return {
    method,
    headers: {
      Authorization: `Bearer ${token}`,
    },
  };
}

async function fetchDoc(path, token) {
  const opts = getOpts(token);
  const resp = await fetch(`https://admin.da.live/source${path}.html`, opts);
  if (!resp.ok) return { message: 'Could not fetch doc.', status: resp.status };
  const html = await resp.text();
  return { html };
}

async function saveDoc(path, token, doc) {
  // Create the body
  const body = new FormData();
  const html = doc.body.outerHTML;
  const data = new Blob([html], { type: 'text/html' });
  body.append('data', data);

  // Setup options
  const opts = getOpts(token, 'POST');
  opts.body = body;

  const resp = await fetch(`https://admin.da.live/source${path}.html`, opts);
  if (!resp.ok) return { message: 'Could not save.', status: resp.status, type: 'error' };
  return { message: 'Successfully saved.', status: resp.status, type: 'success' };
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

export async function loadGenTags(path, token) {
  const { html } = await fetchDoc(path, token);
  const baseOpts = getOpts(token, 'POST');
  const opts = { ...baseOpts, body: JSON.stringify({ html }) };
  const resp = await fetch(`https://da-etc.adobeaem.workers.dev/tags`, opts);
  if (!resp.ok) return [];
  const { tags } = await resp.json();
  return tags;
}

export async function loadPageTags(path, token) {
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

export async function savePageTags(path, token, tags) {
  // Build the tag row elements
  const tagsRow = createTagRow(tags);

  // Always get a fresh doc
  const { html } = await fetchDoc(path, token);
  const doc = new DOMParser().parseFromString(html, 'text/html');

  // Re-use existing metadata block if possible
  const metaEl = doc.querySelector('.metadata');
  if (metaEl) {
    const metaRows = metaEl.querySelectorAll(':scope > div');
    const foundRow = [...metaRows].find((row) => {
      const text = row.children[0].textContent;
      return text === 'tags';
    });
    if (foundRow) {
      foundRow.parentElement.replaceChild(tagsRow, foundRow);
    } else {
      metaEl.append(tagsRow);
    }
  } else {
    // Make net-new metadata block
    const newMetaEl = createMetadataBlock();
    newMetaEl.append(tagsRow);
    doc.body.querySelector('main > div:last-child').append(newMetaEl);
  }
  return saveDoc(path, token, doc);
}
