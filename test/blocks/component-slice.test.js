import { expect } from '@esm-bundle/chai';
import sinon from 'sinon';
import { fetchComponentSlice, resetComponentSliceCacheForTests } from '../../scripts/utils/component-slice.js';

describe('component-slice', () => {
  let fetchStub;

  beforeEach(() => {
    fetchStub = sinon.stub(window, 'fetch');
    resetComponentSliceCacheForTests();
  });

  afterEach(() => {
    fetchStub.restore();
  });

  it('fetches deps/status/<slug>.json and returns the parsed slice', async () => {
    const slice = {
      ios: {
        figma: {
          status: 'available', figmaSource: 's2-ios', figmaFile: 'OQExiy8bX0pRqee71eAWX6', figmaPageId: '1:2',
        },
      },
    };
    fetchStub.resolves({ ok: true, json: async () => slice });
    const data = await fetchComponentSlice('action-button');
    expect(fetchStub.firstCall.args[0]).to.contain('/deps/status/action-button.json');
    expect(data).to.deep.equal(slice);
  });

  it('returns null when the slice cannot be fetched', async () => {
    fetchStub.resolves({ ok: false, status: 404 });
    expect(await fetchComponentSlice('nonexistent')).to.equal(null);
  });

  it('returns null when fetch throws', async () => {
    fetchStub.rejects(new Error('network down'));
    expect(await fetchComponentSlice('action-button')).to.equal(null);
  });

  it('caches: a second call for the same slug does not fetch again', async () => {
    fetchStub.resolves({ ok: true, json: async () => ({ web: { figma: { status: 'not-available' } } }) });
    await fetchComponentSlice('action-button');
    await fetchComponentSlice('action-button');
    expect(fetchStub.callCount).to.equal(1);
  });

  it('fetches separately for a different slug', async () => {
    fetchStub.resolves({ ok: true, json: async () => ({ web: {} }) });
    await fetchComponentSlice('action-button');
    await fetchComponentSlice('cards');
    expect(fetchStub.callCount).to.equal(2);
  });

  it('de-dupes concurrent calls for the same slug into a single fetch', async () => {
    fetchStub.resolves({ ok: true, json: async () => ({ web: {} }) });
    await Promise.all([fetchComponentSlice('action-button'), fetchComponentSlice('action-button')]);
    expect(fetchStub.callCount).to.equal(1);
  });
});
