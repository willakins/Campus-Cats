import { InMemoryCallableEffects } from '../adapters/inMemory/InMemoryCallableEffects';
import { InMemoryDocumentStore } from '../adapters/inMemory/InMemoryDocumentStore';
import { InMemoryImageSelection } from '../adapters/inMemory/InMemoryImageSelection';
import {
  InMemoryInaturalistEffects,
  InMemoryInaturalistReader,
} from '../adapters/inMemory/InMemoryInaturalist';
import { InMemoryMediaStore } from '../adapters/inMemory/InMemoryMediaStore';
import { InMemorySession } from '../adapters/inMemory/InMemorySession';
import { InMemoryUniversityOnboarding } from '../adapters/inMemory/InMemoryUniversityOnboarding';
import { InMemoryUniversitySelectionStore } from '../adapters/inMemory/InMemoryUniversitySelectionStore';
import {
  FixedClock,
  Role,
  SequenceIdGenerator,
  createPersistenceCodecs,
  parseChatDay,
  parseUser,
} from '../core/domain';
import { AppInfrastructure, createAppModules } from './createAppModules';

describe('createAppModules', () => {
  it('builds feature behavior entirely from app-owned infrastructure ports', async () => {
    const documents = new InMemoryDocumentStore();
    const infrastructure: AppInfrastructure = {
      documents,
      media: new InMemoryMediaStore(),
      effects: new InMemoryCallableEffects(),
      billing: {
        reader: {
          getSummary: async () => ({
            status: 'ready',
            projectId: 'test-project',
            exportProjectId: 'test-project',
            datasetId: 'test-billing',
            generatedAt: '2026-08-06T12:00:00.000Z',
            months: [],
          }),
        },
        presentation: {
          settingsSubtitle: 'Review monthly cloud costs',
          consoleDescription: 'Cloud billing consoles',
          consoleLinks: () => [],
          setup: () => ({
            message: 'Setup required',
            title: 'Setup',
            steps: [],
          }),
        },
      },
      clubBilling: {
        observeAccess: () => () => undefined,
        getSummary: async () => {
          throw new Error('Not used by this composition test');
        },
        createSetupSession: async () => ({ url: 'https://example.com/setup' }),
        createPortalSession: async () => ({ url: 'https://example.com/portal' }),
        payOutstandingInvoice: async () => ({ url: 'https://example.com/invoice' }),
        setCollectionMethod: async () => undefined,
        updateBillingEmail: async () => undefined,
        scheduleCancellation: async () => {
          throw new Error('Not used by this composition test');
        },
        resumeSubscription: async () => {
          throw new Error('Not used by this composition test');
        },
      },
      chat: {
        getDay: async (_actor, dayKey) =>
          parseChatDay({ dayKey, messages: [], reactions: [] }),
        observeDay: () => () => undefined,
        findPreviousActiveDay: async () => undefined,
        sendMessage: async () => {
          throw new Error('Not used by this composition test');
        },
        setReaction: async () => undefined,
        observePingState: () => () => undefined,
        markPingsRead: async () => undefined,
        observeCurrentRestriction: () => () => undefined,
        getRestriction: async () => undefined,
        muteForOneHour: async () => {
          throw new Error('Not used by this composition test');
        },
        setChatBanned: async () => {
          throw new Error('Not used by this composition test');
        },
      },
      inaturalist: {
        reader: new InMemoryInaturalistReader(),
        effects: new InMemoryInaturalistEffects(),
      },
      session: new InMemorySession(),
      surveySubmissions: {
        submit: async () => ({
          responseId: 'response-1',
          submittedAt: new Date('2026-08-06T12:00:00.000Z'),
        }),
      },
      communityVoting: {
        submitNomination: async (_actor, _vote, action) => ({
          action,
          submittedAt: new Date('2026-08-06T12:00:00.000Z'),
        }),
        submitBallot: async (_actor, _vote, optionId) => ({
          ballotId: 'ballot-1',
          optionId,
          submittedAt: new Date('2026-08-06T12:00:00.000Z'),
        }),
        getResults: async () => ({ totalVotes: 0, options: [] }),
      },
      whitelistSubmissions: {
        submit: async () => ({ status: 'created', id: 'application-1' }),
      },
      universityOnboarding: new InMemoryUniversityOnboarding(),
      universitySelections: new InMemoryUniversitySelectionStore(),
      images: new InMemoryImageSelection(),
      passwords: { generate: () => 'deterministic-password' },
      ids: new SequenceIdGenerator(['contact-1']),
      clock: new FixedClock(new Date('2026-08-06T12:00:00.000Z')),
      codecs: createPersistenceCodecs({
        encode: (date) => new Date(date),
        decode: (value) => {
          if (!(value instanceof Date)) throw new Error('Expected a date');
          return new Date(value);
        },
      }),
    };
    const modules = createAppModules(infrastructure);
    const officer = parseUser({
      id: 'officer-1',
      email: 'officer@gatech.edu',
      role: Role.Officer,
    });

    await expect(
      modules.contacts.create(officer, {
        name: 'Campus Cats',
        email: 'cats@gatech.edu',
      }),
    ).resolves.toMatchObject({
      ok: true,
      value: { id: 'contact-1', name: 'Campus Cats' },
    });
    await expect(modules.contacts.list(officer)).resolves.toMatchObject({
      ok: true,
      value: [{ id: 'contact-1', name: 'Campus Cats' }],
    });
    const tags = await modules.catalogTags.list(officer);
    expect(tags).toMatchObject({ ok: true });
    if (!tags.ok) throw new Error('Expected catalog tags');
    expect(tags.value).toContainEqual({ id: 'adopted', label: 'Adopted' });
  });
});
