import { expect } from '@esm-bundle/chai';
import {
  PRIVACY_CONFIGS,
  initPrivacy,
  startPrivacy,
} from '../../scripts/privacy.js';

const SELECTOR = '[data-feds-action="open-adchoices-modal"]';
const DOMAIN_ID = '7a5eb705-95ed-4cc4-a11d-0cc5760e93db';

function removePrivacyScripts() {
  Object.values(PRIVACY_CONFIGS).forEach(({ src }) => {
    document.querySelectorAll(`script[src="${src}"]`).forEach((script) => script.remove());
  });
}

describe('Adobe privacy controls', () => {
  beforeEach(() => {
    delete window.fedsConfig;
    removePrivacyScripts();
  });

  afterEach(() => {
    delete window.fedsConfig;
    removePrivacyScripts();
  });

  it('does not configure or load privacy controls outside approved hosts', async () => {
    let loadCount = 0;

    const initialized = await initPrivacy({
      hostname: 'localhost',
      load: async () => { loadCount += 1; },
    });

    expect(initialized).to.be.false;
    expect(window.fedsConfig).to.be.undefined;
    expect(loadCount).to.equal(0);
  });

  it('configures production privacy controls before loading the production endpoint', async () => {
    let configAtLoad;
    let loadedSrc;

    const initialized = await initPrivacy({
      hostname: 'spectrum.adobe.com',
      load: async (src) => {
        loadedSrc = src;
        configAtLoad = structuredClone(window.fedsConfig);
      },
    });

    expect(initialized).to.be.true;
    expect(PRIVACY_CONFIGS.prod).to.deep.equal({
      domainId: DOMAIN_ID,
      src: 'https://www.adobe.com/etc.clientlibs/globalnav/clientlibs/base/privacy-standalone.js',
    });
    expect(loadedSrc).to.equal(PRIVACY_CONFIGS.prod.src);
    expect(configAtLoad.privacy).to.deep.equal({
      otDomainId: PRIVACY_CONFIGS.prod.domainId,
      footerLinkSelector: SELECTOR,
    });
    expect(configAtLoad).not.to.have.property('content');
  });

  it('uses stage privacy controls on an AEM stage host', async () => {
    let loadedSrc;

    await initPrivacy({
      hostname: 'main--spectrum-hub--adobe.aem.page',
      load: async (src) => { loadedSrc = src; },
    });

    expect(PRIVACY_CONFIGS.stage).to.deep.equal({
      domainId: DOMAIN_ID,
      src: 'https://www.stage.adobe.com/etc.clientlibs/globalnav/clientlibs/base/privacy-standalone.js',
    });
    expect(loadedSrc).to.equal(PRIVACY_CONFIGS.stage.src);
    expect(window.fedsConfig.privacy.otDomainId).to.equal(PRIVACY_CONFIGS.stage.domainId);
  });

  it('does not load stage privacy controls on an AEM live host', async () => {
    let loadCount = 0;

    const initialized = await initPrivacy({
      hostname: 'main--spectrum-hub--adobe.aem.live',
      load: async () => { loadCount += 1; },
    });

    expect(initialized).to.be.false;
    expect(window.fedsConfig).to.be.undefined;
    expect(loadCount).to.equal(0);
  });

  it('does not load or append the same endpoint twice', async () => {
    let loadCount = 0;
    const fakeLoader = async (src) => {
      loadCount += 1;
      const script = document.createElement('script');
      script.src = src;
      document.head.append(script);
    };

    await initPrivacy({ hostname: 'spectrum.adobe.com', load: fakeLoader });
    await initPrivacy({ hostname: 'spectrum.adobe.com', load: fakeLoader });

    expect(loadCount).to.equal(1);
    expect(document.querySelectorAll(`script[src="${PRIVACY_CONFIGS.prod.src}"]`)).to.have.length(1);
  });

  it('shares an overlapping privacy load between callers', async () => {
    let finishLoading;
    let loadCount = 0;
    const results = [];
    const fakeLoader = (src) => {
      loadCount += 1;
      const script = document.createElement('script');
      script.src = src;
      document.head.append(script);
      return new Promise((resolve) => { finishLoading = resolve; });
    };

    const first = initPrivacy({ hostname: 'spectrum.adobe.com', load: fakeLoader })
      .then((result) => results.push(result));
    const second = initPrivacy({ hostname: 'spectrum.adobe.com', load: fakeLoader })
      .then((result) => results.push(result));

    await Promise.resolve();
    expect(loadCount).to.equal(1);
    expect(results).to.deep.equal([]);

    finishLoading();
    await Promise.all([first, second]);
    expect(results).to.deep.equal([true, true]);
  });

  it('shares overlapping failures and allows a later retry', async () => {
    let failLoading;
    let loadCount = 0;
    const reports = [];
    const fakeLoader = (src) => {
      loadCount += 1;
      const script = document.createElement('script');
      script.src = src;
      document.head.append(script);
      return new Promise((resolve, reject) => { failLoading = reject; });
    };

    const first = startPrivacy({
      hostname: 'spectrum.adobe.com',
      load: fakeLoader,
      report: (...args) => reports.push(args),
    });
    const second = startPrivacy({
      hostname: 'spectrum.adobe.com',
      load: fakeLoader,
      report: (...args) => reports.push(args),
    });

    await Promise.resolve();
    expect(loadCount).to.equal(1);

    const error = new Error('network unavailable');
    failLoading(error);
    expect(await Promise.all([first, second])).to.deep.equal([false, false]);
    expect(reports).to.deep.equal([
      ['Failed to load Adobe privacy controls.', error],
      ['Failed to load Adobe privacy controls.', error],
    ]);
    expect(document.querySelector(`script[src="${PRIVACY_CONFIGS.prod.src}"]`)).to.be.null;

    const retried = await initPrivacy({
      hostname: 'spectrum.adobe.com',
      load: async () => { loadCount += 1; },
    });
    expect(retried).to.be.true;
    expect(loadCount).to.equal(2);
  });

  it('reports loader failures without rejecting', async () => {
    const error = new Error('network unavailable');
    const reports = [];

    const initialized = await startPrivacy({
      hostname: 'spectrum.adobe.com',
      load: async () => { throw error; },
      report: (...args) => reports.push(args),
    });

    expect(initialized).to.be.false;
    expect(reports).to.deep.equal([['Failed to load Adobe privacy controls.', error]]);
  });
});
