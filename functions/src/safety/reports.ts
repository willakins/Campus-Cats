import { createHash } from 'node:crypto';
import { FieldPath, Firestore, Transaction } from 'firebase-admin/firestore';
import { HttpsError } from 'firebase-functions/v2/https';

export interface SafetyActor {
  uid: string;
  authTime: number;
  email: string;
}

export type SafetyStatus = 'open' | 'reviewing' | 'closed';

function input(value: unknown, keys: string[]): Record<string, unknown> {
  if (
    !value ||
    typeof value !== 'object' ||
    Array.isArray(value) ||
    Object.keys(value).some((key) => !keys.includes(key))
  ) {
    throw new HttpsError('invalid-argument', 'Invalid report fields');
  }
  return value as Record<string, unknown>;
}

function text(
  value: unknown,
  name: string,
  max: number,
  optional = false,
): string {
  if (optional && value === undefined) return '';
  if (
    typeof value !== 'string' ||
    value.length > max ||
    (!optional && !value.trim())
  ) {
    throw new HttpsError(
      'invalid-argument',
      `Check ${name} (maximum ${max} characters)`,
    );
  }
  return value.trim();
}

function identifier(value: unknown): string {
  if (typeof value !== 'string' || !/^[A-Za-z0-9_-]{1,128}$/.test(value)) {
    throw new HttpsError('invalid-argument', 'Invalid identifier');
  }
  return value;
}

function status(value: unknown): SafetyStatus {
  if (value !== 'open' && value !== 'reviewing' && value !== 'closed') {
    throw new HttpsError('invalid-argument', 'Choose a report status');
  }
  return value;
}

// Use only after verifying the ID token, including revocation, at the callable boundary.
export class SafetyReports {
  constructor(
    private readonly db: Firestore,
    private readonly now = Date.now,
  ) {}

  private async authorize(
    transaction: Transaction,
    actor: SafetyActor,
    admin = false,
  ) {
    const member = (
      await transaction.get(this.db.doc(`users/${actor.uid}`))
    ).data();
    const cutoff = member?.sessionRevokedAt;
    if (
      !member ||
      member.banned === true ||
      member.deletionPending === true ||
      !Number.isSafeInteger(actor.authTime) ||
      (cutoff !== undefined &&
        (!Number.isSafeInteger(cutoff) || actor.authTime <= cutoff)) ||
      (admin && member.platformAdmin !== true)
    ) {
      throw new HttpsError(
        'permission-denied',
        admin
          ? 'Current platform administrator access is required'
          : 'Use the safety contact email if your account cannot submit a report',
      );
    }
    // Reporting remains available without a paid subscription, chat access, or new terms consent.
    return member;
  }

  async submit(actor: SafetyActor, value: unknown) {
    const data = input(value, ['requestId', 'description', 'contentReference']);
    const requestId = identifier(data.requestId);
    const description = text(data.description, 'description', 3000);
    const contentReference = text(
      data.contentReference,
      'content reference',
      500,
      true,
    );
    const id = createHash('sha256')
      .update(`${actor.uid}:${requestId}`)
      .digest('hex');
    const reference = this.db.doc(`safety-reports/${id}`);
    const rate = this.db.doc(`safety-report-limits/${actor.uid}`);
    await this.db.runTransaction(async (transaction) => {
      const member = await this.authorize(transaction, actor);
      const existing = await transaction.get(reference);
      if (existing.exists) {
        if (
          existing.data()?.description !== description ||
          existing.data()?.contentReference !== contentReference
        ) {
          throw new HttpsError(
            'already-exists',
            'This submission has already been received. Start a new report for different details.',
          );
        }
        return; // A retry never creates a second report or consumes another quota slot.
      }
      const previous = (await transaction.get(rate)).data();
      const now = this.now();
      const inWindow = previous && previous.windowStart > now - 60 * 60 * 1000;
      const count = inWindow ? previous.count : 0;
      if (count >= 5) {
        throw new HttpsError(
          'resource-exhausted',
          'Please wait before sending another report, or use the safety contact email.',
        );
      }
      transaction.set(rate, {
        windowStart: inWindow ? previous.windowStart : now,
        count: count + 1,
      });
      transaction.create(reference, {
        id,
        description,
        contentReference,
        reporterId: actor.uid,
        reporterEmail: actor.email,
        clubId: typeof member.clubId === 'string' ? member.clubId : '',
        createdAtMs: now,
        updatedAtMs: now,
        status: 'open',
        revision: 0,
        lastNote: '',
        notificationState: 'pending',
      });
    });
    return { id };
  }

