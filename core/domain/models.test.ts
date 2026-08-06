import {
  COLLECTIONS,
  Role,
  createPersistenceCodecs,
  parseAnnouncement,
  parseClubEvent,
  parseCatalogFavorite,
  parseCatalogEntry,
  parseContact,
  parseManagedUser,
  parsePublicProfile,
  parseSighting,
  parseStation,
  parseSurvey,
  parseSurveyResponse,
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
      parseClubEvent({
        id: 'event-1',
        title: 'Volunteer workshop',
        details: 'Learn how to support campus cats.',
        location: 'Student Center',
        startsAt: createdAt,
        expiresAt: new Date('2025-04-11T23:59:59.999Z'),
        imageUrl: 'https://example.com/event.jpg',
        createdAt,
        createdBy: member,
      }),
      parseSurvey({
        id: 'survey-1',
        title: 'Volunteer interests',
        details: '',
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
        createdBy: member,
      }),
      parseSurveyResponse({
        id: 'response-1',
        surveyId: 'survey-1',
        answers: [{ questionId: 'question-1', value: 'A workshop' }],
        submittedAt: createdAt,
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
      parseCatalogFavorite({
        userId: 'member-1',
        catalogId: 'cat-1',
        createdAt,
      }),
      parsePublicProfile({
        id: 'member-1',
        displayName: 'Cat Watcher',
        bio: 'I watch cats.',
        profilePhotoUrl: 'https://storage.example/profile.jpg',
        role: Role.Member,
        achievementIds: ['profile-photo'],
        selectedTitleId: 'profile-photo',
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

  it('parses the developer role as a persisted user role', () => {
    expect(
      parseUser({
        id: 'developer-1',
        email: 'developer@gatech.edu',
        role: Role.Developer,
      }),
    ).toMatchObject({ role: 4 });
  });

  it('keeps managed-account moderation separate from content authors', () => {
    const managed = parseManagedUser({
      ...member,
      banned: true,
      disciplinaryNotices: [
        {
          id: 'notice-1',
          message: 'Posted an inappropriate image',
          createdAt: new Date('2026-08-05T12:00:00.000Z'),
          issuedById: 'officer-1',
          issuedByEmail: 'officer@gatech.edu',
        },
      ],
    });

    expect(managed).toMatchObject({
      banned: true,
      disciplinaryNotices: [{ message: 'Posted an inappropriate image' }],
    });
    expect(parseUser(managed)).toEqual(member);
  });

  it('rejects duplicate achievements and locked displayed titles', () => {
    const baseProfile = {
      id: 'member-1',
      displayName: 'Cat Watcher',
      bio: '',
      profilePhotoUrl: '',
      role: Role.Member,
      achievementIds: ['first-sighting'],
      selectedTitleId: 'first-sighting',
    };

    expect(() =>
      parsePublicProfile({
        ...baseProfile,
        achievementIds: ['first-sighting', 'first-sighting'],
      }),
    ).toThrow('Achievements must be unique');
    expect(() =>
      parsePublicProfile({
        ...baseProfile,
        achievementIds: [],
      }),
    ).toThrow('The displayed title must be unlocked');
  });
});

describe('persistence codecs', () => {
  const timestamp = (value: string) => ({
    toDate: () => new Date(value),
  });
  const codecs = createPersistenceCodecs({
    encode: (value) => ({ encodedDate: value.toISOString() }),
    decode: (value) => {
      if (value instanceof Date) return new Date(value);
      if (
        typeof value !== 'object' ||
        value === null ||
        !('toDate' in value) ||
        typeof value.toDate !== 'function'
      ) {
        throw new Error('Expected a test timestamp');
      }
      return value.toDate();
    },
  });

  it('keeps coordinate values attached to their named fields', () => {
    const sighting = codecs.sighting.decode('sighting-1', {
      name: 'Goldie',
      info: 'Near Tech Tower',
      fed: true,
      health: true,
      spotted_time: timestamp('2025-04-10T12:00:00.000Z'),
      location: { longitude: -84.394, latitude: 33.772 },
      createdBy: member,
      timeofDay: 'Afternoon',
    });

    expect(sighting.location).toEqual({
      latitude: 33.772,
      longitude: -84.394,
    });
    expect(codecs.sighting.encode(sighting)).toMatchObject({
      location: { latitude: 33.772, longitude: -84.394 },
    });
  });

  it('preserves public sighting fields while separating contributor identity', () => {
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
      timeofDay: 'Afternoon',
    });
    expect(COLLECTIONS.sightings).toBe('cat-sightings');
    expect(COLLECTIONS.contentContributors).toBe('content-contributors');
    expect(
      codecs.contentContributor.encode(
        codecs.contentContributor.decode('sighting__sighting-1', {
          kind: 'sighting',
          contentId: 'sighting-1',
          user: member,
        }),
      ),
    ).toEqual({
      kind: 'sighting',
      contentId: 'sighting-1',
      user: member,
    });
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

  it('stores one favorite under the account ID without duplicating it in the payload', () => {
    const favorite = codecs.catalogFavorite.decode('member-1', {
      catalogId: 'inat-guide-2113386',
      createdAt: timestamp('2025-04-10T12:00:00.000Z'),
    });

    expect(favorite).toMatchObject({
      userId: 'member-1',
      catalogId: 'inat-guide-2113386',
    });
    expect(codecs.catalogFavorite.encode(favorite)).toEqual({
      catalogId: 'inat-guide-2113386',
      createdAt: { encodedDate: '2025-04-10T12:00:00.000Z' },
    });
    expect(COLLECTIONS.catalogFavorites).toBe('catalog-favorites');
  });

  it('converts community dates and omits identity from anonymous survey responses', () => {
    const event = codecs.clubEvent.decode('event-1', {
      title: 'Volunteer workshop',
      details: 'Learn how to support campus cats.',
      location: 'Student Center',
      startsAt: timestamp('2025-04-10T12:00:00.000Z'),
      expiresAt: timestamp('2025-04-11T23:59:59.999Z'),
      imageUrl: 'https://example.com/event.jpg',
      createdAt: timestamp('2025-04-01T12:00:00.000Z'),
      createdBy: member,
    });
    expect(event.startsAt).toEqual(new Date('2025-04-10T12:00:00.000Z'));
    expect(codecs.clubEvent.encode(event)).toMatchObject({
      startsAt: { encodedDate: '2025-04-10T12:00:00.000Z' },
      expiresAt: { encodedDate: '2025-04-11T23:59:59.999Z' },
    });

    const response = parseSurveyResponse({
      id: 'response-1',
      surveyId: 'survey-1',
      answers: [{ questionId: 'question-1', value: 'A workshop' }],
      submittedAt: new Date('2025-04-10T12:00:00.000Z'),
    });
    expect(codecs.surveyResponse.encode(response)).toEqual({
      surveyId: 'survey-1',
      answers: [{ questionId: 'question-1', value: 'A workshop' }],
      submittedAt: { encodedDate: '2025-04-10T12:00:00.000Z' },
    });
    expect(COLLECTIONS.surveySubmissionReceipts).toBe(
      'survey-submission-receipts',
    );
  });

  it('accepts native dates and rejects invalid document and timestamp shapes', () => {
    expect(
      codecs.announcement.decode('announcement-1', {
        title: 'Update',
        info: 'Details',
        createdAt: new Date('2025-04-10T12:00:00.000Z'),
        createdBy: member,
        authorAlias: 'Campus Cats',
      }),
    ).toMatchObject({ createdAt: new Date('2025-04-10T12:00:00.000Z') });
    expect(() => codecs.user.decode('member-1', null)).toThrow(
      'Expected persisted document data',
    );
    expect(() => codecs.user.decode('member-1', [])).toThrow(
      'Expected persisted document data',
    );
    expect(() =>
      codecs.announcement.decode('announcement-1', {
        title: 'Update',
        info: 'Details',
        createdAt: 'not-a-timestamp',
        createdBy: member,
        authorAlias: 'Campus Cats',
      }),
    ).toThrow('Expected a test timestamp');
  });

  it('defaults legacy users to active and decodes disciplinary history', () => {
    expect(codecs.user.decode('member-1', {
      email: 'member@gatech.edu',
      role: Role.Member,
    })).toMatchObject({ banned: false, disciplinaryNotices: [] });

    const managed = codecs.user.decode('member-1', {
      email: 'member@gatech.edu',
      role: Role.Member,
      banned: true,
      disciplinaryNotices: [
        {
          id: 'notice-1',
          message: 'Posted an inappropriate image',
          createdAt: timestamp('2026-08-05T12:00:00.000Z'),
          issuedById: 'officer-1',
          issuedByEmail: 'officer@gatech.edu',
        },
      ],
    });
    expect(managed.disciplinaryNotices[0]?.createdAt).toEqual(
      new Date('2026-08-05T12:00:00.000Z'),
    );
    expect(codecs.user.encode(managed)).toMatchObject({
      banned: true,
      disciplinaryNotices: [
        { createdAt: { encodedDate: '2026-08-05T12:00:00.000Z' } },
      ],
    });
  });

  it('keeps public profile data separate from private moderation records', () => {
    const profile = codecs.publicProfile.decode('member-1', {
      displayName: 'Cat Watcher',
      bio: 'I watch cats.',
      profilePhotoUrl: '',
      role: Role.Member,
      achievementIds: ['first-sighting'],
      selectedTitleId: 'first-sighting',
    });

    expect(profile).toMatchObject({
      id: 'member-1',
      displayName: 'Cat Watcher',
      achievementIds: ['first-sighting'],
    });
    expect(codecs.publicProfile.encode(profile)).not.toHaveProperty('id');
    expect(COLLECTIONS.publicProfiles).toBe('public-profiles');
  });
});
