import { test, expect } from '@playwright/test';
import { NONE_OPTION } from '../../../deps/shared/playground/unset-control-options.js';

const FIXTURE = '/test/a11y/fixtures/playground-interactions.html';
const components = {
  data: [
    { Component: 'Button', Implementation: 'rsp', Properties: 'isDisabled, label' },
    { Component: 'Button', Implementation: 'swc', Properties: 'isDisabled, label, size' },
    { Component: 'Button', Implementation: 'ios, android', Properties: 'variant, staticColor' },
    { Component: 'Badge', Properties: 'fixed' },
    { Component: 'conversation-turn', Implementation: 'swc', Properties: 'type' },
    { Component: 'response-status', Implementation: 'swc', Properties: 'status' },
    { Component: 'Avatar', Properties: 'size' },
    { Component: 'Tooltip', Properties: 'placement' },
  ],
};
const controls = {
  data: [
    { Property: 'isDisabled', control: 'switch' },
    { Property: 'fixed', control: 'switch' },
    { Property: 'type', control: 'picker' },
    { Property: 'status', control: 'picker' },
    { Property: 'label', control: 'textfield' },
    { Property: 'size', control: 'picker' },
    { Property: 'placement', control: 'picker' },
    { Property: 'variant', control: 'picker', options: 'default, accent' },
    { Property: 'staticColor', control: 'picker', options: 'white, black' },
  ],
};
const catalogs = {
  '/deps/rsp/data/Button.json': {
    props: [{ property: 'isDisabled', kind: 'boolean', values: [], default: 'false' }],
  },
  '/deps/rsp/data/Avatar.json': {
    props: [{ property: 'size', kind: 'unknown', values: [], default: '24' }],
  },
  '/deps/rsp/data/TooltipTrigger.json': {
    props: [{ property: 'placement', kind: 'enum', values: ['top', 'bottom'], default: 'top' }],
  },
  '/deps/swc/data/swc-button.json': [
    { property: 'disabled', attribute: 'disabled', kind: 'boolean', values: [], default: 'false' },
    { property: 'size', attribute: 'size', kind: 'enum', values: ['m', 'l'], optional: true },
  ],
  '/deps/swc/data/swc-badge.json': [
    { property: 'fixed', attribute: 'fixed', kind: 'boolean', values: [], default: 'false' },
  ],
};
const snippets = {
  '/deps/rsp/playground/snippets/button.jsx': '<Button>Button</Button>',
  '/deps/rsp/playground/snippets/avatar.jsx': '<Avatar alt="User avatar" size="{24}" />',
  '/deps/rsp/playground/snippets/tooltip.jsx': '<Tooltip>Helpful tip</Tooltip>',
  '/deps/swc/playground/snippets/button.html': '<swc-button>Button</swc-button>',
  '/deps/swc/playground/snippets/badge.html': '<swc-badge>Badge</swc-badge>',
};
const rspMetadata = { version: '1.0.0-test', peerDependencies: { react: '^19.0.0' } };
const reactModule = `
  export const Fragment = Symbol('Fragment');
  export function createElement(type, props, ...children) {
    const values = { ...props };
    if (children.length) values.children = children.length === 1 ? children[0] : children;
    return { type: typeof type === 'function' ? type.name : String(type), props: values };
  }
`;
// Observe the production renderer's final prop tree, not a replacement message handler.
const reactDomModule = `
  export function createRoot(mount) {
    return {
      render(tree) {
        mount.setAttribute('data-preview', JSON.stringify(tree));
        mount.textContent = 'Component preview';
      }
    };
  }
`;
const rspModule = `
  export function Button() {}
  export function Avatar() {}
  export function Tooltip() {}
  export function TooltipTrigger() {}
  export function Provider() {}
  export function Text() {}
`;
const swcModule = `
  export class Button extends HTMLElement {}
  export class Badge extends HTMLElement {}
  export class ConversationTurn extends HTMLElement {}
  export class UserMessage extends HTMLElement {}
  export class SystemMessage extends HTMLElement {}
  export class ResponseStatus extends HTMLElement {}
  export class ResponseStatusStep extends HTMLElement {}
`;

