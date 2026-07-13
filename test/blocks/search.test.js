import { expect } from '@esm-bundle/chai';
import sinon from 'sinon';
import init, {
  algoliaSearch,
  fetchData,
  SEARCH_DEBOUNCE_MS,
  SEARCH_HITS_PER_PAGE,
} from '../../blocks/search/search.js';

const originalHref = window.location.href;

const SAMPLE_DATA = [
  { path: '/page-one', title: 'Page One', description: 'First description' },
  { path: '/page-two', title: 'Page Two', description: 'Second description' },
];

// callsFake ensures a fresh Response body is created per call —
// a Response body can only be consumed once.
function stubFetch(sandbox, data = SAMPLE_DATA, status = 200) {
  return sandbox.stub(window, 'fetch').callsFake(() => Promise.resolve(
    new Response(JSON.stringify({ data }), { status }),
  ));
}

function makeBlock({ linkHref } = {}) {
  const el = document.createElement('div');
  el.classList.add('search');
  if (linkHref) {
    const p = document.createElement('p');
    const a = document.createElement('a');
    a.href = linkHref;
    p.append(a);
    el.append(p);
  }
  document.body.append(el);
  return el;
}

async function typeIntoSearch(block, value) {
  const input = block.querySelector('.search-input');
  input.value = value;
  input.dispatchEvent(new Event('input'));
  // wait past the debounce interval so the search actually runs
  await new Promise((resolve) => { setTimeout(resolve, SEARCH_DEBOUNCE_MS + 20); });
}

