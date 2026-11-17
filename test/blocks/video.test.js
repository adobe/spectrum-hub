import { expect } from '@esm-bundle/chai';
import sinon from 'sinon';
import { setConfig } from '../../scripts/ak.js';
import init, { getAdobeVideoId, getVideoSource, getYoutubeId } from '../../blocks/video/video.js';

const VIDEO_ID = 'dQw4w9WgXcQ';
const WATCH_URL = `https://www.youtube.com/watch?v=${VIDEO_ID}`;
// 1x1 transparent GIF, so fixture posters never hit the network.
const PIXEL = 'data:image/gif;base64,R0lGODlhAQABAAAAACH5BAEKAAEALAAAAAABAAEAAAICTAEAOw==';

let sandbox;
let logStub;

beforeEach(() => {
  sandbox = sinon.createSandbox();
  logStub = sandbox.stub();
  setConfig({ log: logStub });
  // Default: no oEmbed data, so the block keeps its fallback label and poster.
  sandbox.stub(window, 'fetch').resolves({ ok: false, json: async () => ({}) });
});

afterEach(() => {
  sandbox.restore();
});

/**
 * Builds the DOM the link auto-block produces: an anchor carrying the block
 * class, alone in a paragraph, inside a section.
 */
function makeLink(href, text = href) {
  const section = document.createElement('div');
  section.className = 'section';
  section.innerHTML = `<p><a class="video auto-block" href="${href}">${text}</a></p>`;
  return { section, link: section.querySelector('a') };
}

describe('getYoutubeId', () => {
  it('reads the id from a watch URL', () => {
    expect(getYoutubeId(`https://www.youtube.com/watch?v=${VIDEO_ID}`)).to.equal(VIDEO_ID);
  });

  it('reads the id from a watch URL with extra params', () => {
    expect(getYoutubeId(`https://www.youtube.com/watch?list=abc&v=${VIDEO_ID}&t=30`)).to.equal(VIDEO_ID);
  });

  it('reads the id from a youtu.be URL', () => {
    expect(getYoutubeId(`https://youtu.be/${VIDEO_ID}`)).to.equal(VIDEO_ID);
  });

  it('reads the id from an embed URL', () => {
    expect(getYoutubeId(`https://www.youtube.com/embed/${VIDEO_ID}`)).to.equal(VIDEO_ID);
  });

  it('reads the id from a shorts URL', () => {
    expect(getYoutubeId(`https://www.youtube.com/shorts/${VIDEO_ID}`)).to.equal(VIDEO_ID);
  });

  it('reads the id from a live URL', () => {
    expect(getYoutubeId(`https://www.youtube.com/live/${VIDEO_ID}`)).to.equal(VIDEO_ID);
  });

  it('reads the id from a nocookie embed URL', () => {
    expect(getYoutubeId(`https://www.youtube-nocookie.com/embed/${VIDEO_ID}`)).to.equal(VIDEO_ID);
  });

  it('reads the id from a mobile URL', () => {
    expect(getYoutubeId(`https://m.youtube.com/watch?v=${VIDEO_ID}`)).to.equal(VIDEO_ID);
  });

  it('rejects a URL on another host', () => {
    expect(getYoutubeId(`https://notyoutube.com/watch?v=${VIDEO_ID}`)).to.equal('');
  });

  it('rejects a host that merely ends in youtube.com', () => {
    expect(getYoutubeId(`https://evil-youtube.com/watch?v=${VIDEO_ID}`)).to.equal('');
  });

  it('rejects an id of the wrong length', () => {
    expect(getYoutubeId('https://www.youtube.com/watch?v=tooshort')).to.equal('');
  });

  it('rejects a YouTube URL with no id', () => {
    expect(getYoutubeId('https://www.youtube.com/')).to.equal('');
  });

  it('rejects an unparseable URL', () => {
    expect(getYoutubeId('not a url')).to.equal('');
  });

  it('rejects an empty value', () => {
    expect(getYoutubeId('')).to.equal('');
  });
});

