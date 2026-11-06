import { expect } from '@esm-bundle/chai';
import { buildCardItem } from '../../blocks/card-grid/card-grid-item.js';

const fullRow = () => ({
  path: '/web/rsp/components/accordion',
  title: 'Accordion',
  description: 'An accordion displays a list of items that can be expanded.',
  image: '/media_1270372ba73a31b64cb998d3c4a0a3d44e565196f.png',
  implementation: 'rsp',
  status: 'available',
});

// A full row minus one field, without tripping no-unused-vars on a destructure
// that exists only to drop a key.
const rowWithout = (key) => {
  const row = fullRow();
  delete row[key];
  return row;
};

describe('card-item', () => {
  describe('buildCardItem', () => {
    it('renders the title as the card link', () => {
      const el = buildCardItem(fullRow());
      const link = el.querySelector('.card-grid-item-title a');

      expect(link.textContent).to.equal('Accordion');
      expect(link.getAttribute('href')).to.equal('/web/rsp/components/accordion');
    });

    it('renders the description', () => {
      const el = buildCardItem(fullRow());

      expect(el.querySelector('.card-grid-item-description').textContent)
        .to.equal('An accordion displays a list of items that can be expanded.');
    });

    it('renders a decorative image, since the title names the card', () => {
      const el = buildCardItem(fullRow());
      const img = el.querySelector('.card-grid-item-image picture img');

      expect(img).to.not.equal(null);
      expect(img.getAttribute('alt')).to.equal('');
    });

    it('renders an image from an absolute URL', () => {
      const el = buildCardItem({ ...fullRow(), image: 'https://spectrum.adobe.com/media_abc.png' });

      expect(el.querySelector('.card-grid-item-image picture img')).to.not.equal(null);
    });

    it('labels the implementation with its short label', () => {
      const el = buildCardItem(fullRow());

      expect(el.querySelector('.card-grid-item-impl').textContent).to.equal('RSP');
    });

    it('labels a design-only page as Figma', () => {
      const el = buildCardItem({ ...fullRow(), implementation: 'design-only' });

      expect(el.querySelector('.card-grid-item-impl').textContent).to.equal('Figma');
    });

    it('renders the status badge with its unified label and data hook', () => {
      const el = buildCardItem(fullRow());
      const badge = el.querySelector('.card-grid-item-status');

      expect(badge.textContent).to.equal('Available');
      expect(badge.getAttribute('data-status')).to.equal('available');
    });

    it('adds its class without overwriting one already on the root', () => {
      const root = document.createElement('li');
      root.className = 'preset';
      buildCardItem(fullRow(), root);

      expect(root.classList.contains('preset')).to.be.true;
      expect(root.classList.contains('card-grid-item')).to.be.true;
    });

    it('omits the image element when the row has no image', () => {
      const el = buildCardItem(rowWithout('image'));

      expect(el.querySelector('.card-grid-item-image')).to.equal(null);
    });

    it('omits the badge when the row has no status', () => {
      const el = buildCardItem(rowWithout('status'));

      expect(el.querySelector('.card-grid-item-status')).to.equal(null);
    });

    it('omits the badge for a status id the model does not define', () => {
      const el = buildCardItem({ ...fullRow(), status: 'invented' });

      expect(el.querySelector('.card-grid-item-status')).to.equal(null);
    });

    it('omits the title when the row has none, rather than linking empty text', () => {
      const el = buildCardItem(rowWithout('title'));

      expect(el.querySelector('.card-grid-item-title')).to.equal(null);
    });

    it('sets authored copy as text, never as markup', () => {
      const el = buildCardItem({ ...fullRow(), description: '<img src=x onerror="alert(1)">' });
      const description = el.querySelector('.card-grid-item-description');

      expect(description.querySelector('img')).to.equal(null);
      expect(description.textContent).to.equal('<img src=x onerror="alert(1)">');
    });

    describe('badges', () => {
      const withBadges = (badges) => ({ ...fullRow(), badges });

      const badgesIn = (el) => [...el.querySelectorAll('.card-grid-item-badge')]
        .map((badge) => [badge.dataset.field, badge.textContent]);

      it('renders one badge per value, in the order it is given', () => {
        const el = buildCardItem(withBadges([
          { field: 'card-team', value: 'CXO' },
          { field: 'card-subject', value: 'web' },
          { field: 'card-steward', value: 'Marina Harutyunyan' },
        ]));

        expect(badgesIn(el)).to.deep.equal([
          ['card-team', 'CXO'],
          ['card-subject', 'web'],
          ['card-steward', 'Marina Harutyunyan'],
        ]);
      });

      it('marks the badge row as a list, since list-style none strips the role in Safari', () => {
        const el = buildCardItem(withBadges([{ field: 'card-team', value: 'CXO' }]));

        expect(el.querySelector('.card-grid-item-badges').getAttribute('role')).to.equal('list');
      });

      it('renders the badges as list items', () => {
        const el = buildCardItem(withBadges([
          { field: 'card-team', value: 'CXO' },
          { field: 'card-subject', value: 'web' },
        ]));

        expect(el.querySelectorAll('.card-grid-item-badges > li')).to.have.length(2);
      });

      it('omits the badge row when the card has no badges', () => {
        expect(buildCardItem(withBadges([])).querySelector('.card-grid-item-badges'))
          .to.equal(null);
        expect(buildCardItem(fullRow()).querySelector('.card-grid-item-badges'))
          .to.equal(null);
      });

      it('sets the value as text, never as markup', () => {
        const el = buildCardItem(withBadges([
          { field: 'card-team', value: '<img src=x onerror="alert(1)">' },
        ]));
        const badge = el.querySelector('.card-grid-item-badge');

        expect(badge.querySelector('img')).to.equal(null);
        expect(badge.textContent).to.equal('<img src=x onerror="alert(1)">');
      });
    });
  });
});
