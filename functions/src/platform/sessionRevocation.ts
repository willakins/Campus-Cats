import { Firestore } from 'firebase-admin/firestore';

interface SessionAuth {
  revokeRefreshTokens(uid: string): Promise<void>;
  getUser(uid: string): Promise<{ tokensValidAfterTime?: string }>;
}

// Persist Firebase's cutoff for direct Firestore/Storage requests as well as
// callable verification. Never remove or move this value backwards on unban.
export async function revokeMemberSessions(
  firestore: Firestore,
  auth: SessionAuth,
  uid: string,
): Promise<void> {
  await auth.revokeRefreshTokens(uid);
  const account = await auth.getUser(uid);
  const cutoff = Math.floor(
    Date.parse(account.tokensValidAfterTime ?? '') / 1000,
  );
  if (!Number.isFinite(cutoff))
    throw new Error('Firebase session cutoff is unavailable');
  const reference = firestore.collection('users').doc(uid);
  await firestore.runTransaction(async (transaction) => {
    const snapshot = await transaction.get(reference);
    if (!snapshot.exists) throw new Error('Member no longer exists');
    const previous = snapshot.data()?.sessionRevokedAt;
    if (
      previous !== undefined &&
      (!Number.isSafeInteger(previous) || previous < 0)
    ) {
      throw new Error('Stored session cutoff is invalid');
    }
    transaction.update(reference, {
      sessionRevokedAt: Math.max(previous ?? 0, cutoff),
    });
  });
}