describe('video block, link authored', () => {
  it('replaces the anchor with a video container', async () => {
    const { section, link } = makeLink(WATCH_URL);

    await init(link);

    const video = section.querySelector('.video');
    expect(video.tagName).to.equal('DIV');
    expect(section.contains(link)).to.equal(false);
  });

  it('keeps the classes the auto-block put on the anchor', async () => {
    const { section, link } = makeLink(WATCH_URL);

    await init(link);

    expect(section.querySelector('.video').classList.contains('auto-block')).to.equal(true);
  });

  it('replaces the paragraph that held only the anchor', async () => {
    const { section, link } = makeLink(WATCH_URL);

    await init(link);

    expect(section.querySelector('.video').parentElement === section).to.equal(true);
    expect(section.firstElementChild.classList.contains('video')).to.equal(true);
  });

  it('replaces a paragraph that wraps the anchor across several lines', async () => {
    const section = document.createElement('div');
    section.className = 'section';
    section.innerHTML = `
      <p>
        <a class="video auto-block" href="${WATCH_URL}">
          Getting started with Author Kit
        </a>
      </p>
    `;

    await init(section.querySelector('a'));

    expect(section.querySelector('.video').parentElement === section).to.equal(true);
  });

  it('keeps a paragraph that holds more than the anchor', async () => {
    const { section, link } = makeLink(WATCH_URL);
    link.parentElement.append(' and more text');

    await init(link);

    const paragraph = section.querySelector('p');
    expect(paragraph.querySelector('.video') === null).to.equal(false);
  });

  it('builds a play button instead of an iframe', async () => {
    const { section, link } = makeLink(WATCH_URL);

    await init(link);

    const button = section.querySelector('button.video-poster');
    expect(button.type).to.equal('button');
    expect(section.querySelector('iframe') === null).to.equal(true);
  });

  it('shows the maxres poster from the YouTube image CDN', async () => {
    const { section, link } = makeLink(WATCH_URL);

    await init(link);

    const img = section.querySelector('.video-poster img');
    expect(img.getAttribute('src')).to.equal(`https://img.youtube.com/vi/${VIDEO_ID}/maxresdefault.jpg`);
    expect(img.getAttribute('alt')).to.equal('');
  });

  it('names the play button from custom link text', async () => {
    const { section, link } = makeLink(WATCH_URL, 'Getting started with Author Kit');

    await init(link);

    const button = section.querySelector('.video-poster');
    expect(button.getAttribute('aria-label')).to.equal('Play video: Getting started with Author Kit');
  });

  it('falls back to the video id when the link text is the raw URL', async () => {
    const { section, link } = makeLink(WATCH_URL);

    await init(link);

    expect(section.querySelector('.video-poster').getAttribute('aria-label')).to.equal(`Play video ${VIDEO_ID}`);
  });

  it('removes the block and logs when the URL has no usable video id', async () => {
    const { section, link } = makeLink('https://www.youtube.com/');

    await init(link);

    expect(section.querySelector('.video') === null).to.equal(true);
    expect(section.textContent.trim()).to.equal('');
    expect(logStub.called).to.equal(true);
  });
});

/** Builds the DOM an authored table produces, from `[label, valueHtml]` pairs. */
function makeBlock(rows) {
  const wrapper = document.createElement('div');
  wrapper.className = 'video-wrapper';
  const block = document.createElement('div');
  block.className = 'video';
  rows.forEach(([label, html]) => {
    const row = document.createElement('div');
    row.innerHTML = `<div>${label}</div><div>${html}</div>`;
    block.append(row);
  });
  wrapper.append(block);
  return { wrapper, block };
}

