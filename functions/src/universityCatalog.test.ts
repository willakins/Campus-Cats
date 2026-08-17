import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  MAX_SEARCH_CANDIDATES,
  UniversityCatalogService,
  approvedDomainFromWebsite,
  applyUniversityOverride,
  fetchScorecardCatalog,
  normalizeScorecardSchool,
  rankUniversities,
  universityCanResolve,
  universitySearchPrefix,
  universitySearchPrefixes,
} from './universityCatalog';

const catalogDocument = (
  id: string,
  name: string,
  aliases: readonly string[] = [],
) => ({
  id,
  exists: true,
  data: () => ({
    name,
    city: 'Atlanta',
    state: 'GA',
    emailDomains: ['example.edu'],
    aliases,
    active: true,
    timezone: 'America/New_York',
  }),
});

const searchFirestore = (
  documents: readonly ReturnType<typeof catalogDocument>[],
  mappings: Readonly<Record<string, Record<string, unknown>>> = {},
  indexedDocuments = documents,
) => {
  let catalogReads = 0;
  let requestedLimit = 0;
  let batchedReads = 0;
  const whereClauses: unknown[][] = [];
  const emptySnapshot = { exists: false, data: () => undefined };
  const reference = (collectionName: string, id: string) => ({
    collectionName,
    id,
    get: async () => emptySnapshot,
  });
  const firestore = {
    collection: (name: string) => {
      if (name === 'universities') {
        const query = {
          where: (...clause: unknown[]) => {
            whereClauses.push(clause);
            return query;
          },
          limit: (limit: number) => {
            requestedLimit = limit;
            return query;
          },
          get: async () => {
            catalogReads += 1;
            return { size: indexedDocuments.length, docs: indexedDocuments };
          },
          doc: (id: string) => reference(name, id),
        };
        return query;
      }
      if (name === 'university-clubs') {
        return {
          get: async () => ({
            docs: Object.entries(mappings).map(([id, data]) => ({
              id,
              exists: true,
              data: () => data,
            })),
          }),
          doc: (id: string) => ({
            get: async () => mappings[id]
              ? { exists: true, data: () => mappings[id] }
              : emptySnapshot,
          }),
        };
      }
      return { doc: (id: string) => reference(name, id) };
    },
    getAll: async (...references: readonly { collectionName: string; id: string }[]) => {
      batchedReads += 1;
      return references.map(({ collectionName, id }) => {
        if (collectionName !== 'universities') return emptySnapshot;
        return documents.find((document) => document.id === id) ?? emptySnapshot;
      });
    },
  };
  return {
    firestore,
    get catalogReads() { return catalogReads; },
    get batchedReads() { return batchedReads; },
    get requestedLimit() { return requestedLimit; },
    get whereClauses() { return whereClauses; },
  };
};

