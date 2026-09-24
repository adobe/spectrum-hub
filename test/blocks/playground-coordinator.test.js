import { expect } from '@esm-bundle/chai';
import sinon from 'sinon';
import { createPlaygroundCoordinator } from '../../blocks/playground/playground-coordinator.js';

function createHarness() {
  let messageListener;
  let observerCallback;
  const hostWindow = {
    addEventListener: sinon.spy((type, listener) => {
      if (type === 'message') { messageListener = listener; }
    }),
  };
  const themeRoot = {
    classList: {
      contains: sinon.stub().returns(false),
    },
  };
  const observer = {
    observe: sinon.spy(),
    disconnect: sinon.spy(),
  };
  const coordinator = createPlaygroundCoordinator({
    hostWindow,
    themeRoot,
    fetchImpl: sinon.stub(),
    createObserver: (callback) => {
      observerCallback = callback;
      return observer;
    },
  });
  return {
    coordinator,
    hostWindow,
    themeRoot,
    observer,
    emitMessage: (event) => messageListener(event),
    emitMutation: (records) => observerCallback(records),
  };
}

function createFrame() {
  return {
    isConnected: true,
    contentWindow: { postMessage: sinon.spy() },
  };
}

describe('createPlaygroundCoordinator', () => {
  it('installs one message listener and one body observer', () => {
    const { hostWindow, observer } = createHarness();

    expect(hostWindow.addEventListener.calledOnceWith('message')).to.be.true;
    expect(observer.observe.calledOnce).to.be.true;
    expect(observer.observe.firstCall.args[1]).to.deep.equal({
      attributes: true,
      attributeFilter: ['class'],
      childList: true,
      subtree: true,
    });
  });

  it('shares concurrent URL requests and evicts a rejected request', async () => {
    let attempts = 0;
    const fetchImpl = sinon.stub().callsFake(async () => {
      attempts += 1;
      if (attempts === 1) { throw new Error('offline'); }
      return new Response(JSON.stringify({ ok: true }), { status: 200 });
    });
    const coordinator = createPlaygroundCoordinator({
      hostWindow: { addEventListener() {} },
      themeRoot: { classList: { contains: () => false } },
      fetchImpl,
      createObserver: () => ({ observe() {} }),
    });

    let error;
    try {
      await coordinator.json('/data.json');
    } catch (caught) {
      error = caught;
    }
    expect(error?.message).to.equal('offline');
    const [first, second] = await Promise.all([
      coordinator.json('/data.json'),
      coordinator.json('/data.json'),
    ]);
    expect(first).to.deep.equal({ ok: true });
    expect(second).to.deep.equal({ ok: true });
    expect(fetchImpl.callCount).to.equal(2);
  });

  it('ignores unknown sources and mismatched frame identifiers', () => {
    const { coordinator, emitMessage } = createHarness();
    const first = createFrame();
    const second = createFrame();
    const onMounted = sinon.spy();
    coordinator.register(first, { frameId: 'first', onMounted });
    coordinator.register(second, { frameId: 'second' });

    emitMessage({ source: {}, data: { type: 'preview-mounted', frameId: 'first' } });
    emitMessage({
      source: first.contentWindow,
      data: { type: 'preview-mounted', frameId: 'second' },
    });

    expect(onMounted.called).to.be.false;
    expect(second.contentWindow.postMessage.called).to.be.false;
  });

  it('sends exactly one deferred preview initialization', async () => {
    const { coordinator, emitMessage } = createHarness();
    const iframe = createFrame();
    let resolveInit;
    const initPromise = new Promise((resolve) => {
      resolveInit = resolve;
    });
    coordinator.register(iframe, { frameId: 'deferred', initPromise });

    emitMessage({
      source: iframe.contentWindow,
      data: { type: 'shell-ready', frameId: 'deferred' },
    });
    emitMessage({
      source: iframe.contentWindow,
      data: { type: 'shell-ready', frameId: 'deferred' },
    });
    expect(iframe.contentWindow.postMessage.called).to.be.false;

    resolveInit({ model: { component: 'button' }, runtime: { styles: [] } });
    await initPromise;
    await Promise.resolve();

    expect(iframe.contentWindow.postMessage.calledOnceWith(
      {
        type: 'preview-init',
        model: { component: 'button' },
        runtime: { styles: [] },
        frameId: 'deferred',
      },
      '*',
    )).to.be.true;
  });

  it('targets prop updates and broadcasts theme changes to connected frames', () => {
    const {
      coordinator, themeRoot, emitMutation,
    } = createHarness();
    const first = createFrame();
    const second = createFrame();
    coordinator.register(first, { frameId: 'first' });
    coordinator.register(second, { frameId: 'second' });

    coordinator.update(first, {
      property: 'size', attribute: 'size', value: 16, controlType: 'slider',
    });
    expect(first.contentWindow.postMessage.calledWith(
      sinon.match({ type: 'prop-update', value: 16 }),
      '*',
    )).to.be.true;
    expect(second.contentWindow.postMessage.called).to.be.false;

    themeRoot.classList.contains.withArgs('dark-scheme').returns(true);
    emitMutation([{ type: 'attributes' }]);
    expect(first.contentWindow.postMessage.calledWith(
      { type: 'theme-update', scheme: 'dark', frameId: 'first' },
      '*',
    )).to.be.true;
    expect(second.contentWindow.postMessage.calledWith(
      { type: 'theme-update', scheme: 'dark', frameId: 'second' },
      '*',
    )).to.be.true;
  });

  it('reports preview events and ignores unknown sources', () => {
    const { coordinator, emitMessage } = createHarness();
    const iframe = createFrame();
    const onMounted = sinon.spy();
    const onError = sinon.spy();
    const onDiagnostic = sinon.spy();
    coordinator.register(iframe, {
      frameId: 'events', onMounted, onError, onDiagnostic,
    });

    emitMessage({ source: {}, data: { type: 'preview-mounted', frameId: 'events' } });
    emitMessage({
      source: iframe.contentWindow,
      data: { type: 'preview-mounted', frameId: 'events' },
    });
    emitMessage({
      source: iframe.contentWindow,
      data: { type: 'preview-error', phase: 'mount', frameId: 'events' },
    });
    emitMessage({
      source: iframe.contentWindow,
      data: { type: 'preview-diagnostic', recovered: true, frameId: 'events' },
    });

    expect(onMounted.calledOnce).to.be.true;
    expect(onError.calledOnce).to.be.true;
    expect(onDiagnostic.calledOnce).to.be.true;
  });

  it('unregisters explicitly and prunes disconnected frames', () => {
    const { coordinator, emitMutation } = createHarness();
    const explicit = createFrame();
    const disconnected = createFrame();
    const unregister = coordinator.register(explicit, {});
    coordinator.register(disconnected, {});

    unregister();
    unregister();
    disconnected.isConnected = false;
    emitMutation([{ type: 'childList' }]);

    expect(coordinator.size).to.equal(0);
  });
});