describe('video block, table authored', () => {
  it('builds the facade inside the authored block', async () => {
    const { block } = makeBlock([['Video URL', `<a href="${WATCH_URL}">${WATCH_URL}</a>`]]);

    await init(block);

    expect(block.querySelector('button.video-poster') === null).to.equal(false);
    expect(block.classList.contains('video')).to.equal(true);
  });

  it('accepts the Youtube URL label as an alias', async () => {
    const { block } = makeBlock([['Youtube URL', `<a href="${WATCH_URL}">${WATCH_URL}</a>`]]);

    await init(block);

    expect(block.querySelector('.video-poster img').getAttribute('src'))
      .to.equal(`https://img.youtube.com/vi/${VIDEO_ID}/maxresdefault.jpg`);
  });

  it('accepts a plain-text URL with no link', async () => {
    const { block } = makeBlock([['Video URL', WATCH_URL]]);

    await init(block);

    expect(block.querySelector('.video-poster') === null).to.equal(false);
  });

  it('names the play button from custom link text', async () => {
    const { block } = makeBlock([['Video URL', `<a href="${WATCH_URL}">Author Kit basics</a>`]]);

    await init(block);

    expect(block.querySelector('.video-poster').getAttribute('aria-label'))
      .to.equal('Play video: Author Kit basics');
  });

  it('prefers an authored poster image over the provider thumbnail', async () => {
    const { block } = makeBlock([
      ['Video URL', `<a href="${WATCH_URL}">${WATCH_URL}</a>`],
      ['Poster', `<picture><img src="${PIXEL}" alt=""></picture>`],
    ]);

    await init(block);

    const media = block.querySelector('.video-media');
    expect(media.querySelector('picture') === null).to.equal(false);
    expect(media.querySelector('img').getAttribute('src')).to.equal(PIXEL);
  });

  it('finds authored media in any row, whatever the label says', async () => {
    const { block } = makeBlock([
      ['Video URL', `<a href="${WATCH_URL}">${WATCH_URL}</a>`],
      ['Something else', `<img src="${PIXEL}" alt="">`],
    ]);

    await init(block);

    expect(block.querySelector('.video-media img').getAttribute('src')).to.equal(PIXEL);
  });

  it('builds a closed transcript disclosure from the Transcript row', async () => {
    const { block } = makeBlock([
      ['Video URL', `<a href="${WATCH_URL}">${WATCH_URL}</a>`],
      ['Transcript', '<p>First line.</p><p>Second line.</p>'],
    ]);

    await init(block);

    const details = block.querySelector('details.video-transcript');
    expect(details.open).to.equal(false);
    expect(details.querySelector('summary').textContent).to.equal('View transcript');
    expect(details.querySelectorAll('.video-transcript-panel p').length).to.equal(2);
  });

  it('points the play button at the transcript it describes', async () => {
    const { block } = makeBlock([
      ['Video URL', `<a href="${WATCH_URL}">${WATCH_URL}</a>`],
      ['Transcript', '<p>First line.</p>'],
    ]);

    await init(block);

    const details = block.querySelector('.video-transcript');
    expect(details.id).to.not.equal('');
    expect(block.querySelector('.video-poster').getAttribute('aria-describedby')).to.equal(details.id);
  });

  it('gives each transcript on the page a unique id', async () => {
    const first = makeBlock([
      ['Video URL', `<a href="${WATCH_URL}">${WATCH_URL}</a>`],
      ['Transcript', '<p>One.</p>'],
    ]);
    const second = makeBlock([
      ['Video URL', `<a href="${WATCH_URL}">${WATCH_URL}</a>`],
      ['Transcript', '<p>Two.</p>'],
    ]);

    await init(first.block);
    await init(second.block);

    const firstId = first.block.querySelector('.video-transcript').id;
    const secondId = second.block.querySelector('.video-transcript').id;
    expect(firstId === secondId).to.equal(false);
  });

  it('omits the disclosure when the Transcript row is empty', async () => {
    const { block } = makeBlock([
      ['Video URL', `<a href="${WATCH_URL}">${WATCH_URL}</a>`],
      ['Transcript', '   '],
    ]);

    await init(block);

    expect(block.querySelector('.video-transcript') === null).to.equal(true);
    expect(block.querySelector('.video-poster').hasAttribute('aria-describedby')).to.equal(false);
  });

  it('omits the disclosure when there is no Transcript row', async () => {
    const { block } = makeBlock([['Video URL', `<a href="${WATCH_URL}">${WATCH_URL}</a>`]]);

    await init(block);

    expect(block.querySelector('.video-transcript') === null).to.equal(true);
  });

  it('removes the block and its empty wrapper when the URL is unplayable', async () => {
    const { wrapper, block } = makeBlock([['Video URL', '<a href="https://example.com/clip">Clip</a>']]);
    document.body.append(wrapper);

    await init(block);

    expect(wrapper.isConnected).to.equal(false);
    expect(logStub.called).to.equal(true);
  });
});

