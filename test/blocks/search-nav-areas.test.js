import { expect } from '@esm-bundle/chai';
import sinon from 'sinon';

import {
  parseLevel1Areas, fetchNavAreas, readLevel1AreasFromSitenav,
  NAV_AREA_DESCRIPTIONS, resetNavAreasCacheForTests,
} from '../../blocks/search/nav-areas.js';

// Mirrors the level-1 <li>/<button> shape blocks/sitenav/sitenav.js's
// decorateLevel() produces, without importing that module (its body is a
// side-effecting IIFE that fetches and injects the whole sitenav rail).
function buildDecoratedSitenav(labels) {
  const sitenav = document.createElement('div');
  sitenav.id = 'sitenav';
  sitenav.innerHTML = `<nav><ul class="level-1-list">${labels.map((label) => `
    <li class="level-1">
      <button class="level-1-button" aria-controls="${label.toLowerCase().replace(/\s+/g, '-')}">
        <span class="list-item-label">${label}</span>
      </button>
    </li>
  `).join('')}</ul></nav>`;
  return sitenav;
}

const FRAGMENT_HTML = `<body><header></header><main><div><ul>
  <li><p>Getting started</p><ul><li><a href="/a">a</a></li></ul></li>
  <li><p>Foundations</p><ul>
    <li><p>Principles</p><ul><li><a href="/b">b</a></li></ul></li>
  </ul></li>
</ul></div></main></body>`;

describe('parseLevel1Areas', () => {
  it('extracts only top-level labels, in document order', () => {
    const areas = parseLevel1Areas(FRAGMENT_HTML);
    expect(areas.map((a) => a.label)).to.deep.equal(['Getting started', 'Foundations']);
  });

  it('does not pick up a nested level-2 heading like "Principles"', () => {
    const areas = parseLevel1Areas(FRAGMENT_HTML);
    expect(areas.some((a) => a.label === 'Principles')).to.be.false;
  });

  it('pairs each label with its known description', () => {
    const areas = parseLevel1Areas(FRAGMENT_HTML);
    expect(areas[0].description).to.equal(NAV_AREA_DESCRIPTIONS['Getting started']);
  });

  it('defaults to an empty description for an unknown label', () => {
    const [only] = parseLevel1Areas('<main><div><ul><li><p>Unknown Area</p><ul><li><a>x</a></li></ul></li></ul></div></main>');
    expect(only.description).to.equal('');
  });

  it('returns an empty array for a fragment with no nav list', () => {
    expect(parseLevel1Areas('<main></main>')).to.deep.equal([]);
  });
});

describe('readLevel1AreasFromSitenav', () => {
  afterEach(() => {
    document.querySelector('#sitenav')?.remove();
  });

  it('returns null when no sitenav is present in the document', () => {
    expect(readLevel1AreasFromSitenav(document)).to.equal(null);
  });

  it('reads labels from an already-decorated sitenav, in document order', () => {
    document.body.append(buildDecoratedSitenav(['Getting started', 'Foundations']));
    const areas = readLevel1AreasFromSitenav(document);
    expect(areas.map((a) => a.label)).to.deep.equal(['Getting started', 'Foundations']);
  });

  it('pairs each label with its known description', () => {
    document.body.append(buildDecoratedSitenav(['Getting started']));
    const [only] = readLevel1AreasFromSitenav(document);
    expect(only.description).to.equal(NAV_AREA_DESCRIPTIONS['Getting started']);
  });

  it('falls back to the button aria-label for a linked-style item with no label span', () => {
    const sitenav = buildDecoratedSitenav([]);
    sitenav.querySelector('.level-1-list').innerHTML = `
      <li class="level-1">
        <button class="level-1-button" aria-label="Foundations" aria-controls="foundations"></button>
      </li>
    `;
    document.body.append(sitenav);
    const [only] = readLevel1AreasFromSitenav(document);
    expect(only.label).to.equal('Foundations');
  });
});

describe('fetchNavAreas', () => {
  let sandbox;

  beforeEach(() => {
    sandbox = sinon.createSandbox();
    resetNavAreasCacheForTests();
  });

  afterEach(() => {
    sandbox.restore();
    document.querySelector('#sitenav')?.remove();
  });

  it('fetches the site-nav fragment and parses it', async () => {
    const fetchImpl = sandbox.stub().resolves(new Response(FRAGMENT_HTML, { status: 200 }));
    const areas = await fetchNavAreas(fetchImpl, document);
    expect(areas.map((a) => a.label)).to.deep.equal(['Getting started', 'Foundations']);
    expect(fetchImpl.calledOnceWith('/fragments/nav/site-nav')).to.be.true;
  });

  it('resolves an empty array when the fragment cannot be fetched', async () => {
    const fetchImpl = sandbox.stub().resolves(new Response('', { status: 404 }));
    expect(await fetchNavAreas(fetchImpl, document)).to.deep.equal([]);
  });

  it('caches: a second call does not fetch again', async () => {
    const fetchImpl = sandbox.stub().resolves(new Response(FRAGMENT_HTML, { status: 200 }));
    await fetchNavAreas(fetchImpl, document);
    await fetchNavAreas(fetchImpl, document);
    expect(fetchImpl.calledOnce).to.be.true;
  });

  it('prefers an already-decorated sitenav over fetching, when one is present', async () => {
    document.body.append(buildDecoratedSitenav(['Getting started', 'Foundations']));
    const fetchImpl = sandbox.stub().rejects(new Error('should not be called'));

    const areas = await fetchNavAreas(fetchImpl, document);

    expect(areas.map((a) => a.label)).to.deep.equal(['Getting started', 'Foundations']);
    expect(fetchImpl.called).to.be.false;
  });
});
