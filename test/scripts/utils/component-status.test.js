import { expect } from '@esm-bundle/chai';
import { getComponentStatus } from '../../../scripts/utils/component-status.js';

describe('scripts/utils/component-status.js', () => {
  describe('getComponentStatus for rsp', () => {
    it('returns the package default status when the component is present', () => {
      const data = {
        package: { default_status: 'stable' },
        components: { button: true },
        overrides: {},
      };
      expect(getComponentStatus('button', 'rsp', data)).to.equal('stable');
    });

    it('returns null when the component is not in the manifest', () => {
      const data = {
        package: { default_status: 'stable' },
        components: { button: true },
        overrides: {},
      };
      expect(getComponentStatus('tree-view', 'rsp', data)).to.be.null;
    });

    it('returns the override status when one is defined for the component', () => {
      const data = {
        package: { default_status: 'stable' },
        components: { button: true },
        overrides: { button: 'caution' },
      };
      expect(getComponentStatus('button', 'rsp', data)).to.equal('caution');
    });
  });

  describe('getComponentStatus for swc', () => {
    const swcData = {
      generations: {
        first_gen: { default_status: 'stable' },
        second_gen: { default_status: 'beta' },
      },
      components: {
        button: { first_gen: true, second_gen: true },
        'action-button': { first_gen: true, second_gen: false },
        'tree-view': { first_gen: false, second_gen: false },
      },
      overrides: {},
    };

    it('prefers 2nd-gen status when the component ships in 2nd-gen', () => {
      expect(getComponentStatus('button', 'swc', swcData)).to.equal('beta');
    });

    it('falls back to 1st-gen status when only 1st-gen ships the component', () => {
      expect(getComponentStatus('action-button', 'swc', swcData)).to.equal('stable');
    });

    it('returns null when neither generation ships the component', () => {
      expect(getComponentStatus('tree-view', 'swc', swcData)).to.be.null;
    });

    it('returns null when the component is not in the manifest', () => {
      expect(getComponentStatus('not-a-component', 'swc', swcData)).to.be.null;
    });

    it('returns the override status when one is defined for the component', () => {
      const withOverride = { ...swcData, overrides: { button: 'caution' } };
      expect(getComponentStatus('button', 'swc', withOverride)).to.equal('caution');
    });
  });
});
