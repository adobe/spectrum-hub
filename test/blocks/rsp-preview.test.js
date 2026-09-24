import { expect } from '@esm-bundle/chai';
import sinon from 'sinon';
import { init } from '../../deps/rsp/playground/rsp-preview.js';

describe('RSP preview adapter', () => {
  it('imports only supplied modules and updates the mounted component', async () => {
    document.body.innerHTML = '<div id="mount"></div>';
    const render = sinon.spy();
    const unmount = sinon.spy();
    const modules = {
      react: {
        Fragment: Symbol('Fragment'),
        createElement: (type, props, ...children) => ({ type, props, children }),
      },
      reactDom: { createRoot: () => ({ render, unmount }) },
      button: { Button() {} },
      provider: { Provider() {} },
      text: { Text() {} },
    };
    const loadModule = sinon.stub().callsFake(async (url) => modules[url]);
    const adapter = await init({
      model: {
        component: 'button',
        componentTitle: 'Button',
        propsTitle: 'Button',
        snippetMarkup: '<Button>Authored</Button>',
        hasRealLabelProp: false,
        values: { children: 'Controlled' },
      },
      runtime: {
        imports: { react: 'react', reactDom: 'reactDom' },
        modules: [
          { name: 'Button', exportName: 'Button', url: 'button' },
          { name: 'Provider', exportName: 'Provider', url: 'provider' },
          { name: 'Text', exportName: 'Text', url: 'text' },
        ],
        styles: [],
      },
      mount: document.getElementById('mount'),
      reportError: sinon.spy(),
      reportDiagnostic: sinon.spy(),
      loadModule,
      ownerDocument: document,
      media: () => ({ matches: false }),
    });

    expect(loadModule.callCount).to.equal(5);
    expect(render.calledOnce).to.be.true;
    adapter.update({ property: 'children', value: 'Updated' });
    adapter.updateTheme('dark');
    expect(render.callCount).to.equal(3);
    adapter.destroy();
    expect(unmount.calledOnce).to.be.true;
  });

  it('reports invalid fragments with a stable phase', async () => {
    let error;
    try {
      await init({
        model: {
          component: 'button',
          componentTitle: 'Button',
          propsTitle: 'Button',
          snippetMarkup: '<Button>',
          values: {},
        },
        runtime: { imports: {}, modules: [], styles: [] },
        mount: document.createElement('div'),
        reportError: sinon.spy(),
        reportDiagnostic: sinon.spy(),
        ownerDocument: document,
      });
    } catch (caught) {
      error = caught;
    }
    expect(error.phase).to.equal('fragment-parse');
  });
});
