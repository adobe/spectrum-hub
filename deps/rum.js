export default function sampleRUM(checkpoint, data) {
  // eslint-disable-next-line max-len
  const timeShift = () => (window.performance ? window.performance.now() : Date.now() - window.hlx.rum.firstReadTime);
  try {
    window.hlx = window.hlx || {};
    if (!window.hlx.rum || !window.hlx.rum.collector) {
      sampleRUM.enhance = () => {};
      const param = new URLSearchParams(window.location.search).get('rum');
      const rate = ['on', 'off'].includes(param) ? param : window.SAMPLE_PAGEVIEWS_AT_RATE;
      // Let operators tune or disable collection without requiring a deployment.
      const rates = {
        on: 1,
        off: 0,
        high: 10,
        medium: 100,
        low: 1000,
      };
      const weight = Object.hasOwn(rates, rate) ? rates[rate] : 100;
      const id = (window.hlx.rum && window.hlx.rum.id) || crypto.randomUUID().slice(-9);
      const isSelected = (window.hlx.rum && window.hlx.rum.isSelected)
          || (weight > 0 && Math.random() * weight < 1);
        // eslint-disable-next-line object-curly-newline, max-len
      window.hlx.rum = {
        weight,
        id,
        isSelected,
        firstReadTime: window.performance ? window.performance.timeOrigin : Date.now(),
        sampleRUM,
        queue: [],
        collector: (...args) => window.hlx.rum.queue.push(args),
      };
      if (isSelected) {
        const dataFromErrorObj = (error) => {
          const errData = { source: 'undefined error' };
          try {
            errData.target = error.toString();
            errData.source = error.stack
              .split('\n')
              .filter((line) => line.match(/https?:\/\//))
              .shift()
              .replace(/at ([^ ]+) \((.+)\)/, '$1@$2')
              .replace(/ at /, '@')
              .trim();
          } catch (err) {
            /* error structure was not as expected */
          }
          return errData;
        };

        // Makes DOM event rejections name the resource that failed (images, fonts, etc.)
        const dataFromEventObj = (event) => {
          const errData = { source: 'Unhandled Rejection', target: 'Unknown' };
          try {
            const el = event.target;
            const locator = el && el.tagName
              ? [el.tagName.toLowerCase(), el.src, el.href]
                .filter((part) => part && typeof part === 'string').join('@')
              : el && el.toString();
            errData.target = (locator || event.type).slice(0, 200);
          } catch (err) {
            /* event structure was not as expected */
          }
          return errData;
        };

        window.addEventListener('error', ({ error }) => {
          const errData = dataFromErrorObj(error);
          sampleRUM('error', errData);
        });

        window.addEventListener('unhandledrejection', ({ reason }) => {
          let errData = {
            source: 'Unhandled Rejection',
            target: reason || 'Unknown',
          };
          if (reason instanceof Error) {
            errData = dataFromErrorObj(reason);
          } else if (reason instanceof Event) {
            errData = dataFromEventObj(reason);
          }
          sampleRUM('error', errData);
        });

        // If an enhanced RUM gets blocked by CSP, this should use the base collector
        window.addEventListener('securitypolicyviolation', (e) => {
          if (e.blockedURI.includes('helix-rum-enhancer') && e.disposition === 'enforce') {
            const errData = {
              source: 'csp',
              target: e.blockedURI,
            };
            sampleRUM.sendPing('error', timeShift(), errData);
          }
        });

        sampleRUM.baseURL = sampleRUM.baseURL || new URL(window.RUM_BASE || '/', new URL('https://rum.hlx.page'));
        sampleRUM.collectBaseURL = sampleRUM.collectBaseURL || sampleRUM.baseURL;
        sampleRUM.sendPing = (ck, time, pingData = {}) => {
          // Separate Playwright/automated browser traffic from real user sessions
          const uaExtra = navigator.webdriver && !navigator.userAgent.includes('+http')
            ? { ua: `${navigator.userAgent} +http://navigator.webdriver` }
            : {};
          // eslint-disable-next-line max-len, object-curly-newline
          const rumData = JSON.stringify({
            weight,
            id,
            referer: window.location.href,
            checkpoint: ck,
            t: time,
            ...pingData,
            ...uaExtra,
          });
          const urlParams = window.RUM_PARAMS
            ? new URLSearchParams(window.RUM_PARAMS).toString() || ''
            : '';
          const { href: url, origin } = new URL(
            `.rum/${weight}${urlParams ? `?${urlParams}` : ''}`,
            sampleRUM.collectBaseURL,
          );
          const body = origin === window.location.origin
            ? new Blob([rumData], { type: 'application/json' })
            : rumData;
          navigator.sendBeacon(url, body);
          // eslint-disable-next-line no-console
          console.debug(`ping:${ck}`, pingData);
        };
        sampleRUM.sendPing('top', timeShift());

        sampleRUM.enhance = () => {
          // only enhance once
          if (document.querySelector('script[src*="rum-enhancer"]')) return;
          const { enhancerVersion, enhancerHash } = sampleRUM.enhancerContext || {};
          const script = document.createElement('script');
          if (enhancerHash) {
            script.integrity = enhancerHash;
            script.setAttribute('crossorigin', 'anonymous');
          }
          script.src = new URL(
            `.rum/@adobe/helix-rum-enhancer@${enhancerVersion || '^2'}/src/index.js`,
            sampleRUM.baseURL,
          ).href;
          document.head.appendChild(script);
        };
        if (!window.hlx.RUM_MANUAL_ENHANCE) {
          sampleRUM.enhance();
        }
      }
    }
    if (window.hlx.rum && window.hlx.rum.isSelected && checkpoint) {
      window.hlx.rum.collector(checkpoint, data, timeShift());
    }
    document.dispatchEvent(new CustomEvent('rum', { detail: { checkpoint, data } }));
  } catch (error) {
    // something went awry
  }
}

window.hlx ??= {};
window.hlx.RUM_MASK_URL = 'full';
sampleRUM.collectBaseURL = window.origin;
sampleRUM();
