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
  if (!resp.ok) { return undefined; }
  return resp.text();
}

function extractText(docHtml) {
  if (!docHtml) { return ''; }
  const doc = new DOMParser().parseFromString(docHtml, 'text/html');
  const root = doc.querySelector('main') || doc.body;
  return root.textContent.replace(/\s+/g, ' ').trim();
}

export async function loadComponents(basePath, token) {
  const opts = getOpts(token);
  const resp = await fetch(`https://admin.da.live/list${basePath}/fragments/components`, opts);
  if (!resp.ok) { return []; }
  const items = await resp.json();
  return items
    .filter((item) => item.name && !item.ext)
    .map((item) => ({ name: item.name, path: item.path }))
    .sort((a, b) => a.name.localeCompare(b.name));
}

export async function loadComponentDescription(component, token) {
  const docHtml = await fetchDoc(`${component.path}/description`, token);
  return extractText(docHtml);
}

function createMetadataBlock() {
  const metadata = document.createElement('div');
  metadata.className = 'metadata';
  return metadata;
}

function createDescriptionRow(description) {
  const row = document.createElement('div');

  const key = document.createElement('div');
  key.textContent = 'description';

  const val = document.createElement('div');
  val.textContent = description;

  row.append(key, val);

  return row;
}

async function saveDoc(path, token, doc) {
  const body = new FormData();
  const html = doc.body.outerHTML;
  const data = new Blob([html], { type: 'text/html' });
  body.append('data', data);

  const opts = getOpts(token, 'POST');
  opts.body = body;

  const resp = await fetch(`https://admin.da.live/source${path}.html`, opts);
  if (!resp.ok) { return { message: 'Could not save.', status: resp.status, type: 'error' }; }
  return { message: 'Successfully saved.', status: resp.status, type: 'success' };
}

const getMetadata = (el) => [...el.childNodes].reduce((rdx, row) => {
  if (row.children) {
    const key = row.children[0].textContent.trim().toLowerCase();
    const content = row.children[1];
    const text = content.textContent.trim();
    if (key && text) { rdx[key] = { text }; }
  }
  return rdx;
}, {});

export async function loadPageDescription(path, token) {
  const docHtml = await fetchDoc(path, token);
  if (!docHtml) { return undefined; }
  const doc = new DOMParser().parseFromString(docHtml, 'text/html');
  const metaEl = doc.querySelector('.metadata');
  if (metaEl) {
    const { description } = getMetadata(metaEl);
    if (description) { return description.text; }
  }
  return undefined;
}

export async function savePageDescription(path, token, description) {
  const descriptionRow = createDescriptionRow(description);

  // Always work from a fresh doc
  const docHtml = await fetchDoc(path, token);
  const doc = new DOMParser().parseFromString(docHtml, 'text/html');

  const metaEl = doc.querySelector('.metadata');
  if (metaEl) {
    const metaRows = metaEl.querySelectorAll(':scope > div');
    const foundRow = [...metaRows].find((row) => {
      const text = row.children[0].textContent.trim().toLowerCase();
      return text === 'description';
    });
    if (foundRow) {
      foundRow.parentElement.replaceChild(descriptionRow, foundRow);
    } else {
      metaEl.append(descriptionRow);
    }
  } else {
    // Make net-new metadata block
    const newMetaEl = createMetadataBlock();
    newMetaEl.append(descriptionRow);
    doc.body.querySelector('main > div:last-child').append(newMetaEl);
  }
  return saveDoc(path, token, doc);
}
