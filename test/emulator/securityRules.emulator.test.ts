import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import {
  RulesTestEnvironment,
  assertFails,
  assertSucceeds,
  initializeTestEnvironment,
} from '@firebase/rules-unit-testing';
import { deleteObject, getMetadata, ref, uploadBytes } from 'firebase/storage';
import { doc, getDoc, setDoc, updateDoc } from 'firebase/firestore';

import {
  FIREBASE_TEST_PROJECT_ID,
  assertDemoProjectId,
} from '../support/firebaseProject';

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
        setDoc(doc(firestore, 'users', 'member-1'), {
          email: 'member@gatech.edu',
          role: 0,
        }),
        setDoc(doc(firestore, 'users', 'member-2'), {
          email: 'other@gatech.edu',
          role: 0,
        }),
        setDoc(doc(firestore, 'users', 'admin-1'), {
          email: 'admin@gatech.edu',
          role: 1,
        }),
        setDoc(doc(firestore, 'users', 'super-1'), {
          email: 'super@gatech.edu',
          role: 2,
        }),
        setDoc(doc(firestore, 'announcements', 'announcement-1'), {
          title: 'Update',
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
    await assertFails(getDoc(doc(firestore, 'announcements', 'announcement-1')));
    await assertFails(
      setDoc(doc(firestore, 'contact-info', 'contact-1'), {
        name: 'Officer',
        email: 'officer@gatech.edu',
      }),
    );
  });

  it('allows members to read content and mutate only their own sightings', async () => {
    const member = environment.authenticatedContext('member-1', {
      email: 'member@gatech.edu',
    }).firestore();
    const other = environment.authenticatedContext('member-2', {
      email: 'other@gatech.edu',
    }).firestore();
    const sighting = doc(member, 'cat-sightings', 'sighting-1');

    await assertSucceeds(getDoc(doc(member, 'announcements', 'announcement-1')));
    await assertSucceeds(
      setDoc(sighting, {
        name: 'Goldie',
        createdBy: { id: 'member-1' },
      }),
    );
    await assertSucceeds(updateDoc(sighting, { name: 'Goldie Cat' }));
    await assertFails(
      updateDoc(doc(other, 'cat-sightings', 'sighting-1'), { name: 'Stolen' }),
    );
    await assertFails(
      setDoc(doc(member, 'catalog', 'cat-1'), { name: 'Goldie' }),
    );
  });

  it('allows only self push-token updates while privileged user changes stay callable-only', async () => {
    const member = environment.authenticatedContext('member-1', {
      email: 'member@gatech.edu',
    }).firestore();
    const admin = environment.authenticatedContext('admin-1', {
      email: 'admin@gatech.edu',
    }).firestore();

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

  it('enforces admin media management and sighting media ownership', async () => {
    const memberStorage = environment.authenticatedContext('member-1', {
      email: 'member@gatech.edu',
    }).storage();
    const otherStorage = environment.authenticatedContext('member-2', {
      email: 'other@gatech.edu',
    }).storage();
    const adminStorage = environment.authenticatedContext('admin-1', {
      email: 'admin@gatech.edu',
    }).storage();
    const anonymousStorage = environment.unauthenticatedContext().storage();
    const owned = ref(
      memberStorage,
      'cat-sightings/sighting-1/profile-owned.jpg',
    );

    await assertSucceeds(
      uploadBytes(owned, new Uint8Array([1]), {
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
      ),
    );
    await assertSucceeds(
      uploadBytes(
        ref(adminStorage, 'catalog/cat-1/profile.jpg'),
        new Uint8Array([1]),
      ),
    );
    await assertSucceeds(deleteObject(owned));
  });
});
