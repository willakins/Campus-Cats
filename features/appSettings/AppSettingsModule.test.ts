import { InMemoryDocumentStore } from '../../adapters/inMemory/InMemoryDocumentStore';
import { InMemoryMediaStore } from '../../adapters/inMemory/InMemoryMediaStore';
import {
  DEFAULT_APP_SETTINGS,
  Role,
  SequenceIdGenerator,
  createPersistenceCodecs,
  dateObjectCodec,
  parseUser,
} from '../../core/domain';
import { MediaCoordinator } from '../../core/media';
import { AppSettingsModule } from './AppSettingsModule';

const president = parseUser({
  id: 'president-1',
  email: 'president@gatech.edu',
  role: Role.President,
});
const developer = parseUser({
  id: 'developer-1',
  email: 'developer@gatech.edu',
  role: Role.Developer,
});
const officer = parseUser({
  id: 'officer-1',
  email: 'officer@gatech.edu',
  role: Role.Officer,
});
const member = parseUser({
  id: 'member-1',
  email: 'member@gatech.edu',
  role: Role.Member,
});

const buildModule = () => {
  const documents = new InMemoryDocumentStore();
  const media = new InMemoryMediaStore();
  const ids = new SequenceIdGenerator(['logo-1', 'donation-1', 'donation-2']);
  const codecs = createPersistenceCodecs(dateObjectCodec);
  const migrateContributorPrivacy = jest.fn().mockResolvedValue(undefined);
  return {
    documents,
    media,
    migrateContributorPrivacy,
    module: new AppSettingsModule({
      documents,
      mediaCoordinator: new MediaCoordinator(media, ids),
      codecs: { appSettings: codecs.appSettings },
      migrateContributorPrivacy,
    }),
  };
};

