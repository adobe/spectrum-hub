import { execFileSync } from 'node:child_process';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';
import { test, expect } from '@playwright/test';
import {
  playgroundEmptyControlsSheet,
  playgroundEmptyRspProps,
  playgroundMultipleComponentsSheet,
  playgroundRspPackageListing,
  playgroundRspRuntimePackage,
  playgroundRspRuntimeManifest,
} from '../mocks.js';
import { summarize } from '../compare-playground-performance.js';

const LIVE = process.env.PLAYGROUND_BENCHMARK_MODE === 'live';
const OUTPUT = process.env.PLAYGROUND_BENCHMARK_OUTPUT;
const LABEL = process.env.PLAYGROUND_BENCHMARK_LABEL ?? (LIVE ? 'live' : 'deterministic');
const RUNS = 5;

const reactModule = `
  export const Fragment = Symbol('Fragment');
  export function createElement(type, props, ...children) {
    return { type, props: { ...(props ?? {}), children } };
  }
`;
const reactDomModule = 'export function createRoot() { return { render() {} }; }';
const rspModule = `
  export function Button() {}
  export function Badge() {}
  export function Provider() {}
  export function Text() {}
`;

async function installRoutes(context) {
  await context.route('**/playground-data.json?sheet=components', (route) => route.fulfill({
    contentType: 'application/json',
    body: playgroundMultipleComponentsSheet,
  }));
  await context.route('**/playground-data.json?sheet=controls', (route) => route.fulfill({
    contentType: 'application/json',
    body: playgroundEmptyControlsSheet,
  }));
  await context.route('**/deps/rsp/data/*.json', (route) => route.fulfill({
    contentType: 'application/json',
    body: playgroundEmptyRspProps,
  }));
  await context.route('**/deps/rsp/playground/snippets/button.jsx', (route) => route.fulfill({
    contentType: 'text/plain',
    body: '<Button>Button</Button>',
  }));
  await context.route('**/deps/rsp/playground/snippets/badge.jsx', (route) => route.fulfill({
    contentType: 'text/plain',
    body: '<Badge>Badge</Badge>',
  }));
  if (LIVE) { return; }

  const cors = { 'access-control-allow-origin': '*' };
  await context.route('**/deps/rsp/playground/runtime-manifest.json', (route) => route.fulfill({
    contentType: 'application/json',
    body: playgroundRspRuntimeManifest,
  }));
  await context.route('https://esm.sh/@react-spectrum/s2/package.json', (route) => route.fulfill({
    contentType: 'application/json',
    headers: cors,
    body: playgroundRspRuntimePackage,
  }));
  await context.route('https://data.jsdelivr.com/v1/package/npm/@react-spectrum/s2@*/flat', (route) => route.fulfill({
    contentType: 'application/json',
    headers: cors,
    body: playgroundRspPackageListing,
  }));
  await context.route('https://esm.sh/react@*', (route) => route.fulfill({
    contentType: 'application/javascript',
    headers: cors,
    body: reactModule,
  }));
  await context.route('https://esm.sh/react-dom@*/client', (route) => route.fulfill({
    contentType: 'application/javascript',
    headers: cors,
    body: reactDomModule,
  }));
  await context.route('https://esm.sh/@react-spectrum/s2@*', (route) => {
    const url = route.request().url();
    if (url.endsWith('.css')) {
      return route.fulfill({ contentType: 'text/css', headers: cors, body: ':root {}' });
    }
    return route.fulfill({
      contentType: 'application/javascript',
      headers: cors,
      body: rspModule,
    });
  });
}

