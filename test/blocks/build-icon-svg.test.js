import { expect } from '@esm-bundle/chai';
import { iconHref, buildIconSvg } from '../../deps/shared/playground/build-icon-svg.js';

describe('iconHref', () => {
  it('builds the site-wide s2-icon path convention for a given name', () => {
    expect(iconHref('search')).to.equal('/img/icons/s2-icon-search-20-n.svg#icon');
  });
});

describe('buildIconSvg', () => {
  it('builds a real <svg> element with a viewBox', () => {
    const svg = buildIconSvg('search');
    expect(svg.tagName.toLowerCase()).to.equal('svg');
    expect(svg.getAttribute('viewBox')).to.equal('0 0 20 20');
  });

  it('nests a <use> element pointing at the icon href', () => {
    const svg = buildIconSvg('checkmarkcircle');
    const use = svg.querySelector('use');
    expect(use).to.exist;
    expect(use.getAttribute('href')).to.equal('/img/icons/s2-icon-checkmarkcircle-20-n.svg#icon');
  });

  it('builds elements in the SVG namespace, not plain HTML', () => {
    const svg = buildIconSvg('copy');
    expect(svg.namespaceURI).to.equal('http://www.w3.org/2000/svg');
    expect(svg.querySelector('use').namespaceURI).to.equal('http://www.w3.org/2000/svg');
  });
});
