'use strict';

const assert = require('node:assert/strict');
const { describe, it } = require('node:test');

const { __test } = require('./index');

const document = (id, data) => ({
  id,
  exists: data !== undefined,
  data: () => data,
});

const fakeFirestore = (collections) => ({
  collection(name) {
    const values = collections[name] ?? {};
    return {
      async get() {
        return { docs: Object.entries(values).map(([id, data]) => document(id, data)) };
      },
      doc(id) {
        return { get: async () => document(id, values[id]) };
      },
      where(field, _operator, expected) {
        const matches = Object.entries(values)
          .filter(([, data]) => data[field]?.includes(expected))
          .map(([id, data]) => document(id, data));
        return {
          limit(limit) {
            return { get: async () => ({ docs: matches.slice(0, limit) }) };
          },
        };
      },
    };
  },
  async getAll(...references) {
    return Promise.all(references.map((reference) => reference.get()));
  },
});

const database = () => fakeFirestore({
  universities: {
    '139658': {
      name: 'Emory University',
      city: 'Atlanta',
      state: 'GA',
      active: true,
      aliases: [],
      emailDomains: ['emory.edu'],
      timezone: 'America/New_York',
      searchPrefixes: ['em', 'emo', 'emor', 'emory'],
    },
    '139755': {
      name: 'Georgia Institute of Technology-Main Campus',
      city: 'Atlanta',
      state: 'GA',
      active: true,
      aliases: ['Georgia Tech'],
      emailDomains: ['gatech.edu'],
      timezone: 'America/New_York',
      searchPrefixes: ['ge', 'geo', 'geor', 'georg', 'georgia'],
    },
  },
  'university-clubs': {
    '139755': { clubId: 'campus-cats', clubName: 'Campus Cats' },
  },
  'university-club-claims': {},
});

describe('development catalog functions', () => {
  it('searches the full cloned catalog instead of a hardcoded fixture', async () => {
    const results = await __test.searchCatalog(database(), 'Emory');

    assert.deepEqual(results, [{
      id: '139658',
      name: 'Emory University',
      city: 'Atlanta',
      state: 'GA',
      emailDomains: ['emory.edu'],
      timezone: 'America/New_York',
      status: 'unclaimed',
    }]);
  });

  it('restores the mapped Campus Cats club without exposing setup', async () => {
    const result = await __test.getUniversityCatalog(database(), '139755');

    assert.equal(result.status, 'mapped');
    assert.deepEqual(result.club, {
      id: 'campus-cats',
      name: 'Campus Cats',
      emailEnabled: true,
    });
  });

  it('rejects invalid university identifiers at the callable boundary', async () => {
    await assert.rejects(
      __test.getUniversityCatalog(database(), '../clubs/campus-cats'),
      (error) => error.code === 'invalid-argument',
    );
  });
});
