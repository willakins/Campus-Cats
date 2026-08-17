import type { ApplicationEffects } from '../../core/ports';
import {
  DevelopmentApplicationEffects,
  createApplicationEffectsGateway,
} from './DevelopmentApplicationEffects';

const delegate = (): jest.Mocked<ApplicationEffects> => ({
  notifyAnnouncement: jest.fn(),
  provisionWhitelistUser: jest.fn(),
  emailWhitelistCredentials: jest.fn(),
  removeProvisionedUser: jest.fn(),
  updateUserRole: jest.fn(),
  addDisciplinaryNotice: jest.fn(),
  setUserBanned: jest.fn(),
  transferPresidency: jest.fn(),
  removeUser: jest.fn(),
  syncPublicProfile: jest.fn(),
  updatePublicProfile: jest.fn(),
  selectProfileTitle: jest.fn(),
  migrateContributorPrivacy: jest.fn(),
  beginInaturalistAccountLink: jest.fn(),
  getInaturalistAccountLinkStatus: jest.fn(),
  unlinkInaturalistAccount: jest.fn(),
});

describe('Development application effects', () => {
  it('blocks outbound notification, user provisioning, and credential email callables', async () => {
    const firebase = delegate();
    const effects = new DevelopmentApplicationEffects(firebase);

    await expect(
      effects.notifyAnnouncement({ title: 'News', body: 'Update' }),
    ).rejects.toThrow('Outbound messaging is disabled in development');
    await expect(
      effects.provisionWhitelistUser({
        email: 'member@example.com',
        password: 'temporary-password',
      }),
    ).rejects.toThrow('Outbound messaging is disabled in development');
    await expect(
      effects.emailWhitelistCredentials({
        email: 'member@example.com',
        password: 'temporary-password',
      }),
    ).rejects.toThrow('Outbound messaging is disabled in development');
    expect(firebase.notifyAnnouncement).not.toHaveBeenCalled();
    expect(firebase.provisionWhitelistUser).not.toHaveBeenCalled();
    expect(firebase.emailWhitelistCredentials).not.toHaveBeenCalled();
  });

  it('keeps non-messaging development effects scoped to the development Firebase app', async () => {
    const firebase = delegate();
    firebase.updateUserRole.mockResolvedValue(undefined);
    const effects = new DevelopmentApplicationEffects(firebase);

    await effects.updateUserRole('member-1', 1);

    expect(firebase.updateUserRole).toHaveBeenCalledWith('member-1', 1);
  });

  it('is selected only for development builds', () => {
    const firebase = delegate();

    expect(
      createApplicationEffectsGateway(firebase, 'development'),
    ).toBeInstanceOf(DevelopmentApplicationEffects);
    expect(createApplicationEffectsGateway(firebase, 'production')).toBe(
      firebase,
    );
  });
});
