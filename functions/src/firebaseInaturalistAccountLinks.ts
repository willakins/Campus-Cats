import {
  FieldValue,
  Firestore,
  Timestamp,
} from 'firebase-admin/firestore';

import { HandlerError } from './handlers';
import {
  InaturalistAccountLinkRepository,
  InaturalistLinkAttempt,
  InaturalistLinkIdentity,
} from './inaturalistAccountLinking';

const ATTEMPTS = 'inaturalist-link-attempts';
const ACCOUNT_LINKS = 'inaturalist-account-links';
const PUBLIC_LINKS = 'inaturalist-public-links';

export class FirebaseInaturalistAccountLinkRepository
  implements InaturalistAccountLinkRepository
{
  constructor(private readonly firestore: Firestore) {}

  async createAttempt(
    stateHash: string,
    attempt: InaturalistLinkAttempt,
  ): Promise<void> {
    const reference = this.firestore.collection(ATTEMPTS).doc(stateHash);
    const existingQuery = this.firestore
      .collection(ATTEMPTS)
      .where('firebaseUid', '==', attempt.firebaseUid);
    await this.firestore.runTransaction(async (transaction) => {
      const [existing, collision] = await Promise.all([
        transaction.get(existingQuery),
        transaction.get(reference),
      ]);
      if (collision.exists) {
        throw new HandlerError('already-exists', 'Please try linking again');
      }
      for (const document of existing.docs) {
        if (document.data().status === 'pending') {
          transaction.update(document.ref, { status: 'failed' });
        }
      }
      transaction.create(reference, serializeAttempt(attempt));
    });
  }

  async claimAttempt(
    stateHash: string,
    claimedAt: Date,
  ): Promise<InaturalistLinkAttempt | undefined> {
    const reference = this.firestore.collection(ATTEMPTS).doc(stateHash);
    return this.firestore.runTransaction(async (transaction) => {
      const snapshot = await transaction.get(reference);
      if (!snapshot.exists) return undefined;
      const attempt = deserializeAttempt(snapshot.data());
      if (
        !attempt ||
        attempt.status !== 'pending' ||
        attempt.expiresAt <= claimedAt
      ) {
        return undefined;
      }
      transaction.update(reference, {
        status: 'processing',
        claimedAt: Timestamp.fromDate(claimedAt),
      });
      return { ...attempt, status: 'processing' };
    });
  }

  async failAttempt(stateHash: string): Promise<void> {
    const reference = this.firestore.collection(ATTEMPTS).doc(stateHash);
    await this.firestore.runTransaction(async (transaction) => {
      const snapshot = await transaction.get(reference);
      if (!snapshot.exists || snapshot.data()?.status === 'succeeded') return;
      transaction.update(reference, { status: 'failed' });
    });
  }

  async completeAttempt(
    stateHash: string,
    identity: InaturalistLinkIdentity,
    completedAt: Date,
  ): Promise<void> {
    const attemptReference = this.firestore.collection(ATTEMPTS).doc(stateHash);
    await this.firestore.runTransaction(async (transaction) => {
      const attemptSnapshot = await transaction.get(attemptReference);
      const attempt = attemptSnapshot.exists
        ? deserializeAttempt(attemptSnapshot.data())
        : undefined;
      if (!attempt || attempt.status !== 'processing') {
        throw new HandlerError('failed-precondition', 'Link attempt is no longer valid');
      }
      const accountReference = this.firestore
        .collection(ACCOUNT_LINKS)
        .doc(attempt.firebaseUid);
      const targetPublicReference = this.tenantCollection(
        attempt.clubId,
        PUBLIC_LINKS,
      )
        .doc(String(identity.inaturalistUserId));
      const [accountSnapshot, targetPublicSnapshot] = await Promise.all([
        transaction.get(accountReference),
        transaction.get(targetPublicReference),
      ]);
      const targetOwner = targetPublicSnapshot.data()?.userId;
      if (
        typeof targetOwner === 'string' &&
        targetOwner !== attempt.firebaseUid
      ) {
        throw new HandlerError(
          'already-exists',
          'That iNaturalist account is already linked',
        );
      }
      const previousId = positiveInteger(accountSnapshot.data()?.inaturalistUserId);
      const previousPublicReference =
        previousId && previousId !== identity.inaturalistUserId
          ? this.tenantCollection(attempt.clubId, PUBLIC_LINKS).doc(String(previousId))
          : undefined;
      const previousPublicSnapshot = previousPublicReference
        ? await transaction.get(previousPublicReference)
        : undefined;
      const linkedAt =
        accountSnapshot.data()?.linkedAt instanceof Timestamp
          ? accountSnapshot.data()?.linkedAt
          : Timestamp.fromDate(completedAt);

      if (
        previousPublicReference &&
        previousPublicSnapshot?.data()?.userId === attempt.firebaseUid
      ) {
        transaction.delete(previousPublicReference);
      }
      transaction.set(accountReference, {
        clubId: attempt.clubId,
        inaturalistUserId: identity.inaturalistUserId,
        login: identity.login,
        linkedAt,
        verifiedAt: Timestamp.fromDate(completedAt),
      });
      transaction.set(targetPublicReference, {
        userId: attempt.firebaseUid,
        login: identity.login,
        linkedAt,
      });
      transaction.update(attemptReference, {
        status: 'succeeded',
        completedAt: Timestamp.fromDate(completedAt),
        codeVerifier: FieldValue.delete(),
      });
    });
  }

  async getAttempt(
    firebaseUid: string,
    attemptId: string,
  ): Promise<InaturalistLinkAttempt | undefined> {
    const snapshot = await this.firestore
      .collection(ATTEMPTS)
      .where('attemptId', '==', attemptId)
      .limit(1)
      .get();
    const attempt = snapshot.empty
      ? undefined
      : deserializeAttempt(snapshot.docs[0]?.data());
    return attempt?.firebaseUid === firebaseUid ? attempt : undefined;
  }

  async getLink(firebaseUid: string): Promise<InaturalistLinkIdentity | undefined> {
    const snapshot = await this.firestore
      .collection(ACCOUNT_LINKS)
      .doc(firebaseUid)
      .get();
    const id = positiveInteger(snapshot.data()?.inaturalistUserId);
    const login = snapshot.data()?.login;
    return id && typeof login === 'string' && login.trim()
      ? { inaturalistUserId: id, login: login.trim() }
      : undefined;
  }

  async unlink(firebaseUid: string): Promise<void> {
    const accountReference = this.firestore
      .collection(ACCOUNT_LINKS)
      .doc(firebaseUid);
    await this.firestore.runTransaction(async (transaction) => {
      const accountSnapshot = await transaction.get(accountReference);
      if (!accountSnapshot.exists) return;
      const id = positiveInteger(accountSnapshot.data()?.inaturalistUserId);
      const clubId = typeof accountSnapshot.data()?.clubId === 'string'
        ? accountSnapshot.data()!.clubId
        : 'campus-cats';
      const publicReference = id
        ? this.tenantCollection(clubId, PUBLIC_LINKS).doc(String(id))
        : undefined;
      const publicSnapshot = publicReference
        ? await transaction.get(publicReference)
        : undefined;
      if (publicReference && publicSnapshot?.data()?.userId === firebaseUid) {
        transaction.delete(publicReference);
      }
      transaction.delete(accountReference);
    });
  }

  private tenantCollection(clubId: string, name: string) {
    return this.firestore.collection('clubs').doc(clubId).collection(name);
  }
}

