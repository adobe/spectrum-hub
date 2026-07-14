import { expect } from '@esm-bundle/chai';
import init from '../../blocks/usage/usage.js';

function makeEl(html, ...extraClasses) {
  const el = document.createElement('div');
  el.classList.add('usage', ...extraClasses);
  el.innerHTML = html;
  return el;
}

function icon(name) {
  return `<span class="icon icon-${name}"></span>`;
}

const SINGLE_PANEL = `
  <div>
    <div><h2>Title</h2><p>Content</p></div>
    <div><picture><img src="do.jpg" alt=""></picture></div>
  </div>
  <div>
    <div>Do this</div>
  </div>
  <div>
    <div>${icon('docheck')}</div>
  </div>
`;

const SINGLE_PANEL_NO_CAPTION = `
  <div>
    <div><h2>Title</h2><p>Content</p></div>
    <div><picture><img src="dont.jpg" alt=""></picture></div>
  </div>
  <div>
    <div></div>
  </div>
  <div>
    <div>${icon('dontcross')}</div>
  </div>
`;

const STACKED_TWO_PANEL_NO_CAPTIONS = `
  <div>
    <div><h2>Title</h2><p>Content</p></div>
    <div><picture><img src="do.jpg" alt=""></picture></div>
  </div>
  <div>
    <div></div>
  </div>
  <div>
    <div>${icon('docheck')}</div>
  </div>
  <div>
    <div><picture><img src="dont.jpg" alt=""></picture></div>
  </div>
  <div>
    <div></div>
  </div>
  <div>
    <div>${icon('dontcross')}</div>
  </div>
`;

const STACKED_THREE_PANEL_WITH_CAPTIONS = `
  <div>
    <div><h2>Title</h2><p>Content</p></div>
    <div><picture><img src="do.jpg" alt=""></picture></div>
  </div>
  <div>
    <div>Do caption</div>
  </div>
  <div>
    <div>${icon('docheck')}</div>
  </div>
  <div>
    <div><picture><img src="dont.jpg" alt=""></picture></div>
  </div>
  <div>
    <div>Dont caption</div>
  </div>
  <div>
    <div>${icon('dontcross')}</div>
  </div>
  <div>
    <div><picture><img src="neutral.jpg" alt=""></picture></div>
  </div>
  <div>
    <div>Neutral caption</div>
  </div>
  <div>
    <div>${icon('neutralminus')}</div>
  </div>
`;

const SIDE_BY_SIDE_NO_CONTENT = `
  <div>
    <div><picture><img src="do.jpg" alt=""></picture></div>
    <div><picture><img src="dont.jpg" alt=""></picture></div>
  </div>
  <div>
    <div>Do caption</div>
    <div>Dont caption</div>
  </div>
  <div>
    <div>${icon('docheck')}</div>
    <div>${icon('dontcross')}</div>
  </div>
`;

const SIDE_BY_SIDE_WITH_CONTENT = `
  <div>
    <div><h2>Title</h2><p>Content</p></div>
    <div><picture><img src="do.jpg" alt=""></picture></div>
    <div><picture><img src="dont.jpg" alt=""></picture></div>
  </div>
  <div>
    <div></div>
    <div>Do caption</div>
    <div>Dont caption</div>
  </div>
  <div>
    <div></div>
    <div>${icon('docheck')}</div>
    <div>${icon('dontcross')}</div>
  </div>
`;

const NO_INDICATOR_ICON = `
  <div>
    <div><h2>Title</h2><p>Content</p></div>
    <div><picture><img src="hero.jpg" alt=""></picture></div>
  </div>
  <div>
    <div>Caption</div>
  </div>
  <div>
    <div></div>
  </div>
`;

const MEDIA_CELL_WITH_RICH_CONTENT = `
  <div>
    <div><h2>Title</h2><p>Content</p></div>
    <div><span class="widget">Live example</span></div>
  </div>
  <div>
    <div>Caption</div>
  </div>
  <div>
    <div>${icon('docheck')}</div>
  </div>
`;

const MISSING_INDICATOR_ROW = `
  <div>
    <div><h2>Title</h2><p>Content</p></div>
    <div><picture><img src="hero.jpg" alt=""></picture></div>
  </div>
  <div>
    <div>Caption only, no indicator row</div>
  </div>
`;