describe('search block', () => {
  let sandbox;

  beforeEach(() => {
    sandbox = sinon.createSandbox();
    document.body.innerHTML = '';
  });

  afterEach(() => {
    sandbox.restore();
    window.history.pushState({}, '', originalHref);
  });

  describe('fetchData', () => {
    it('returns the data array from a successful response', async () => {
      stubFetch(sandbox);
      const result = await fetchData('/query-index.json');
      expect(result).to.deep.equal(SAMPLE_DATA);
    });

    it('returns null for a non-OK response', async () => {
      sandbox.stub(window, 'fetch').resolves(new Response('', { status: 404 }));
      const result = await fetchData('/query-index.json');
      expect(result).to.be.null;
    });

    it('calls fetch with the provided source URL', async () => {
      const stub = stubFetch(sandbox);
      await fetchData('/custom-index.json');
      expect(stub.calledOnceWith('/custom-index.json')).to.be.true;
    });
  });

  describe('algoliaSearch', () => {
    function fakeAlgoliaConfig(hits = []) {
      const calls = [];
      return {
        calls,
        algolia: {
          indexName: 'spectrum_hub',
          client: {
            searchSingleIndex: async (args) => {
              calls.push(args);
              return { hits };
            },
          },
        },
      };
    }

    it('queries the configured index with the joined terms', async () => {
      const config = fakeAlgoliaConfig();
      await algoliaSearch(['page', 'one'], config);
      expect(config.calls[0].indexName).to.equal('spectrum_hub');
      expect(config.calls[0].searchParams.query).to.equal('page one');
      expect(config.calls[0].searchParams.hitsPerPage).to.equal(SEARCH_HITS_PER_PAGE);
    });

    it('returns the hits from the response', async () => {
      const hits = [{ path: '/a', title: 'A' }];
      const config = fakeAlgoliaConfig(hits);
      const results = await algoliaSearch(['a'], config);
      expect(results).to.deep.equal(hits);
    });
  });

  describe('decorate — DOM structure', () => {
    let block;

    beforeEach(async () => {
      stubFetch(sandbox);
      block = makeBlock();
      await init(block);
    });

    it('replaces block content with a search-box and search-results', () => {
      expect(block.querySelector('.search-box')).to.not.be.null;
      expect(block.querySelector('.search-results')).to.not.be.null;
    });

    it('renders a search input with type="search"', () => {
      const input = block.querySelector('.search-input');
      expect(input).to.not.be.null;
      expect(input.getAttribute('type')).to.equal('search');
    });

    it('sets the input placeholder to "Search..."', () => {
      expect(block.querySelector('.search-input').placeholder).to.equal('Search...');
    });

    it('sets aria-label on the input to match the placeholder', () => {
      expect(block.querySelector('.search-input').getAttribute('aria-label')).to.equal('Search...');
    });

    it('renders an icon-search span inside the search box', () => {
      expect(block.querySelector('.search-box .icon-search')).to.not.be.null;
    });

    it('gives the results container role="status" for screen reader announcements', () => {
      expect(block.querySelector('.search-results').getAttribute('role')).to.equal('status');
    });

    it('gives the results container aria-live="polite"', () => {
      expect(block.querySelector('.search-results').getAttribute('aria-live')).to.equal('polite');
    });

    it('gives the results container aria-atomic="true"', () => {
      expect(block.querySelector('.search-results').getAttribute('aria-atomic')).to.equal('true');
    });
  });

  describe('decorate — source URL', () => {
    it('uses the href from the link in the block as the data source', async () => {
      const stub = stubFetch(sandbox);
      const block = makeBlock({ linkHref: 'https://example.com/custom-index.json' });
      await init(block);
      await typeIntoSearch(block, 'page');
      expect(stub.calledWith('https://example.com/custom-index.json')).to.be.true;
    });

    it('falls back to /query-index.json when the block has no link', async () => {
      const stub = stubFetch(sandbox);
      const block = makeBlock();
      await init(block);
      await typeIntoSearch(block, 'page');
      expect(stub.calledWith('/query-index.json')).to.be.true;
    });
  });

  describe('search input behavior', () => {
    let block;
    let fetchStub;

    beforeEach(async () => {
      fetchStub = stubFetch(sandbox);
      block = makeBlock();
      await init(block);
    });

    it('does not fetch when fewer than 3 characters are typed', async () => {
      fetchStub.resetHistory();
      await typeIntoSearch(block, 'pa');
      expect(fetchStub.called).to.be.false;
    });

    it('fetches and renders results when 3 or more characters are typed', async () => {
      await typeIntoSearch(block, 'page');
      expect([...block.querySelectorAll('.search-results li')]).to.have.length(2);
    });

    it('debounces rapid input into a single search', async () => {
      fetchStub.resetHistory();
      const input = block.querySelector('.search-input');
      ['pag', 'page', 'pages'].forEach((value) => {
        input.value = value;
        input.dispatchEvent(new Event('input'));
      });
      await new Promise((resolve) => { setTimeout(resolve, SEARCH_DEBOUNCE_MS + 20); });
      expect(fetchStub.callCount).to.equal(1);
    });

    it('clears results when input drops below 3 characters after a search', async () => {
      await typeIntoSearch(block, 'page');
      await typeIntoSearch(block, 'pa');
      expect(block.querySelector('.search-results').innerHTML).to.equal('');
    });

    it('shows "No results found." when no results match', async () => {
      await typeIntoSearch(block, 'zzz');
      expect(block.querySelector('.search-results').textContent).to.include('No results found.');
    });

    it('adds no-results class to the results container when there are no matches', async () => {
      await typeIntoSearch(block, 'zzz');
      expect(block.querySelector('.search-results').classList.contains('no-results')).to.be.true;
    });

    it('removes no-results class when results are found after a no-match search', async () => {
      await typeIntoSearch(block, 'zzz');
      await typeIntoSearch(block, 'page');
      expect(block.querySelector('.search-results').classList.contains('no-results')).to.be.false;
    });

    it('clears results on Escape key', async () => {
      await typeIntoSearch(block, 'page');
      block.querySelector('.search-input').dispatchEvent(new KeyboardEvent('keyup', { code: 'Escape' }));
      expect(block.querySelector('.search-results').innerHTML).to.equal('');
    });

    it('updates the URL query param when a search is performed', async () => {
      await typeIntoSearch(block, 'page');
      expect(window.location.search).to.include('q=page');
    });
  });

  describe('search result rendering', () => {
    let block;

    beforeEach(async () => {
      stubFetch(sandbox, [
        { path: '/test-page', title: 'Test Page', description: 'A test description' },
      ]);
      block = makeBlock();
      await init(block);
      await typeIntoSearch(block, 'test');
    });

    it('renders one list item per matching result', () => {
      expect([...block.querySelectorAll('.search-results li')]).to.have.length(1);
    });

    it('renders the result title as an anchor', () => {
      expect(block.querySelector('.search-result-title a').textContent).to.equal('Test Page');
    });

    it('sets the result link href to the result path', () => {
      expect(block.querySelector('.search-result-title a').getAttribute('href')).to.equal('/test-page');
    });

    it('renders the result description as a paragraph', () => {
      expect(block.querySelector('.search-results p').textContent).to.equal('A test description');
    });

    it('highlights matching terms in the title with <mark>', () => {
      expect(block.querySelector('.search-result-title mark')).to.not.be.null;
    });

    it('highlights matching terms in the description with <mark>', () => {
      expect(block.querySelector('.search-results p mark')).to.not.be.null;
    });
  });

  describe('search result filtering', () => {
    it('matches results case-insensitively', async () => {
      stubFetch(sandbox, [{ path: '/page', title: 'Hello World', description: '' }]);
      const block = makeBlock();
      await init(block);
      await typeIntoSearch(block, 'hello');
      expect([...block.querySelectorAll('.search-results li')]).to.have.length(1);
    });

    it('excludes results that do not match any search term', async () => {
      stubFetch(sandbox, [
        { path: '/match', title: 'Matching Title', description: '' },
        { path: '/no-match', title: 'Unrelated', description: '' },
      ]);
      const block = makeBlock();
      await init(block);
      await typeIntoSearch(block, 'matching');
      expect([...block.querySelectorAll('.search-results li')]).to.have.length(1);
    });

    it('matches terms found only in the description', async () => {
      stubFetch(sandbox, [{ path: '/page', title: 'Unrelated Title', description: 'unique keyword here' }]);
      const block = makeBlock();
      await init(block);
      await typeIntoSearch(block, 'unique');
      expect([...block.querySelectorAll('.search-results li')]).to.have.length(1);
    });
  });
});