test.beforeEach(async ({ context }) => {
  await context.route(/^https:\/\/(esm\.sh|unpkg\.com|data\.jsdelivr\.com)\//, async (route) => {
    await route.abort();
    throw new Error(`Unexpected external request: ${route.request().url()}`);
  });
  const json = (route, body) => route.fulfill({
    contentType: 'application/json',
    headers: { 'access-control-allow-origin': '*' },
    body: JSON.stringify(body),
  });
  const module = (route, body) => route.fulfill({
    contentType: 'application/javascript',
    headers: { 'access-control-allow-origin': '*' },
    body,
  });
  await context.route('**/playground-data.json?sheet=components', (route) => json(route, components));
  await context.route('**/playground-data.json?sheet=controls', (route) => json(route, controls));
  await context.route('**/deps/*/data/*.json', (route) => {
    const path = new URL(route.request().url()).pathname;
    expect(catalogs[path], `Unexpected catalog request: ${path}`).toBeDefined();
    return json(route, catalogs[path]);
  });
  await context.route('**/deps/*/playground/snippets/*', (route) => {
    const path = new URL(route.request().url()).pathname;
    expect(snippets[path], `Unexpected snippet request: ${path}`).toBeDefined();
    return route.fulfill({ contentType: 'text/plain', body: snippets[path] });
  });
  await context.route('**/deps/swc/data/swc-{conversation-turn,response-status}.json', (route) => route.continue());
  await context.route('**/deps/swc/playground/snippets/{conversation-turn,response-status}.html', (route) => route.continue());
  await context.route('https://esm.sh/@react-spectrum/s2/package.json', (route) => json(route, rspMetadata));
  await context.route('https://data.jsdelivr.com/v1/package/npm/@react-spectrum/s2@*/flat', (route) => json(route, {
    files: [{ name: '/page.css' }],
  }));
  await context.route('https://esm.sh/react@*', (route) => module(route, reactModule));
  await context.route('https://esm.sh/react-dom@*/client', (route) => module(route, reactDomModule));
  await context.route('https://esm.sh/@react-spectrum/s2@**', (route) => (
    route.request().url().endsWith('.css')
      ? route.fulfill({ contentType: 'text/css', body: ':root {}' })
      : module(route, rspModule)
  ));
  await context.route('https://esm.sh/@adobe/spectrum-wc@**', (route) => module(route, swcModule));
  await context.route('https://unpkg.com/@adobe/spectrum-wc@*/dist/swc.css', (route) => (
    route.fulfill({ contentType: 'text/css', body: ':root {}' })
  ));
  await context.route('https://use.typekit.net/**', (route) => route.abort());
  await context.route('**/playground/button/images/*/*.png', (route) => route.fulfill({
    contentType: 'image/svg+xml',
    body: '<svg xmlns="http://www.w3.org/2000/svg" width="40" height="40"><rect width="40" height="40" /></svg>',
  }));
});

async function gotoFixture(page) {
  await page.goto(FIXTURE, { waitUntil: 'domcontentloaded' });
  await expect(page.locator('.playground-layout')).toHaveCount(10);
}

async function rspTree(block) {
  const value = await block.frameLocator('iframe').locator('#mount').getAttribute('data-preview');
  return value ? JSON.parse(value) : null;
}

test('RSP controls deliver typed values only to their own live component', async ({ page }) => {
  await gotoFixture(page);
  const active = page.locator('#rsp-button');
  const sibling = page.locator('#rsp-button-sibling');
  await expect.poll(async () => (await rspTree(active))?.props.children.props.isDisabled)
    .toBe(false);
  await expect.poll(async () => (await rspTree(sibling))?.props.children.props.isDisabled)
    .toBe(false);

  const toggle = active.getByRole('switch', { name: 'isDisabled' });
  await toggle.click();
  await expect(toggle).toBeFocused();
  await expect.poll(async () => (await rspTree(active)).props.children.props.isDisabled).toBe(true);
  await expect.poll(async () => (await rspTree(sibling)).props.children.props.isDisabled)
    .toBe(false);
  await expect(active.locator('pre')).toContainText('isDisabled');
  await expect(sibling.locator('pre')).not.toContainText('isDisabled');

  await active.getByRole('textbox', { name: 'label' }).fill('yes');
  await expect.poll(async () => (await rspTree(active)).props.children.props.children).toBe('yes');
  await expect.poll(async () => (await rspTree(sibling)).props.children.props.children).toBe('Button');
  await active.getByRole('textbox', { name: 'label' }).fill('');
  await expect.poll(async () => (await rspTree(active)).props.children.props.children).toBe('');
  await toggle.click();
  await expect.poll(async () => (await rspTree(active)).props.children.props.isDisabled)
    .toBe(false);
});

test('RSP numeric controls retain numbers in the live props and copied JSX', async ({ page }) => {
  await gotoFixture(page);
  const avatar = page.locator('#rsp-avatar');
  await expect.poll(async () => (await rspTree(avatar))?.props.children.props.size).toBe(24);
  await avatar.getByRole('combobox', { name: 'size' }).selectOption('40');
  await expect.poll(async () => (await rspTree(avatar)).props.children.props.size).toBe(40);
  await expect(avatar.locator('pre')).toContainText('size={40}');
});