describe('video block, play control', () => {
  it('replaces the poster with a privacy-enhanced iframe', async () => {
    const { block } = makeBlock([['Video URL', `<a href="${WATCH_URL}">${WATCH_URL}</a>`]]);
    await init(block);

    block.querySelector('.video-poster').click();

    const iframe = block.querySelector('.video-player iframe');
    const src = new URL(iframe.src);
    expect(src.origin).to.equal('https://www.youtube-nocookie.com');
    expect(src.pathname).to.equal(`/embed/${VIDEO_ID}`);
    expect(block.querySelector('.video-poster') === null).to.equal(true);
  });

  it('autoplays, since the viewer already asked for the video', async () => {
    const { block } = makeBlock([['Video URL', `<a href="${WATCH_URL}">${WATCH_URL}</a>`]]);
    await init(block);

    block.querySelector('.video-poster').click();

    const src = new URL(block.querySelector('iframe').src);
    expect(src.searchParams.get('autoplay')).to.equal('1');
    expect(src.searchParams.get('rel')).to.equal('0');
    expect(src.searchParams.get('cc_load_policy')).to.equal('1');
  });

  it('titles the iframe from the authored link text', async () => {
    const { block } = makeBlock([['Video URL', `<a href="${WATCH_URL}">Author Kit basics</a>`]]);
    await init(block);

    block.querySelector('.video-poster').click();

    expect(block.querySelector('iframe').title).to.equal('Author Kit basics');
  });

  it('allows fullscreen and the controls the player needs', async () => {
    const { block } = makeBlock([['Video URL', `<a href="${WATCH_URL}">${WATCH_URL}</a>`]]);
    await init(block);

    block.querySelector('.video-poster').click();

    expect(block.querySelector('iframe').getAttribute('allow')).to.contain('fullscreen');
  });

  it('announces the player load to screen readers', async () => {
    const { block } = makeBlock([['Video URL', `<a href="${WATCH_URL}">${WATCH_URL}</a>`]]);
    await init(block);
    expect(block.querySelector('[role="status"]').textContent).to.equal('');

    block.querySelector('.video-poster').click();

    expect(block.querySelector('[role="status"]').textContent).to.equal('Video player loaded');
  });

  it('keeps the transcript disclosure after play', async () => {
    const { block } = makeBlock([
      ['Video URL', `<a href="${WATCH_URL}">${WATCH_URL}</a>`],
      ['Transcript', '<p>First line.</p>'],
    ]);
    await init(block);

    block.querySelector('.video-poster').click();

    const details = block.querySelector('.video-transcript');
    expect(details === null).to.equal(false);
    expect(block.querySelector('iframe').getAttribute('aria-describedby')).to.equal(details.id);
  });
});

describe('video block, poster fallback', () => {
  const hqUrl = `https://img.youtube.com/vi/${VIDEO_ID}/hqdefault.jpg`;

  async function buildPoster() {
    const { block } = makeBlock([['Video URL', `<a href="${WATCH_URL}">${WATCH_URL}</a>`]]);
    await init(block);
    return block.querySelector('.video-media img');
  }

  it('falls back to hqdefault when maxres fails to load', async () => {
    const img = await buildPoster();

    img.dispatchEvent(new Event('error'));

    expect(img.getAttribute('src')).to.equal(hqUrl);
  });

  it('falls back to hqdefault when maxres loads as a tiny placeholder', async () => {
    const img = await buildPoster();
    Object.defineProperty(img, 'naturalWidth', { value: 120, configurable: true });

    img.dispatchEvent(new Event('load'));

    expect(img.getAttribute('src')).to.equal(hqUrl);
  });

  it('keeps a full-size maxres poster', async () => {
    const img = await buildPoster();
    Object.defineProperty(img, 'naturalWidth', { value: 1280, configurable: true });

    img.dispatchEvent(new Event('load'));

    expect(img.getAttribute('src')).to.equal(`https://img.youtube.com/vi/${VIDEO_ID}/maxresdefault.jpg`);
  });

  it('falls back only once', async () => {
    const img = await buildPoster();

    img.dispatchEvent(new Event('error'));
    img.dispatchEvent(new Event('error'));

    expect(img.getAttribute('src')).to.equal(hqUrl);
  });

  it('never rewrites an authored poster', async () => {
    const { block } = makeBlock([
      ['Video URL', `<a href="${WATCH_URL}">${WATCH_URL}</a>`],
      ['Poster', `<img src="${PIXEL}" alt="">`],
    ]);
    await init(block);
    const img = block.querySelector('.video-media img');

    img.dispatchEvent(new Event('error'));

    expect(img.getAttribute('src')).to.equal(PIXEL);
  });
});

/** Drains pending microtasks so a fire-and-forget fetch chain has settled. */
const flush = () => new Promise((resolve) => { setTimeout(resolve, 0); });

