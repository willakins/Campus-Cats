import { Timestamp } from 'firebase-admin/firestore';
import { clubAccessAllowed } from './clubAccess';

export function firebaseClubAccessAllowed(
  club: Record<string, unknown> | undefined,
): boolean {
  return clubAccessAllowed(
    club && {
      ...club,
      graceEndsAt:
        club.graceEndsAt instanceof Timestamp
          ? club.graceEndsAt.toDate()
          : club.graceEndsAt,
      scheduledEndAt:
        club.scheduledEndAt instanceof Timestamp
          ? club.scheduledEndAt.toDate()
          : club.scheduledEndAt,
    },
    new Date(),
  );
}
