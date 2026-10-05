import type { LiveMemberAccess } from './readGateway';
import { clubAccessAllowed } from '../shared/clubAccess';

export interface FirebaseAuthorizationDependencies {
  projectId: string;
  termsVersion: string;
  now: () => Date;
  getAuthUser: (uid: string) => Promise<{ disabled: boolean } | undefined>;
  getMember: (uid: string) => Promise<Record<string, unknown> | undefined>;
  getClub: (id: string) => Promise<Record<string, unknown> | undefined>;
}

export function createFirebaseAuthorizer(
  dependencies: FirebaseAuthorizationDependencies,
) {
  return async (uid: string): Promise<LiveMemberAccess | undefined> => {
    const [authUser, member] = await Promise.all([
      dependencies.getAuthUser(uid),
      dependencies.getMember(uid),
    ]);
    if (
      !authUser ||
      !member ||
      member.deletionPending === true ||
      typeof member.clubId !== 'string' ||
      !member.clubId ||
      typeof member.role !== 'number' ||
      !Number.isInteger(member.role) ||
      member.role < 0 ||
      member.role > 4 ||
      member.agreedToTerms !== true ||
      member.termsVersion !== dependencies.termsVersion
    )
      return undefined;
    const club = await dependencies.getClub(member.clubId);
    if (!club) return undefined;
    const enabled = clubAccessAllowed(club, dependencies.now());
    return {
      clubId: member.clubId,
      firebaseProjectId: dependencies.projectId,
      role: member.role,
      banned: member.banned === true,
      authDisabled: authUser.disabled,
      clubAccessEnabled: enabled,
    };
  };
}
