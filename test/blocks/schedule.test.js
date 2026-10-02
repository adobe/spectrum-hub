import { expect } from '@esm-bundle/chai';
import sinon from 'sinon';
import init from '../../blocks/schedule/schedule.js';

const SCHEDULE = {
  data: [{
    name: 'always-on',
    start: '2020-01-01T00:00:00Z',
    end: '2099-12-31T23:59:59Z',
    fragment: 'http://localhost:2000/event-fragment',
  }],
};

const EVENT_HTML = '<main><div><h2>Scheduled event content</h2></div></main>';

describe('schedule block', () => {
  let sandbox;

  beforeEach(() => {
    sandbox = sinon.createSandbox();
  });

  afterEach(() => {
    sandbox.restore();
  });

  it('replaces the schedule link with the active event fragment', async () => {
    sandbox.stub(window, 'fetch').callsFake(async (url) => (String(url).endsWith('.json')
      ? Response.json(SCHEDULE)
      : new Response(EVENT_HTML)));

    const wrapper = document.createElement('div');
    wrapper.innerHTML = '<div class="section"><p><a href="/schedule.json">Scheduled</a></p></div>';
    document.body.append(wrapper);

    await init(wrapper.querySelector('a'));

    expect(wrapper.querySelector('a')).to.be.null;
    expect(wrapper.querySelector('h2').textContent).to.equal('Scheduled event content');
    wrapper.remove();
  });
});
