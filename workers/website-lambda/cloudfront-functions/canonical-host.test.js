import { readFileSync } from 'node:fs';
import { describe, it, expect } from 'vitest';

// The function is a plain CloudFront Functions script (no exports), so load it
// the way CloudFront does and pull out `handler`.
const source = readFileSync(new URL('./canonical-host.js', import.meta.url), 'utf8');
// eslint-disable-next-line no-new-func
const handler = new Function(`${source}; return handler;`)();

const event = (host, uri = '/', querystring = {}) => ({
  request: { uri, querystring, headers: host ? { host: { value: host } } : {} },
});

describe('canonical-host CloudFront Function', () => {
  it('301s s2.spectrum.adobe.com to spectrum.adobe.com, keeping the path', () => {
    const resp = handler(event('s2.spectrum.adobe.com', '/components/button/'));
    expect(resp.statusCode).toBe(301);
    expect(resp.headers.location.value).toBe('https://spectrum.adobe.com/components/button/');
  });

  it('keeps the query string, including repeated and empty params', () => {
    const resp = handler(event('S2.Spectrum.Adobe.com', '/search', {
      q: { value: 'a%20b' },
      tag: { value: 'x', multiValue: [{ value: 'x' }, { value: 'y' }] },
      flag: { value: '' },
    }));
    expect(resp.headers.location.value).toBe('https://spectrum.adobe.com/search?q=a%20b&tag=x&tag=y&flag');
  });

  it('passes other hosts through unchanged', () => {
    const req = event('spectrum.adobe.com', '/x').request;
    expect(handler({ request: req })).toBe(req);
    const cf = event('d2fh4e6818mjc6.cloudfront.net').request;
    expect(handler({ request: cf })).toBe(cf);
  });

  it('passes a request with no host header through', () => {
    const req = event(undefined).request;
    expect(handler({ request: req })).toBe(req);
  });
});