  async list(actor: SafetyActor, value: unknown) {
    const data = input(value, ['cursor', 'status']);
    const filter = data.status === undefined ? undefined : status(data.status);
    let query = this.db
      .collection('safety-reports')
      .orderBy('createdAtMs', 'desc')
      .orderBy(FieldPath.documentId(), 'desc');
    if (filter) query = query.where('status', '==', filter);
    if (data.cursor !== undefined) {
      const cursor = input(data.cursor, ['id', 'createdAtMs']);
      const id = identifier(cursor.id);
      if (
        !Number.isSafeInteger(cursor.createdAtMs) ||
        (cursor.createdAtMs as number) < 0
      ) {
        throw new HttpsError('invalid-argument', 'Invalid page cursor');
      }
      query = query.startAfter(cursor.createdAtMs, id);
    }
    return this.db.runTransaction(async (transaction) => {
      await this.authorize(transaction, actor, true);
      const page = await transaction.get(query.limit(26));
      const reports = page.docs.slice(0, 25).map((document) => document.data());
      const last = reports[reports.length - 1];
      return {
        reports,
        nextCursor:
          page.size > 25
            ? { id: last.id, createdAtMs: last.createdAtMs }
            : null,
      };
    });
  }

  async update(actor: SafetyActor, value: unknown) {
    const data = input(value, ['id', 'revision', 'status', 'note']);
    const id = identifier(data.id);
    const nextStatus = status(data.status);
    const note = text(data.note, 'case note', 2000);
    if (!Number.isSafeInteger(data.revision) || (data.revision as number) < 0) {
      throw new HttpsError('invalid-argument', 'Invalid report revision');
    }
    return this.db.runTransaction(async (transaction) => {
      await this.authorize(transaction, actor, true);
      const reference = this.db.doc(`safety-reports/${id}`);
      const existing = (await transaction.get(reference)).data();
      if (!existing) throw new HttpsError('not-found', 'Report not found');
      if (existing.revision !== data.revision) {
        throw new HttpsError(
          'failed-precondition',
          'Another administrator changed this report. Refresh before saving.',
        );
      }
      const change = {
        status: nextStatus,
        lastNote: note,
        updatedAtMs: this.now(),
        updatedById: actor.uid,
        revision: existing.revision + 1,
      };
      transaction.update(reference, change);
      transaction.create(reference.collection('history').doc(), {
        ...change,
        action: 'review',
      });
      return { ...existing, ...change };
    });
  }

  async moderate(actor: SafetyActor, value: unknown) {
    const data = input(value, ['id', 'action', 'targetId', 'clubId', 'note']);
    const id = identifier(data.id);
    const targetId = identifier(data.targetId);
    const note = text(data.note, 'reason', 2000);
    const action = data.action;
    if (action !== 'remove-chat' && action !== 'restrict-account') {
      throw new HttpsError('invalid-argument', 'Invalid safety action');
    }
    const clubId =
      action === 'remove-chat' ? identifier(data.clubId) : undefined;
    await this.db.runTransaction(async (transaction) => {
      await this.authorize(transaction, actor, true);
      const report = this.db.doc(`safety-reports/${id}`);
      if (!(await transaction.get(report)).exists)
        throw new HttpsError('not-found', 'Report not found');
      const target = this.db.doc(
        action === 'remove-chat'
          ? `clubs/${clubId}/chat-messages/${targetId}`
          : `users/${targetId}`,
      );
      const record = (await transaction.get(target)).data();
      if (!record) throw new HttpsError('not-found', 'Target not found');
      if (action === 'restrict-account') {
        if (targetId === actor.uid || record.platformAdmin === true) {
          throw new HttpsError(
            'failed-precondition',
            'Platform administrator accounts require a separate administrator response',
          );
        }
        // Rules and live callable authorization immediately reject banned accounts.
        transaction.update(target, { banned: true });
      } else {
        // Remove the body while keeping day grouping and references valid. Reactions contain no media.
        transaction.update(target, {
          body: '[Removed by Campus Cats safety team]',
          isClubPing: false,
          removedAtMs: this.now(),
        });
      }
      transaction.create(report.collection('history').doc(), {
        action,
        targetId,
        ...(clubId ? { clubId } : {}),
        note,
        updatedById: actor.uid,
        updatedAtMs: this.now(),
      });
    });
    return { applied: true };
  }
}
