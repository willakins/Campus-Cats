import {
  COLLECTIONS,
  Role,
  createFirestoreCodecs,
  parseAnnouncement,
  parseCatalogEntry,
  parseContact,
  parseSighting,
  parseStation,
  parseUser,
  parseWhitelistApplication,
} from './index';

const member = {
  id: 'member-1',
  email: 'member@gatech.edu',
  role: Role.Member,
};

describe('canonical domain models', () => {
  it('parses immutable records for every persisted feature', () => {
    const createdAt = new Date('2025-04-10T12:00:00.000Z');
    const catalog = parseCatalogEntry({
      id: 'cat-1',
      cat: {
        name: 'Goldie',
        descShort: 'Friendly orange cat',
        descLong: 'Often seen around central campus.',
        colorPattern: 'Orange',
        behavior: 'Friendly',
        yearsRecorded: '2024-2025',
        AoR: 'Tech Tower',
        currentStatus: 'Feral',
        furLength: 'Short',
        furPattern: 'Tabby',
        tnr: 'Yes',
        sex: 'Female',
      },
      credits: 'Campus Cats team',
      createdAt,
      createdBy: member,
    });
    const records = [
      parseUser(member),
      parseSighting({
        id: 'sighting-1',
        name: 'Goldie',
        info: 'Near Tech Tower',
        fed: true,
        health: true,
        date: createdAt,
        location: { latitude: 33.772, longitude: -84.394 },
        createdBy: member,
        timeOfDay: 'Afternoon',
      }),
      catalog,
      parseStation({
        id: 'station-1',
        name: 'Tech Tower Station',
        location: { latitude: 33.772, longitude: -84.394 },
        lastStocked: createdAt,
        stockingFreq: 7,
        knownCats: 'Goldie',
        createdBy: member,
      }),
      parseAnnouncement({
        id: 'announcement-1',
        title: 'Volunteer shift',
        info: 'Meet near the station.',
        createdAt,
        createdBy: member,
        authorAlias: 'Campus Cats',
      }),
      parseWhitelistApplication({
        id: 'application-1',
        name: 'Alex Student',
        graduationYear: '2027',
        email: 'alex@gatech.edu',
        codeWord: 'meow',
      }),
      parseContact({
        id: 'contact-1',
        name: 'Campus Cats',
        email: 'cats@gatech.edu',
      }),
    ];

    for (const record of records) {
      expect(Object.isFrozen(record)).toBe(true);
    }
    expect(Object.isFrozen(catalog.cat)).toBe(true);
  });

  it('rejects invalid persisted values instead of creating dummy records', () => {
    expect(() => parseUser({ ...member, email: 'not-an-email' })).toThrow();
    expect(() =>
      parseStation({
        id: 'station-1',
        name: '',
        location: { latitude: 200, longitude: -84.394 },
        lastStocked: new Date('invalid'),
        stockingFreq: 0,
        knownCats: '',
        createdBy: member,
      }),
    ).toThrow();
  });
});

describe('Firestore codecs', () => {
  const timestamp = (value: string) => ({
    toDate: () => new Date(value),
  });
  const codecs = createFirestoreCodecs({
    fromDate: (value) => ({ encodedDate: value.toISOString() }),
  });

  it('preserves existing collection and sighting field names', () => {
    const sighting = codecs.sighting.decode('sighting-1', {
      name: 'Goldie',
      info: 'Near Tech Tower',
      fed: true,
      health: true,
      spotted_time: timestamp('2025-04-10T12:00:00.000Z'),
      location: { latitude: 33.772, longitude: -84.394 },
      createdBy: member,
      timeofDay: 'Afternoon',
    });

    expect(sighting.timeOfDay).toBe('Afternoon');
    expect(codecs.sighting.encode(sighting)).toEqual({
      name: 'Goldie',
      info: 'Near Tech Tower',
      fed: true,
      health: true,
      spotted_time: { encodedDate: '2025-04-10T12:00:00.000Z' },
      location: { latitude: 33.772, longitude: -84.394 },
      createdBy: member,
      timeofDay: 'Afternoon',
    });
    expect(COLLECTIONS.sightings).toBe('cat-sightings');
  });

  it('decodes station timestamps and derives no clock-dependent state', () => {
    expect(
      codecs.station.decode('station-1', {
        name: 'Tech Tower Station',
        location: { latitude: 33.772, longitude: -84.394 },
        lastStocked: timestamp('2025-04-10T12:00:00.000Z'),
        stockingFreq: 7,
        knownCats: 'Goldie',
        createdBy: member,
      }),
    ).toMatchObject({
      id: 'station-1',
      lastStocked: new Date('2025-04-10T12:00:00.000Z'),
    });
  });
});
