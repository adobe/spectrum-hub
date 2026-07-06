import { expect } from '@esm-bundle/chai';
import sinon from 'sinon';
import {
  getMetadata,
  getLocale,
  stripLocalePrefix,
  setConfig,
  getConfig,
  localizeUrl,
  decorateLink,
  loadArea,
} from '../../scripts/ak.js';

// Minimal config that won't throw inside decorateLink / loadBlock
const SAFE_CONFIG = {
  hostnames: ['authorkit.dev'],
  linkBlocks: [{ fragment: '/fragments/' }, { youtube: 'https://www.youtube' }],
  components: [],
  locales: { '': { lang: 'en' } },
};

describe('ak.js', () => {
  let sandbox;
  const originalHref = window.location.href;

  beforeEach(() => {
    sandbox = sinon.createSandbox();
    setConfig(SAFE_CONFIG);
    document.body.innerHTML = '';
    document.head.querySelectorAll('meta[name="header"], meta[name="locale"], meta[property]').forEach((m) => m.remove());
  });

  afterEach(() => {
    sandbox.restore();
    window.history.pushState({}, '', originalHref);
  });

  describe('getMetadata', () => {
    it('returns null when no matching meta tag exists', () => {
      expect(getMetadata('missing')).to.be.null;
    });

    it('returns the content of a name meta tag', () => {
      const meta = document.createElement('meta');
      meta.name = 'header';
      meta.content = '/custom/header';
      document.head.append(meta);
      expect(getMetadata('header')).to.equal('/custom/header');
      meta.remove();
    });

    it('uses the property attribute for names containing a colon', () => {
      const meta = document.createElement('meta');
      meta.setAttribute('property', 'og:title');
      meta.content = 'Test page';
      document.head.append(meta);
      expect(getMetadata('og:title')).to.equal('Test page');
      meta.remove();
    });

    it('returns an empty string when the meta content is empty', () => {
      const meta = document.createElement('meta');
      meta.name = 'template';
      meta.content = '';
      document.head.append(meta);
      expect(getMetadata('template')).to.equal('');
      meta.remove();
    });
  });

  describe('getLocale', () => {
    it('returns prefix="" when no locales are provided', () => {
      const locale = getLocale();
      expect(locale.prefix).to.equal('');
    });

    it('returns prefix="" when pathname does not match any locale', () => {
      window.history.pushState({}, '', '/about');
      const locale = getLocale({ '': { lang: 'en' }, '/de': { lang: 'de' } });
      expect(locale.prefix).to.equal('');
    });

    it('returns the matching locale prefix when pathname starts with it', () => {
      window.history.pushState({}, '', '/de/about');
      const locale = getLocale({ '': { lang: 'en' }, '/de': { lang: 'de' } });
      expect(locale.prefix).to.equal('/de');
    });

    it('sets document.documentElement.lang from the matched locale', () => {
      window.history.pushState({}, '', '/de/page');
      getLocale({ '': { lang: 'en' }, '/de': { lang: 'de' } });
      expect(document.documentElement.lang).to.equal('de');
    });

    it('prefers the locale meta tag over pathname matching', () => {
      window.history.pushState({}, '', '/de/page');
      const meta = document.createElement('meta');
      meta.name = 'locale';
      meta.content = '/fr';
      document.head.append(meta);
      const locale = getLocale({ '': {}, '/de': { lang: 'de' }, '/fr': { lang: 'fr' } });
      expect(locale.prefix).to.equal('/fr');
      meta.remove();
    });
  });

  describe('stripLocalePrefix', () => {
    it('returns the pathname unchanged when the prefix is empty (root locale)', () => {
      expect(stripLocalePrefix('/foundations/color', '')).to.equal('/foundations/color');
    });

    it('strips a matching locale prefix from the pathname', () => {
      expect(stripLocalePrefix('/fr/foundations/color', '/fr')).to.equal('/foundations/color');
    });

    it('returns the pathname unchanged when it does not start with the prefix', () => {
      expect(stripLocalePrefix('/foundations/color', '/fr')).to.equal('/foundations/color');
    });
  });

  describe('setConfig / getConfig', () => {
    it('getConfig() returns a config object', () => {
      expect(getConfig()).to.be.an('object');
    });

    it('setConfig() merges the provided properties into the config', () => {
      setConfig({ hostnames: ['example.com'], components: [] });
      expect(getConfig().hostnames).to.deep.equal(['example.com']);
    });

    it('config always includes a log function', () => {
      setConfig({});
      expect(getConfig().log).to.be.a('function');
    });

    it('config always includes a locale object with a prefix', () => {
      setConfig({});
      expect(getConfig().locale).to.be.an('object');
      expect(getConfig().locale).to.have.property('prefix');
    });

    it('config always includes a codeBase string derived from the module URL', () => {
      setConfig({});
      expect(getConfig().codeBase).to.be.a('string');
      expect(getConfig().codeBase.length).to.be.above(0);
    });

    it('uses a custom log function when provided', () => {
      const log = sinon.spy();
      setConfig({ log });
      expect(getConfig().log).to.equal(log);
    });
  });

  describe('localizeUrl', () => {
    it('returns null when locale prefix is empty (root locale)', () => {
      const config = setConfig({ locales: { '': { lang: 'en' } } });
      const url = new URL('http://example.com/about');
      expect(localizeUrl({ config, url })).to.be.null;
    });

    it('returns a localized URL for a non-localized path in a non-root locale', () => {
      window.history.pushState({}, '', '/de/page');
      const config = setConfig({ locales: { '': { lang: 'en' }, '/de': { lang: 'de' } } });
      const url = new URL('http://example.com/about');
      expect(localizeUrl({ config, url }).pathname).to.equal('/de/about');
    });

    it('returns null when the URL is already localized with the active prefix', () => {
      window.history.pushState({}, '', '/de/page');
      const config = setConfig({ locales: { '': {}, '/de': { lang: 'de' } } });
      const url = new URL('http://example.com/de/about');
      expect(localizeUrl({ config, url })).to.be.null;
    });

    it('returns null when the URL already carries a different locale prefix', () => {
      window.history.pushState({}, '', '/de/page');
      const config = setConfig({ locales: { '': {}, '/de': { lang: 'de' }, '/fr': { lang: 'fr' } } });
      const url = new URL('http://example.com/fr/about');
      expect(localizeUrl({ config, url })).to.be.null;
    });

    it('preserves query string and hash in the localized URL', () => {
      window.history.pushState({}, '', '/de/page');
      const config = setConfig({ locales: { '': {}, '/de': { lang: 'de' } } });
      const url = new URL('http://example.com/about?q=1#sec');
      const result = localizeUrl({ config, url });
      expect(result.search).to.equal('?q=1');
      expect(result.hash).to.equal('#sec');
    });
  });

  describe('decorateLink', () => {
    function makeAnchor(href) {
      const a = document.createElement('a');
      a.href = href;
      document.body.append(a);
      return a;
    }

    it('returns null for a plain internal link that matches no block pattern', () => {
      const config = getConfig();
      const a = makeAnchor('/about');
      expect(decorateLink(config, a)).to.be.null;
    });

    it('strips the configured hostname from an absolute URL', () => {
      const config = getConfig();
      const a = makeAnchor('https://authorkit.dev/about');
      decorateLink(config, a);
      expect(a.getAttribute('href')).to.equal('/about');
    });

    it('returns the anchor and adds block classes when the href matches a linkBlock pattern', () => {
      const config = getConfig();
      const a = makeAnchor('/fragments/header');
      const result = decorateLink(config, a);
      expect(result).to.equal(a);
      expect(a.classList.contains('fragment')).to.be.true;
      expect(a.classList.contains('auto-block')).to.be.true;
    });

    it('sets target="_blank" for a link with a #_blank hash', () => {
      const config = getConfig();
      const a = makeAnchor('/page#_blank');
      decorateLink(config, a);
      expect(a.target).to.equal('_blank');
    });

    it('calls config.log and returns null when processing throws (e.g. missing hostnames)', () => {
      const log = sinon.spy();
      const badConfig = { log, linkBlocks: [] };
      const a = makeAnchor('/test');
      const result = decorateLink(badConfig, a);
      expect(result).to.be.null;
      expect(log.calledOnce).to.be.true;
    });
  });

  describe('loadArea — non-document area', () => {
    beforeEach(() => {
      setConfig({ ...SAFE_CONFIG, locales: { '': { lang: 'en' } } });
    });

    it('invokes the decorateArea callback from config once', async () => {
      const decorateArea = sinon.spy();
      setConfig({ ...SAFE_CONFIG, decorateArea });
      const area = document.createElement('div');
      area.innerHTML = '<div><p>Content</p></div>';
      await loadArea({ area });
      expect(decorateArea.calledOnce).to.be.true;
    });

    it('adds .section class to each direct div child of the area', async () => {
      const area = document.createElement('div');
      area.innerHTML = '<div>One</div><div>Two</div>';
      await loadArea({ area });
      expect(area.querySelectorAll('.section')).to.have.length(2);
    });

    it('removes data-status from sections after processing', async () => {
      const area = document.createElement('div');
      area.innerHTML = '<div>Section</div>';
      await loadArea({ area });
      expect(area.querySelector('[data-status]')).to.be.null;
    });
  });
});
