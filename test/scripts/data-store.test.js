import { expect } from '@esm-bundle/chai';
import sinon from 'sinon';
import { getData, clear } from '../../scripts/utils/data-store.js';

// A fresh Response per call: a Response body can only be consumed once, so a
// stub that resolves one shared instance breaks the moment two fetches happen.
const jsonResponse = (data, status = 200) => new Response(
  JSON.stringify({ data }),
  { status, headers: { 'content-type': 'application/json' } },
);

describe('data-store', () => {
  let sandbox;

  beforeEach(() => {
    sandbox = sinon.createSandbox();
    clear();
  });

  afterEach(() => {
    sandbox.restore();
    clear();
  });

  describe('getData', () => {
    it('resolves the parsed payload for an endpoint', async () => {
      const fetchStub = sandbox.stub(window, 'fetch')
        .callsFake(() => Promise.resolve(jsonResponse([{ path: '/web/rsp/components/button' }])));

      const result = await getData('/web/components/query-index.json');

      expect(result.data).to.deep.equal([{ path: '/web/rsp/components/button' }]);
      expect(fetchStub.callCount).to.equal(1);
      expect(fetchStub.firstCall.args).to.deep.equal(['/web/components/query-index.json']);
    });

    it('serves a repeat request from cache without fetching again', async () => {
      const fetchStub = sandbox.stub(window, 'fetch')
        .callsFake(() => Promise.resolve(jsonResponse([{ path: '/a' }])));

      const first = await getData('/web/components/query-index.json');
      const second = await getData('/web/components/query-index.json');

      expect(fetchStub.callCount).to.equal(1);
      // Identity compared as a boolean: chai deep-equality on a large live
      // object graph is slow and has hung this suite before.
      expect(first === second).to.be.true;
    });

    it('collapses concurrent requests for one endpoint into a single fetch', async () => {
      let settle;
      const fetchStub = sandbox.stub(window, 'fetch')
        .returns(new Promise((resolve) => { settle = resolve; }));

      const first = getData('/web/components/query-index.json');
      const second = getData('/web/components/query-index.json');

      expect(fetchStub.callCount).to.equal(1);

      settle(jsonResponse([{ path: '/a' }]));
      const [a, b] = await Promise.all([first, second]);

      expect(a === b).to.be.true;
    });

    it('fetches each distinct endpoint separately', async () => {
      const fetchStub = sandbox.stub(window, 'fetch')
        .callsFake(() => Promise.resolve(jsonResponse([])));

      await getData('/web/components/query-index.json');
      await getData('/deps/status-index.json');

      expect(fetchStub.callCount).to.equal(2);
    });

    it('resolves null for a non-2xx response', async () => {
      sandbox.stub(window, 'fetch')
        .callsFake(() => Promise.resolve(jsonResponse([], 404)));

      const result = await getData('/web/components/query-index.json');

      expect(result).to.equal(null);
    });

    it('resolves null when fetch rejects', async () => {
      sandbox.stub(window, 'fetch').rejects(new TypeError('network down'));

      const result = await getData('/web/components/query-index.json');

      expect(result).to.equal(null);
    });

    it('does not cache a failed response', async () => {
      const fetchStub = sandbox.stub(window, 'fetch');
      fetchStub.onFirstCall().callsFake(() => Promise.resolve(jsonResponse([], 404)));
      fetchStub.onSecondCall().callsFake(() => Promise.resolve(jsonResponse([{ path: '/a' }])));

      const failed = await getData('/web/components/query-index.json');
      const retried = await getData('/web/components/query-index.json');

      expect(failed).to.equal(null);
      expect(retried.data).to.deep.equal([{ path: '/a' }]);
      expect(fetchStub.callCount).to.equal(2);
    });
  });

  describe('clear', () => {
    it('drops cached payloads so the next request refetches', async () => {
      const fetchStub = sandbox.stub(window, 'fetch')
        .callsFake(() => Promise.resolve(jsonResponse([])));

      await getData('/web/components/query-index.json');
      clear();
      await getData('/web/components/query-index.json');

      expect(fetchStub.callCount).to.equal(2);
    });
  });
});
