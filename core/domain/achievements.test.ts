import {
  ACHIEVEMENTS,
  achievementById,
  achievementIdsForProgress,
  defaultDisplayNameFromEmail,
} from './achievements';

describe('profile achievements', () => {
  it('unlocks each sighting milestone at its exact threshold', () => {
    expect(
      achievementIdsForProgress({
        hasProfilePhoto: false,
        isOrWasPresident: false,
        sightingCount: 0,
      }),
    ).toEqual([]);
    expect(
      achievementIdsForProgress({
        hasProfilePhoto: true,
        isOrWasPresident: true,
        sightingCount: 100,
      }),
    ).toEqual([
      'profile-photo',
      'president',
      'first-sighting',
      'ten-sightings',
      'hundred-sightings',
    ]);
  });

  it('defines the requested titles and a safe legacy display-name fallback', () => {
    expect(achievementById('profile-photo')?.title).toBe('hot af');
    expect(achievementById('president')?.title).toBe('prez');
    expect(achievementById('first-sighting')?.title).toBe('cat lover');
    expect(achievementById('ten-sightings')?.title).toBe('cat collector');
    expect(achievementById('hundred-sightings')?.title).toBe('cat cutie');
    expect(ACHIEVEMENTS).toHaveLength(5);
    expect(defaultDisplayNameFromEmail('member@gatech.edu')).toBe('member');
  });
});
