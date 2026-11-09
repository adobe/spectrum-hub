import assert from 'node:assert/strict';
import { afterEach, beforeEach, describe, it } from 'node:test';

import {
  S2_DOCS_BASE,
  docsPageName,
  fetchComponentDocStatus,
  parseStatusFromHtml,
  parseStatusFromMdx,
  s2MdxUrl,
} from '../../deps/rsp/extract-doc-status.js';
import { componentDocsUrl } from '../../deps/rsp/docs.js';

describe('componentDocsUrl', () => {
  it('uses the same page as status extraction for an AI component', () => {
    assert.equal(
      componentDocsUrl('InsertMenuButton', 'ai'),
      `${S2_DOCS_BASE}/${docsPageName('InsertMenuButton', 'ai')}.html#insertmenubutton`,
    );
  });

  it('uses the component page without an anchor for S2', () => {
    assert.equal(componentDocsUrl('ActionButton'), `${S2_DOCS_BASE}/ActionButton.html`);
  });
});

describe('parseStatusFromMdx', () => {
  it('returns prerelease when export const version is set', () => {
    const mdx = "export const version = 'rc';\n# Autocomplete\n";
    assert.equal(parseStatusFromMdx(mdx), 'rc');
  });

  it('returns stable when no version export exists', () => {
    assert.equal(parseStatusFromMdx('# Button\n'), 'stable');
  });
});

describe('parseStatusFromHtml', () => {
  it('returns prerelease when the docs badge is present', () => {
    assert.equal(parseStatusFromHtml('<span>rc</span>'), 'rc');
    assert.equal(parseStatusFromHtml('>alpha<'), 'alpha');
  });

  it('returns stable when no badge is present', () => {
    assert.equal(parseStatusFromHtml('<h1>Button</h1>'), 'stable');
  });

  it('ignores a demo control option that merely echoes its own value (e.g. an alpha color channel)', () => {
    assert.equal(
      parseStatusFromHtml('<select><option value="alpha">alpha</option></select>'),
      'stable',
    );
  });
});

describe('docsPageName', () => {
  it('uses the component\'s own page for an S2 component', () => {
    assert.equal(docsPageName('Button', 's2'), 'Button');
  });

  it('defaults to the S2 package when none is given', () => {
    assert.equal(docsPageName('Button'), 'Button');
  });

  it('routes every AI component to the one shared AI components page', () => {
    // @react-spectrum/ai is not documented a page per component: Chat, PromptField,
    // UserMessage and the rest share /ai-components.html, which carries a single badge
    // for the whole cohort. Asking for /Chat.html 404s.
    assert.equal(docsPageName('Chat', 'ai'), 'ai-components');
    assert.equal(docsPageName('UserMessage', 'ai'), 'ai-components');
  });
});

describe('fetchComponentDocStatus', () => {
  /** @type {typeof fetch} */
  let originalFetch;

  beforeEach(() => {
    originalFetch = globalThis.fetch;
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  /**
   * @param {Record<string, { status: number, body: string }>} routes
   */
  function mockFetch(routes) {
    globalThis.fetch = async (input) => {
      const url = String(input);
      const route = routes[url];
      if (!route) {
        return { ok: false, status: 404, text: async () => '' };
      }
      return {
        ok: route.status >= 200 && route.status < 300,
        status: route.status,
        text: async () => route.body,
      };
    };
  }

  it('reads status from the published S2 HTML doc', async () => {
    mockFetch({
      [`${S2_DOCS_BASE}/Button.html`]: {
        status: 200,
        body: '<h1>Button</h1>',
      },
    });

    assert.equal(await fetchComponentDocStatus('Button'), 'stable');
  });

  it('detects prerelease badges in HTML', async () => {
    mockFetch({
      [`${S2_DOCS_BASE}/Toast.html`]: {
        status: 200,
        body: '<h1>Toast</h1>>alpha<',
      },
    });

    assert.equal(await fetchComponentDocStatus('Toast'), 'alpha');
  });

  it('falls back to MDX on jsDelivr when HTML returns 404', async () => {
    const mdxUrl = s2MdxUrl('FutureComponent');
    mockFetch({
      [`${S2_DOCS_BASE}/FutureComponent.html`]: { status: 404, body: '' },
      [mdxUrl]: {
        status: 200,
        body: "export const version = 'beta';\n# FutureComponent\n",
      },
    });

    assert.equal(await fetchComponentDocStatus('FutureComponent'), 'beta');
  });

  it('returns null when neither HTML nor MDX is available', async () => {
    mockFetch({
      [`${S2_DOCS_BASE}/Missing.html`]: { status: 404, body: '' },
      [s2MdxUrl('Missing')]: { status: 404, body: '' },
    });

    assert.equal(await fetchComponentDocStatus('Missing'), null);
  });

  it('reads an AI component\'s status from the shared AI components page', async () => {
    mockFetch({
      [`${S2_DOCS_BASE}/ai-components.html`]: {
        status: 200,
        body: '<span>alpha</span><h1>AI Components</h1>',
      },
    });

    assert.equal(await fetchComponentDocStatus('Chat', 'ai'), 'alpha');
  });

  it('does not request an AI component\'s own page, which does not exist', async () => {
    mockFetch({
      [`${S2_DOCS_BASE}/UserMessage.html`]: { status: 200, body: '<h1>UserMessage</h1>' },
    });

    // Only /ai-components.html is routed, and it is absent from the mock, so a lookup that
    // wrongly asked for /UserMessage.html would report stable instead of null.
    assert.equal(await fetchComponentDocStatus('UserMessage', 'ai'), null);
  });

  it('falls back to the shared AI components MDX when its HTML returns 404', async () => {
    mockFetch({
      [`${S2_DOCS_BASE}/ai-components.html`]: { status: 404, body: '' },
      [s2MdxUrl('ai-components')]: {
        status: 200,
        body: "export const version = 'alpha';\n# AI Components\n",
      },
    });

    assert.equal(await fetchComponentDocStatus('PromptField', 'ai'), 'alpha');
  });

  it('returns null when HTML fails with a non-404 error', async () => {
    mockFetch({
      [`${S2_DOCS_BASE}/Button.html`]: { status: 503, body: 'unavailable' },
    });

    assert.equal(await fetchComponentDocStatus('Button'), null);
  });
});