describe('video block, oEmbed title', () => {
  function stubOembed(payload) {
    window.fetch.resolves({ ok: true, json: async () => payload });
  }

  it('renames the play button with the real video title', async () => {
    stubOembed({ title: 'Getting started with Author Kit' });
    const { block } = makeBlock([['Video URL', `<a href="${WATCH_URL}">${WATCH_URL}</a>`]]);

    await init(block);
    await flush();

    expect(block.querySelector('.video-poster').getAttribute('aria-label'))
      .to.equal('Play video: Getting started with Author Kit');
  });

  it('requests the title from the YouTube oEmbed endpoint', async () => {
    stubOembed({ title: 'Anything' });
    const { block } = makeBlock([['Video URL', `<a href="${WATCH_URL}">${WATCH_URL}</a>`]]);

    await init(block);
    await flush();

    const requested = new URL(window.fetch.firstCall.args[0]);
    expect(requested.origin + requested.pathname).to.equal('https://www.youtube.com/oembed');
    expect(requested.searchParams.get('url')).to.equal(`https://www.youtube.com/watch?v=${VIDEO_ID}`);
  });

  it('collapses whitespace in the title', async () => {
    stubOembed({ title: '  Author   Kit\nbasics  ' });
    const { block } = makeBlock([['Video URL', `<a href="${WATCH_URL}">${WATCH_URL}</a>`]]);

    await init(block);
    await flush();

    expect(block.querySelector('.video-poster').getAttribute('aria-label'))
      .to.equal('Play video: Author Kit basics');
  });

  it('keeps the fallback label when the request fails', async () => {
    window.fetch.rejects(new Error('offline'));
    const { block } = makeBlock([['Video URL', `<a href="${WATCH_URL}">${WATCH_URL}</a>`]]);

    await init(block);
    await flush();

    expect(block.querySelector('.video-poster').getAttribute('aria-label')).to.equal(`Play video ${VIDEO_ID}`);
  });

  it('keeps the fallback label when the payload has no title', async () => {
    stubOembed({});
    const { block } = makeBlock([['Video URL', `<a href="${WATCH_URL}">${WATCH_URL}</a>`]]);

    await init(block);
    await flush();

    expect(block.querySelector('.video-poster').getAttribute('aria-label')).to.equal(`Play video ${VIDEO_ID}`);
  });

  it('does not request a title when the author already named the video', async () => {
    stubOembed({ title: 'Some other title' });
    const { block } = makeBlock([['Video URL', `<a href="${WATCH_URL}">Author Kit basics</a>`]]);

    await init(block);
    await flush();

    expect(window.fetch.called).to.equal(false);
    expect(block.querySelector('.video-poster').getAttribute('aria-label'))
      .to.equal('Play video: Author Kit basics');
  });

  it('titles the player with the fetched title when played afterwards', async () => {
    stubOembed({ title: 'Author Kit basics' });
    const { block } = makeBlock([['Video URL', `<a href="${WATCH_URL}">${WATCH_URL}</a>`]]);
    await init(block);
    await flush();

    block.querySelector('.video-poster').click();

    expect(block.querySelector('iframe').title).to.equal('Author Kit basics');
  });

  it('does nothing when the player already replaced the poster', async () => {
    stubOembed({ title: 'Late title' });
    const { block } = makeBlock([['Video URL', `<a href="${WATCH_URL}">${WATCH_URL}</a>`]]);
    await init(block);

    block.querySelector('.video-poster').click();
    await flush();

    expect(block.querySelector('iframe').title).to.equal(`video ${VIDEO_ID}`);
  });
});

const ADOBE_ID = '3503885';
const ADOBE_URL = `https://video.tv.adobe.com/v/${ADOBE_ID}`;

