import { expect } from '@esm-bundle/chai';
import { getComponentStatus } from '../../../scripts/utils/component-status.js';

describe('scripts/utils/component-status.js', () => {
  describe('getComponentStatus', () => {
    it('returns the package default status when the component is present', () => {
      const data = {
        package: { default_status: 'stable' },
        components: { button: true },
        overrides: {},
      };
      expect(getComponentStatus('button', data)).to.equal('stable');
    });

    it('returns null when the component is not in the manifest', () => {
      const data = {
        package: { default_status: 'stable' },
        components: { button: true },
        overrides: {},
      };
      expect(getComponentStatus('tree-view', data)).to.be.null;
    });

    it('returns null when the component is in the manifest with a falsy value', () => {
      const data = {
        package: { default_status: 'beta' },
        components: { button: true, 'action-button': false },
        overrides: {},
      };
      expect(getComponentStatus('action-button', data)).to.be.null;
    });

    it('returns the override status when one is defined for the component', () => {
      const data = {
        package: { default_status: 'stable' },
        components: { button: true },
        overrides: { button: 'caution' },
      };
      expect(getComponentStatus('button', data)).to.equal('caution');
    });
  });
});
