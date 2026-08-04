import { expect } from '@esm-bundle/chai';
import sinon from 'sinon';

import {
  parseLevel1Areas, fetchNavAreas, NAV_AREA_DESCRIPTIONS, resetNavAreasCacheForTests,
} from '../../blocks/search/nav-areas.js';

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

describe('fetchNavAreas', () => {
  let sandbox;

  beforeEach(() => {
    sandbox = sinon.createSandbox();
    resetNavAreasCacheForTests();
  });

  afterEach(() => sandbox.restore());

  it('fetches the site-nav fragment and parses it', async () => {
    const fetchImpl = sandbox.stub().resolves(new Response(FRAGMENT_HTML, { status: 200 }));
    const areas = await fetchNavAreas(fetchImpl);
    expect(areas.map((a) => a.label)).to.deep.equal(['Getting started', 'Foundations']);
    expect(fetchImpl.calledOnceWith('/fragments/nav/site-nav')).to.be.true;
  });

  it('resolves an empty array when the fragment cannot be fetched', async () => {
    const fetchImpl = sandbox.stub().resolves(new Response('', { status: 404 }));
    expect(await fetchNavAreas(fetchImpl)).to.deep.equal([]);
  });

  it('caches: a second call does not fetch again', async () => {
    const fetchImpl = sandbox.stub().resolves(new Response(FRAGMENT_HTML, { status: 200 }));
    await fetchNavAreas(fetchImpl);
    await fetchNavAreas(fetchImpl);
    expect(fetchImpl.calledOnce).to.be.true;
  });
});