describe('getAdobeVideoId', () => {
  it('reads the id from a /v/ URL', () => {
    expect(getAdobeVideoId(ADOBE_URL)).to.equal(ADOBE_ID);
  });

  it('reads the id from a URL with a trailing slash', () => {
    expect(getAdobeVideoId(`${ADOBE_URL}/`)).to.equal(ADOBE_ID);
  });

  it('keeps the tracking suffix, which belongs to the embed URL', () => {
    expect(getAdobeVideoId('https://video.tv.adobe.com/v/3477418t1/')).to.equal('3477418t1');
  });

  it('reads the id when extra path segments follow', () => {
    expect(getAdobeVideoId(`${ADOBE_URL}/author-kit/`)).to.equal(ADOBE_ID);
  });

  it('reads the id when a query string follows', () => {
    expect(getAdobeVideoId(`${ADOBE_URL}/?quality=12&learn=on`)).to.equal(ADOBE_ID);
  });

  it('rejects a URL on another host', () => {
    expect(getAdobeVideoId(`https://video.tv.example.com/v/${ADOBE_ID}`)).to.equal('');
  });

  it('rejects a host that merely ends in the Adobe host', () => {
    expect(getAdobeVideoId(`https://evilvideo.tv.adobe.com.bad.com/v/${ADOBE_ID}`)).to.equal('');
  });

  it('rejects a path that is not /v/', () => {
    expect(getAdobeVideoId(`https://video.tv.adobe.com/watch/${ADOBE_ID}`)).to.equal('');
  });

  it('rejects a non-numeric id', () => {
    expect(getAdobeVideoId('https://video.tv.adobe.com/v/not-a-number')).to.equal('');
  });

  it('rejects a non-http protocol', () => {
    expect(getAdobeVideoId(`ftp://video.tv.adobe.com/v/${ADOBE_ID}`)).to.equal('');
  });

  it('rejects an unparseable URL', () => {
    expect(getAdobeVideoId('not a url')).to.equal('');
  });

  it('rejects an empty value', () => {
    expect(getAdobeVideoId('')).to.equal('');
  });
});

describe('getVideoSource', () => {
  it('identifies an Adobe video and keeps the authored params', () => {
    const source = getVideoSource(`${ADOBE_URL}/?t=30&learn=on`);

    expect(source.provider).to.equal('adobe');
    expect(source.id).to.equal(ADOBE_ID);
    expect(source.params.get('t')).to.equal('30');
    expect(source.params.get('learn')).to.equal('on');
  });

  it('identifies a YouTube video', () => {
    expect(getVideoSource(WATCH_URL).provider).to.equal('youtube');
  });

  it('returns null for an unsupported host', () => {
    expect(getVideoSource('https://example.com/clip') === null).to.equal(true);
  });
});