test('RSP overlay controls update the trigger without changing the tooltip content', async ({ page }) => {
  await gotoFixture(page);
  const tooltip = page.locator('#rsp-tooltip');
  await expect.poll(async () => (await rspTree(tooltip))?.props.children.props.placement).toBe('top');
  await tooltip.getByRole('combobox', { name: 'placement' }).selectOption('bottom');
  await expect.poll(async () => (await rspTree(tooltip)).props.children.props.placement).toBe('bottom');
  const trigger = (await rspTree(tooltip)).props.children;
  expect(trigger.type).toBe('TooltipTrigger');
  const bubble = trigger.props.children.find(({ type }) => type === 'Tooltip');
  expect(bubble.props.placement).toBeUndefined();
  expect(bubble.props.children).toBe('Helpful tip');
  await expect(tooltip.locator('pre')).toContainText('placement="bottom"');
  await expect(tooltip.locator('pre')).toContainText('<Tooltip>Helpful tip</Tooltip>');
});

test('SWC controls apply and remove attributes on the correct upgraded element', async ({ page }) => {
  await gotoFixture(page);
  const button = page.locator('#swc-button');
  const badge = page.locator('#swc-badge');
  const liveButton = button.frameLocator('iframe').locator('swc-button');
  const liveBadge = badge.frameLocator('iframe').locator('swc-badge');
  await expect(liveButton).toHaveText('Button');
  await expect(liveBadge).toHaveText('Badge');
  await button.getByRole('switch', { name: 'isDisabled' }).click();
  await expect(liveButton).toHaveAttribute('disabled', '');
  await expect(liveBadge).not.toHaveAttribute('fixed');
  await badge.getByRole('switch', { name: 'fixed' }).click();
  await expect(liveBadge).toHaveAttribute('fixed', '');
  await button.getByRole('switch', { name: 'isDisabled' }).click();
  await expect(liveButton).not.toHaveAttribute('disabled');
  await expect(liveBadge).toHaveAttribute('fixed', '');
  await button.getByRole('textbox', { name: 'label' }).fill('yes');
  await expect(liveButton).toHaveText('yes');
  await expect(liveBadge).toHaveText('Badge');
});

test('SWC optional picker values disappear from both the live element and copied markup', async ({ page }) => {
  await gotoFixture(page);
  const button = page.locator('#swc-button');
  const liveButton = button.frameLocator('iframe').locator('swc-button');
  await expect(liveButton).toHaveText('Button');
  await button.getByRole('combobox', { name: 'size' }).selectOption('l');
  await expect(liveButton).toHaveAttribute('size', 'l');
  await expect(button.locator('pre')).toContainText('size="l"');
  await button.getByRole('combobox', { name: 'size' }).selectOption(NONE_OPTION);
  await expect(liveButton).not.toHaveAttribute('size');
  await expect(button.locator('pre')).not.toContainText('size=');
});

test('SWC conversation-turn controls update the live message through the frame observer', async ({ page }) => {
  await gotoFixture(page);
  const block = page.locator('#swc-conversation-turn');
  await block.scrollIntoViewIfNeeded();
  const turn = block.frameLocator('iframe').locator('swc-conversation-turn');
  const messages = turn.locator('swc-user-message, swc-system-message');
  const texts = {
    user: 'Can you summarize the attached campaign assets?',
    system: 'Here is a concise summary based on the files you shared. I grouped themes by audience and channel.',
  };
  await expect(turn).toHaveAttribute('type', 'user');
  await expect(messages).toHaveCount(1);
  await expect(turn.locator('swc-user-message')).toHaveText(texts.user);

  for (const type of ['system', 'system', 'user', 'system', 'user']) {
    await block.getByRole('combobox', { name: 'type', exact: true }).selectOption(type);
    await expect(turn).toHaveAttribute('type', type);
    await expect(messages).toHaveCount(1);
    await expect(turn.locator(`swc-${type}-message`)).toHaveText(texts[type]);
    await expect(block.locator('pre')).toContainText(`<swc-${type}-message>`);
    await expect(block.locator('pre')).toContainText(texts[type]);
  }
});

test('SWC response-status controls update the live timeline through the frame observer', async ({ page }) => {
  await gotoFixture(page);
  const block = page.locator('#swc-response-status');
  await block.scrollIntoViewIfNeeded();
  const status = block.frameLocator('iframe').locator('swc-response-status');
  const steps = status.locator('swc-response-status-step');
  const label = status.locator(':scope > [slot="label"]');
  const labels = {
    active: 'Searching repositories for Europe trips',
    complete: 'Thought for 9 seconds',
    stopped: 'You stopped the response',
  };
  const descriptions = {
    active: 'Checked 3 internal repositories for previously compiled trip package data and pricing templates.',
    complete: 'Synthesizing findings into a structured comparison of available packages with pricing and availability.',
    stopped: 'Interrupted before this step could finish.',
  };
  await expect(status).toHaveAttribute('status', 'active');
  await expect(label).toHaveText(labels.active);
  await expect(steps).toHaveCount(3);

  for (const value of ['complete', 'complete', 'stopped', 'active', 'complete', 'active', 'stopped']) {
    await block.getByRole('combobox', { name: 'status', exact: true }).selectOption(value);
    await expect(status).toHaveAttribute('status', value);
    await expect(label).toHaveText(labels[value]);
    await expect(steps).toHaveCount(value === 'complete' ? 4 : 3);
    await expect(steps.last()).toHaveAttribute('status', value);
    await expect(steps.last().locator('[slot="label"]')).toHaveText(
      value === 'complete' ? 'Compose response' : labels.active,
    );
    await expect(steps.last().locator('[slot="description"]')).toHaveText(descriptions[value]);
    await expect(block.locator('pre')).toContainText(labels[value]);
    await expect(block.locator('pre')).toContainText(descriptions[value]);
    if (value !== 'complete') {
      await expect(block.locator('pre')).not.toContainText('Compose response');
    }
  }
});

