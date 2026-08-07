import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { Firestore } from 'firebase-admin/firestore';

import { HandlerError } from './handlers';
import {
  ClubSetupRequestRecord,
  FirebaseClubSetupRequestRepository,
} from './universityOnboarding';

type Data = Record<string, unknown>;

class FakeSnapshot {
  readonly exists: boolean;

  constructor(private readonly value: Data | undefined) {
    this.exists = value !== undefined;
  }

  data(): Data | undefined {
    return this.value;
  }
}

class FakeDocumentReference {
  constructor(readonly firestore: TransactionalFirestore, readonly path: string) {}

  async set(data: Data, options?: { readonly merge?: boolean }): Promise<void> {
    this.firestore.write(this.path, data, options?.merge === true);
  }
}

class FakeCollectionReference {
  constructor(
    private readonly firestore: TransactionalFirestore,
    private readonly path: string,
  ) {}

  doc(id: string): FakeDocumentReference {
    return new FakeDocumentReference(this.firestore, `${this.path}/${id}`);
  }
}

class FakeTransaction {
  constructor(private readonly firestore: TransactionalFirestore) {}

  async get(reference: FakeDocumentReference): Promise<FakeSnapshot> {
    return new FakeSnapshot(this.firestore.read(reference.path));
  }

  set(
    reference: FakeDocumentReference,
    data: Data,
    options?: { readonly merge?: boolean },
  ): void {
    this.firestore.write(reference.path, data, options?.merge === true);
  }

  update(reference: FakeDocumentReference, data: Data): void {
    if (!this.firestore.read(reference.path)) {
      throw new Error(`Document ${reference.path} does not exist`);
    }
    this.firestore.write(reference.path, data, true);
  }

  delete(reference: FakeDocumentReference): void {
    this.firestore.delete(reference.path);
  }
}

class TransactionalFirestore {
  private readonly documents = new Map<string, Data>();
  private transactionTail: Promise<void> = Promise.resolve();

  collection(path: string): FakeCollectionReference {
    return new FakeCollectionReference(this, path);
  }

  async runTransaction<T>(
    operation: (transaction: FakeTransaction) => Promise<T>,
  ): Promise<T> {
    const previous = this.transactionTail;
    let release: () => void = () => undefined;
    this.transactionTail = new Promise<void>((resolve) => {
      release = resolve;
    });
    await previous;
    try {
      return await operation(new FakeTransaction(this));
    } finally {
      release();
    }
  }

  read(path: string): Data | undefined {
    return this.documents.get(path);
  }

  write(path: string, data: Data, merge: boolean): void {
    this.documents.set(
      path,
      merge ? { ...this.documents.get(path), ...data } : { ...data },
    );
  }

  delete(path: string): void {
    this.documents.delete(path);
  }
}

const record = (
  id: string,
  universityId: string,
  now: Date,
  overrides: Partial<ClubSetupRequestRecord> = {},
): ClubSetupRequestRecord => ({
  id,
  universityId,
  universityName: `University ${universityId}`,
  clubName: `Club ${universityId}`,
  timezone: 'America/New_York',
  presidentEmail: `${id}@example.edu`,
  primaryColor: '#112233',
  accentColor: '#AABBCC',
  tokenHash: `token-${id}`,
  clientIpHash: `ip-${id}`,
  emailHash: `email-${id}`,
  expiresAt: new Date(now.getTime() + 24 * 60 * 60 * 1000),
  ...overrides,
});

const hasCode = (code: string) => (error: unknown): boolean =>
  error instanceof HandlerError && error.code === code;