describe('AppSettingsModule', () => {
  it('uses anonymous, repository-safe defaults before settings are created', async () => {
    const { module } = buildModule();

    await expect(module.get()).resolves.toEqual({
      ok: true,
      value: DEFAULT_APP_SETTINGS,
      warnings: [],
    });
  });

  it('allows President-level roles to save validated branding and privacy', async () => {
    const { module, migrateContributorPrivacy } = buildModule();
    const draft = {
      logoUrl: '',
      primaryColor: '#0057b8',
      accentColor: '#f5a623',
      sightingsAnonymous: true,
    };

    await expect(module.save(developer, draft)).resolves.toMatchObject({
      ok: true,
    });
    await expect(module.save(president, draft)).resolves.toMatchObject({
      ok: true,
      value: {
        primaryColor: '#0057B8',
        accentColor: '#F5A623',
        sightingsAnonymous: true,
      },
    });
    expect(migrateContributorPrivacy).toHaveBeenCalledTimes(1);

    await module.save(president, draft);
    expect(migrateContributorPrivacy).toHaveBeenCalledTimes(1);

    await expect(module.get()).resolves.toMatchObject({
      ok: true,
      value: {
        ...draft,
        primaryColor: '#0057B8',
        accentColor: '#F5A623',
      },
    });
  });

  it('requires authentication before saving settings', async () => {
    const { module } = buildModule();

    await expect(
      module.save(undefined, DEFAULT_APP_SETTINGS),
    ).resolves.toMatchObject({
      ok: false,
      error: { code: 'unauthenticated' },
    });
  });

  it('uploads a replacement login logo before publishing its URL', async () => {
    const { module, media } = buildModule();

    await expect(
      module.save(president, DEFAULT_APP_SETTINGS, 'file://new-logo.png'),
    ).resolves.toMatchObject({
      ok: true,
      value: { logoUrl: 'memory://app-branding/profile-logo-1.jpg' },
    });
    expect(media.ids()).toEqual(['app-branding/profile-logo-1.jpg']);
  });

  it('does not repeat contributor migration when replacing a logo', async () => {
    const { module, migrateContributorPrivacy } = buildModule();
    await module.save(president, DEFAULT_APP_SETTINGS);

    await expect(
      module.save(president, DEFAULT_APP_SETTINGS, 'file://new-logo.png'),
    ).resolves.toMatchObject({ ok: true });

    expect(migrateContributorPrivacy).toHaveBeenCalledTimes(1);
  });

  it('reports logo upload failures without publishing settings', async () => {
    const { module, media, documents } = buildModule();
    media.failNext('upload', new Error('offline'));

    await expect(
      module.save(president, DEFAULT_APP_SETTINGS, 'file://new-logo.png'),
    ).resolves.toMatchObject({
      ok: false,
      error: { code: 'dependency_failure' },
    });
    await expect(documents.list('app-settings')).resolves.toEqual([]);
  });

  it('reports document write failures', async () => {
    const { module, documents } = buildModule();
    documents.failNext('put', new Error('offline'));

    await expect(
      module.save(president, {
        ...DEFAULT_APP_SETTINGS,
        sightingsAnonymous: false,
      }),
    ).resolves.toMatchObject({
      ok: false,
      error: { code: 'dependency_failure' },
    });
  });

  it('migrates again when contributor visibility changes from public to anonymous', async () => {
    const { module, migrateContributorPrivacy } = buildModule();

    await module.save(president, {
      ...DEFAULT_APP_SETTINGS,
      sightingsAnonymous: false,
    });
    expect(migrateContributorPrivacy).not.toHaveBeenCalled();

    await module.save(president, DEFAULT_APP_SETTINGS);
    expect(migrateContributorPrivacy).toHaveBeenCalledTimes(1);
  });

  it('rejects malformed color values without writing settings', async () => {
    const { module, documents } = buildModule();

    await expect(
      module.save(president, {
        ...DEFAULT_APP_SETTINGS,
        primaryColor: 'navy',
      }),
    ).resolves.toMatchObject({
      ok: false,
      error: { code: 'validation' },
    });
    await expect(documents.list('app-settings')).resolves.toEqual([]);
  });

  it('lets President-level roles publish an external donation page with one optional photo', async () => {
    const { module, media } = buildModule();
    const donation = {
      title: 'Help feed the colony',
      description: 'Your gift pays for food and veterinary care.',
      method: 'external' as const,
      externalUrl: 'https://give.example.org/campus-cats',
    };
    const images = [
      { kind: 'local' as const, localUri: 'file://donation-one.jpg' },
    ];

    await expect(
      module.saveDonationPage(member, donation, images),
    ).resolves.toMatchObject({ ok: false, error: { code: 'forbidden' } });
    await expect(
      module.saveDonationPage(officer, donation, images),
    ).resolves.toMatchObject({ ok: false, error: { code: 'forbidden' } });

    await expect(
      module.saveDonationPage(president, donation, images),
    ).resolves.toMatchObject({
      ok: true,
      value: {
        donationPage: {
          ...donation,
          images: [
            {
              id: 'donations/logo-1.jpg',
              url: 'memory://donations/logo-1.jpg',
            },
          ],
        },
      },
    });
    expect(media.ids()).toEqual(['donations/logo-1.jpg']);

    await expect(
      module.saveDonationPage(developer, donation, []),
    ).resolves.toMatchObject({ ok: true });
  });

  it('requires a valid link only for externally hosted donations', async () => {
    const { module } = buildModule();

    await expect(
      module.saveDonationPage(
        president,
        {
          title: 'Support Campus Cats',
          description: 'Help us care for community cats.',
          method: 'external',
          externalUrl: '',
        },
        [],
      ),
    ).resolves.toMatchObject({ ok: false, error: { code: 'validation' } });
    await expect(
      module.saveDonationPage(
        president,
        {
          title: 'Support Campus Cats',
          description: 'Help us care for community cats.',
          method: 'external',
          externalUrl: 'http://give.example.org/campus-cats',
        },
        [],
      ),
    ).resolves.toMatchObject({ ok: false, error: { code: 'validation' } });

    await expect(
      module.saveDonationPage(
        president,
        {
          title: 'Support Campus Cats',
          description: 'Help us care for community cats.',
          method: 'direct',
          externalUrl: '',
        },
        [],
      ),
    ).resolves.toMatchObject({ ok: false, error: { code: 'validation' } });
  });

  it('preserves the donation page when branding and privacy are saved', async () => {
    const { module } = buildModule();
    const donation = {
      title: 'Support Campus Cats',
      description: 'Help us care for community cats.',
      method: 'external' as const,
      externalUrl: 'https://give.example.org/campus-cats',
    };
    await module.saveDonationPage(president, donation, []);

    await module.save(president, {
      logoUrl: '',
      primaryColor: '#0057B8',
      accentColor: '#F5A623',
      sightingsAnonymous: false,
    });

    await expect(module.get()).resolves.toMatchObject({
      ok: true,
      value: { donationPage: { ...donation, images: [] } },
    });
  });

  it('rejects more than one donation photo before uploading any media', async () => {
    const { module, media } = buildModule();
    const images = Array.from({ length: 2 }, (_, index) => ({
      kind: 'local' as const,
      localUri: `file://donation-${index}.jpg`,
    }));

    await expect(
      module.saveDonationPage(
        president,
        {
          title: 'Support Campus Cats',
          description: 'Help us care for community cats.',
          method: 'external',
          externalUrl: 'https://give.example.org/campus-cats',
        },
        images,
      ),
    ).resolves.toMatchObject({ ok: false, error: { code: 'validation' } });
    expect(media.ids()).toEqual([]);
  });
});
