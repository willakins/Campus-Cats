import { Functions } from 'firebase/functions';

import { FirebaseCallableEffects } from './FirebaseCallableEffects';

const mockCallable = jest.fn();

jest.mock('firebase/functions', () => ({
  httpsCallable: (_functions: unknown, name: string) => (data: unknown) =>
    mockCallable(name, data),
}));

describe('FirebaseCallableEffects profile workflows', () => {
  beforeEach(() => {
    mockCallable.mockReset();
    mockCallable.mockResolvedValue({ data: {} });
  });

  it('synchronizes the current or requested public profile', async () => {
    const effects = new FirebaseCallableEffects({} as Functions);

    await effects.syncPublicProfile();
    await effects.syncPublicProfile('member-2');

    expect(mockCallable.mock.calls).toEqual([
      ['syncPublicProfile', {}],
      ['syncPublicProfile', { userId: 'member-2' }],
    ]);
  });

  it('sends editable profile fields and title choices through callables', async () => {
    const effects = new FirebaseCallableEffects({} as Functions);
    const profile = {
      displayName: 'Cat Watcher',
      bio: 'Tech Tower cat fan',
      profilePhotoUrl: 'https://firebasestorage.googleapis.com/photo.jpg',
    };

    await effects.updatePublicProfile(profile);
    await effects.selectProfileTitle('first-sighting');
    await effects.selectProfileTitle('');

    expect(mockCallable.mock.calls).toEqual([
      ['updatePublicProfile', profile],
      ['selectProfileTitle', { achievementId: 'first-sighting' }],
      ['selectProfileTitle', { achievementId: '' }],
    ]);
  });
});
