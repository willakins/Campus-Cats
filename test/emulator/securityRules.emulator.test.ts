import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import {
  RulesTestEnvironment,
  assertFails,
  assertSucceeds,
  initializeTestEnvironment,
} from '@firebase/rules-unit-testing';
import {
  FirebaseStorage,
  deleteObject,
  getMetadata,
  ref as firebaseStorageRef,
  uploadBytes,
} from 'firebase/storage';
import {
  Firestore,
  collection as firebaseCollection,
  deleteDoc,
  doc as firebaseDoc,
  getDoc,
  getDocs,
  orderBy,
  query,
  setDoc,
  Timestamp,
  updateDoc,
  where,
  writeBatch,
} from 'firebase/firestore';

import {
  FIREBASE_TEST_PROJECT_ID,
  assertDemoProjectId,
} from '../support/firebaseProject';

const CLUB_ID = 'campus-cats';
const GLOBAL_COLLECTIONS = new Set(['clubs', 'users']);
const tenantPath = (segments: readonly string[]) =>
  segments[0] === 'clubs' || GLOBAL_COLLECTIONS.has(segments[0] ?? '')
    ? segments
    : ['clubs', CLUB_ID, ...segments];
const doc = (firestore: unknown, ...segments: string[]) => {
  const [path, ...rest] = tenantPath(segments);
  if (!path) throw new Error('Document path is required');
  return firebaseDoc(firestore as Firestore, path, ...rest);
};
const collection = (firestore: unknown, ...segments: string[]) => {
  const [path, ...rest] = tenantPath(segments);
  if (!path) throw new Error('Collection path is required');
  return firebaseCollection(firestore as Firestore, path, ...rest);
};
const ref = (storage: unknown, path: string) =>
  firebaseStorageRef(
    storage as FirebaseStorage,
    path.startsWith('clubs/') ? path : `clubs/${CLUB_ID}/${path}`,
  );
const userSnapshot = (id: string, email: string, role: number) => ({
  id,
  email,
  role,
  clubId: CLUB_ID,
  platformAdmin: id === 'developer-1',
});

