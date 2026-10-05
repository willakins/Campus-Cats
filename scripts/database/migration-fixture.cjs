// Synthetic import fixture covering features currently empty in production.
function fields(value) {
  return Object.fromEntries(
    Object.entries(value).map(([key, item]) => [key, encode(item)]),
  );
}
function encode(value) {
  if (value === null) return { nullValue: null };
  if (typeof value === 'string') return { stringValue: value };
  if (typeof value === 'number') return { integerValue: String(value) };
  if (typeof value === 'boolean') return { booleanValue: value };
  if (Array.isArray(value))
    return { arrayValue: { values: value.map(encode) } };
  return { mapValue: { fields: fields(value) } };
}
function fixture() {
  const club = 'import-fixture',
    project = 'demo-test',
    date = '2026-10-01T00:00:00Z';
  const user = {
    id: 'import-user',
    email: 'private@example.test',
    role: 0,
    clubId: club,
  };
  const records = {
    users: [['import-user', { role: 0, clubId: club }]],
    'public-profiles': [
      [
        'import-user',
        {
          displayName: 'Member',
          bio: '',
          role: 0,
          achievementIds: [],
          selectedTitleId: '',
        },
      ],
    ],
    catalog: [
      [
        'cat',
        {
          cat: { name: "Cat'); select 'safe", descShort: '', descLong: '' },
          createdAt: date,
        },
      ],
    ],
    'inaturalist-guide-profiles': [
      [
        '123',
        {
          displayName: 'Source name',
          shortDescription: 'Source description',
          sourceUrl: 'https://example.test/guide',
          sourceUpdatedAt: date,
          linkedLocalCatalogId: 'cat',
          matchStatus: 'linked',
          visible: true,
          sourceActive: true,
          overrides: { coverPhotoId: 'photo-2' },
          photos: [
            {
              id: 'photo-1',
              url: 'https://example.test/1.jpg',
              role: 'profile',
            },
            {
              id: 'photo-2',
              url: 'https://example.test/2.jpg',
              role: 'gallery',
            },
          ],
        },
      ],
    ],
    'cat-sightings': [
      [
        'sighting',
        {
          name: "Cat'); select 'safe",
          info: '',
          fed: false,
          health: true,
          date,
          createdBy: user,
          location: { latitude: 33, longitude: -84 },
        },
      ],
    ],
    'content-contributors': [
      ['sighting__sighting', { kind: 'sighting', contentId: 'sighting', user }],
    ],
    stations: [
      [
        'station',
        {
          name: 'Station',
          location: { latitude: 33, longitude: -84 },
          stockingFreq: 7,
          lastStocked: date,
        },
      ],
    ],
    alerts: [
      [
        'alert',
        { title: 'Alert', info: 'Details', createdAt: date, createdBy: user },
      ],
    ],
    'alert-read-receipts': [
      ['r1', { alertId: 'alert', userId: user.id, readAt: date }],
    ],
    'community-events': [
      [
        'event',
        {
          title: 'Event',
          details: '',
          createdAt: date,
          startsAt: date,
          expiresAt: '2026-10-02T00:00:00Z',
          location: 'Campus',
          imageUrl: 'https://example.test/event.jpg',
          createdBy: user,
        },
      ],
    ],
    'event-read-receipts': [
      ['r1', { eventId: 'event', userId: user.id, readAt: date }],
    ],
    'catalog-tag-settings': [
      ['catalog', { tags: [{ id: 'tag', label: 'Tag' }] }],
    ],
    'catalog-tag-assignments': [['cat', { catalogId: 'cat', tagIds: ['tag'] }]],
    'catalog-favorites': [
      ['import-user', { catalogId: 'cat', userId: user.id, createdAt: date }],
    ],
    'community-surveys': [
      [
        'survey',
        {
          title: 'Survey',
          details: '',
          anonymous: true,
          participationAudience: 'all_members',
          status: 'open',
          createdAt: date,
          createdBy: user,
          questions: [
            {
              id: 'q1',
              type: 'single_choice',
              prompt: 'Choice',
              options: [{ id: 'o1', label: 'One' }],
            },
            {
              id: 'q2',
              type: 'multi_select',
              prompt: 'Multiple',
              options: [{ id: 'o2', label: 'Two' }],
            },
            { id: 'q3', type: 'short_text', prompt: 'Text', options: [] },
          ],
        },
      ],
    ],
    'survey-responses': [
      [
        'response',
        {
          surveyId: 'survey',
          submittedAt: date,
          answers: [
            { questionId: 'q1', value: 'o1' },
            { questionId: 'q2', value: ['o2'] },
            { questionId: 'q3', value: 'A response' },
          ],
        },
      ],
    ],
    'survey-submission-receipts': [
      [
        'r1',
        {
          userId: user.id,
          surveyId: 'survey',
          responseId: 'response',
          submittedAt: date,
        },
      ],
    ],
    'community-votes': [
      [
        'contest',
        {
          kind: 'contest',
          title: 'Contest',
          details: '',
          createdAt: date,
          createdBy: user,
          participationAudience: 'all_members',
          votingStartsAt: date,
          votingEndsAt: '2026-10-03T00:00:00Z',
          options: [{ id: 'o1', label: 'One' }],
        },
      ],
      [
        'election',
        {
          kind: 'presidential_election',
          title: 'Election',
          details: '',
          createdAt: date,
          participationAudience: 'all_members',
          votingStartsAt: '2026-10-02T00:00:00Z',
          nominationEndsAt: '2026-10-02T00:00:00Z',
          votingEndsAt: '2026-10-03T00:00:00Z',
          options: [],
        },
      ],
    ],
    'community-vote-nominees': [
      [
        'n1',
        {
          voteId: 'election',
          userId: user.id,
          displayName: 'Member',
          nominatedAt: date,
        },
      ],
    ],
    'community-vote-ballots': [
      [
        'b1',
        {
          voteId: 'contest',
          optionId: 'o1',
          submittedAt: date,
          billingActorId: user.id,
        },
      ],
      [
        'b2',
        {
          voteId: 'election',
          optionId: user.id,
          submittedAt: '2026-10-02T01:00:00Z',
        },
      ],
    ],
    'community-vote-ballot-receipts': [
      ['r1', { voteId: 'contest', userId: user.id, ballotId: 'b1' }],
      ['r2', { voteId: 'election', userId: user.id, ballotId: 'b2' }],
    ],
    'community-vote-nomination-receipts': [
      ['r1', { voteId: 'election', userId: user.id }],
    ],
    'community-vote-state': [['state', { votingNotificationSentAt: date }]],
    'sighting-comments': [
      [
        'comment',
        {
          target: { kind: 'sighting', id: 'sighting' },
          source: 'campus-cats',
          body: 'Hello',
          createdAt: date,
          createdById: user.id,
        },
      ],
    ],
    'inaturalist-public-links': [
      [
        'link',
        {
          inaturalistUserId: 123,
          userId: user.id,
          login: 'public-login',
          linkedAt: date,
        },
      ],
    ],
    'inaturalist-comment-moderation': [
      ['mod', { hidden: true, reason: 'Review' }],
    ],
  };
  return {
    snapshot: {
      version: 1,
      project,
      club,
      consistentSnapshot: false,
      documents: [
        {
          path: `clubs/${club}`,
          fields: fields({ name: 'Fixture' }),
          updateTime: date,
        },
        ...Object.entries(records).flatMap(([collection, docs]) =>
          docs.map(([id, data]) => ({
            path: `${collection}/${id}`,
            fields: fields(data),
            updateTime: date,
          })),
        ),
      ],
    },
    manifest: {
      version: 1,
      project,
      club,
      sources: Object.fromEntries(
        Object.keys(records).map((collection) => [collection, 'root']),
      ),
    },
  };
}
module.exports = { fixture };