async function measure(browser) {
  const context = await browser.newContext();
  await installRoutes(context);
  const page = await context.newPage();
  const cdp = await context.newCDPSession(page);
  const requests = new Map();
  const resources = [];

  cdp.on('Network.requestWillBeSent', ({ requestId, request, type }) => {
    requests.set(requestId, { url: request.url, resourceType: type });
  });
  cdp.on('Network.loadingFinished', ({ requestId, encodedDataLength }) => {
    const request = requests.get(requestId);
    if (request) { resources.push({ ...request, encodedDataLength }); }
  });
  await cdp.send('Network.enable');

  await page.goto('http://localhost:3001/test/a11y/fixtures/playground-multiple.html');
  await expect.poll(
    () => page.evaluate(() => window.playgroundPerformanceMarks
      .filter((mark) => mark.type === 'preview-mounted').length),
  ).toBe(2);
  await page.waitForLoadState('networkidle');

  const marks = await page.evaluate(() => window.playgroundPerformanceMarks);
  const first = (type) => marks.find((mark) => mark.type === type)?.time ?? null;
  const normalized = resources
    .map((resource) => ({
      ...resource,
      url: resource.url.replace(/[?&]cache-bust=[^&]+/, ''),
    }))
    .sort((a, b) => a.url.localeCompare(b.url));
  const result = {
    requests: normalized,
    totals: {
      requests: normalized.length,
      encodedDataLength: normalized.reduce((sum, item) => sum + item.encodedDataLength, 0),
    },
    marks: {
      firstShellReady: first('shell-ready'),
      firstPreviewInit: first('preview-init'),
      firstPreviewMounted: first('preview-mounted'),
    },
  };
  await context.close();
  return result;
}

test('records the multiple-playground request, byte, and first-mount baseline', async ({ browser }, testInfo) => {
  test.skip(testInfo.project.name !== 'chromium', 'CDP metrics run once in Chromium.');
  test.setTimeout(LIVE ? 180_000 : 60_000);

  await measure(browser);
  const runs = [];
  for (let index = 0; index < RUNS; index += 1) {
    runs.push(await measure(browser));
  }
  const result = {
    label: LABEL,
    mode: LIVE ? 'live' : 'deterministic',
    sourceRevision: execFileSync('git', ['rev-parse', 'HEAD'], { encoding: 'utf8' }).trim(),
    runs,
  };

  expect(runs).toHaveLength(RUNS);
  expect(runs.every((run) => run.marks.firstPreviewMounted !== null)).toBe(true);
  runs.forEach((run) => {
    const urls = run.requests.map(({ url }) => url);
    const count = (part) => urls.filter((url) => url.includes(part)).length;
    expect(count('playground-data.json?sheet=components')).toBe(1);
    expect(count('playground-data.json?sheet=controls')).toBe(1);
    expect(count('/deps/rsp/data/Button.json')).toBe(1);
    expect(count('/deps/rsp/data/Badge.json')).toBe(1);
    expect(count('/deps/rsp/playground/snippets/button.jsx')).toBe(1);
    expect(count('/deps/rsp/playground/snippets/badge.jsx')).toBe(1);
    expect(urls.filter((url) => url.endsWith('/deps/rsp/playground/runtime-manifest.json'))).toHaveLength(1);
    expect(urls.filter((url) => url.includes('/@react-spectrum/s2/package.json'))).toHaveLength(0);
    expect(urls.filter((url) => url.includes('data.jsdelivr.com/v1/package/npm'))).toHaveLength(0);
    expect(count('/blocks/playground/playground-coordinator.js')).toBe(1);
    expect(count('/deps/rsp/playground/rsp-preview.js')).toBe(2);
    expect(run.marks.firstShellReady).not.toBeNull();
    expect(run.marks.firstPreviewInit).not.toBeNull();
  });
  if (!LIVE) {
    const baseline = JSON.parse(readFileSync(
      new URL('../baselines/playground-performance.json', import.meta.url),
      'utf8',
    ));
    const before = summarize(baseline);
    const after = summarize(result);
    // Timing acceptance runs separately in live mode. Navigation timing is not stable
    // while this spec competes with the full parallel accessibility suite in CI.
    expect(after.requests).toBeLessThan(before.requests);
    expect(after.encodedDataLength).toBeLessThan(before.encodedDataLength);
  }
  if (OUTPUT) {
    mkdirSync(dirname(OUTPUT), { recursive: true });
    writeFileSync(OUTPUT, `${JSON.stringify(result, null, 2)}\n`);
  }
});
