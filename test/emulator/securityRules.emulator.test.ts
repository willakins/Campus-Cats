import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import {
  RulesTestEnvironment,
  assertFails,
  assertSucceeds,
  initializeTestEnvironment,
} from '@firebase/rules-unit-testing';
import { deleteObject, getMetadata, ref, uploadBytes } from 'firebase/storage';
import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
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
        setDoc(doc(firestore, 'users', 'banned-1'), {
          email: 'banned@gatech.edu',
          role: 0,
          banned: true,
        }),
        setDoc(doc(firestore, 'users', 'admin-1'), {
          email: 'admin@gatech.edu',
          role: 1,
        }),
        setDoc(doc(firestore, 'users', 'super-1'), {
          email: 'super@gatech.edu',
          role: 2,
        }),
        setDoc(doc(firestore, 'users', 'president-1'), {
          email: 'president@gatech.edu',
          role: 3,
        }),
        setDoc(doc(firestore, 'users', 'developer-1'), {
          email: 'developer@gatech.edu',
          role: 4,
        }),
        setDoc(doc(firestore, 'public-profiles', 'member-1'), {
          displayName: 'Member One',
          bio: 'Campus cat watcher',
          profilePhotoUrl: '',
          role: 0,
          achievementIds: [],
          selectedTitleId: '',
        }),
        setDoc(doc(firestore, 'public-profiles', 'member-2'), {
          displayName: 'Member Two',
          bio: '',
          profilePhotoUrl: '',
          role: 0,
          achievementIds: ['first-sighting'],
          selectedTitleId: 'first-sighting',
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
    const createSighting = writeBatch(member);
    createSighting.set(sighting, { name: 'Goldie' });
    createSighting.set(
      doc(member, 'content-contributors', 'sighting__sighting-1'),
      {
        kind: 'sighting',
        contentId: 'sighting-1',
        user: { id: 'member-1', email: 'member@gatech.edu', role: 0 },
      },
    );
    await assertSucceeds(createSighting.commit());
    await assertSucceeds(updateDoc(sighting, { name: 'Goldie Cat' }));
    await assertFails(
      updateDoc(doc(other, 'cat-sightings', 'sighting-1'), { name: 'Stolen' }),
    );
    await assertFails(
      setDoc(
        doc(other, 'content-contributors', 'sighting__sighting-1'),
        {
          kind: 'sighting',
          contentId: 'sighting-1',
          user: { id: 'member-2', email: 'other@gatech.edu', role: 0 },
        },
      ),
    );
    await assertFails(
      setDoc(
        doc(other, 'content-contributors', 'sighting__orphaned'),
        {
          kind: 'sighting',
          contentId: 'orphaned',
          user: { id: 'member-2', email: 'other@gatech.edu', role: 0 },
        },
      ),
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

  it('lets only the President manage public branding and privacy settings', async () => {
    const anonymous = environment.unauthenticatedContext().firestore();
    const president = environment.authenticatedContext('president-1', {
      email: 'president@gatech.edu',
    }).firestore();
    const developer = environment.authenticatedContext('developer-1', {
      email: 'developer@gatech.edu',
    }).firestore();
    const settings = doc(president, 'app-settings', 'public');
    const value = {
      logoUrl: '',
      primaryColor: '#18314F',
      accentColor: '#B58A16',
      sightingsAnonymous: true,
    };

    await assertSucceeds(setDoc(settings, value));
    await assertSucceeds(getDoc(doc(anonymous, 'app-settings', 'public')));
    await assertFails(
      setDoc(doc(developer, 'app-settings', 'public'), {
        ...value,
        sightingsAnonymous: false,
      }),
    );
    await assertFails(
      updateDoc(settings, { primaryColor: 'navy' }),
    );
  });

  it('keeps contributor records officer-only while anonymity is enabled', async () => {
    const member = environment.authenticatedContext('member-1', {
      email: 'member@gatech.edu',
    }).firestore();
    const other = environment.authenticatedContext('member-2', {
      email: 'other@gatech.edu',
    }).firestore();
    const admin = environment.authenticatedContext('admin-1', {
      email: 'admin@gatech.edu',
    }).firestore();
    const president = environment.authenticatedContext('president-1', {
      email: 'president@gatech.edu',
    }).firestore();
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
      user: { id: 'member-1', email: 'member@gatech.edu', role: 0 },
    });
    await assertSucceeds(batch.commit());

    await assertSucceeds(getDoc(contributor));
    await assertSucceeds(
      getDoc(
        doc(admin, 'content-contributors', 'sighting__private-sighting'),
      ),
    );
    await assertFails(
      getDoc(
        doc(other, 'content-contributors', 'sighting__private-sighting'),
      ),
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
      getDoc(
        doc(other, 'content-contributors', 'sighting__private-sighting'),
      ),
    );
  });

  it('keeps legacy sightings readable until contributor privacy is initialized', async () => {
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
      ]);
    });
    const member = environment.authenticatedContext('member-2', {
      email: 'other@gatech.edu',
    }).firestore();
    const president = environment.authenticatedContext('president-1', {
      email: 'president@gatech.edu',
    }).firestore();

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
    await assertSucceeds(
      getDoc(doc(member, 'catalog', 'legacy-catalog')),
    );

    await assertSucceeds(
      setDoc(doc(president, 'app-settings', 'public'), {
        logoUrl: '',
        primaryColor: '#18314F',
        accentColor: '#B58A16',
        sightingsAnonymous: true,
      }),
    );

    const memberAfterInitialization = environment.authenticatedContext(
      'member-1',
      { email: 'member@gatech.edu' },
    ).firestore();
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

  it('lets each account store exactly one validated favorite and read heart counts', async () => {
    const member = environment.authenticatedContext('member-1', {
      email: 'member@gatech.edu',
    }).firestore();
    const other = environment.authenticatedContext('member-2', {
      email: 'other@gatech.edu',
    }).firestore();
    const admin = environment.authenticatedContext('admin-1', {
      email: 'admin@gatech.edu',
    }).firestore();
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
    await assertFails(
      setDoc(favorite, { catalogId: '', createdAt: now }),
    );
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

  it('shares public profiles without exposing private user documents or client writes', async () => {
    const member = environment.authenticatedContext('member-1', {
      email: 'member@gatech.edu',
    }).firestore();
    const banned = environment.authenticatedContext('banned-1', {
      email: 'banned@gatech.edu',
    }).firestore();
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
    await assertFails(
      getDoc(doc(banned, 'public-profiles', 'member-1')),
    );
    await assertFails(
      getDoc(doc(anonymous, 'public-profiles', 'member-1')),
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

  it('preserves officer data access for the developer role', async () => {
    const developer = environment.authenticatedContext('developer-1', {
      email: 'developer@gatech.edu',
    }).firestore();

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
    const member = environment.authenticatedContext('member-1', {
      email: 'member@gatech.edu',
    }).firestore();
    const admin = environment.authenticatedContext('admin-1', {
      email: 'admin@gatech.edu',
    }).firestore();

    await assertSucceeds(
      getDoc(doc(member, 'inaturalist-observations', '1001')),
    );
    await assertFails(
      getDoc(doc(member, 'inaturalist-observations', '1002')),
    );
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
    await assertFails(
      getDoc(doc(member, 'integration-state', 'inaturalist')),
    );
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

  it('protects officer events and separates anonymous survey answers from submission receipts', async () => {
    const member = environment.authenticatedContext('member-1', {
      email: 'member@gatech.edu',
    }).firestore();
    const other = environment.authenticatedContext('member-2', {
      email: 'other@gatech.edu',
    }).firestore();
    const admin = environment.authenticatedContext('admin-1', {
      email: 'admin@gatech.edu',
    }).firestore();
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
      createdBy: { id: 'admin-1', email: 'admin@gatech.edu', role: 1 },
    };

    await assertFails(setDoc(doc(member, 'community-events', 'event-1'), event));
    await assertSucceeds(setDoc(doc(admin, 'community-events', 'event-1'), event));
    await assertFails(
      setDoc(doc(admin, 'community-events', 'invalid-event'), {
        ...event,
        title: '   ',
      }),
    );
    await assertSucceeds(getDoc(doc(member, 'community-events', 'event-1')));

    const anonymousSurvey = {
      title: 'Volunteer interests',
      details: 'Help us plan.',
      anonymous: true,
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
      createdBy: { id: 'admin-1', email: 'admin@gatech.edu', role: 1 },
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
        title: '   ',
      }),
    );
    await assertSucceeds(
      getDoc(doc(member, 'community-surveys', 'anonymous')),
    );
    await assertSucceeds(
      getDoc(
        doc(member, 'survey-submission-receipts', 'member-1__anonymous'),
      ),
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
          doc(
            firestore,
            'survey-submission-receipts',
            'member-1__anonymous',
          ),
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
      getDoc(
        doc(member, 'survey-submission-receipts', 'member-1__anonymous'),
      ),
    );
    await assertFails(
      getDoc(
        doc(admin, 'survey-submission-receipts', 'member-1__anonymous'),
      ),
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

  it('allows only officers to manage validated event pictures', async () => {
    const memberStorage = environment.authenticatedContext('member-1', {
      email: 'member@gatech.edu',
    }).storage();
    const adminStorage = environment.authenticatedContext('admin-1', {
      email: 'admin@gatech.edu',
    }).storage();
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
      getMetadata(
        ref(memberStorage, 'community-events/event-1/profile.jpg'),
      ),
    );
    await assertFails(
      uploadBytes(
        ref(adminStorage, 'community-events/event-1/not-an-image.txt'),
        new Blob(['not image'], { type: 'text/plain' }),
      ),
    );
  });

  it('lets only the President publish a validated public login logo', async () => {
    const presidentStorage = environment.authenticatedContext('president-1', {
      email: 'president@gatech.edu',
    }).storage();
    const developerStorage = environment.authenticatedContext('developer-1', {
      email: 'developer@gatech.edu',
    }).storage();
    const anonymousStorage = environment.unauthenticatedContext().storage();
    const logo = ref(presidentStorage, 'app-branding/profile-logo.png');

    await assertSucceeds(
      uploadBytes(logo, new Uint8Array([1]), { contentType: 'image/png' }),
    );
    await assertSucceeds(
      getMetadata(ref(anonymousStorage, 'app-branding/profile-logo.png')),
    );
    await assertFails(
      uploadBytes(
        ref(developerStorage, 'app-branding/developer-logo.png'),
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
    const memberStorage = environment.authenticatedContext('member-1', {
      email: 'member@gatech.edu',
    }).storage();
    const otherStorage = environment.authenticatedContext('member-2', {
      email: 'other@gatech.edu',
    }).storage();
    const bannedStorage = environment.authenticatedContext('banned-1', {
      email: 'banned@gatech.edu',
    }).storage();
    const profilePhoto = ref(
      memberStorage,
      'public-profiles/member-1/profile.jpg',
    );

    await assertSucceeds(
      uploadBytes(profilePhoto, new Blob([new Uint8Array([1])], { type: 'image/jpeg' }), {
        customMetadata: { ownerId: 'member-1' },
      }),
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
      deleteObject(
        ref(otherStorage, 'public-profiles/member-1/profile.jpg'),
      ),
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
