import { expect } from '@esm-bundle/chai';
import { statusForPath } from '../../scripts/utils/status-lookup.js';

// Mirrors the shape deps/build-status-index.js emits: a `components` array of
// canonical PascalCase names, each with per-platform, per-implementation status.
const statusIndex = {
  statuses: {},
  implementations: { web: [{ id: 'figma' }, { id: 'rsp' }, { id: 'swc' }] },
  components: [
    {
      name: 'Accordion',
      label: 'Accordion',
      platforms: {
        web: {
          figma: { status: 'available' },
          rsp: { status: 'available', context: 'Stable' },
          swc: { status: 'experimental' },
        },
      },
    },
    {
      name: 'DropZone',
      label: 'Drop Zone',
      platforms: { web: { figma: { status: 'available' }, rsp: { status: 'deprecated' } } },
    },
    {
      name: 'AlertBanner',
      label: 'Alert banner',
      platforms: { web: { figma: { status: 'available' } } },
    },
    // Two components documented on one shared page, via the `page` override in
    // deps/status-overrides.json.
    {
      name: 'ColorHandle',
      label: 'Color Handle',
      platforms: { web: { rsp: { status: 'available', page: 'color-handle-and-loupe' } } },
    },
    {
      name: 'ColorLoupe',
      label: 'Color Loupe',
      platforms: { web: { rsp: { status: 'available', page: 'color-handle-and-loupe' } } },
    },
  ],
};

describe('status-lookup', () => {
  describe('statusForPath', () => {
    it('resolves an rsp page to its rsp status', () => {
      expect(statusForPath('/web/rsp/components/accordion', statusIndex)).to.equal('available');
    });

    it('resolves an swc page to its swc status', () => {
      expect(statusForPath('/web/swc/components/accordion', statusIndex)).to.equal('experimental');
    });

    it('resolves a design-only page to the figma status', () => {
      expect(statusForPath('/web/design-only/components/alert-banner', statusIndex)).to.equal('available');
    });

    it('slugs a PascalCase component name to match the URL', () => {
      expect(statusForPath('/web/rsp/components/drop-zone', statusIndex)).to.equal('deprecated');
    });

    it('returns null when the implementation has no entry for that component', () => {
      expect(statusForPath('/web/swc/components/drop-zone', statusIndex)).to.equal(null);
    });

    it('returns null for a slug absent from the index', () => {
      expect(statusForPath('/web/rsp/components/not-a-component', statusIndex)).to.equal(null);
    });

    it('returns null for a path with no components segment', () => {
      expect(statusForPath('/web/rsp/get-started', statusIndex)).to.equal(null);
    });

    // implAndSlugFromPath takes the segment directly after `components`, so a
    // nested path yields the folder name as the slug. No component matches it,
    // which is the safe outcome, but the behavior should stay documented.
    it('returns null for a nested path whose slug segment is a folder', () => {
      expect(statusForPath('/web/swc/components/patterns/conversational-ai', statusIndex)).to.equal(null);
    });

    it('returns null for a platform the index does not carry', () => {
      expect(statusForPath('/mobile/swiftui/components/accordion', statusIndex)).to.equal(null);
    });

    it('returns null when the status index is missing', () => {
      expect(statusForPath('/web/rsp/components/accordion', null)).to.equal(null);
    });

    it('resolves a shared page slug when every component on it agrees', () => {
      expect(statusForPath('/web/rsp/components/color-handle-and-loupe', statusIndex)).to.equal('available');
    });

    // No single badge is truthful for a page whose components report different
    // statuses, so no status is returned. No such page exists in the current
    // data; this guards the behavior if one appears.
    it('returns null when components sharing a page disagree', () => {
      const disagreeing = {
        components: [
          { name: 'ColorHandle', platforms: { web: { rsp: { status: 'available', page: 'shared' } } } },
          { name: 'ColorLoupe', platforms: { web: { rsp: { status: 'deprecated', page: 'shared' } } } },
        ],
      };
      expect(statusForPath('/web/rsp/components/shared', disagreeing)).to.equal(null);
    });

    it('prefers a component own slug over another component page override', () => {
      const colliding = {
        components: [
          { name: 'Calendar', platforms: { web: { rsp: { status: 'experimental' } } } },
          { name: 'DatePicker', platforms: { web: { rsp: { status: 'deprecated', page: 'calendar' } } } },
        ],
      };
      expect(statusForPath('/web/rsp/components/calendar', colliding)).to.equal('experimental');
    });

    it('returns null when an implementation entry carries no status', () => {
      const noStatus = {
        components: [{ name: 'Accordion', platforms: { web: { rsp: {} } } }],
      };
      expect(statusForPath('/web/rsp/components/accordion', noStatus)).to.equal(null);
    });
  });
});