describe('Firebase club setup request repository', () => {
  it('transactionally permits only one concurrent university claim', async () => {
    const now = new Date('2026-08-07T12:00:00.000Z');
    const firestore = new TransactionalFirestore();
    const repository = new FirebaseClubSetupRequestRepository(
      firestore as unknown as Firestore,
      () => now,
    );

    const results = await Promise.allSettled([
      repository.begin(record('first', '100', now)),
      repository.begin(record('second', '100', now)),
    ]);
    assert.equal(results.filter(({ status }) => status === 'fulfilled').length, 1);
    const rejected = results.find(({ status }) => status === 'rejected');
    assert(rejected?.status === 'rejected');
    assert(hasCode('already-exists')(rejected.reason));
  });

  it('releases expired claims and enforces IP and email throttles', async () => {
    let now = new Date('2026-08-07T12:00:00.000Z');
    const firestore = new TransactionalFirestore();
    const repository = new FirebaseClubSetupRequestRepository(
      firestore as unknown as Firestore,
      () => now,
    );
    await repository.begin(record('expiring', '101', now, {
      expiresAt: new Date(now.getTime() + 1000),
    }));
    now = new Date(now.getTime() + 1001);
    await repository.begin(record('replacement', '101', now));

    const ipRepository = new FirebaseClubSetupRequestRepository(
      new TransactionalFirestore() as unknown as Firestore,
      () => now,
    );
    for (let index = 0; index < 5; index += 1) {
      await ipRepository.begin(record(`ip-${index}`, String(200 + index), now, {
        clientIpHash: 'same-ip',
      }));
    }
    await assert.rejects(
      () => ipRepository.begin(record('ip-blocked', '299', now, {
        clientIpHash: 'same-ip',
      })),
      hasCode('failed-precondition'),
    );

    const emailRepository = new FirebaseClubSetupRequestRepository(
      new TransactionalFirestore() as unknown as Firestore,
      () => now,
    );
    for (let index = 0; index < 3; index += 1) {
      await emailRepository.begin(record(
        `email-${index}`,
        String(300 + index),
        now,
        { emailHash: 'same-email' },
      ));
    }
    await assert.rejects(
      () => emailRepository.begin(record('email-blocked', '399', now, {
        emailHash: 'same-email',
      })),
      hasCode('failed-precondition'),
    );
  });

  it('expires links, makes completed tokens single-use, and ignores stale failure', async () => {
    let now = new Date('2026-08-07T12:00:00.000Z');
    const firestore = new TransactionalFirestore();
    const repository = new FirebaseClubSetupRequestRepository(
      firestore as unknown as Firestore,
      () => now,
    );
    const expired = record('expired', '400', now, {
      expiresAt: new Date(now.getTime() + 1000),
    });
    await repository.begin(expired);
    now = new Date(now.getTime() + 1001);
    await assert.rejects(
      () => repository.loadForVerification(expired.id, expired.tokenHash),
      hasCode('failed-precondition'),
    );

    const active = record('active', '401', now);
    await repository.begin(active);
    await repository.loadForVerification(active.id, active.tokenHash);
    await repository.complete(active.id, 'club-401');
    await repository.fail(active.id);
    assert.equal(
      firestore.read('club-onboarding-requests/active')?.status,
      'completed',
    );
    await assert.rejects(
      () => repository.loadForVerification(active.id, active.tokenHash),
      (error: unknown) =>
        hasCode('failed-precondition')(error) &&
        error instanceof Error &&
        error.message.includes('already been used'),
    );
  });

  it('refuses completion after a later request acquires an expired claim', async () => {
    let now = new Date('2026-08-07T12:00:00.000Z');
    const firestore = new TransactionalFirestore();
    const repository = new FirebaseClubSetupRequestRepository(
      firestore as unknown as Firestore,
      () => now,
    );
    await repository.begin(record('old', '500', now, {
      expiresAt: new Date(now.getTime() + 1000),
    }));
    now = new Date(now.getTime() + 1001);
    await repository.begin(record('new', '500', now));

    await assert.rejects(
      () => repository.complete('old', 'club-500'),
      hasCode('failed-precondition'),
    );
    assert.equal(
      firestore.read('university-club-claims/500')?.requestId,
      'new',
    );
  });
});
