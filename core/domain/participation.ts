import { z } from 'zod';

import { Role, hasMinimumRole } from './roles';

export const participationAudienceSchema = z
  .enum(['all_members', 'officers_only'])
  .default('all_members');

export type ParticipationAudience = z.infer<
  typeof participationAudienceSchema
>;

export const canParticipate = (
  role: Role,
  audience: ParticipationAudience,
): boolean =>
  audience === 'all_members' || hasMinimumRole(role, Role.Officer);