test('native image controls preserve platform routing, sorted props and unset omission', async ({ page }) => {
  await gotoFixture(page);
  const ios = page.locator('#ios-button');
  const android = page.locator('#android-button');
  const iosImage = ios.frameLocator('iframe').locator('#preview-image');
  const androidImage = android.frameLocator('iframe').locator('#preview-image');
  await expect(iosImage).toHaveAttribute('src', '/playground/button/images/ios/variant-default.png');
  await expect(androidImage).toHaveAttribute('src', '/playground/button/images/android/variant-default.png');
  await ios.getByRole('combobox', { name: 'variant' }).selectOption('accent');
  // Legacy native pickers expose only None for staticColor. Test its frame contract directly.
  await ios.locator('iframe').evaluate((iframe) => {
    iframe.contentWindow.postMessage({ type: 'prop-update', property: 'staticColor', value: 'white' }, '*');
  });
  await expect(iosImage).toHaveAttribute('src', '/playground/button/images/ios/staticColor-white--variant-accent.png');
  await expect(iosImage).toHaveAttribute('alt', /staticColor: white/);
  await expect(androidImage).toHaveAttribute('src', '/playground/button/images/android/variant-default.png');
  await ios.locator('iframe').evaluate((iframe, value) => {
    iframe.contentWindow.postMessage({ type: 'prop-update', property: 'staticColor', value }, '*');
  }, NONE_OPTION);
  await expect(iosImage).toHaveAttribute('src', '/playground/button/images/ios/variant-accent.png');
  await expect(iosImage).not.toHaveAttribute('alt', /staticColor|__unset/);
  await android.getByRole('combobox', { name: 'variant' }).selectOption('accent');
  await expect(androidImage).toHaveAttribute('src', '/playground/button/images/android/variant-accent.png');
});

test('theme changes reach every preview without changing controlled RSP props', async ({ page }) => {
  await gotoFixture(page);
  const button = page.locator('#rsp-button');
  await expect.poll(async () => (await rspTree(button))?.props.children.props.isDisabled)
    .toBe(false);
  for (const scheme of ['dark', 'light']) {
    await page.evaluate((value) => {
      document.body.classList.remove('dark-scheme', 'light-scheme');
      document.body.classList.add(`${value}-scheme`);
    }, scheme);
    for (const id of ['swc-button', 'swc-badge', 'ios-button', 'android-button']) {
      await expect(page.locator(`#${id}`).frameLocator('iframe').locator('body'))
        .toHaveCSS('color-scheme', scheme);
    }
    for (const id of ['rsp-button', 'rsp-button-sibling', 'rsp-avatar', 'rsp-tooltip']) {
      await expect.poll(async () => (await rspTree(page.locator(`#${id}`)))?.props.colorScheme).toBe(scheme);
    }
    expect((await rspTree(button)).props.children.props.isDisabled).toBe(false);
  }
});

test('controls changed before runtime readiness reach the component after initialization', async ({ page }) => {
  const gate = Promise.withResolvers();
  const requested = Promise.withResolvers();
  await page.route('https://esm.sh/@react-spectrum/s2/package.json', async (route) => {
    requested.resolve();
    await gate.promise;
    await route.fulfill({
      contentType: 'application/json',
      headers: { 'access-control-allow-origin': '*' },
      body: JSON.stringify(rspMetadata),
    });
  });
  await gotoFixture(page);
  await requested.promise;
  const button = page.locator('#rsp-button');
  try {
    expect(await rspTree(button)).toBeNull();
    await button.getByRole('switch', { name: 'isDisabled' }).click();
    await button.getByRole('textbox', { name: 'label' }).fill('Before ready');
  } finally {
    gate.resolve();
  }
  await expect.poll(async () => (await rspTree(button))?.props.children.props.isDisabled)
    .toBe(true);
  await expect.poll(async () => (await rspTree(button))?.props.children.props.children).toBe('Before ready');
});
