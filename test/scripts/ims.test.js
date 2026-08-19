import { expect } from '@esm-bundle/chai';
import { readHintExpiry, dueForRefresh } from '../../scripts/utils/ims.js';

// The readable companion cookie (spectrum_session_active) is the client's only
// reliable signal that the HttpOnly spectrum_session cookie exists. These cover
// the self-healing decision: when the real cookie is gone the companion is gone
// too, so dueForRefresh() must return true and setSession() re-mints.

const HINT = 'spectrum_session_active';
const ONE_HOUR = 60 * 60 * 1000;

const setHint = (value) => { document.cookie = `${HINT}=${value}; path=/`; };
const clearHint = () => { document.cookie = `${HINT}=; path=/; max-age=0`; };

describe('ims.js session-hint cookie', () => {
  beforeEach(() => { clearHint(); });
  afterEach(() => { clearHint(); });

  describe('readHintExpiry', () => {
    it('returns null when no companion cookie is set', () => {
      expect(readHintExpiry()).to.be.null;
    });

    it('returns the numeric expiry when the companion cookie is present', () => {
      const expiresAt = Date.now() + ONE_HOUR;
      setHint(expiresAt);
      expect(readHintExpiry()).to.equal(expiresAt);
    });

    it('returns null when the companion cookie value is not numeric', () => {
      setHint('not-a-number');
      expect(readHintExpiry()).to.be.null;
    });
  });

  describe('dueForRefresh', () => {
    it('is due when there is no companion cookie (nothing to lose by minting)', () => {
      expect(dueForRefresh()).to.be.true;
    });

    it('is not due when the session cookie is comfortably in the future', () => {
      setHint(Date.now() + 2 * ONE_HOUR);
      expect(dueForRefresh()).to.be.false;
    });

    it('is due once inside the one-hour refresh window', () => {
      setHint(Date.now() + ONE_HOUR / 2);
      expect(dueForRefresh()).to.be.true;
    });
  });
});
