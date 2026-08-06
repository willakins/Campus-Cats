import { z } from 'zod';

export const achievementIdSchema = z.enum([
  'profile-photo',
  'president',
  'first-sighting',
  'ten-sightings',
  'hundred-sightings',
]);

export type AchievementId = z.infer<typeof achievementIdSchema>;

export interface AchievementDefinition {
  readonly id: AchievementId;
  readonly name: string;
  readonly description: string;
  readonly title: string;
}

export const ACHIEVEMENTS: readonly AchievementDefinition[] = Object.freeze([
  {
    id: 'profile-photo',
    name: 'Picture Purr-fect',
    description: 'Add a profile picture.',
    title: 'hot af',
  },
  {
    id: 'president',
    name: 'Presidential Service',
    description: 'Become president of Campus Cats.',
    title: 'prez',
  },
  {
    id: 'first-sighting',
    name: 'First Field Report',
    description: 'Report your first cat sighting.',
    title: 'cat lover',
  },
  {
    id: 'ten-sightings',
    name: 'Ten Cats Spotted',
    description: 'Report 10 cat sightings.',
    title: 'cat collector',
  },
  {
    id: 'hundred-sightings',
    name: 'Century of Sightings',
    description: 'Report 100 cat sightings.',
    title: 'cat cutie',
  },
]);

export const achievementById = (
  id: AchievementId | '',
): AchievementDefinition | undefined =>
  ACHIEVEMENTS.find((achievement) => achievement.id === id);

export const achievementIdsForProgress = ({
  hasProfilePhoto,
  isOrWasPresident,
  sightingCount,
}: {
  readonly hasProfilePhoto: boolean;
  readonly isOrWasPresident: boolean;
  readonly sightingCount: number;
}): readonly AchievementId[] => {
  const ids: AchievementId[] = [];
  if (hasProfilePhoto) ids.push('profile-photo');
  if (isOrWasPresident) ids.push('president');
  if (sightingCount >= 1) ids.push('first-sighting');
  if (sightingCount >= 10) ids.push('ten-sightings');
  if (sightingCount >= 100) ids.push('hundred-sightings');
  return ids;
};

export const defaultDisplayNameFromEmail = (email: string): string => {
  const localPart = email.split('@')[0]?.trim();
  return localPart || 'Campus Cats member';
};
