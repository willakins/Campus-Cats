import { Role } from './roles';
import {
  canParticipate,
  participationAudienceSchema,
} from './participation';

describe('participation audience', () => {
  it('allows everyone by default and cascades officer-only access', () => {
    expect(participationAudienceSchema.parse(undefined)).toBe('all_members');
    expect(canParticipate(Role.Member, 'all_members')).toBe(true);
    expect(canParticipate(Role.Member, 'officers_only')).toBe(false);

    for (const role of [
      Role.Officer,
      Role.VicePresident,
      Role.President,
      Role.Developer,
    ]) {
      expect(canParticipate(role, 'officers_only')).toBe(true);
    }
  });
});