describe('Firebase authorization matrix', () => {
  let environment: RulesTestEnvironment;

  beforeAll(async () => {
    environment = await initializeTestEnvironment({
      projectId: assertDemoProjectId(FIREBASE_TEST_PROJECT_ID),
      firestore: {
        host: '127.0.0.1',
        port: 8080,
        rules: readFileSync(resolve(process.cwd(), 'firestore.rules'), 'utf8'),
      },
      storage: {
        host: '127.0.0.1',
        port: 9199,
        rules: readFileSync(resolve(process.cwd(), 'storage.rules'), 'utf8'),
      },
    });
  });

  beforeEach(async () => {
    await environment.clearFirestore();
    await environment.clearStorage();
    await environment.withSecurityRulesDisabled(async (context) => {
      const firestore = context.firestore();
      await Promise.all([
        setDoc(doc(firestore, 'clubs', CLUB_ID), {
          name: 'Campus Cats',
          timezone: 'America/New_York',
          billingEmail: 'billing@example.com',
          billingEnforcementEnabled: false,
          maintenanceMode: false,
          accessState: 'enabled',
          paymentStanding: 'current',
          collectionMethod: 'manual',
        }),
        setDoc(firebaseDoc(firestore, 'clubs', CLUB_ID, 'access', 'public'), {
          clubId: CLUB_ID,
          clubName: 'Campus Cats',
          timezone: 'America/New_York',
          billingEnforcementEnabled: false,
          maintenanceMode: false,
          accessState: 'enabled',
          paymentStanding: 'current',
          collectionMethod: 'manual',
        }),
        setDoc(doc(firestore, 'users', 'member-1'), {
          email: 'member@gatech.edu',
          role: 0,
          clubId: CLUB_ID,
          platformAdmin: false,
          banned: false,
        }),
        setDoc(doc(firestore, 'users', 'member-2'), {
          email: 'other@gatech.edu',
          role: 0,
          clubId: CLUB_ID,
          platformAdmin: false,
          banned: false,
        }),
        setDoc(doc(firestore, 'users', 'legacy-member-1'), {
          email: 'legacy-member@gatech.edu',
          role: 0,
          clubId: CLUB_ID,
          platformAdmin: false,
        }),
        setDoc(doc(firestore, 'users', 'banned-1'), {
          email: 'banned@gatech.edu',
          role: 0,
          clubId: CLUB_ID,
          platformAdmin: false,
          banned: true,
        }),
        setDoc(doc(firestore, 'users', 'admin-1'), {
          email: 'admin@gatech.edu',
          role: 1,
          clubId: CLUB_ID,
          platformAdmin: false,
          banned: false,
        }),
        setDoc(doc(firestore, 'users', 'super-1'), {
          email: 'super@gatech.edu',
          role: 2,
          clubId: CLUB_ID,
          platformAdmin: false,
          banned: false,
        }),
        setDoc(doc(firestore, 'users', 'president-1'), {
          email: 'president@gatech.edu',
          role: 3,
          clubId: CLUB_ID,
          platformAdmin: false,
          banned: false,
        }),
        setDoc(doc(firestore, 'users', 'developer-1'), {
          email: 'developer@gatech.edu',
          role: 4,
          clubId: CLUB_ID,
          platformAdmin: true,
          banned: false,
        }),
        setDoc(doc(firestore, 'public-profiles', 'member-1'), {
          displayName: 'Member One',
          bio: 'Campus cat watcher',
          profilePhotoUrl: '',
          role: 0,
          achievementIds: [],
          selectedTitleId: '',
          clubId: CLUB_ID,
        }),
        setDoc(doc(firestore, 'public-profiles', 'member-2'), {
          displayName: 'Member Two',
          bio: '',
          profilePhotoUrl: '',
          role: 0,
          achievementIds: ['first-sighting'],
          selectedTitleId: 'first-sighting',
          clubId: CLUB_ID,
        }),
        setDoc(doc(firestore, 'announcements', 'announcement-1'), {
          title: 'Update',
        }),
        setDoc(doc(firestore, 'inaturalist-observations', '1001'), {
          displayName: 'Goldie',
          visible: true,
          sourceActive: true,
        }),
        setDoc(doc(firestore, 'inaturalist-observations', '1002'), {
          displayName: 'Hidden cat',
          visible: false,
          sourceActive: true,
        }),
        setDoc(doc(firestore, 'inaturalist-guide-profiles', '2001'), {
          displayName: 'Goldie',
          visible: true,
          sourceActive: true,
        }),
        setDoc(doc(firestore, 'inaturalist-guide-profiles', '2002'), {
          displayName: 'Retired profile',
          visible: false,
          sourceActive: false,
        }),
        setDoc(doc(firestore, 'integration-state', 'inaturalist'), {
          running: false,
          lastStatus: 'success',
        }),
      ]);
    });
  });

  afterAll(async () => {
    await environment.cleanup();
  });

  it('allows anonymous users only to submit validated whitelist applications', async () => {
    const firestore = environment.unauthenticatedContext().firestore();
    await assertSucceeds(
      setDoc(doc(firestore, 'whitelist', 'application-1'), {
        name: 'Alex Applicant',
        graduationYear: '2025',
        email: 'alex@example.com',
        codeWord: '',
      }),
    );
    await assertFails(
      setDoc(doc(firestore, 'whitelist', 'invalid'), {
        name: '',
        graduationYear: '2025',
        email: 'not-an-email',
        codeWord: '',
      }),
    );
    await assertFails(
      getDoc(doc(firestore, 'announcements', 'announcement-1')),
    );
    await assertFails(
      setDoc(doc(firestore, 'contact-info', 'contact-1'), {
        name: 'Officer',
        email: 'officer@gatech.edu',
      }),
    );
    for (const collectionName of [
      'universities',
      'university-overrides',
      'university-clubs',
      'university-club-claims',
      'club-onboarding-requests',
      'club-onboarding-rate-limits',
    ]) {
      const protectedRecord = firebaseDoc(
        firestore,
        collectionName,
        'protected',
      );
      await assertFails(getDoc(protectedRecord));
      await assertFails(
        setDoc(protectedRecord, {
          tokenHash: 'must-not-be-client-writable',
        }),
      );
    }
  });

  it('isolates clubs and limits suspended members to identity and access state', async () => {
    await environment.withSecurityRulesDisabled(async (context) => {
      const firestore = context.firestore();
      await Promise.all([
        setDoc(firebaseDoc(firestore, 'clubs', 'other-club'), {
          name: 'Other Club',
          timezone: 'America/Chicago',
          billingEmail: 'billing@other.example',
          billingEnforcementEnabled: false,
          maintenanceMode: false,
          accessState: 'enabled',
          paymentStanding: 'current',
          collectionMethod: 'manual',
        }),
        setDoc(firebaseDoc(firestore, 'users', 'other-club-member'), {
          email: 'member@other.example',
          role: 0,
          clubId: 'other-club',
          platformAdmin: false,
          banned: false,
        }),
        setDoc(
          firebaseDoc(
            firestore,
            'clubs',
            'other-club',
            'announcements',
            'private-update',
          ),
          { title: 'Other club only' },
        ),
      ]);
    });
    const member = environment
      .authenticatedContext('member-1', {
        email: 'member@gatech.edu',
      })
      .firestore();
    await assertFails(
      getDoc(
        firebaseDoc(
          member,
          'clubs',
          'other-club',
          'announcements',
          'private-update',
        ),
      ),
    );

    await environment.withSecurityRulesDisabled(async (context) => {
      await updateDoc(firebaseDoc(context.firestore(), 'clubs', CLUB_ID), {
        billingEnforcementEnabled: true,
        accessState: 'suspended',
        suspensionReason: 'nonpayment',
      });
      await updateDoc(
        firebaseDoc(context.firestore(), 'clubs', CLUB_ID, 'access', 'public'),
        {
          billingEnforcementEnabled: true,
          accessState: 'suspended',
          suspensionReason: 'nonpayment',
        },
      );
    });
    await assertSucceeds(getDoc(firebaseDoc(member, 'users', 'member-1')));
    await assertFails(getDoc(firebaseDoc(member, 'clubs', CLUB_ID)));
    await assertSucceeds(
      getDoc(firebaseDoc(member, 'clubs', CLUB_ID, 'access', 'public')),
    );
    await assertFails(getDoc(doc(member, 'announcements', 'announcement-1')));
    await assertFails(getDoc(doc(member, 'public-profiles', 'member-1')));
    await assertFails(getDoc(firebaseDoc(member, 'billing-accounts', CLUB_ID)));
  });

  it('allows members to read content and mutate only their own sightings', async () => {
    const member = environment
      .authenticatedContext('member-1', {
        email: 'member@gatech.edu',
      })
      .firestore();
    const other = environment
      .authenticatedContext('member-2', {
        email: 'other@gatech.edu',
      })
      .firestore();
    const sighting = doc(member, 'cat-sightings', 'sighting-1');

    await assertSucceeds(
      getDoc(doc(member, 'announcements', 'announcement-1')),
    );
    const ownReadReceipt = doc(
      member,
      'announcement-read-receipts',
      'member-1__announcement-1',
    );
    await assertSucceeds(
      setDoc(ownReadReceipt, {
        userId: 'member-1',
        announcementId: 'announcement-1',
        readAt: Timestamp.fromDate(new Date('2026-08-21T12:00:00.000Z')),
      }),
    );
    await assertSucceeds(getDoc(ownReadReceipt));
    await assertSucceeds(
      getDocs(
        query(
          collection(member, 'announcement-read-receipts'),
          where('userId', '==', 'member-1'),
        ),
      ),
    );
    const otherReadReceipt = doc(
      other,
      'announcement-read-receipts',
      'member-2__announcement-1',
    );
    await assertSucceeds(
      setDoc(otherReadReceipt, {
        userId: 'member-2',
        announcementId: 'announcement-1',
        readAt: Timestamp.fromDate(new Date('2026-08-21T12:00:00.000Z')),
      }),
    );
    await assertFails(
      getDoc(
        doc(member, 'announcement-read-receipts', 'member-2__announcement-1'),
      ),
    );
    await assertFails(
      setDoc(
        doc(member, 'announcement-read-receipts', 'member-2__announcement-1'),
        {
          userId: 'member-2',
          announcementId: 'announcement-1',
          readAt: Timestamp.fromDate(new Date('2026-08-21T12:00:00.000Z')),
        },
      ),
    );
    const createSighting = writeBatch(member);
    createSighting.set(sighting, { name: 'Goldie' });
    createSighting.set(
      doc(member, 'content-contributors', 'sighting__sighting-1'),
      {
        kind: 'sighting',
        contentId: 'sighting-1',
        user: userSnapshot('member-1', 'member@gatech.edu', 0),
      },
    );
    await assertSucceeds(createSighting.commit());
    await assertSucceeds(updateDoc(sighting, { name: 'Goldie Cat' }));
    await assertFails(
      updateDoc(doc(other, 'cat-sightings', 'sighting-1'), { name: 'Stolen' }),
    );
    await assertFails(
      setDoc(doc(other, 'content-contributors', 'sighting__sighting-1'), {
        kind: 'sighting',
        contentId: 'sighting-1',
        user: userSnapshot('member-2', 'other@gatech.edu', 0),
      }),
    );
    await assertFails(
      setDoc(doc(other, 'content-contributors', 'sighting__orphaned'), {
        kind: 'sighting',
        contentId: 'orphaned',
        user: userSnapshot('member-2', 'other@gatech.edu', 0),
      }),
    );
    await assertFails(
      setDoc(doc(member, 'catalog', 'cat-1'), { name: 'Goldie' }),
    );
    await assertFails(deleteDoc(sighting));
    const deleteSighting = writeBatch(member);
    deleteSighting.delete(sighting);
    deleteSighting.delete(
      doc(member, 'content-contributors', 'sighting__sighting-1'),
    );
    await assertSucceeds(deleteSighting.commit());
  });

  it('keeps chat tenant-readable while reserving every mutation for callables', async () => {
    await environment.withSecurityRulesDisabled(async (context) => {
      const firestore = context.firestore();
      await Promise.all([
        setDoc(doc(firestore, 'chat-messages', 'message-1'), {
          body: 'Hello club',
          createdById: 'member-2',
          createdAt: Timestamp.fromDate(new Date('2026-08-27T15:00:00.000Z')),
          dayKey: '2026-08-27',
          isClubPing: false,
        }),
        setDoc(doc(firestore, 'chat-reactions', 'message-1__member-2'), {
          messageId: 'message-1',
          messageDayKey: '2026-08-27',
          userId: 'member-2',
          emoji: '👍',
          updatedAt: Timestamp.fromDate(new Date('2026-08-27T15:01:00.000Z')),
        }),
        setDoc(doc(firestore, 'chat-restrictions', 'member-1'), {
          chatBanned: false,
          mutedUntil: Timestamp.fromDate(new Date('2026-08-27T16:00:00.000Z')),
          updatedAt: Timestamp.fromDate(new Date('2026-08-27T15:00:00.000Z')),
          updatedById: 'admin-1',
        }),
        setDoc(doc(firestore, 'chat-restrictions', 'member-2'), {
          chatBanned: true,
          updatedAt: Timestamp.fromDate(new Date('2026-08-27T15:00:00.000Z')),
          updatedById: 'admin-1',
        }),
        setDoc(doc(firestore, 'chat-ping-reads', 'member-1'), {
          lastReadPingId: 'ping-1',
          lastReadPingAt: Timestamp.fromDate(new Date('2026-08-27T14:00:00.000Z')),
        }),
      ]);
    });
    const member = environment.authenticatedContext('member-1', {
      email: 'member@gatech.edu',
    }).firestore();
    const officer = environment.authenticatedContext('admin-1', {
      email: 'admin@gatech.edu',
    }).firestore();
    const banned = environment.authenticatedContext('banned-1', {
      email: 'banned@gatech.edu',
    }).firestore();

    await assertSucceeds(
      getDocs(
        query(
          collection(member, 'chat-messages'),
          where('dayKey', '==', '2026-08-27'),
          orderBy('createdAt', 'asc'),
        ),
      ),
    );
    await assertSucceeds(getDocs(collection(member, 'chat-reactions')));
    await assertFails(getDocs(collection(banned, 'chat-messages')));
    await assertFails(
      setDoc(doc(member, 'chat-messages', 'direct-message'), {
        body: 'Clients cannot write chat',
      }),
    );
    await assertFails(
      setDoc(doc(member, 'chat-reactions', 'message-1__member-1'), {
        emoji: '❤️',
      }),
    );
    await assertSucceeds(getDoc(doc(member, 'chat-restrictions', 'member-1')));
    await assertFails(getDoc(doc(member, 'chat-restrictions', 'member-2')));
    await assertSucceeds(getDoc(doc(officer, 'chat-restrictions', 'member-2')));
    await assertFails(
      updateDoc(doc(officer, 'chat-restrictions', 'member-2'), {
        chatBanned: false,
      }),
    );
    await assertSucceeds(getDoc(doc(member, 'chat-ping-reads', 'member-1')));
    await assertFails(getDoc(doc(member, 'chat-ping-reads', 'member-2')));
    await assertFails(
      updateDoc(doc(member, 'chat-ping-reads', 'member-1'), {
        lastReadPingId: 'ping-2',
      }),
    );
  });

  it('keeps legacy members without a banned field active', async () => {
    const legacyContext = environment.authenticatedContext('legacy-member-1', {
      email: 'legacy-member@gatech.edu',
    });
    const memberStorage = environment
      .authenticatedContext('member-1', {
        email: 'member@gatech.edu',
      })
      .storage();
    const image = ref(
      memberStorage,
      'cat-sightings/legacy-readable/profile.jpg',
    );

    await assertSucceeds(
      getDocs(collection(legacyContext.firestore(), 'cat-sightings')),
    );
    await assertSucceeds(
      uploadBytes(image, new Uint8Array([1]), {
        contentType: 'image/jpeg',
        customMetadata: { ownerId: 'member-1' },
      }),
    );
    await assertSucceeds(
      getMetadata(
        ref(
          legacyContext.storage(),
          'cat-sightings/legacy-readable/profile.jpg',
        ),
      ),
    );
  });

  it('lets President-level roles manage public settings and donations', async () => {
    const anonymous = environment.unauthenticatedContext().firestore();
    const president = environment
      .authenticatedContext('president-1', {
        email: 'president@gatech.edu',
      })
      .firestore();
    const officer = environment
      .authenticatedContext('admin-1', {
        email: 'admin@gatech.edu',
      })
      .firestore();
    const developer = environment
      .authenticatedContext('developer-1', {
        email: 'developer@gatech.edu',
      })
      .firestore();
    const member = environment
      .authenticatedContext('member-1', {
        email: 'member@gatech.edu',
      })
      .firestore();
    const settings = doc(president, 'app-settings', 'public');
    const value = {
      logoUrl: '',
      primaryColor: '#18314F',
      accentColor: '#B58A16',
      sightingsAnonymous: true,
      donationPage: {
        title: 'Help feed the colony',
        description: 'Support food and veterinary care.',
        images: [],
        method: 'external',
        externalUrl: 'https://give.example.org/campus-cats',
      },
    };

    await assertFails(setDoc(doc(officer, 'app-settings', 'public'), value));
    await assertSucceeds(setDoc(settings, value));
    await assertSucceeds(getDoc(doc(anonymous, 'app-settings', 'public')));
    await assertFails(
      updateDoc(doc(officer, 'app-settings', 'public'), {
        donationPage: {
          ...value.donationPage,
          description: 'An officer cannot publish this donation page.',
        },
      }),
    );
    await assertFails(
      updateDoc(doc(member, 'app-settings', 'public'), {
        donationPage: {
          ...value.donationPage,
          description: 'A member cannot publish this.',
        },
      }),
    );
    await assertFails(
      updateDoc(settings, {
        primaryColor: 'navy',
      }),
    );
    await assertSucceeds(
      updateDoc(settings, {
        primaryColor: '#0057B8',
        donationPage: {
          ...value.donationPage,
          description: 'The President can update this donation page.',
        },
      }),
    );
    await assertSucceeds(
      updateDoc(doc(developer, 'app-settings', 'public'), {
        donationPage: {
          ...value.donationPage,
          description: 'A Developer can update this donation page.',
        },
      }),
    );
    await assertFails(
      updateDoc(settings, {
        donationPage: { ...value.donationPage, method: 'direct' },
      }),
    );
    await assertFails(
      updateDoc(settings, {
        donationPage: {
          ...value.donationPage,
          images: [
            { id: 'one', url: 'https://example.org/cat-one.jpg' },
            { id: 'two', url: 'https://example.org/cat-two.jpg' },
          ],
        },
      }),
    );
    await assertFails(
      updateDoc(settings, {
        donationPage: {
          ...value.donationPage,
          externalUrl: 'http://give.example.org/campus-cats',
        },
      }),
    );
  });

  it('keeps contributor records officer-only while anonymity is enabled', async () => {
    const member = environment
      .authenticatedContext('member-1', {
        email: 'member@gatech.edu',
      })
      .firestore();
    const other = environment
      .authenticatedContext('member-2', {
        email: 'other@gatech.edu',
      })
      .firestore();
    const admin = environment
      .authenticatedContext('admin-1', {
        email: 'admin@gatech.edu',
      })
      .firestore();
    const president = environment
      .authenticatedContext('president-1', {
        email: 'president@gatech.edu',
      })
      .firestore();
    const contributor = doc(
      member,
      'content-contributors',
      'sighting__private-sighting',
    );
    const batch = writeBatch(member);
    batch.set(doc(member, 'cat-sightings', 'private-sighting'), {
      name: 'Goldie',
    });
    batch.set(contributor, {
      kind: 'sighting',
      contentId: 'private-sighting',
      user: userSnapshot('member-1', 'member@gatech.edu', 0),
    });
    await assertSucceeds(batch.commit());

    await assertSucceeds(getDoc(contributor));
    await assertSucceeds(
      getDoc(doc(admin, 'content-contributors', 'sighting__private-sighting')),
    );
    await assertFails(
      getDoc(doc(other, 'content-contributors', 'sighting__private-sighting')),
    );

    await assertSucceeds(
      setDoc(doc(president, 'app-settings', 'public'), {
        logoUrl: '',
        primaryColor: '#18314F',
        accentColor: '#B58A16',
        sightingsAnonymous: false,
      }),
    );
    await assertSucceeds(
      getDoc(doc(other, 'content-contributors', 'sighting__private-sighting')),
    );
  });

  it('keeps legacy sightings readable when public attribution is enabled', async () => {
    await environment.withSecurityRulesDisabled(async (context) => {
      const firestore = context.firestore();
      await Promise.all([
        setDoc(doc(firestore, 'cat-sightings', 'legacy-sighting'), {
          name: 'Legacy Goldie report',
          createdBy: {
            id: 'member-1',
            email: 'member@gatech.edu',
            role: 0,
          },
        }),
        setDoc(doc(firestore, 'catalog', 'legacy-catalog'), {
          name: 'Legacy Goldie profile',
          createdBy: {
            id: 'member-1',
            email: 'member@gatech.edu',
            role: 0,
          },
        }),
        setDoc(doc(firestore, 'app-settings', 'public'), {
          logoUrl: '',
          primaryColor: '#18314F',
          accentColor: '#B58A16',
          sightingsAnonymous: false,
        }),
      ]);
    });
    const member = environment
      .authenticatedContext('member-2', {
        email: 'other@gatech.edu',
      })
      .firestore();
    const president = environment
      .authenticatedContext('president-1', {
        email: 'president@gatech.edu',
      })
      .firestore();

    const legacySightings = await assertSucceeds(
      getDocs(collection(member, 'cat-sightings')),
    );
    const legacyCatalog = await assertSucceeds(
      getDocs(collection(member, 'catalog')),
    );
    expect(legacySightings.size).toBe(1);
    expect(legacyCatalog.size).toBe(1);
    await assertSucceeds(
      getDoc(doc(member, 'cat-sightings', 'legacy-sighting')),
    );
    await assertSucceeds(getDoc(doc(member, 'catalog', 'legacy-catalog')));

    await assertSucceeds(
      setDoc(doc(president, 'app-settings', 'public'), {
        logoUrl: '',
        primaryColor: '#18314F',
        accentColor: '#B58A16',
        sightingsAnonymous: true,
      }),
    );

    const memberAfterInitialization = environment
      .authenticatedContext('member-1', { email: 'member@gatech.edu' })
      .firestore();
    await assertFails(
      getDoc(
        doc(memberAfterInitialization, 'cat-sightings', 'legacy-sighting'),
      ),
    );
    await assertFails(
      getDoc(doc(memberAfterInitialization, 'catalog', 'legacy-catalog')),
    );
  });

  it('lets banned accounts read only their own status while denying app data and media', async () => {
    const bannedContext = environment.authenticatedContext('banned-1', {
      email: 'banned@gatech.edu',
    });
    const bannedFirestore = bannedContext.firestore();
    const bannedStorage = bannedContext.storage();

    const profile = await assertSucceeds(
      getDoc(doc(bannedFirestore, 'users', 'banned-1')),
    );
    expect(profile.data()?.banned).toBe(true);
    await assertFails(
      getDoc(doc(bannedFirestore, 'announcements', 'announcement-1')),
    );
    await assertFails(
      setDoc(doc(bannedFirestore, 'cat-sightings', 'banned-sighting'), {
        name: 'Blocked',
        createdBy: { id: 'banned-1' },
      }),
    );
    await assertFails(
      updateDoc(doc(bannedFirestore, 'users', 'banned-1'), {
        expoPushToken: 'ExponentPushToken[banned]',
      }),
    );
    await assertFails(
      uploadBytes(
        ref(bannedStorage, 'cat-sightings/banned-sighting/photo.jpg'),
        new Uint8Array([1]),
        { customMetadata: { ownerId: 'banned-1' } },
      ),
    );
  });

  it('lets members post comments while reserving deletion for officers', async () => {
    await environment.withSecurityRulesDisabled(async (context) => {
      const firestore = context.firestore();
      await Promise.all([
        setDoc(
          firebaseDoc(
            firestore,
            'clubs',
            CLUB_ID,
            'cat-sightings',
            'sighting-1',
          ),
          { name: 'Goldie' },
        ),
        setDoc(
          firebaseDoc(firestore, 'clubs', CLUB_ID, 'stations', 'station-1'),
          { name: 'Library station' },
        ),
        setDoc(
          firebaseDoc(
            firestore,
            'clubs',
            CLUB_ID,
            'inaturalist-observations',
            '321',
          ),
          { visible: true },
        ),
        setDoc(
          firebaseDoc(
            firestore,
            'clubs',
            CLUB_ID,
            'inaturalist-guide-profiles',
            '654',
          ),
          { visible: true },
        ),
      ]);
    });
    const member = environment
      .authenticatedContext('member-1', {
        email: 'member@gatech.edu',
      })
      .firestore();
    const other = environment
      .authenticatedContext('member-2', {
        email: 'other@gatech.edu',
      })
      .firestore();
    const admin = environment
      .authenticatedContext('admin-1', {
        email: 'admin@gatech.edu',
      })
      .firestore();
    const banned = environment
      .authenticatedContext('banned-1', {
        email: 'banned@gatech.edu',
      })
      .firestore();
    const now = Timestamp.fromDate(new Date('2026-08-20T15:30:00.000Z'));
    const comment = doc(member, 'sighting-comments', 'comment-1');
    const data = {
      target: {
        kind: 'sighting',
        id: 'sighting-1',
        documentId: 'sighting-1',
      },
      targetKey: 'sighting:sighting-1',
      body: 'I saw this cat yesterday!',
      createdAt: now,
      createdById: 'member-1',
    };
    const importedSourceComment = {
      schemaVersion: 1,
      source: 'inaturalist',
      target: {
        kind: 'sighting',
        id: 'inat-observation-321',
        documentId: '321',
      },
      targetKey: 'sighting:inat-observation-321',
      body: 'Pretty sure this is Charles!',
      createdAt: now,
      sourceUpdatedAt: now,
      sourceCommentId: 22894482,
      sourceCommentUuid: 'e221e4fd-b34c-43ec-b21a-e36c1ba327d7',
      sourceUrl:
        'https://www.inaturalist.org/observations/321#comment-22894482',
      externalAuthor: {
        id: 8358607,
        login: 'chipmunkt',
        displayName: 'Chip Munk',
        sourceUrl: 'https://www.inaturalist.org/people/chipmunkt',
      },
      lastSeenRunId: 'run-1',
    };

    await environment.withSecurityRulesDisabled(async (context) => {
      await setDoc(
        doc(
          context.firestore(),
          'sighting-comments',
          'inat-comment-source-uuid',
        ),
        importedSourceComment,
      );
    });

    await assertSucceeds(setDoc(comment, data));
    await assertSucceeds(
      setDoc(doc(member, 'sighting-comments', 'imported-sighting-comment'), {
        ...data,
        target: {
          kind: 'sighting',
          id: 'inat-observation-321',
          documentId: '321',
        },
        targetKey: 'sighting:inat-observation-321',
      }),
    );
    await assertSucceeds(
      setDoc(doc(member, 'catalog-comments', 'imported-catalog-comment'), {
        ...data,
        target: {
          kind: 'catalog',
          id: 'inat-guide-654',
          documentId: '654',
        },
        targetKey: 'catalog:inat-guide-654',
      }),
    );
    const thread = await assertSucceeds(
      getDocs(
        query(
          collection(other, 'sighting-comments'),
          where('targetKey', '==', 'sighting:sighting-1'),
        ),
      ),
    );
    expect(thread.docs.map(({ id }) => id)).toEqual(['comment-1']);
    await assertSucceeds(
      getDocs(
        query(
          collection(member, 'sighting-comments'),
          where('targetKey', '==', 'sighting:inat-observation-321'),
        ),
      ),
    );
    await assertFails(
      setDoc(doc(member, 'sighting-comments', 'spoofed-import'), {
        ...importedSourceComment,
        sourceCommentId: 22894483,
      }),
    );

    await assertFails(
      setDoc(doc(member, 'sighting-comments', 'spoofed-comment'), {
        ...data,
        createdById: 'member-2',
      }),
    );
    await assertFails(
      setDoc(doc(member, 'sighting-comments', 'too-long-comment'), {
        ...data,
        body: 'x'.repeat(301),
      }),
    );
    await assertFails(
      setDoc(doc(member, 'sighting-comments', 'mismatched-target'), {
        ...data,
        targetKey: 'station:station-1',
      }),
    );
    await assertFails(
      setDoc(doc(member, 'sighting-comments', 'orphaned-comment'), {
        ...data,
        target: {
          kind: 'sighting',
          id: 'missing-sighting',
          documentId: 'missing-sighting',
        },
        targetKey: 'sighting:missing-sighting',
      }),
    );
    const stationData = {
      ...data,
      target: {
        kind: 'station',
        id: 'station-1',
        documentId: 'station-1',
      },
      targetKey: 'station:station-1',
    };
    await assertFails(
      setDoc(
        doc(member, 'station-comments', 'member-station-comment'),
        stationData,
      ),
    );
    await assertSucceeds(
      setDoc(doc(admin, 'station-comments', 'admin-station-comment'), {
        ...stationData,
        createdById: 'admin-1',
      }),
    );
    await assertFails(
      getDocs(
        query(
          collection(member, 'station-comments'),
          where('targetKey', '==', 'station:station-1'),
        ),
      ),
    );
    await assertSucceeds(
      getDocs(
        query(
          collection(admin, 'station-comments'),
          where('targetKey', '==', 'station:station-1'),
        ),
      ),
    );
    await assertFails(updateDoc(comment, { body: 'Changed later' }));
    await assertFails(deleteDoc(comment));
    await assertSucceeds(
      deleteDoc(doc(admin, 'sighting-comments', 'comment-1')),
    );
    const importedComment = doc(
      admin,
      'sighting-comments',
      'inat-comment-source-uuid',
    );
    await assertFails(deleteDoc(importedComment));
    const moderation = doc(
      admin,
      'inaturalist-comment-moderation',
      'inat-comment-source-uuid',
    );
    const hideBatch = writeBatch(admin);
    hideBatch.set(moderation, {
      commentId: 'inat-comment-source-uuid',
      targetKey: 'sighting:inat-observation-321',
      hiddenById: 'admin-1',
      hiddenAt: now,
    });
    hideBatch.delete(importedComment);
    await assertSucceeds(hideBatch.commit());
    await assertFails(
      getDoc(
        doc(
          member,
          'inaturalist-comment-moderation',
          'inat-comment-source-uuid',
        ),
      ),
    );
    await assertSucceeds(getDoc(moderation));
    await assertFails(getDocs(collection(banned, 'sighting-comments')));
    await assertFails(
      setDoc(doc(banned, 'sighting-comments', 'banned-comment'), {
        ...data,
        createdById: 'banned-1',
      }),
    );
  });

  it('lets each account store exactly one validated favorite and read heart counts', async () => {
    const member = environment
      .authenticatedContext('member-1', {
        email: 'member@gatech.edu',
      })
      .firestore();
    const other = environment
      .authenticatedContext('member-2', {
        email: 'other@gatech.edu',
      })
      .firestore();
    const admin = environment
      .authenticatedContext('admin-1', {
        email: 'admin@gatech.edu',
      })
      .firestore();
    const anonymous = environment.unauthenticatedContext().firestore();
    const favorite = doc(member, 'catalog-favorites', 'member-1');
    const now = Timestamp.fromDate(new Date('2026-08-05T12:00:00.000Z'));

    await assertSucceeds(
      setDoc(favorite, { catalogId: 'cat-1', createdAt: now }),
    );
    await assertSucceeds(
      setDoc(favorite, {
        catalogId: 'inat-guide-2113386',
        createdAt: now,
      }),
    );
    const stored = await assertSucceeds(getDoc(favorite));
    expect(stored.data()?.catalogId).toBe('inat-guide-2113386');

    await assertSucceeds(
      setDoc(doc(other, 'catalog-favorites', 'member-2'), {
        catalogId: 'inat-guide-2113386',
        createdAt: now,
      }),
    );
    const visibleFavorites = await assertSucceeds(
      getDocs(collection(member, 'catalog-favorites')),
    );
    expect(visibleFavorites.size).toBe(2);

    await assertFails(
      setDoc(doc(member, 'catalog-favorites', 'member-2'), {
        catalogId: 'cat-1',
        createdAt: now,
      }),
    );
    await assertFails(
      setDoc(favorite, {
        catalogId: 'cat-1',
        createdAt: now,
        userId: 'member-1',
      }),
    );
    await assertFails(setDoc(favorite, { catalogId: '', createdAt: now }));
    await assertFails(
      setDoc(favorite, { catalogId: 'cat-1', createdAt: 'today' }),
    );
    await assertFails(
      setDoc(doc(admin, 'catalog-favorites', 'member-1'), {
        catalogId: 'cat-1',
        createdAt: now,
      }),
    );
    await assertFails(getDocs(collection(anonymous, 'catalog-favorites')));
    await assertFails(
      setDoc(doc(anonymous, 'catalog-favorites', 'anonymous'), {
        catalogId: 'cat-1',
        createdAt: now,
      }),
    );

    await assertSucceeds(deleteDoc(favorite));
    expect((await assertSucceeds(getDoc(favorite))).exists()).toBe(false);
  });

  it('lets active members read catalog tags while only officers can configure and assign them', async () => {
    const member = environment
      .authenticatedContext('member-1', {
        email: 'member@gatech.edu',
      })
      .firestore();
    const admin = environment
      .authenticatedContext('admin-1', {
        email: 'admin@gatech.edu',
      })
      .firestore();
    const anonymous = environment.unauthenticatedContext().firestore();
    const settings = doc(admin, 'catalog-tag-settings', 'catalog');
    const assignment = doc(admin, 'catalog-tag-assignments', 'cat-1');

    await assertSucceeds(
      setDoc(settings, {
        tags: [
          { id: 'feral', label: 'Feral' },
          { id: 'medical', label: 'Needs medication' },
        ],
      }),
    );
    await assertSucceeds(setDoc(assignment, { tagIds: ['feral', 'medical'] }));

    await assertSucceeds(
      getDoc(doc(member, 'catalog-tag-settings', 'catalog')),
    );
    await assertSucceeds(
      getDocs(collection(member, 'catalog-tag-assignments')),
    );
    await assertFails(
      setDoc(doc(member, 'catalog-tag-assignments', 'cat-1'), {
        tagIds: ['feral'],
      }),
    );
    await assertFails(
      setDoc(doc(admin, 'catalog-tag-settings', 'not-catalog'), { tags: [] }),
    );
    await assertFails(setDoc(settings, { tags: 'feral' }));
    await assertFails(setDoc(assignment, { tagIds: 'feral' }));
    await assertFails(
      setDoc(assignment, {
        tagIds: Array.from({ length: 51 }, (_, index) => `tag-${index}`),
      }),
    );
    await assertFails(
      getDoc(doc(anonymous, 'catalog-tag-settings', 'catalog')),
    );
    await assertFails(
      getDocs(collection(anonymous, 'catalog-tag-assignments')),
    );
    await assertSucceeds(deleteDoc(assignment));
    await assertFails(deleteDoc(settings));
  });

  it('shares public profiles without exposing private user documents or client writes', async () => {
    const member = environment
      .authenticatedContext('member-1', {
        email: 'member@gatech.edu',
      })
      .firestore();
    const banned = environment
      .authenticatedContext('banned-1', {
        email: 'banned@gatech.edu',
      })
      .firestore();
    const anonymous = environment.unauthenticatedContext().firestore();

    const otherProfile = await assertSucceeds(
      getDoc(doc(member, 'public-profiles', 'member-2')),
    );
    expect(otherProfile.data()?.displayName).toBe('Member Two');
    await assertSucceeds(getDocs(collection(member, 'public-profiles')));
    await assertFails(getDoc(doc(member, 'users', 'member-2')));
    await assertFails(
      updateDoc(doc(member, 'public-profiles', 'member-1'), {
        displayName: 'Changed from client',
      }),
    );
    await assertFails(getDoc(doc(banned, 'public-profiles', 'member-1')));
    await assertFails(getDoc(doc(anonymous, 'public-profiles', 'member-1')));
  });

  it('allows only self push-token updates while privileged user changes stay callable-only', async () => {
    const member = environment
      .authenticatedContext('member-1', {
        email: 'member@gatech.edu',
      })
      .firestore();
    const admin = environment
      .authenticatedContext('admin-1', {
        email: 'admin@gatech.edu',
      })
      .firestore();

    await assertSucceeds(
      updateDoc(doc(member, 'users', 'member-1'), {
        expoPushToken: 'ExponentPushToken[test]',
      }),
    );
    await assertFails(updateDoc(doc(member, 'users', 'member-1'), { role: 1 }));
    await assertFails(
      updateDoc(doc(member, 'users', 'member-2'), {
        expoPushToken: 'ExponentPushToken[other]',
      }),
    );
    await assertFails(updateDoc(doc(admin, 'users', 'member-1'), { role: 1 }));
    await assertSucceeds(
      setDoc(doc(admin, 'contact-info', 'contact-1'), {
        name: 'Officer',
        email: 'officer@gatech.edu',
      }),
    );
  });

  it('preserves officer data access for the developer role', async () => {
    const developer = environment
      .authenticatedContext('developer-1', {
        email: 'developer@gatech.edu',
      })
      .firestore();

    await assertSucceeds(
      setDoc(doc(developer, 'contact-info', 'developer-contact'), {
        name: 'Developer',
        email: 'developer@gatech.edu',
      }),
    );
    await assertSucceeds(
      getDoc(doc(developer, 'integration-state', 'inaturalist')),
    );
    await assertFails(
      updateDoc(doc(developer, 'users', 'developer-1'), { role: 2 }),
    );
  });

  it('exposes only visible imports to members and keeps all imported writes callable-only', async () => {
    const member = environment
      .authenticatedContext('member-1', {
        email: 'member@gatech.edu',
      })
      .firestore();
    const admin = environment
      .authenticatedContext('admin-1', {
        email: 'admin@gatech.edu',
      })
      .firestore();

    await assertSucceeds(
      getDoc(doc(member, 'inaturalist-observations', '1001')),
    );
    await assertFails(getDoc(doc(member, 'inaturalist-observations', '1002')));
    await assertSucceeds(
      getDocs(
        query(
          collection(member, 'inaturalist-guide-profiles'),
          where('visible', '==', true),
        ),
      ),
    );
    await assertFails(
      getDocs(collection(member, 'inaturalist-guide-profiles')),
    );
    await assertSucceeds(
      getDoc(doc(admin, 'inaturalist-guide-profiles', '2002')),
    );
    await assertSucceeds(
      getDoc(doc(admin, 'integration-state', 'inaturalist')),
    );
    await assertFails(getDoc(doc(member, 'integration-state', 'inaturalist')));
    await assertFails(
      updateDoc(doc(admin, 'inaturalist-observations', '1001'), {
        visible: false,
      }),
    );
    await assertFails(
      setDoc(doc(admin, 'inaturalist-guide-profiles', 'new'), {
        displayName: 'Client-created profile',
        visible: true,
      }),
    );
  });

  it('exposes verified attribution only to active members and keeps linking data server-only', async () => {
    await environment.withSecurityRulesDisabled(async (context) => {
      const firestore = context.firestore();
      await Promise.all([
        setDoc(doc(firestore, 'inaturalist-public-links', '42'), {
          userId: 'member-1',
          login: 'cat_watcher',
          linkedAt: Timestamp.fromDate(new Date('2026-08-06T12:00:00.000Z')),
        }),
        setDoc(doc(firestore, 'inaturalist-account-links', 'member-1'), {
          inaturalistUserId: 42,
          login: 'cat_watcher',
        }),
        setDoc(doc(firestore, 'inaturalist-link-attempts', 'state-hash'), {
          firebaseUid: 'member-1',
          attemptId: 'attempt-1',
          codeVerifier: 'server-secret-verifier',
          status: 'pending',
        }),
      ]);
    });
    const member = environment
      .authenticatedContext('member-1', {
        email: 'member@gatech.edu',
      })
      .firestore();
    const admin = environment
      .authenticatedContext('admin-1', {
        email: 'admin@gatech.edu',
      })
      .firestore();
    const banned = environment
      .authenticatedContext('banned-1', {
        email: 'banned@gatech.edu',
      })
      .firestore();
    const anonymous = environment.unauthenticatedContext().firestore();

    await assertSucceeds(getDoc(doc(member, 'inaturalist-public-links', '42')));
    await assertSucceeds(
      getDocs(
        query(
          collection(member, 'inaturalist-public-links'),
          where('userId', '==', 'member-1'),
        ),
      ),
    );
    await assertFails(getDoc(doc(banned, 'inaturalist-public-links', '42')));
    await assertFails(getDoc(doc(anonymous, 'inaturalist-public-links', '42')));
    for (const firestore of [member, admin]) {
      await assertFails(
        getDoc(doc(firestore, 'inaturalist-account-links', 'member-1')),
      );
      await assertFails(
        getDoc(doc(firestore, 'inaturalist-link-attempts', 'state-hash')),
      );
      await assertFails(
        updateDoc(doc(firestore, 'inaturalist-public-links', '42'), {
          userId: 'member-2',
        }),
      );
      await assertFails(
        setDoc(doc(firestore, 'inaturalist-account-links', 'member-2'), {
          inaturalistUserId: 42,
        }),
      );
    }
  });

  it('protects officer events and separates anonymous survey answers from submission receipts', async () => {
    const member = environment
      .authenticatedContext('member-1', {
        email: 'member@gatech.edu',
      })
      .firestore();
    const other = environment
      .authenticatedContext('member-2', {
        email: 'other@gatech.edu',
      })
      .firestore();
    const admin = environment
      .authenticatedContext('admin-1', {
        email: 'admin@gatech.edu',
      })
      .firestore();
    const startsAt = Timestamp.fromDate(new Date('2026-08-10T12:00:00.000Z'));
    const expiresAt = Timestamp.fromDate(new Date('2026-08-11T23:59:59.999Z'));
    const createdAt = Timestamp.fromDate(new Date('2026-08-06T12:00:00.000Z'));
    const event = {
      title: 'Volunteer workshop',
      details: 'Learn how to help campus cats.',
      location: 'Student Center',
      startsAt,
      expiresAt,
      imageUrl: 'https://example.com/event.jpg',
      createdAt,
      createdBy: userSnapshot('admin-1', 'admin@gatech.edu', 1),
    };

    await assertFails(
      setDoc(doc(member, 'community-events', 'event-1'), event),
    );
    await assertSucceeds(
      setDoc(doc(admin, 'community-events', 'event-1'), event),
    );
    await assertFails(
      setDoc(doc(admin, 'community-events', 'invalid-event'), {
        ...event,
        title: '   ',
      }),
    );
    await assertSucceeds(getDoc(doc(member, 'community-events', 'event-1')));
    const eventReadAt = Timestamp.fromDate(
      new Date('2026-08-06T13:00:00.000Z'),
    );
    const ownEventReceipt = doc(
      member,
      'event-read-receipts',
      'member-1__event-1',
    );
    await assertSucceeds(
      setDoc(ownEventReceipt, {
        userId: 'member-1',
        eventId: 'event-1',
        readAt: eventReadAt,
      }),
    );
    await assertSucceeds(getDoc(ownEventReceipt));
    await assertSucceeds(
      getDocs(
        query(
          collection(member, 'event-read-receipts'),
          where('userId', '==', 'member-1'),
        ),
      ),
    );
    await assertSucceeds(
      setDoc(
        doc(other, 'event-read-receipts', 'member-2__event-1'),
        {
          userId: 'member-2',
          eventId: 'event-1',
          readAt: eventReadAt,
        },
      ),
    );
    await assertFails(
      getDoc(doc(member, 'event-read-receipts', 'member-2__event-1')),
    );
    await assertFails(
      setDoc(
        doc(member, 'event-read-receipts', 'member-2__event-1'),
        {
          userId: 'member-2',
          eventId: 'event-1',
          readAt: eventReadAt,
        },
      ),
    );

    const anonymousSurvey = {
      title: 'Volunteer interests',
      details: 'Help us plan.',
      anonymous: true,
      participationAudience: 'officers_only',
      status: 'open',
      questions: [
        {
          id: 'question-1',
          type: 'short_text',
          prompt: 'What should we plan?',
          options: [],
        },
      ],
      createdAt,
      createdBy: userSnapshot('admin-1', 'admin@gatech.edu', 1),
    };
    await assertFails(
      setDoc(doc(member, 'community-surveys', 'anonymous'), anonymousSurvey),
    );
    await assertSucceeds(
      setDoc(doc(admin, 'community-surveys', 'anonymous'), anonymousSurvey),
    );
    await assertFails(
      setDoc(doc(admin, 'community-surveys', 'invalid-survey'), {
        ...anonymousSurvey,
        participationAudience: 'admins_only',
      }),
    );
    await assertSucceeds(getDoc(doc(member, 'community-surveys', 'anonymous')));
    await assertSucceeds(
      getDoc(doc(member, 'survey-submission-receipts', 'member-1__anonymous')),
    );

    const directSubmission = writeBatch(member);
    directSubmission.set(doc(member, 'survey-responses', 'response-blocked'), {
      surveyId: 'anonymous',
      answers: [{ questionId: 'question-1', value: 'A workshop' }],
      submittedAt: createdAt,
    });
    directSubmission.set(
      doc(member, 'survey-submission-receipts', 'member-1__anonymous'),
      {
        surveyId: 'anonymous',
        responseId: 'response-blocked',
        userId: 'member-1',
        submittedAt: createdAt,
      },
    );
    await assertFails(directSubmission.commit());

    await environment.withSecurityRulesDisabled(async (context) => {
      const firestore = context.firestore();
      await Promise.all([
        setDoc(doc(firestore, 'survey-responses', 'response-1'), {
          surveyId: 'anonymous',
          answers: [{ questionId: 'question-1', value: 'A workshop' }],
          submittedAt: createdAt,
        }),
        setDoc(
          doc(firestore, 'survey-submission-receipts', 'member-1__anonymous'),
          {
            surveyId: 'anonymous',
            responseId: 'response-1',
            userId: 'member-1',
            submittedAt: createdAt,
          },
        ),
      ]);
    });
    await assertFails(getDoc(doc(member, 'survey-responses', 'response-1')));
    await assertSucceeds(getDoc(doc(admin, 'survey-responses', 'response-1')));
    await assertSucceeds(
      getDoc(doc(member, 'survey-submission-receipts', 'member-1__anonymous')),
    );
    await assertFails(
      getDoc(doc(admin, 'survey-submission-receipts', 'member-1__anonymous')),
    );

    const duplicate = writeBatch(member);
    duplicate.set(doc(member, 'survey-responses', 'response-2'), {
      surveyId: 'anonymous',
      answers: [{ questionId: 'question-1', value: 'Another response' }],
      submittedAt: createdAt,
    });
    duplicate.set(
      doc(member, 'survey-submission-receipts', 'member-1__anonymous'),
      {
        surveyId: 'anonymous',
        responseId: 'response-2',
        userId: 'member-1',
        submittedAt: createdAt,
      },
    );
    await assertFails(duplicate.commit());

    await assertSucceeds(
      setDoc(doc(admin, 'community-surveys', 'named'), {
        ...anonymousSurvey,
        anonymous: false,
      }),
    );
    const directNamed = writeBatch(other);
    directNamed.set(doc(other, 'survey-responses', 'response-3'), {
      surveyId: 'named',
      answers: [{ questionId: 'question-1', value: 'No identity' }],
      submittedAt: createdAt,
    });
    directNamed.set(
      doc(other, 'survey-submission-receipts', 'member-2__named'),
      {
        surveyId: 'named',
        responseId: 'response-3',
        userId: 'member-2',
        submittedAt: createdAt,
      },
    );
    await assertFails(directNamed.commit());
    await assertFails(
      updateDoc(doc(member, 'community-surveys', 'anonymous'), {
        status: 'closed',
        closedAt: createdAt,
      }),
    );
    await assertSucceeds(
      updateDoc(doc(admin, 'community-surveys', 'anonymous'), {
        status: 'closed',
        closedAt: createdAt,
      }),
    );
  });

  it('protects contest creation, presidential elections, and private participation records', async () => {
    const member = environment
      .authenticatedContext('member-1', {
        email: 'member@gatech.edu',
      })
      .firestore();
    const other = environment
      .authenticatedContext('member-2', {
        email: 'other@gatech.edu',
      })
      .firestore();
    const officer = environment
      .authenticatedContext('admin-1', {
        email: 'admin@gatech.edu',
      })
      .firestore();
    const president = environment
      .authenticatedContext('president-1', {
        email: 'president@gatech.edu',
      })
      .firestore();
    const developer = environment
      .authenticatedContext('developer-1', {
        email: 'developer@gatech.edu',
      })
      .firestore();
    const createdAt = Timestamp.fromMillis(Date.now());
    const votingEndsAt = Timestamp.fromDate(
      new Date(createdAt.toMillis() + 7 * 24 * 60 * 60 * 1_000),
    );
    const contest = {
      kind: 'contest',
      title: 'Choose our logo',
      details: 'Pick one design.',
      participationAudience: 'officers_only',
      options: [
        { id: 'option-1', label: 'Calico crest' },
        { id: 'option-2', label: 'Midnight mark' },
      ],
      createdAt,
      createdBy: userSnapshot('admin-1', 'admin@gatech.edu', 1),
      votingStartsAt: createdAt,
      votingEndsAt,
    };

    await assertFails(
      setDoc(doc(member, 'community-votes', 'contest'), contest),
    );
    await assertSucceeds(
      setDoc(doc(officer, 'community-votes', 'contest'), contest),
    );
    await assertSucceeds(getDoc(doc(member, 'community-votes', 'contest')));

    const nominationEndsAt = Timestamp.fromDate(
      new Date(createdAt.toMillis() + 14 * 24 * 60 * 60 * 1_000),
    );
    const election = {
      kind: 'presidential_election',
      title: 'Club president election',
      details: 'Nominate yourself, then vote.',
      options: [],
      createdAt,
      createdBy: userSnapshot('president-1', 'president@gatech.edu', 3),
      nominationEndsAt,
      votingStartsAt: nominationEndsAt,
      votingEndsAt: Timestamp.fromDate(
        new Date(createdAt.toMillis() + 21 * 24 * 60 * 60 * 1_000),
      ),
    };
    await assertFails(
      setDoc(doc(officer, 'community-votes', 'officer-election'), election),
    );
    await assertFails(
      setDoc(doc(developer, 'community-votes', 'developer-election'), {
        ...election,
        createdBy: userSnapshot('developer-1', 'developer@gatech.edu', 4),
      }),
    );
    const electionBatch = writeBatch(developer);
    electionBatch.set(doc(developer, 'community-votes', 'election'), {
      ...election,
      createdBy: userSnapshot('developer-1', 'developer@gatech.edu', 4),
    });
    electionBatch.set(
      doc(
        developer,
        'community-vote-state',
        'presidential-election',
      ),
      { voteId: 'election', votingEndsAt: election.votingEndsAt },
    );
    await assertSucceeds(electionBatch.commit());

    const overlappingElection = writeBatch(president);
    overlappingElection.set(
      doc(president, 'community-votes', 'president-election'),
      election,
    );
    overlappingElection.set(
      doc(
        president,
        'community-vote-state',
        'presidential-election',
      ),
      {
        voteId: 'president-election',
        votingEndsAt: election.votingEndsAt,
      },
    );
    await assertFails(overlappingElection.commit());
    await assertFails(
      updateDoc(doc(president, 'community-votes', 'election'), {
        votingNotificationSentAt: createdAt,
      }),
    );

    for (const collectionName of [
      'community-vote-nominees',
      'community-vote-nomination-receipts',
      'community-vote-ballots',
      'community-vote-ballot-receipts',
    ]) {
      await assertFails(
        setDoc(doc(member, collectionName, `member-write-${collectionName}`), {
          voteId: 'election',
        }),
      );
    }

    await environment.withSecurityRulesDisabled(async (context) => {
      const firestore = context.firestore();
      await Promise.all([
        setDoc(
          doc(firestore, 'community-vote-nominees', 'election__member-1'),
          {
            voteId: 'election',
            userId: 'member-1',
            displayName: 'Member One',
            nominatedAt: createdAt,
          },
        ),
        setDoc(
          doc(
            firestore,
            'community-vote-nomination-receipts',
            'member-1__election',
          ),
          {
            voteId: 'election',
            userId: 'member-1',
            action: 'nominate',
            submittedAt: createdAt,
          },
        ),
        setDoc(doc(firestore, 'community-vote-ballots', 'ballot-1'), {
          voteId: 'election',
          optionId: 'member-1',
          submittedAt: votingEndsAt,
        }),
        setDoc(
          doc(
            firestore,
            'community-vote-ballot-receipts',
            'member-1__election',
          ),
          {
            voteId: 'election',
            userId: 'member-1',
            ballotId: 'ballot-1',
            submittedAt: votingEndsAt,
          },
        ),
      ]);
    });
    await assertSucceeds(
      getDoc(doc(member, 'community-vote-nominees', 'election__member-1')),
    );
    await assertSucceeds(
      getDoc(
        doc(member, 'community-vote-nomination-receipts', 'member-1__election'),
      ),
    );
    await assertSucceeds(
      getDoc(
        doc(member, 'community-vote-ballot-receipts', 'member-1__election'),
      ),
    );
    await assertFails(
      getDoc(
        doc(other, 'community-vote-ballot-receipts', 'member-1__election'),
      ),
    );
    await assertFails(
      getDoc(doc(member, 'community-vote-ballots', 'ballot-1')),
    );
  });

  it('enforces admin media management and sighting media ownership', async () => {
    const memberStorage = environment
      .authenticatedContext('member-1', {
        email: 'member@gatech.edu',
      })
      .storage();
    const otherStorage = environment
      .authenticatedContext('member-2', {
        email: 'other@gatech.edu',
      })
      .storage();
    const adminStorage = environment
      .authenticatedContext('admin-1', {
        email: 'admin@gatech.edu',
      })
      .storage();
    const anonymousStorage = environment.unauthenticatedContext().storage();
    const owned = ref(
      memberStorage,
      'cat-sightings/sighting-1/profile-owned.jpg',
    );

    await assertSucceeds(
      uploadBytes(owned, new Uint8Array([1]), {
        contentType: 'image/jpeg',
        customMetadata: { ownerId: 'member-1' },
      }),
    );
    await assertFails(
      deleteObject(
        ref(otherStorage, 'cat-sightings/sighting-1/profile-owned.jpg'),
      ),
    );
    await assertSucceeds(getMetadata(owned));
    await assertFails(
      getMetadata(
        ref(anonymousStorage, 'cat-sightings/sighting-1/profile-owned.jpg'),
      ),
    );
    await assertFails(
      uploadBytes(
        ref(memberStorage, 'catalog/cat-1/profile.jpg'),
        new Uint8Array([1]),
        { contentType: 'image/jpeg' },
      ),
    );
    await assertSucceeds(
      uploadBytes(
        ref(adminStorage, 'catalog/cat-1/profile.jpg'),
        new Uint8Array([1]),
        { contentType: 'image/jpeg' },
      ),
    );
    await assertSucceeds(deleteObject(owned));
  });

  it('allows only officers to manage validated event pictures', async () => {
    const memberStorage = environment
      .authenticatedContext('member-1', {
        email: 'member@gatech.edu',
      })
      .storage();
    const adminStorage = environment
      .authenticatedContext('admin-1', {
        email: 'admin@gatech.edu',
      })
      .storage();
    const image = ref(adminStorage, 'community-events/event-1/profile.jpg');

    await assertFails(
      uploadBytes(
        ref(memberStorage, 'community-events/event-1/member.jpg'),
        new Blob([new Uint8Array([1])], { type: 'image/jpeg' }),
      ),
    );
    await assertSucceeds(
      uploadBytes(
        image,
        new Blob([new Uint8Array([1])], { type: 'image/jpeg' }),
      ),
    );
    await assertSucceeds(
      getMetadata(ref(memberStorage, 'community-events/event-1/profile.jpg')),
    );
    await assertFails(
      uploadBytes(
        ref(adminStorage, 'community-events/event-1/not-an-image.txt'),
        new Blob(['not image'], { type: 'text/plain' }),
      ),
    );
  });

  it('lets officers upload image-backed contest options while members can only read them', async () => {
    const memberStorage = environment
      .authenticatedContext('member-1', {
        email: 'member@gatech.edu',
      })
      .storage();
    const officerStorage = environment
      .authenticatedContext('admin-1', {
        email: 'admin@gatech.edu',
      })
      .storage();
    const image = ref(officerStorage, 'community-votes/contest-1/option-1.jpg');

    await assertFails(
      uploadBytes(
        ref(memberStorage, 'community-votes/contest-1/member.jpg'),
        new Blob([new Uint8Array([1])], { type: 'image/jpeg' }),
      ),
    );
    await assertSucceeds(
      uploadBytes(
        image,
        new Blob([new Uint8Array([1])], { type: 'image/jpeg' }),
      ),
    );
    await assertSucceeds(
      getMetadata(ref(memberStorage, 'community-votes/contest-1/option-1.jpg')),
    );
    await assertFails(
      uploadBytes(
        ref(officerStorage, 'community-votes/contest-1/not-image.txt'),
        new Blob(['not image'], { type: 'text/plain' }),
      ),
    );
  });

  it('lets President-level roles manage branding and donation photos', async () => {
    const presidentStorage = environment
      .authenticatedContext('president-1', {
        email: 'president@gatech.edu',
      })
      .storage();
    const developerStorage = environment
      .authenticatedContext('developer-1', {
        email: 'developer@gatech.edu',
      })
      .storage();
    const anonymousStorage = environment.unauthenticatedContext().storage();
    const memberStorage = environment
      .authenticatedContext('member-1', {
        email: 'member@gatech.edu',
      })
      .storage();
    const officerStorage = environment
      .authenticatedContext('admin-1', {
        email: 'admin@gatech.edu',
      })
      .storage();
    const logo = ref(presidentStorage, 'app-branding/profile-logo.png');

    await assertSucceeds(
      uploadBytes(logo, new Uint8Array([1]), { contentType: 'image/png' }),
    );
    await assertSucceeds(
      getMetadata(ref(anonymousStorage, 'app-branding/profile-logo.png')),
    );
    await assertSucceeds(
      uploadBytes(
        ref(developerStorage, 'app-branding/developer-logo.png'),
        new Uint8Array([1]),
        { contentType: 'image/png' },
      ),
    );
    const donation = ref(presidentStorage, 'donations/appeal.png');
    await assertSucceeds(
      uploadBytes(donation, new Uint8Array([1]), { contentType: 'image/png' }),
    );
    await assertSucceeds(
      getMetadata(ref(memberStorage, 'donations/appeal.png')),
    );
    await assertFails(
      uploadBytes(
        ref(officerStorage, 'donations/officer-image.png'),
        new Uint8Array([1]),
        { contentType: 'image/png' },
      ),
    );
    await assertFails(
      uploadBytes(
        ref(memberStorage, 'donations/member-image.png'),
        new Uint8Array([1]),
        { contentType: 'image/png' },
      ),
    );
    await assertFails(
      uploadBytes(
        ref(presidentStorage, 'app-branding/not-an-image.txt'),
        new Uint8Array([1]),
        { contentType: 'text/plain' },
      ),
    );
  });

  it('lets active users manage only their own public profile picture', async () => {
    const memberStorage = environment
      .authenticatedContext('member-1', {
        email: 'member@gatech.edu',
      })
      .storage();
    const otherStorage = environment
      .authenticatedContext('member-2', {
        email: 'other@gatech.edu',
      })
      .storage();
    const bannedStorage = environment
      .authenticatedContext('banned-1', {
        email: 'banned@gatech.edu',
      })
      .storage();
    const profilePhoto = ref(
      memberStorage,
      'public-profiles/member-1/profile.jpg',
    );

    await assertSucceeds(
      uploadBytes(
        profilePhoto,
        new Blob([new Uint8Array([1])], { type: 'image/jpeg' }),
        {
          customMetadata: { ownerId: 'member-1' },
        },
      ),
    );
    await assertSucceeds(getMetadata(profilePhoto));
    await assertFails(
      uploadBytes(
        ref(memberStorage, 'public-profiles/member-1/not-an-image.txt'),
        new Blob(['not an image'], { type: 'text/plain' }),
        { customMetadata: { ownerId: 'member-1' } },
      ),
    );
    await assertFails(
      uploadBytes(
        ref(memberStorage, 'public-profiles/member-1/wrong-owner.jpg'),
        new Blob([new Uint8Array([1])], { type: 'image/jpeg' }),
        { customMetadata: { ownerId: 'member-2' } },
      ),
    );
    await assertFails(
      uploadBytes(
        ref(memberStorage, 'public-profiles/member-1/fake-system.jpg'),
        new Blob([new Uint8Array([1])], { type: 'image/jpeg' }),
        {
          customMetadata: {
            ownerId: 'member-1',
            billingInitiatedBy: 'system',
          },
        },
      ),
    );
    await assertFails(
      deleteObject(ref(otherStorage, 'public-profiles/member-1/profile.jpg')),
    );
    await assertFails(
      uploadBytes(
        ref(bannedStorage, 'public-profiles/banned-1/profile.jpg'),
        new Blob([new Uint8Array([1])], { type: 'image/jpeg' }),
        { customMetadata: { ownerId: 'banned-1' } },
      ),
    );
    await assertSucceeds(deleteObject(profilePhoto));
  });
});