function serializeAttempt(attempt: InaturalistLinkAttempt) {
  return {
    firebaseUid: attempt.firebaseUid,
    clubId: attempt.clubId,
    attemptId: attempt.attemptId,
    codeVerifier: attempt.codeVerifier,
    createdAt: Timestamp.fromDate(attempt.createdAt),
    expiresAt: Timestamp.fromDate(attempt.expiresAt),
    status: attempt.status,
  };
}

function deserializeAttempt(data: Record<string, unknown> | undefined) {
  const createdAt = timestampDate(data?.createdAt);
  const expiresAt = timestampDate(data?.expiresAt);
  if (
    typeof data?.firebaseUid !== 'string' ||
    typeof data.clubId !== 'string' ||
    typeof data.attemptId !== 'string' ||
    typeof data.codeVerifier !== 'string' ||
    !createdAt ||
    !expiresAt ||
    !isAttemptStatus(data.status)
  ) {
    return undefined;
  }
  return {
    firebaseUid: data.firebaseUid,
    clubId: data.clubId,
    attemptId: data.attemptId,
    codeVerifier: data.codeVerifier,
    createdAt,
    expiresAt,
    status: data.status,
  } satisfies InaturalistLinkAttempt;
}

function isAttemptStatus(value: unknown): value is InaturalistLinkAttempt['status'] {
  return (
    value === 'pending' ||
    value === 'processing' ||
    value === 'succeeded' ||
    value === 'failed'
  );
}

function timestampDate(value: unknown): Date | undefined {
  return value instanceof Timestamp ? value.toDate() : undefined;
}

function positiveInteger(value: unknown): number | undefined {
  return typeof value === 'number' && Number.isInteger(value) && value > 0
    ? value
    : undefined;
}
