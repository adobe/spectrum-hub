import { expect } from '@esm-bundle/chai';

import '../../blocks/profile/profile.js';

const AVATAR = 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBTAA7';

async function mountProfile({ displayName, avatar, email } = {}) {
  const el = document.createElement('se-profile');
  document.body.append(el);
  if (displayName !== undefined) { el.displayName = displayName; }
  if (avatar !== undefined) { el.avatar = avatar; }
  if (email !== undefined) { el.email = email; }
  await el.updateComplete;
  return el;
}

describe('se-profile', () => {
  afterEach(() => {
    document.querySelectorAll('se-profile').forEach((el) => el.remove());
  });

  describe('signed out', () => {
    it('renders a Sign in button and no avatar button', async () => {
      const el = await mountProfile();
      const signIn = el.shadowRoot.querySelector('se-button');
      expect(signIn.textContent.trim()).to.equal('Sign in');
      expect(el.shadowRoot.querySelector('#avatar-button') === null).to.be.true;
    });
  });

  describe('signed in', () => {
    it('gives the avatar button a discernible accessible name', async () => {
      const el = await mountProfile({ displayName: 'Jane Doe', avatar: AVATAR, email: 'jane@example.com' });
      const button = el.shadowRoot.querySelector('#avatar-button');
      expect(button.getAttribute('aria-label')).to.equal('Account menu, Jane Doe');
    });

    it('marks the avatar button as a disclosure trigger for the account popover', async () => {
      const el = await mountProfile({ displayName: 'Jane Doe', avatar: AVATAR });
      const button = el.shadowRoot.querySelector('#avatar-button');
      expect(button.getAttribute('aria-haspopup')).to.equal('dialog');
      expect(button.getAttribute('popovertarget')).to.equal('se-profile-popover');
    });

    it('marks the avatar image as decorative so it does not duplicate the button label', async () => {
      const el = await mountProfile({ displayName: 'Jane Doe', avatar: AVATAR });
      const img = el.shadowRoot.querySelector('#avatar-button img');
      expect(img.getAttribute('alt')).to.equal('');
    });

    it('gives the popover profile image real alt text', async () => {
      const el = await mountProfile({ displayName: 'Jane Doe', avatar: AVATAR });
      const img = el.shadowRoot.querySelector('.se-profile-btn-details img');
      expect(img.getAttribute('alt')).to.equal('Profile photo');
    });

    it('renders the display name and email', async () => {
      const el = await mountProfile({ displayName: 'Jane Doe', avatar: AVATAR, email: 'jane@example.com' });
      expect(el.shadowRoot.querySelector('.se-profile-display-name').textContent).to.equal('Jane Doe');
      expect(el.shadowRoot.querySelector('.se-profile-email').textContent).to.equal('jane@example.com');
    });
  });
});
