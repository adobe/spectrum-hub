import { expect } from '@esm-bundle/chai';
import sinon from 'sinon';
import {
  fetchComponentSlice, fetchComponentPageSlice, resetComponentSliceCacheForTests,
} from '../../scripts/utils/component-slice.js';

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

  it('resolves Buttons through its canonical slice once for both platforms and consumers', async () => {
    const slice = {
      ios: { figma: { status: 'available' } },
      android: { figma: { status: 'experimental' } },
      web: { figma: { status: 'deprecated' } },
    };
    fetchStub.resolves({ ok: true, json: async () => slice });
    const context = { platform: 'mobile', impl: null, slug: 'buttons' };
    const [statusData, actionData] = await Promise.all([
      fetchComponentPageSlice(context),
      fetchComponentPageSlice(context),
    ]);
    expect(statusData).to.deep.equal({ ios: slice.ios, android: slice.android });
    expect(actionData).to.deep.equal(statusData);
    expect(fetchStub.callCount).to.equal(1);
    expect(fetchStub.firstCall.args[0]).to.contain('/deps/status/button.json');
  });

  it('combines the canonical Toast and Snackbar slices without crossing platforms', async () => {
    const ios = { figma: { status: 'available', figmaPageId: '1:2' } };
    const android = { figma: { status: 'experimental', figmaPageId: '3:4' } };
    fetchStub.callsFake(async (url) => {
      if (url.endsWith('/toast.json')) {
        return { ok: true, json: async () => ({ ios, android: { figma: { status: 'deprecated' } } }) };
      }
      if (url.endsWith('/snackbar.json')) {
        return { ok: true, json: async () => ({ android }) };
      }
      return { ok: false };
    });
    const data = await fetchComponentPageSlice({
      platform: 'mobile', impl: null, slug: 'snackbars-and-toasts',
    });
    expect(data).to.deep.equal({ ios, android });
    expect(fetchStub.callCount).to.equal(2);
  });

  it('retains the available platform when the other canonical slice fails', async () => {
    const ios = { figma: { status: 'available' } };
    fetchStub.callsFake(async (url) => (url.endsWith('/toast.json')
      ? { ok: true, json: async () => ({ ios }) } : { ok: false }));
    expect(await fetchComponentPageSlice({
      platform: 'mobile', impl: null, slug: 'snackbars-and-toasts',
    })).to.deep.equal({ ios });
  });
});
