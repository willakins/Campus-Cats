import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { Auth, UserRecord } from 'firebase-admin/auth';
import { Firestore } from 'firebase-admin/firestore';

import {
  ClubProvisioningRequest,
  ClubProvisioningService,
  clubIdForUniversity,
} from './clubProvisioning';

type DocumentData = Record<string, unknown>;

class FakeDocumentSnapshot {
  readonly id: string;
  readonly exists: boolean;

  constructor(
    readonly ref: FakeDocumentReference,
    private readonly value: DocumentData | undefined,
  ) {
    this.id = ref.id;
    this.exists = value !== undefined;
  }

  data(): DocumentData | undefined {
    return this.value;
  }
}

class FakeDocumentReference {
  readonly id: string;

  constructor(readonly firestore: FakeFirestore, readonly path: string) {
    this.id = path.split('/').at(-1)!;
  }

  collection(path: string): FakeCollectionReference {
    return new FakeCollectionReference(this.firestore, `${this.path}/${path}`);
  }

  async get(): Promise<FakeDocumentSnapshot> {
    return this.firestore.snapshot(this);
  }

  async set(data: DocumentData, options?: { readonly merge?: boolean }): Promise<void> {
    this.firestore.write(this, data, options?.merge === true);
  }
}

class FakeQuery {
  constructor(
    readonly firestore: FakeFirestore,
    readonly collectionPath: string,
    readonly filters: readonly { readonly field: string; readonly value: unknown }[],
  ) {}

  where(field: string, _operator: string, value: unknown): FakeQuery {
    return new FakeQuery(this.firestore, this.collectionPath, [
      ...this.filters,
      { field, value },
    ]);
  }

  async get(): Promise<{ readonly docs: readonly FakeDocumentSnapshot[] }> {
    return this.firestore.query(this);
  }
}

class FakeCollectionReference extends FakeQuery {
  constructor(firestore: FakeFirestore, readonly path: string) {
    super(firestore, path, []);
  }

  doc(id: string): FakeDocumentReference {
    return new FakeDocumentReference(this.firestore, `${this.path}/${id}`);
  }
}

class FakeTransaction {
  constructor(private readonly firestore: FakeFirestore) {}

  async get(target: FakeDocumentReference | FakeQuery): Promise<unknown> {
    return target instanceof FakeDocumentReference
      ? this.firestore.snapshot(target)
      : this.firestore.query(target);
  }

  create(reference: FakeDocumentReference, data: DocumentData): void {
    if (this.firestore.read(reference.path)) {
      throw new Error(`Document ${reference.path} already exists`);
    }
    this.firestore.write(reference, data, false);
  }

  set(
    reference: FakeDocumentReference,
    data: DocumentData,
    options?: { readonly merge?: boolean },
  ): void {
    this.firestore.write(reference, data, options?.merge === true);
  }
}

class FakeFirestore {
  private readonly documents = new Map<string, DocumentData>();

  collection(path: string): FakeCollectionReference {
    return new FakeCollectionReference(this, path);
  }

  async runTransaction<T>(operation: (transaction: FakeTransaction) => Promise<T>): Promise<T> {
    return operation(new FakeTransaction(this));
  }

  read(path: string): DocumentData | undefined {
    return this.documents.get(path);
  }

  seed(path: string, data: DocumentData): void {
    this.documents.set(path, { ...data });
  }

  snapshot(reference: FakeDocumentReference): FakeDocumentSnapshot {
    return new FakeDocumentSnapshot(reference, this.read(reference.path));
  }

  query(query: FakeQuery): { readonly docs: readonly FakeDocumentSnapshot[] } {
    const prefix = `${query.collectionPath}/`;
    const docs = [...this.documents.entries()]
      .filter(([path]) => path.startsWith(prefix) && !path.slice(prefix.length).includes('/'))
      .filter(([, data]) => query.filters.every(({ field, value }) => data[field] === value))
      .map(([path, data]) => new FakeDocumentSnapshot(
        new FakeDocumentReference(this, path),
        data,
      ));
    return { docs };
  }

  write(reference: FakeDocumentReference, data: DocumentData, merge: boolean): void {
    this.documents.set(
      reference.path,
      merge ? { ...this.read(reference.path), ...data } : { ...data },
    );
  }
}

class FakeAuth {
  private readonly users = new Map<string, UserRecord>();
  private nextUser = 1;
  readonly deletedUsers: string[] = [];

  seed(email: string, uid: string): UserRecord {
    const user = { uid, email } as UserRecord;
    this.users.set(email, user);
    return user;
  }

  has(email: string): boolean {
    return this.users.has(email);
  }

  async getUserByEmail(email: string): Promise<UserRecord> {
    const user = this.users.get(email);
    if (!user) throw authError('auth/user-not-found');
    return user;
  }

  async createUser(properties: { readonly email?: string }): Promise<UserRecord> {
    const email = properties.email!;
    if (this.users.has(email)) throw authError('auth/email-already-exists');
    return this.seed(email, `user-${this.nextUser++}`);
  }