describe('usage block', () => {
  let el;

  describe('single panel', () => {
    beforeEach(() => {
      el = makeEl(SINGLE_PANEL);
      init(el);
    });

    it('extracts the leading cell into .usage-content', () => {
      const content = el.querySelector('.usage-content');
      expect(content).to.exist;
      expect(content.querySelector('h2').textContent).to.equal('Title');
      expect(content.querySelector('p').textContent).to.equal('Content');
    });

    it('builds exactly one .usage-panel with the correct type', () => {
      const panels = el.querySelectorAll('.usage-panel');
      expect(panels.length).to.equal(1);
      expect(panels[0].classList.contains('usage-panel-do')).to.be.true;
      expect(panels[0].tagName).to.equal('FIGURE');
    });

    it('moves the picture and adds an indicator badge', () => {
      const panel = el.querySelector('.usage-panel');
      expect(panel.querySelector('picture img')).to.exist;
      expect(panel.querySelector('.usage-indicator')).to.exist;
    });

    it('gives the indicator badge an accessible name', () => {
      const badge = el.querySelector('.usage-indicator');
      const label = badge.querySelector('.visually-hidden');
      expect(label).to.exist;
      expect(label.textContent).to.equal('Recommended');
    });

    it('adds a figcaption with the caption text', () => {
      const figcaption = el.querySelector('figcaption');
      expect(figcaption).to.exist;
      expect(figcaption.textContent).to.equal('Do this');
      expect(figcaption.classList.contains('usage-caption')).to.be.true;
    });

    it('sets --usage-panel-count to 1', () => {
      expect(el.style.getPropertyValue('--usage-panel-count')).to.equal('1');
    });

    it('adds "has-content" but not "side-by-side"', () => {
      expect(el.classList.contains('has-content')).to.be.true;
      expect(el.classList.contains('side-by-side')).to.be.false;
    });
  });

  describe('single panel without a caption', () => {
    it('does not add a figcaption when the caption cell is empty', () => {
      el = makeEl(SINGLE_PANEL_NO_CAPTION);
      init(el);
      expect(el.querySelector('figcaption')).to.not.exist;
      expect(el.querySelector('.usage-panel').classList.contains('usage-panel-dont')).to.be.true;
    });
  });

  describe('stacked multi-panel (no captions)', () => {
    beforeEach(() => {
      el = makeEl(STACKED_TWO_PANEL_NO_CAPTIONS);
      init(el);
    });

    it('builds two panels with the correct types in order', () => {
      const panels = [...el.querySelectorAll('.usage-panel')];
      expect(panels.length).to.equal(2);
      expect(panels[0].classList.contains('usage-panel-do')).to.be.true;
      expect(panels[1].classList.contains('usage-panel-dont')).to.be.true;
    });

    it('only extracts content from the very first row', () => {
      expect(el.querySelectorAll('.usage-content').length).to.equal(1);
      expect(el.querySelector('.usage-content h2').textContent).to.equal('Title');
    });

    it('produces no figcaptions', () => {
      expect(el.querySelectorAll('figcaption').length).to.equal(0);
    });

    it('sets --usage-panel-count to 2 and does not add "side-by-side"', () => {
      expect(el.style.getPropertyValue('--usage-panel-count')).to.equal('2');
      expect(el.classList.contains('side-by-side')).to.be.false;
    });
  });

  describe('stacked multi-panel (do/dont/neutral, with captions)', () => {
    beforeEach(() => {
      el = makeEl(STACKED_THREE_PANEL_WITH_CAPTIONS);
      init(el);
    });

    it('builds three panels with the correct types in order', () => {
      const panels = [...el.querySelectorAll('.usage-panel')];
      expect(panels.map((p) => [...p.classList])).to.deep.equal([
        ['usage-panel', 'usage-panel-do'],
        ['usage-panel', 'usage-panel-dont'],
        ['usage-panel', 'usage-panel-neutral'],
      ]);
    });

    it('pairs each panel with its own caption', () => {
      const captions = [...el.querySelectorAll('figcaption')].map((f) => f.textContent);
      expect(captions).to.deep.equal(['Do caption', 'Dont caption', 'Neutral caption']);
    });

    it('sets --usage-panel-count to 3', () => {
      expect(el.style.getPropertyValue('--usage-panel-count')).to.equal('3');
    });

    it('gives each indicator badge the accessible name for its type', () => {
      const labels = [...el.querySelectorAll('.usage-indicator .visually-hidden')]
        .map((l) => l.textContent);
      expect(labels).to.deep.equal(['Recommended', 'Not recommended', 'Use with care']);
    });
  });

  describe('side-by-side shape detection', () => {
    it('auto-detects side-by-side from shape and does not need an authored class', () => {
      // Regression test: this shape used to fall through to the stacked builder,
      // which swallowed the first image into .usage-content and dropped its
      // caption/indicator entirely.
      el = makeEl(SIDE_BY_SIDE_NO_CONTENT);
      expect(el.classList.contains('side-by-side')).to.be.false;
      init(el);
      expect(el.classList.contains('side-by-side')).to.be.true;
    });

    it('builds one panel per column with no leading content', () => {
      el = makeEl(SIDE_BY_SIDE_NO_CONTENT);
      init(el);
      expect(el.querySelector('.usage-content')).to.not.exist;
      expect(el.classList.contains('has-content')).to.be.false;

      const panels = [...el.querySelectorAll('.usage-panel')];
      expect(panels.length).to.equal(2);
      expect(panels[0].classList.contains('usage-panel-do')).to.be.true;
      expect(panels[1].classList.contains('usage-panel-dont')).to.be.true;

      const captions = panels.map((p) => p.querySelector('figcaption').textContent);
      expect(captions).to.deep.equal(['Do caption', 'Dont caption']);
    });
  });

  describe('side-by-side with a leading content column', () => {
    beforeEach(() => {
      el = makeEl(SIDE_BY_SIDE_WITH_CONTENT);
      init(el);
    });

    it('adds both "side-by-side" and "has-content"', () => {
      expect(el.classList.contains('side-by-side')).to.be.true;
      expect(el.classList.contains('has-content')).to.be.true;
    });

    it('extracts the content column identified by its missing indicator', () => {
      const content = el.querySelector('.usage-content');
      expect(content.querySelector('h2').textContent).to.equal('Title');
    });

    it('keeps caption/indicator alignment correct for the remaining panels', () => {
      // Regression test: filtering the content cell out of the media-cell list
      // used to shift indices, pairing panels with the wrong caption/indicator.
      const panels = [...el.querySelectorAll('.usage-panel')];
      expect(panels.length).to.equal(2);
      expect(panels[0].classList.contains('usage-panel-do')).to.be.true;
      expect(panels[0].querySelector('figcaption').textContent).to.equal('Do caption');
      expect(panels[1].classList.contains('usage-panel-dont')).to.be.true;
      expect(panels[1].querySelector('figcaption').textContent).to.equal('Dont caption');
    });
  });

  describe('indicator type fallback', () => {
    it('defaults to "do" when no recognized indicator icon is present', () => {
      el = makeEl(NO_INDICATOR_ICON);
      init(el);
      expect(el.querySelector('.usage-panel').classList.contains('usage-panel-do')).to.be.true;
    });
  });

  describe('media cell content', () => {
    it('moves all of the media cell\'s content, not just a <picture>', () => {
      el = makeEl(MEDIA_CELL_WITH_RICH_CONTENT);
      init(el);
      const panel = el.querySelector('.usage-panel');
      expect(panel.querySelector('.widget')).to.exist;
      expect(panel.querySelector('.widget').textContent).to.equal('Live example');
    });
  });

  describe('malformed content', () => {
    it('does not throw when the indicator row is missing', () => {
      el = makeEl(MISSING_INDICATOR_ROW);
      expect(() => init(el)).to.not.throw();
      const panel = el.querySelector('.usage-panel');
      expect(panel.classList.contains('usage-panel-do')).to.be.true;
      expect(panel.querySelector('figcaption').textContent).to.equal('Caption only, no indicator row');
    });

    it('does not throw and produces no panels for an empty block', () => {
      el = makeEl('');
      expect(() => init(el)).to.not.throw();
      expect(el.querySelectorAll('.usage-panel').length).to.equal(0);
      expect(el.style.getPropertyValue('--usage-panel-count')).to.equal('0');
    });
  });
});
