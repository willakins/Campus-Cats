import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import {
  RulesTestEnvironment,
  initializeTestEnvironment,
  assertFails,
  assertSucceeds,
} from '@firebase/rules-unit-testing';
import {
  Firestore,
  deleteDoc,
  doc,
  getDoc,
  setDoc,
  Timestamp,
  writeBatch,
} from 'firebase/firestore';
import { FirebaseSightingMapReader } from '../../adapters/firebase/FirebaseSightingMapReader';
import { FirebaseTenantScope } from '../../adapters/firebase/FirebaseTenantScope';
import {
  FIREBASE_TEST_PROJECT_ID,
  assertDemoProjectId,
} from '../support/firebaseProject';
const clubId = 'map-field-tests';
const bounds = { south: 33.77, north: 33.78, west: -84.4, east: -84.39 };
describe('map queries and custom field access', () => {
  let env: RulesTestEnvironment;
  beforeAll(async () => {
    env = await initializeTestEnvironment({
      projectId: assertDemoProjectId(FIREBASE_TEST_PROJECT_ID),
      firestore: {
        host: '127.0.0.1',
        port: 8080,
        rules: readFileSync(resolve('firestore.rules'), 'utf8'),
      },
    });
    await env.withSecurityRulesDisabled(async (context) => {
      const db = context.firestore();
      const batch = writeBatch(db);
      batch.set(doc(db, 'clubs', clubId), {
        maintenanceMode: false,
        billingEnforcementEnabled: false,
      });
      for (const [id, role, club] of [
        ['map-member', 0, clubId],
        ['map-officer', 1, clubId],
        ['map-foreign', 3, 'other-club'],
      ] as const)
        batch.set(doc(db, 'users', id), {
          clubId: club,
          role,
          banned: false,
          agreedToTerms: true,
          termsVersion: '2026-08-28',
        });
      batch.set(doc(db, 'clubs', clubId, 'app-settings', 'public'), {
        sightingsAnonymous: true,
      });
      for (let index = 0; index < 105; index++)
        batch.set(
          doc(
            db,
            'clubs',
            clubId,
            'cat-sightings',
            `pin-${String(index).padStart(3, '0')}`,
          ),
          {
            location: { latitude: 33.775, longitude: -84.395 },
            spotted_time: Timestamp.fromMillis(10000),
            name: 'Cat',
          },
        );
      for (const [id, location, date] of [
        ['outside', { latitude: 34, longitude: -84.395 }, 10000],
        ['old', { latitude: 33.775, longitude: -84.395 }, 1000],
      ] as const)
        batch.set(doc(db, 'clubs', clubId, 'cat-sightings', id), {
          location,
          spotted_time: Timestamp.fromMillis(date),
        });
      for (const visible of [true, false])
        batch.set(
          doc(db, 'clubs', clubId, 'inaturalist-observations', String(visible)),
          {
            visible,
            location: { latitude: 33.775, longitude: -84.395 },
            observedAt: Timestamp.fromMillis(10000),
          },
        );
      batch.set(
        doc(db, 'clubs', clubId, 'custom-field-definitions', 'catalog'),
        { fields: [] },
      );
      for (const kind of ['catalog', 'sighting', 'station'])
        batch.set(
          doc(db, 'clubs', clubId, 'custom-field-values', `${kind}__one`),
          {
            kind,
            recordId: 'one',
            recordCollection:
              kind === 'sighting'
                ? 'cat-sightings'
                : kind === 'station'
                  ? 'stations'
                  : 'catalog',
            parentId: 'one',
            values: {},
          },
        );
      for (const collection of ['catalog', 'cat-sightings', 'stations'])
        batch.set(doc(db, 'clubs', clubId, collection, 'one'), {
          name: 'Parent',
        });
      await batch.commit();
    });
  });
  afterAll(async () => {
    await env.cleanup();
  });
  it('queries and paginates as a member without loading outside, old or hidden sightings', async () => {
    const scope = new FirebaseTenantScope();
    scope.setAuthenticatedClub(clubId);
    const reader = new FirebaseSightingMapReader(
      env
        .authenticatedContext('map-member')
        .firestore() as unknown as Firestore,
      scope,
      () => 'map-member',
    );
    const first = await reader.page({ bounds, since: new Date(5000) });
    expect(first.local).toHaveLength(100);
    expect(first.imported).toHaveLength(1);
    const second = await reader.page({
      bounds,
      since: new Date(5000),
      cursor: first.nextCursor,
    });
    expect(second.local).toHaveLength(5);
    expect(second.imported).toHaveLength(0);
    expect(second.nextCursor).toBeUndefined();
    const ids = [...first.local, ...second.local].map((doc) => doc.id);
    expect(new Set(ids).size).toBe(105);
    expect(ids).not.toContain('outside');
    expect(ids).not.toContain('old');
  });
  it('denies cross-club map reads', async () => {
    const scope = new FirebaseTenantScope();
    scope.setAuthenticatedClub(clubId);
    const reader = new FirebaseSightingMapReader(
      env
        .authenticatedContext('map-foreign')
        .firestore() as unknown as Firestore,
      scope,
      () => 'map-foreign',
    );
    await expect(reader.page({ bounds })).rejects.toBeDefined();
  });
  it('permits field reads for the appropriate roles but denies all direct writes', async () => {
    for (const [uid, allowed] of [
      ['map-member', true],
      ['map-foreign', false],
    ] as const) {
      const db = env.authenticatedContext(uid).firestore();
      const definition = doc(
        db,
        'clubs',
        clubId,
        'custom-field-definitions',
        'catalog',
      );
      await (allowed
        ? assertSucceeds(getDoc(definition))
        : assertFails(getDoc(definition)));
      await assertFails(setDoc(definition, { fields: [] }));
      await assertFails(
        setDoc(
          doc(db, 'clubs', clubId, 'custom-field-values', 'catalog__one'),
          { values: {} },
        ),
      );
    }
    await assertSucceeds(
      getDoc(
        doc(
          env.authenticatedContext('map-member').firestore(),
          'clubs',
          clubId,
          'custom-field-values',
          'catalog__one',
        ),
      ),
    );
    await assertFails(
      getDoc(
        doc(
          env.authenticatedContext('map-member').firestore(),
          'clubs',
          clubId,
          'custom-field-values',
          'station__one',
        ),
      ),
    );
    await assertSucceeds(
      getDoc(
        doc(
          env.authenticatedContext('map-officer').firestore(),
          'clubs',
          clubId,
          'custom-field-values',
          'station__one',
        ),
      ),
    );
  });
  it('denies orphaned additional-field reads after a record is deleted', async () => {
    await env.withSecurityRulesDisabled((context) =>
      deleteDoc(doc(context.firestore(), 'clubs', clubId, 'catalog', 'one')),
    );
    await assertFails(
      getDoc(
        doc(
          env.authenticatedContext('map-member').firestore(),
          'clubs',
          clubId,
          'custom-field-values',
          'catalog__one',
        ),
      ),
    );
  });
});
