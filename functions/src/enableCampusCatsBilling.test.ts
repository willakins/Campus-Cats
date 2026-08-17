import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { Firestore } from 'firebase-admin/firestore';

import { enableCampusCatsBilling } from './admin/enableCampusCatsBilling';

type Data = Record<string, unknown>;

class MemoryReference {
  constructor(
    readonly documents: Map<string, Data>,
    readonly path: string,
  ) {}

  collection(name: string) {
    return new MemoryCollection(this.documents, `${this.path}/${name}`);
  }
}

class MemoryCollection {
  constructor(
    readonly documents: Map<string, Data>,
    readonly path: string,
  ) {}

  doc(id: string) {
    return new MemoryReference(this.documents, `${this.path}/${id}`);
  }
}

class MemoryFirestore {
  readonly documents = new Map<string, Data>();

  collection(name: string) {
    return new MemoryCollection(this.documents, name);
  }

  async runTransaction<T>(
    operation: (transaction: {
      get(reference: MemoryReference): Promise<{
        readonly exists: boolean;
        data(): Data | undefined;
      }>;
      set(reference: MemoryReference, data: Data, options?: { merge: boolean }): void;
      create(reference: MemoryReference, data: Data): void;
    }) => Promise<T>,
  ): Promise<T> {
    return operation({
      get: async (reference) => ({
        exists: this.documents.has(reference.path),
        data: () => this.documents.get(reference.path),
      }),
      set: (reference, data, options) => {
        const previous = options?.merge ? this.documents.get(reference.path) ?? {} : {};
        this.documents.set(reference.path, { ...previous, ...data });
      },
      create: (reference, data) => {
        if (this.documents.has(reference.path)) throw new Error('already exists');
        this.documents.set(reference.path, data);
      },
    });
  }
}

const club = (overrides: Data = {}): Data => ({
  name: 'Campus Cats',
  timezone: 'America/New_York',
  billingEnforcementEnabled: false,
  maintenanceMode: false,
  accessState: 'enabled',
  paymentStanding: 'current',
  collectionMethod: 'manual',
  ...overrides,
});

describe('Campus Cats billing gate operation', () => {
  it('dry-runs without writing and applies pending setup to both access records', async () => {
    const database = new MemoryFirestore();
    database.documents.set('clubs/campus-cats', { universityId: '139755' });
    database.documents.set('clubs/campus-cats/access/public', {
      accessState: 'enabled',
      scheduledEndAt: '2026-09-01T00:00:00.000Z',
    });

    assert.equal(
      await enableCampusCatsBilling(database as unknown as Firestore, false),
      'pending_setup',
    );
    assert.equal(database.documents.has('billing-accounts/campus-cats'), false);

    assert.equal(
      await enableCampusCatsBilling(database as unknown as Firestore, true),
      'pending_setup',
    );
    assert.deepEqual(
      database.documents.get('clubs/campus-cats')?.accessState,
      'pending_setup',
    );
    assert.deepEqual(
      database.documents.get('clubs/campus-cats/access/public')?.accessState,
      'pending_setup',
    );
    assert.equal(
      database.documents.get('clubs/campus-cats')?.billingEnforcementEnabled,
      true,
    );
    assert.equal(
      database.documents.get('clubs/campus-cats')?.name,
      'Campus Cats',
    );
    assert.equal(
      database.documents.get('clubs/campus-cats/access/public')
        ?.billingEnforcementEnabled,
      true,
    );
    assert.equal(
      database.documents.get('clubs/campus-cats/access/public')?.scheduledEndAt,
      undefined,
    );
  });

  it('does not reactivate a suspended club that already has a subscription', async () => {
    const database = new MemoryFirestore();
    database.documents.set(
      'clubs/campus-cats',
      club({ accessState: 'suspended', paymentStanding: 'past_due' }),
    );
    database.documents.set('billing-accounts/campus-cats', {
      subscriptionId: 'sub_test',
      collectionMethod: 'manual',
    });

    assert.equal(
      await enableCampusCatsBilling(database as unknown as Firestore, true),
      'already_subscribed',
    );
    assert.equal(
      database.documents.get('clubs/campus-cats/access/public')?.accessState,
      'suspended',
    );
  });
});