describe('university catalog', () => {
  it('normalizes a Scorecard institution and infers its timezone and domain', () => {
    assert.deepEqual(
      normalizeScorecardSchool({
        id: 139755,
        'school.name': 'Georgia Institute of Technology-Main Campus',
        'school.city': 'Atlanta',
        'school.state': 'GA',
        'school.school_url': 'www.gatech.edu',
        'location.lat': 33.7724,
        'location.lon': -84.3948,
      }),
      {
        id: '139755',
        name: 'Georgia Institute of Technology-Main Campus',
        city: 'Atlanta',
        state: 'GA',
        websiteDomain: 'gatech.edu',
        emailDomains: ['gatech.edu'],
        latitude: 33.7724,
        longitude: -84.3948,
        timezone: 'America/New_York',
        aliases: [],
        active: true,
      },
    );
  });

  it('rejects malformed institutions and safely normalizes website domains', () => {
    assert.equal(normalizeScorecardSchool({ id: 1 }), undefined);
    assert.equal(approvedDomainFromWebsite('https://www.emory.edu/home'), 'emory.edu');
    assert.equal(
      approvedDomainFromWebsite('https://admissions.emory.edu/apply'),
      'emory.edu',
    );
    assert.equal(
      approvedDomainFromWebsite('https://apply.examplecollege.org/start'),
      'examplecollege.org',
    );
    assert.equal(approvedDomainFromWebsite('javascript:alert(1)'), undefined);
  });

  it('lets an explicit empty override revoke an inferred email domain', () => {
    const school = normalizeScorecardSchool({
      id: 139658,
      'school.name': 'Emory University',
      'school.city': 'Atlanta',
      'school.state': 'GA',
      'school.school_url': 'emory.edu',
    });
    assert(school);

    assert.deepEqual(
      applyUniversityOverride(school, { emailDomains: [] }).emailDomains,
      [],
    );
  });

  it('does not resolve inactive schools unless they retain an existing club mapping', () => {
    assert.equal(
      universityCanResolve({ active: false }, { status: 'unclaimed' }),
      false,
    );
    assert.equal(
      universityCanResolve({ active: false }, { status: 'mapped' }),
      true,
    );
  });

  it('creates bounded token prefixes and ranks multi-word searches', () => {
    const prefixes = universitySearchPrefixes(
      'Georgia Institute of Technology-Main Campus',
      ['Georgia Tech'],
    );
    assert(prefixes.includes('tech'));
    assert(prefixes.includes('geo'));
    assert(prefixes.length <= 200);

    const ranked = rankUniversities('georgia tech', [
      {
        id: '1',
        name: 'Georgia Institute of Technology-Main Campus',
        city: 'Atlanta',
        state: 'GA',
        aliases: ['Georgia Tech'],
      },
      {
        id: '2',
        name: 'Georgia Piedmont Technical College',
        city: 'Clarkston',
        state: 'GA',
        aliases: [],
      },
    ]);
    assert.equal(ranked[0]?.id, '1');
    assert.equal(
      universitySearchPrefix('University of California Los Angeles'),
      'california',
    );
  });

  it('uses a bounded indexed prefix lookup instead of loading the full catalog', async () => {
    const database = searchFirestore([
      catalogDocument('1', 'Georgia Piedmont Technical College'),
      catalogDocument(
        '2',
        'Georgia Institute of Technology-Main Campus',
        ['Georgia Tech'],
      ),
    ]);
    const service = new UniversityCatalogService(
      database.firestore as never,
      () => 'unused',
      fetch,
      () => new Date('2026-08-07T12:00:00.000Z'),
    );

    assert.equal((await service.search('Georgia Tech'))[0]?.id, '2');
    assert.equal(database.catalogReads, 1);
    assert.equal(database.requestedLimit, MAX_SEARCH_CANDIDATES);
    assert.deepEqual(database.whereClauses, [
      ['searchPrefixes', 'array-contains', 'georgia'],
    ]);
  });

  it('puts mapped clubs ahead of stronger textual matches', async () => {
    const database = searchFirestore([
      catalogDocument('1', 'Georgia Tech'),
      catalogDocument('2', 'Georgia Institute of Technology-Main Campus'),
    ], {
      '2': { clubId: 'campus-cats', clubName: 'Campus Cats' },
    }, [catalogDocument('1', 'Georgia Tech')]);
    const service = new UniversityCatalogService(
      database.firestore as never,
      () => 'unused',
    );

    const results = await service.search('Georgia Tech');

    assert.equal(results[0]?.id, '2');
    assert.equal(results[0]?.status, 'mapped');
    assert.equal(results[1]?.id, '1');
    assert.equal(database.batchedReads, 2);
  });

  it('loads every Scorecard page before returning the catalog', async () => {
    const pages: number[] = [];
    const firstPage = Array.from({ length: 100 }, (_, id) => ({ id }));
    const schools = await fetchScorecardCatalog(
      async (url) => {
        const page = Number(new URL(url).searchParams.get('page'));
        pages.push(page);
        return {
          ok: true,
          status: 200,
          json: async () => ({
            metadata: { total: 101, page },
            results: page === 0 ? firstPage : [{ id: 100 }],
          }),
        };
      },
      (page) => `https://scorecard.example/schools?page=${page}`,
    );

    assert.equal(schools.length, 101);
    assert.deepEqual(pages, [0, 1]);
  });

  it('rejects malformed or incomplete Scorecard pagination', async () => {
    await assert.rejects(
      () => fetchScorecardCatalog(
        async () => ({
          ok: true,
          status: 200,
          json: async () => ({ results: [] }),
        }),
        () => 'https://scorecard.example/schools',
      ),
      /malformed pagination/,
    );
    await assert.rejects(
      () => fetchScorecardCatalog(
        async () => ({
          ok: true,
          status: 200,
          json: async () => ({ metadata: { total: 100 }, results: [{ id: 1 }] }),
        }),
        () => 'https://scorecard.example/schools',
      ),
      /ended early/,
    );
  });
});
