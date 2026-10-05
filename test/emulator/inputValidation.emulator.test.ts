import { readFileSync } from 'node:fs';
import {
  initializeTestEnvironment,
  RulesTestEnvironment,
  assertFails,
  assertSucceeds,
} from '@firebase/rules-unit-testing';
import {
  doc,
  getDoc,
  setDoc,
  updateDoc,
  deleteField,
  writeBatch,
  Timestamp,
} from 'firebase/firestore';
import { ref, uploadBytes } from 'firebase/storage';
import { FIREBASE_TEST_PROJECT_ID } from '../support/firebaseProject';

const clubId = 'campus-cats';
const member = {
  id: 'member',
  email: 'member@example.com',
  role: 0,
  clubId,
  platformAdmin: false,
};
const officer = {
  ...member,
  id: 'officer',
  email: 'officer@example.com',
  role: 3,
};
const sighting = {
  name: 'Goldie',
  info: 'O’Malley <3 🐈\nOn campus',
  fed: true,
  health: true,
  spotted_time: Timestamp.now(),
  location: { latitude: 33, longitude: -84 },
  timeofDay: 'Morning',
};

describe('untrusted Firebase writes', () => {
  let environment: RulesTestEnvironment;
  beforeAll(async () => {
    environment = await initializeTestEnvironment({
      projectId: FIREBASE_TEST_PROJECT_ID,
      firestore: {
        host: '127.0.0.1',
        port: 8080,
        rules: readFileSync('firestore.rules', 'utf8'),
      },
      storage: {
        host: '127.0.0.1',
        port: 9199,
        rules: readFileSync('storage.rules', 'utf8'),
      },
    });
  });
  beforeEach(async () => {
    await environment.clearFirestore();
    await environment.clearStorage();
    await environment.withSecurityRulesDisabled(async (context) => {
      const db = context.firestore();
      await setDoc(doc(db, 'clubs', clubId), {
        billingEnforcementEnabled: false,
        maintenanceMode: false,
      });
      for (const user of [member, officer])
        await setDoc(doc(db, 'users', user.id), {
          ...user,
          banned: false,
          agreedToTerms: true,
          termsVersion: '2026-08-28',
        });
    });
  });
  afterAll(async () => {
    await environment.cleanup();
  });
  const dbFor = (user = officer) =>
    environment
      .authenticatedContext(user.id, { email: user.email })
      .firestore();
  const createSighting = (data: Record<string, unknown>, id = 'sighting') => {
    const db = dbFor(member);
    const batch = writeBatch(db);
    batch.set(doc(db, 'clubs', clubId, 'cat-sightings', id), data);
    batch.set(
      doc(db, 'clubs', clubId, 'content-contributors', `sighting__${id}`),
      {
        kind: 'sighting',
        contentId: id,
        user: member,
      },
    );
    return batch.commit();
  };

  it('accepts ordinary multiline text and rejects oversized, hidden-control, or injected fields', async () => {
    await assertSucceeds(createSighting(sighting));
    for (const [index, patch] of [
      { name: 'x'.repeat(121) },
      { info: 'x'.repeat(5001) },
      { info: 'bad\u0000text' },
      { info: { html: '<script>alert(1)</script>' } },
      { sourceUrl: 'javascript:alert(1)' },
    ].entries())
      await assertFails(
        createSighting({ ...sighting, ...patch }, `invalid-${index}`),
      );
  });

  it('requires typed, bounded officer content and safe contact links', async () => {
    const db = dbFor();
    const contact = doc(db, 'clubs', clubId, 'contact-info', 'contact');
    await assertSucceeds(
      setDoc(contact, {
        name: 'Club',
        email: 'club@example.com',
        websiteUrls: ['https://example.com'],
      }),
    );
    for (const url of [
      'javascript:alert(1)',
      'data:text/html,hello',
      'https://user:pass@example.com',
      'https://example.com/\npath',
    ]) {
      await assertFails(
        setDoc(contact, {
          name: 'Club',
          email: 'club@example.com',
          websiteUrls: [url],
        }),
      );
    }
    await assertFails(
      setDoc(doc(db, 'clubs', clubId, 'alerts', 'alert'), {
        title: 'x'.repeat(121),
      }),
    );
    await assertFails(
      setDoc(doc(db, 'clubs', clubId, 'stations', 'station'), {
        name: { html: 'bad' },
      }),
    );
    await assertFails(
      setDoc(doc(db, 'clubs', clubId, 'catalog-tag-settings', 'catalog'), {
        tags: [{ id: 'tag', label: 'x'.repeat(41) }],
      }),
    );
  });

  it('accepts 50 tag assignments and requires server validation for contests', async () => {
    const db = dbFor();
    await assertSucceeds(
      setDoc(doc(db, 'clubs', clubId, 'catalog-tag-assignments', 'cat'), {
        tagIds: Array.from({ length: 50 }, (_, i) => `tag-${i}`),
      }),
    );
    const createdAt = Timestamp.now();
    await assertFails(
      setDoc(doc(db, 'clubs', clubId, 'community-votes', 'contest'), {
        kind: 'contest',
        title: 'Contest',
        details: '',
        createdAt,
        createdBy: officer,
        votingStartsAt: createdAt,
        votingEndsAt: Timestamp.fromMillis(createdAt.toMillis() + 86400000),
        options: Array.from({ length: 20 }, (_, i) => ({
          id: `option-${i}`,
          label: `Cat ${i}`,
          imageUrl: 'https://example.com/cat.jpg',
        })),
      }),
    );
  });

  it('blocks direct public applications and invalid push token payloads', async () => {
    const anonymous = environment.unauthenticatedContext().firestore();
    await assertFails(
      setDoc(doc(anonymous, 'clubs', clubId, 'whitelist', 'bypass'), {
        name: 'Alex',
        email: 'alex@example.com',
        codeWord: '',
        graduationYear: '',
      }),
    );
    await assertFails(
      setDoc(
        doc(dbFor(member), 'users', member.id),
        { expoPushToken: { arbitrary: 'payload' } },
        { merge: true },
      ),
    );
  });

  it('keeps old sessions revoked after unbanning, including private profiles and storage', async () => {
    const cutoff = Math.floor(Date.now() / 1000) - 60;
    await environment.withSecurityRulesDisabled(async (context) => {
      await updateDoc(doc(context.firestore(), 'users', member.id), {
        banned: false,
        sessionRevokedAt: cutoff,
      });
    });
    for (const authTime of [cutoff - 10, cutoff]) {
      const old = environment.authenticatedContext(member.id, {
        email: member.email,
        auth_time: authTime,
      });
      await assertFails(getDoc(doc(old.firestore(), 'clubs', clubId)));
      await assertFails(getDoc(doc(old.firestore(), 'users', member.id)));
      await assertFails(
        updateDoc(doc(old.firestore(), 'users', member.id), {
          expoPushToken: '',
        }),
      );
      await assertFails(
        uploadBytes(
          ref(
            old.storage(),
            `clubs/${clubId}/public-profiles/${member.id}/old.png`,
          ),
          new Uint8Array([1]),
          {
            contentType: 'image/png',
            customMetadata: { ownerId: member.id },
          },
        ),
      );
    }
    const fresh = environment.authenticatedContext(member.id, {
      email: member.email,
      auth_time: cutoff + 1,
    });
    await assertSucceeds(getDoc(doc(fresh.firestore(), 'clubs', clubId)));
    await assertSucceeds(getDoc(doc(fresh.firestore(), 'users', member.id)));
    await assertSucceeds(
      uploadBytes(
        ref(
          fresh.storage(),
          `clubs/${clubId}/public-profiles/${member.id}/fresh.png`,
        ),
        new Uint8Array([1]),
        {
          contentType: 'image/png',
          customMetadata: { ownerId: member.id },
        },
      ),
    );
    await assertFails(
      updateDoc(doc(fresh.firestore(), 'users', member.id), {
        sessionRevokedAt: deleteField(),
      }),
    );
    await assertFails(
      updateDoc(doc(fresh.firestore(), 'users', member.id), {
        sessionRevokedAt: 0,
      }),
    );
  });

  it('blocks new data access and uploads while deletion is pending, even with a fresh login', async () => {
    const context = environment.authenticatedContext(member.id, {
      email: member.email,
      auth_time: Math.floor(Date.now() / 1000),
    });
    await assertFails(
      updateDoc(doc(context.firestore(), 'users', member.id), {
        deletionPending: true,
      }),
    );
    await environment.withSecurityRulesDisabled(async (admin) => {
      await updateDoc(doc(admin.firestore(), 'users', member.id), {
        deletionPending: true,
      });
    });
    await assertFails(getDoc(doc(context.firestore(), 'clubs', clubId)));
    await assertFails(getDoc(doc(context.firestore(), 'users', member.id)));
    await assertFails(createSighting(sighting));
    await assertFails(
      updateDoc(doc(context.firestore(), 'users', member.id), {
        deletionPending: deleteField(),
      }),
    );
    await assertFails(
      uploadBytes(
        ref(
          context.storage(),
          `clubs/${clubId}/public-profiles/${member.id}/pending.png`,
        ),
        new Uint8Array([1]),
        {
          contentType: 'image/png',
          customMetadata: { ownerId: member.id },
        },
      ),
    );
  });

  it('rejects active image formats and uploads into another member’s sighting', async () => {
    await assertSucceeds(createSighting(sighting));
    const storage = environment
      .authenticatedContext(officer.id, { email: officer.email })
      .storage();
    await assertFails(
      uploadBytes(
        ref(storage, `clubs/${clubId}/cat-sightings/sighting/injected.jpg`),
        new Uint8Array([1]),
        {
          contentType: 'image/jpeg',
          customMetadata: { ownerId: officer.id },
        },
      ),
    );
    await assertFails(
      uploadBytes(
        ref(storage, `clubs/${clubId}/catalog/cat/payload.svg`),
        new Uint8Array([1]),
        { contentType: 'image/svg+xml' },
      ),
    );
  });
});
