import { expect } from '@esm-bundle/chai';
import init, { getColorScheme, setColorScheme } from '../../blocks/section-metadata/section-metadata.js';

function makeSection(blockHtml) {
  const section = document.createElement('div');
  section.classList.add('section');
  const el = document.createElement('div');
  el.classList.add('section-metadata');
  el.innerHTML = blockHtml;
  section.append(el);
  return { section, el };
}

function row(key, valueHtml) {
  return `<div><div>${key}</div><div>${valueHtml}</div></div>`;
}

describe('section-metadata block', () => {
  afterEach(() => {
    document.body.innerHTML = '';
  });

  describe('init — .section guard', () => {
    it('does not throw when el has no .section ancestor', async () => {
      const el = document.createElement('div');
      el.innerHTML = row('style', 'hero');
      document.body.append(el);
      await init(el);
    });

    it('does not remove el when el has no .section ancestor', async () => {
      const el = document.createElement('div');
      el.innerHTML = row('style', 'hero');
      document.body.append(el);
      await init(el);
      expect(document.body.contains(el)).to.be.true;
    });
  });

  describe('init — block removal', () => {
    it('removes the section-metadata element after processing', async () => {
      const { section, el } = makeSection(row('style', 'hero'));
      document.body.append(section);
      await init(el);
      expect(section.contains(el)).to.be.false;
    });
  });

  describe('style row', () => {
    it('adds a single class to the section', async () => {
      const { section, el } = makeSection(row('style', 'hero'));
      document.body.append(section);
      await init(el);
      expect(section.classList.contains('hero')).to.be.true;
    });

    it('adds multiple classes from a comma-separated list', async () => {
      const { section, el } = makeSection(row('style', 'hero, dark'));
      document.body.append(section);
      await init(el);
      expect(section.classList.contains('hero')).to.be.true;
      expect(section.classList.contains('dark')).to.be.true;
    });

    it('sanitizes class names — spaces and special characters become dashes', async () => {
      const { section, el } = makeSection(row('style', 'My Section!'));
      document.body.append(section);
      await init(el);
      expect(section.classList.contains('my-section')).to.be.true;
    });
  });

  describe('grid row', () => {
    it('adds both "grid" and "grid-{value}" classes to the section', async () => {
      const { section, el } = makeSection(row('grid', '2'));
      document.body.append(section);
      await init(el);
      expect(section.classList.contains('grid')).to.be.true;
      expect(section.classList.contains('grid-2')).to.be.true;
    });

    it('skips adding classes when the grid value is "0"', async () => {
      const { section, el } = makeSection(row('grid', '0'));
      document.body.append(section);
      await init(el);
      expect(section.classList.contains('grid')).to.be.false;
      expect(section.classList.contains('grid-0')).to.be.false;
    });
  });

  describe('gap row', () => {
    it('adds gap-{value} class without adding the grid class', async () => {
      const { section, el } = makeSection(row('gap', '300'));
      document.body.append(section);
      await init(el);
      expect(section.classList.contains('gap-300')).to.be.true;
      expect(section.classList.contains('grid')).to.be.false;
    });

    it('skips adding the class when the gap value is "0"', async () => {
      const { section, el } = makeSection(row('gap', '0'));
      document.body.append(section);
      await init(el);
      expect(section.classList.contains('gap-0')).to.be.false;
    });
  });

  describe('spacing row', () => {
    it('adds spacing-{value} class to the section', async () => {
      const { section, el } = makeSection(row('spacing', '200'));
      document.body.append(section);
      await init(el);
      expect(section.classList.contains('spacing-200')).to.be.true;
    });
  });

  describe('container row', () => {
    it('adds container-{value} class to the section', async () => {
      const { section, el } = makeSection(row('container', '4'));
      document.body.append(section);
      await init(el);
      expect(section.classList.contains('container-4')).to.be.true;
    });
  });

  describe('layout row', () => {
    it('adds layout-{value} class to the section', async () => {
      const { section, el } = makeSection(row('layout', 'bento'));
      document.body.append(section);
      await init(el);
      expect(section.classList.contains('layout-bento')).to.be.true;
    });
  });

  describe('background row — picture', () => {
    it('adds has-background class to the section', async () => {
      const { section, el } = makeSection(row('background', '<picture><img src="bg.jpg"></picture>'));
      document.body.append(section);
      await init(el);
      expect(section.classList.contains('has-background')).to.be.true;
    });

    it('adds section-background class to the picture element', async () => {
      const { section, el } = makeSection(row('background', '<picture><img src="bg.jpg"></picture>'));
      document.body.append(section);
      await init(el);
      expect(section.querySelector('picture').classList.contains('section-background')).to.be.true;
    });

    it('prepends the picture as the first child of the section', async () => {
      const { section, el } = makeSection(row('background', '<picture><img src="bg.jpg"></picture>'));
      document.body.append(section);
      await init(el);
      expect(section.firstElementChild.tagName.toLowerCase()).to.equal('picture');
    });
  });

  describe('background row — color', () => {
    it('sets section.style.backgroundColor to the authored color', async () => {
      const { section, el } = makeSection(row('background', '#ff0000'));
      document.body.append(section);
      await init(el);
      expect(getComputedStyle(section).backgroundColor).to.equal('rgb(255, 0, 0)');
    });
  });

  describe('background row — color-token', () => {
    it('converts the color-token prefix to a CSS custom property', async () => {
      const { section, el } = makeSection(row('background', 'color-token-accent-100'));
      document.body.append(section);
      await init(el);
      expect(section.style.backgroundColor).to.equal('var(--color-accent-100)');
    });
  });

  describe('background-color row', () => {
    it('sets backgroundColor for a plain color value', async () => {
      const { section, el } = makeSection(row('background-color', '#0000ff'));
      document.body.append(section);
      await init(el);
      expect(getComputedStyle(section).backgroundColor).to.equal('rgb(0, 0, 255)');
    });

    it('converts a color-token value to a CSS custom property', async () => {
      const { section, el } = makeSection(row('background-color', 'color-token-gray-50'));
      document.body.append(section);
      await init(el);
      expect(section.style.backgroundColor).to.equal('var(--color-gray-50)');
    });
  });

  describe('background-image row', () => {
    it('adds has-background and prepends the picture for a picture value', async () => {
      const { section, el } = makeSection(row('background-image', '<picture><img src="bg.jpg"></picture>'));
      document.body.append(section);
      await init(el);
      expect(section.classList.contains('has-background')).to.be.true;
      expect(section.firstElementChild.tagName.toLowerCase()).to.equal('picture');
    });
  });

  describe('unknown key', () => {
    it('does not throw for an unrecognized key', async () => {
      const { section, el } = makeSection(row('totally-unknown-key', 'some value'));
      document.body.append(section);
      await init(el);
    });

    it('does not add unexpected classes to the section for an unrecognized key', async () => {
      const { section, el } = makeSection(row('totally-unknown-key', 'some value'));
      document.body.append(section);
      const classesBefore = [...section.classList];
      await init(el);
      expect([...section.classList]).to.deep.equal(classesBefore);
    });
  });

  describe('getColorScheme', () => {
    it('returns "light-scheme" for a light background color', () => {
      const div = document.createElement('div');
      div.style.backgroundColor = '#ffffff';
      document.body.append(div);
      expect(getColorScheme(div)).to.equal('light-scheme');
    });

    it('returns "dark-scheme" for a dark background color', () => {
      const div = document.createElement('div');
      div.style.backgroundColor = '#000000';
      document.body.append(div);
      expect(getColorScheme(div)).to.equal('dark-scheme');
    });

    it('returns null when the background color cannot be parsed', () => {
      const div = document.createElement('div');
      document.body.append(div);
      expect(getColorScheme(div)).to.be.null;
    });
  });

  describe('setColorScheme', () => {
    it('adds the scheme class to all direct children of the section', () => {
      const section = document.createElement('div');
      section.style.backgroundColor = '#ffffff';
      const child = document.createElement('div');
      section.append(child);
      document.body.append(section);
      setColorScheme(section);
      expect(child.classList.contains('light-scheme')).to.be.true;
    });

    it('replaces a pre-existing scheme class on children', () => {
      const section = document.createElement('div');
      section.style.backgroundColor = '#000000';
      const child = document.createElement('div');
      child.classList.add('light-scheme');
      section.append(child);
      document.body.append(section);
      setColorScheme(section);
      expect(child.classList.contains('light-scheme')).to.be.false;
      expect(child.classList.contains('dark-scheme')).to.be.true;
    });

    it('does nothing when the background color cannot be parsed', () => {
      const section = document.createElement('div');
      const child = document.createElement('div');
      section.append(child);
      document.body.append(section);
      setColorScheme(section);
      expect(child.classList.contains('light-scheme')).to.be.false;
      expect(child.classList.contains('dark-scheme')).to.be.false;
    });
  });
});
