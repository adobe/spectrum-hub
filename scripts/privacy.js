import loadScript from './utils/script.js';

const PRIVACY_PATH = '/etc.clientlibs/globalnav/clientlibs/base/privacy-standalone.js';
const PROD_DOMAIN_ID = '7a5eb705-95ed-4cc4-a11d-0cc5760e93db';
const STAGE_DOMAIN_ID = '7a5eb705-95ed-4cc4-a11d-0cc5760e93db';

export const PRIVACY_CONFIGS = {
  prod: {
    domainId: PROD_DOMAIN_ID,
    src: `https://www.adobe.com${PRIVACY_PATH}`,
  },
  stage: {
    domainId: STAGE_DOMAIN_ID,
    src: `https://www.stage.adobe.com${PRIVACY_PATH}`,
  },
};

const privacyLoads = new Map();

function getPrivacyConfig(hostname) {
  if (hostname === 'spectrum.adobe.com') {
    return PRIVACY_CONFIGS.prod;
  }
  if (hostname.includes('.aem.') && !hostname.endsWith('.live')) {
    return PRIVACY_CONFIGS.stage;
  }
  return null;
}

function configurePrivacy(domainId) {
  window.fedsConfig = window.fedsConfig || {};
  window.fedsConfig.privacy = {
    otDomainId: domainId,
    footerLinkSelector: '[data-feds-action="open-adchoices-modal"]',
  };
}

export async function initPrivacy({
  hostname = window.location.hostname,
  load = loadScript,
} = {}) {
  const config = getPrivacyConfig(hostname);
  if (!config) {
    return false;
  }

  configurePrivacy(config.domainId);
  const inFlightLoad = privacyLoads.get(config.src);
  if (inFlightLoad) {
    return inFlightLoad;
  }
  if (document.querySelector(`script[src="${config.src}"]`)) {
    return true;
  }

  const loading = Promise.resolve()
    .then(() => load(config.src))
    .then(() => true)
    .catch((error) => {
      document.querySelectorAll(`script[src="${config.src}"]`).forEach((script) => script.remove());
      throw error;
    })
    .finally(() => {
      if (privacyLoads.get(config.src) === loading) {
        privacyLoads.delete(config.src);
      }
    });
  privacyLoads.set(config.src, loading);
  return loading;
}

export async function startPrivacy({ report = console.error, ...options } = {}) {
  try {
    return await initPrivacy(options);
  } catch (error) {
    report('Failed to load Adobe privacy controls.', error);
    return false;
  }
}

startPrivacy();