describe('video block, Adobe Video Publishing Cloud', () => {
  function stubOembed(payload) {
    window.fetch.resolves({ ok: true, json: async () => payload });
  }

  it('builds a poster from the Adobe video frame', async () => {
    const { block } = makeBlock([['Video URL', `<a href="${ADOBE_URL}">${ADOBE_URL}</a>`]]);

    await init(block);

    expect(block.querySelector('.video-media img').getAttribute('src'))
      .to.equal(`https://video.tv.adobe.com/v/${ADOBE_ID}?format=jpeg`);
  });

  it('accepts a plain-text Adobe URL', async () => {
    const { block } = makeBlock([['Video URL', ADOBE_URL]]);

    await init(block);

    expect(block.querySelector('.video-poster') === null).to.equal(false);
  });

  it('plays in an Adobe player iframe', async () => {
    const { block } = makeBlock([['Video URL', `<a href="${ADOBE_URL}">${ADOBE_URL}</a>`]]);
    await init(block);

    block.querySelector('.video-poster').click();

    const src = new URL(block.querySelector('iframe').src);
    expect(src.origin).to.equal('https://video.tv.adobe.com');
    expect(src.pathname).to.equal(`/v/${ADOBE_ID}/`);
    expect(src.searchParams.get('autoplay')).to.equal('1');
    expect(src.searchParams.get('hidetitle')).to.equal('1');
    expect(src.searchParams.get('captions')).to.equal('1');
  });

  it('keeps the authored player params and the tracking suffix', async () => {
    const href = 'https://video.tv.adobe.com/v/3477418t1/?t=30&learn=on';
    const { block } = makeBlock([['Video URL', `<a href="${href}">${href}</a>`]]);
    await init(block);

    block.querySelector('.video-poster').click();

    const src = new URL(block.querySelector('iframe').src);
    expect(src.pathname).to.equal('/v/3477418t1/');
    expect(src.searchParams.get('t')).to.equal('30');
    expect(src.searchParams.get('learn')).to.equal('on');
  });

  it('does not override a player option the author set', async () => {
    const href = `${ADOBE_URL}/?hidetitle=0&captions=0`;
    const { block } = makeBlock([['Video URL', `<a href="${href}">${href}</a>`]]);
    await init(block);

    block.querySelector('.video-poster').click();

    const src = new URL(block.querySelector('iframe').src);
    expect(src.searchParams.get('hidetitle')).to.equal('0');
    expect(src.searchParams.get('captions')).to.equal('0');
  });

  it('requests the title from the Adobe oEmbed endpoint', async () => {
    stubOembed({ title: 'Spectrum 2 in five minutes' });
    const { block } = makeBlock([['Video URL', `<a href="${ADOBE_URL}">${ADOBE_URL}</a>`]]);

    await init(block);
    await flush();

    const requested = new URL(window.fetch.firstCall.args[0]);
    expect(requested.origin + requested.pathname).to.equal('https://video.tv.adobe.com/oembed');
    expect(requested.searchParams.get('url')).to.equal(`https://video.tv.adobe.com/v/${ADOBE_ID}/`);
    expect(block.querySelector('.video-poster').getAttribute('aria-label'))
      .to.equal('Play video: Spectrum 2 in five minutes');
  });

  it('upgrades the small poster to the oEmbed thumbnail', async () => {
    stubOembed({ title: 'T', thumbnail_url: 'https://images-tv.adobe.com/mpcv3/1234/poster.jpg' });
    const { block } = makeBlock([['Video URL', `<a href="${ADOBE_URL}">${ADOBE_URL}</a>`]]);

    await init(block);
    await flush();

    expect(block.querySelector('.video-media img').getAttribute('src'))
      .to.equal('https://images-tv.adobe.com/mpcv3/1234/poster.jpg');
  });

  it('ignores an oEmbed thumbnail served from another host', async () => {
    stubOembed({ title: 'T', thumbnail_url: 'https://evil.example.com/poster.jpg' });
    const { block } = makeBlock([['Video URL', `<a href="${ADOBE_URL}">${ADOBE_URL}</a>`]]);

    await init(block);
    await flush();

    expect(block.querySelector('.video-media img').getAttribute('src'))
      .to.equal(`https://video.tv.adobe.com/v/${ADOBE_ID}?format=jpeg`);
  });

  it('ignores an insecure oEmbed thumbnail', async () => {
    stubOembed({ title: 'T', thumbnail_url: 'http://images-tv.adobe.com/mpcv3/1234/poster.jpg' });
    const { block } = makeBlock([['Video URL', `<a href="${ADOBE_URL}">${ADOBE_URL}</a>`]]);

    await init(block);
    await flush();

    expect(block.querySelector('.video-media img').getAttribute('src'))
      .to.equal(`https://video.tv.adobe.com/v/${ADOBE_ID}?format=jpeg`);
  });

  it('still fetches oEmbed for the poster when the author named the video', async () => {
    stubOembed({ title: 'Provider title', thumbnail_url: 'https://images-tv.adobe.com/mpcv3/1234/poster.jpg' });
    const { block } = makeBlock([['Video URL', `<a href="${ADOBE_URL}">Spectrum 2 basics</a>`]]);

    await init(block);
    await flush();

    // The poster improves, but the authored name is left alone.
    expect(block.querySelector('.video-media img').getAttribute('src'))
      .to.equal('https://images-tv.adobe.com/mpcv3/1234/poster.jpg');
    expect(block.querySelector('.video-poster').getAttribute('aria-label'))
      .to.equal('Play video: Spectrum 2 basics');
  });

  it('skips oEmbed when the author supplied both a name and a poster', async () => {
    stubOembed({ title: 'Provider title' });
    const { block } = makeBlock([
      ['Video URL', `<a href="${ADOBE_URL}">Spectrum 2 basics</a>`],
      ['Poster', `<img src="${PIXEL}" alt="">`],
    ]);

    await init(block);
    await flush();

    expect(window.fetch.called).to.equal(false);
  });

  it('never rewrites an authored poster', async () => {
    stubOembed({ title: 'T', thumbnail_url: 'https://images-tv.adobe.com/mpcv3/1234/poster.jpg' });
    const { block } = makeBlock([
      ['Video URL', `<a href="${ADOBE_URL}">${ADOBE_URL}</a>`],
      ['Poster', `<img src="${PIXEL}" alt="">`],
    ]);

    await init(block);
    await flush();

    expect(block.querySelector('.video-media img').getAttribute('src')).to.equal(PIXEL);
  });
});