  async deleteUser(uid: string): Promise<void> {
    const existing = [...this.users.entries()].find(([, user]) => user.uid === uid);
    if (existing) this.users.delete(existing[0]);
    this.deletedUsers.push(uid);
  }

  async generatePasswordResetLink(email: string): Promise<string> {
    return `https://reset.example/${encodeURIComponent(email)}`;
  }
}

const authError = (code: string): Error & { readonly code: string } =>
  Object.assign(new Error(code), { code });

const request = (overrides: Partial<ClubProvisioningRequest> = {}): ClubProvisioningRequest => ({
  universityId: '139658',
  universityName: 'Emory University',
  clubName: 'Emory Campus Cats',
  timezone: 'America/New_York',
  presidentEmail: 'president@emory.edu',
  primaryColor: '#012169',
  accentColor: '#F2A900',
  ...overrides,
});

const buildService = (
  options: {
    readonly firestore?: FakeFirestore;
    readonly auth?: FakeAuth;
    readonly sendPasswordSetup?: (
      email: string,
      clubName: string,
      link: string,
    ) => Promise<void>;
  } = {},
) => {
  const firestore = options.firestore ?? new FakeFirestore();
  const auth = options.auth ?? new FakeAuth();
  const invitations: string[] = [];
  const service = new ClubProvisioningService({
    firestore: firestore as unknown as Firestore,
    auth: auth as unknown as Auth,
    webOrigin: () => 'https://campuscats.example',
    sendPasswordSetup: options.sendPasswordSetup ?? (async (email) => {
      invitations.push(email);
    }),
    now: () => new Date('2026-08-07T12:00:00.000Z'),
  });
  return { service, firestore, auth, invitations };
};

describe('club provisioning', () => {
  it('uses a stable club ID derived from the Scorecard institution', () => {
    assert.equal(clubIdForUniversity('139755'), 'club-139755');
    assert.throws(() => clubIdForUniversity('../campus-cats'));
  });

  it('creates the complete tenant, President, mapping, and invitation', async () => {
    const context = buildService();
    const result = await context.service.provision(request());

    assert.equal(result.clubId, 'club-139658');
    assert.equal(context.firestore.read('clubs/club-139658')?.accessState, 'pending_setup');
    assert.equal(
      context.firestore.read('billing-accounts/club-139658')?.collectionMethod,
      'manual',
    );
    assert.equal(
      context.firestore.read('university-clubs/139658')?.clubId,
      'club-139658',
    );
    assert.deepEqual(
      context.firestore.read('clubs/club-139658/app-settings/public'),
      {
        logoUrl: '',
        primaryColor: '#012169',
        accentColor: '#F2A900',
        sightingsAnonymous: true,
      },
    );
    assert.equal(
      context.firestore.read(`users/${result.presidentUserId}`)?.role,
      3,
    );
    assert.deepEqual(context.invitations, ['president@emory.edu']);
  });

  it('reuses an existing Auth user and rejects cross-club conflicts', async () => {
    const auth = new FakeAuth();
    auth.seed('president@emory.edu', 'existing-user');
    const reusable = buildService({ auth });
    const provisioned = await reusable.service.provision(request());
    assert.equal(provisioned.presidentUserId, 'existing-user');

    const conflictingFirestore = new FakeFirestore();
    conflictingFirestore.seed('users/existing-user', {
      email: 'president@emory.edu',
      clubId: 'campus-cats',
      role: 3,
    });
    const conflicting = buildService({ auth, firestore: conflictingFirestore });
    await assert.rejects(
      () => conflicting.service.provision(request()),
      /already belongs to another club/,
    );
  });

  it('rejects a different existing President and removes a newly created Auth user', async () => {
    const firestore = new FakeFirestore();
    firestore.seed('users/other-president', {
      email: 'other@emory.edu',
      clubId: 'club-139658',
      role: 3,
    });
    const context = buildService({ firestore });

    await assert.rejects(
      () => context.service.provision(request()),
      /already has a different President/,
    );
    assert.equal(context.auth.has('president@emory.edu'), false);
    assert.deepEqual(context.auth.deletedUsers, ['user-1']);
  });

  it('is retry-safe after both success and password-email failure', async () => {
    let failEmail = true;
    const context = buildService({
      sendPasswordSetup: async () => {
        if (failEmail) throw new Error('email unavailable');
      },
    });
    await assert.rejects(
      () => context.service.provision(request()),
      /email unavailable/,
    );
    assert.equal(context.auth.has('president@emory.edu'), true);
    assert.equal(
      context.firestore.read('university-clubs/139658')?.clubId,
      'club-139658',
    );

    failEmail = false;
    const retried = await context.service.provision(request());
    const repeated = await context.service.provision(request());
    assert.equal(retried.presidentUserId, repeated.presidentUserId);
    assert.equal(repeated.clubId, 'club-139658');
  });
});
