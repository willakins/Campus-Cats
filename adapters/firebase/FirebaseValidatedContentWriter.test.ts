import { Timestamp } from 'firebase/firestore';
import { Functions, httpsCallable } from 'firebase/functions';
import { FirebaseValidatedContentWriter } from './FirebaseValidatedContentWriter';
jest.mock('firebase/firestore', () => ({
  Timestamp: class {
    readonly millis: number;
    constructor(millis: number) {
      this.millis = millis;
    }
    static fromMillis(millis: number) {
      return new this(millis);
    }
    toMillis() {
      return this.millis;
    }
  },
}));
jest.mock('firebase/functions', () => ({ httpsCallable: jest.fn() }));
it('sends survey fields without trusting client authorship or timestamps', async () => {
  const call = jest.fn().mockResolvedValue({});
  jest
    .mocked(httpsCallable)
    .mockReturnValue(Object.assign(call, { stream: jest.fn() }));
  await new FirebaseValidatedContentWriter({} as Functions).createSurvey(
    'club',
    'survey',
    {
      title: 'Survey',
      details: '',
      anonymous: true,
      questions: [],
      status: 'open',
      createdBy: { id: 'forged' },
    },
  );
  expect(httpsCallable).toHaveBeenCalledWith({}, 'createSurvey');
  expect(call).toHaveBeenCalledWith({
    clubId: 'club',
    id: 'survey',
    title: 'Survey',
    details: '',
    anonymous: true,
    participationAudience: 'all_members',
    questions: [],
  });
});
it('keeps tag deletion and assignment updates in one validated call', async () => {
  const call = jest.fn().mockResolvedValue({});
  jest
    .mocked(httpsCallable)
    .mockReturnValue(Object.assign(call, { stream: jest.fn() }));
  const writer = new FirebaseValidatedContentWriter({} as Functions);
  await writer.saveTags(
    'club',
    [],
    [
      {
        operation: 'put',
        collection: 'clubs/club/catalog-tag-assignments',
        id: 'cat',
        data: { tagIds: [] },
      },
    ],
  );
  expect(call).toHaveBeenCalledWith({
    clubId: 'club',
    tags: [],
    assignments: [{ catalogId: 'cat', tagIds: [] }],
  });
  await expect(
    writer.saveTags(
      'club',
      [],
      [
        {
          operation: 'put',
          collection: 'clubs/other/catalog-tag-assignments',
          id: 'cat',
          data: {},
        },
      ],
    ),
  ).rejects.toThrow();
});

it('sends a bounded contest duration instead of trusting supplied dates and authorship', async () => {
  const call = jest.fn().mockResolvedValue({});
  jest
    .mocked(httpsCallable)
    .mockReturnValue(Object.assign(call, { stream: jest.fn() }));
  const writer = new FirebaseValidatedContentWriter({} as Functions);
  await writer.createContest('club', 'contest', {
    title: 'Cats',
    details: '',
    options: [],
    votingStartsAt: Timestamp.fromMillis(1000),
    votingEndsAt: Timestamp.fromMillis(86401000),
    createdBy: { id: 'forged' },
  });
  expect(call).toHaveBeenCalledWith({
    clubId: 'club',
    id: 'contest',
    title: 'Cats',
    details: '',
    participationAudience: 'all_members',
    options: [],
    durationMillis: 86400000,
  });
  await expect(writer.createContest('club', 'contest', {})).rejects.toThrow(
    'Contest dates',
  );
});
