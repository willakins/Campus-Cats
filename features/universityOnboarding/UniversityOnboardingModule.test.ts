import { InMemoryUniversityOnboarding } from '../../adapters/inMemory/InMemoryUniversityOnboarding';
import { InMemoryUniversitySelectionStore } from '../../adapters/inMemory/InMemoryUniversitySelectionStore';
import { UniversityOnboardingModule } from './UniversityOnboardingModule';
import type {
  UniversityOnboardingPort,
  UniversitySelectionStore,
} from '../../core/ports';

const georgiaTech = {
  id: '139755',
  name: 'Georgia Institute of Technology-Main Campus',
  city: 'Atlanta',
  state: 'GA',
  emailDomains: ['gatech.edu'],
  timezone: 'America/New_York',
  status: 'mapped' as const,
  club: {
    id: 'campus-cats',
    name: 'Campus Cats',
    emailEnabled: true,
    saml: { provider: 'gt-sso' as const, label: 'Georgia Tech SSO' },
  },
};

const emory = {
  id: '139658',
  name: 'Emory University',
  city: 'Atlanta',
  state: 'GA',
  emailDomains: ['emory.edu'],
  timezone: 'America/New_York',
  status: 'unclaimed' as const,
};

const draft = {
  universityId: emory.id,
  clubName: 'Emory Campus Cats',
  primaryColor: '#012169',
  accentColor: '#F2A900',
  presidentChoice: 'self' as const,
  presidentEmail: 'president@emory.edu',
};

describe('UniversityOnboardingModule', () => {
  it('searches only after two normalized characters and persists a selected club', async () => {
    const gateway = new InMemoryUniversityOnboarding([georgiaTech, emory]);
    const selections = new InMemoryUniversitySelectionStore();
    const module = new UniversityOnboardingModule({ gateway, selections });

    await expect(module.search('g')).resolves.toMatchObject({ ok: true, value: [] });
    await expect(module.search('  Georgia  ')).resolves.toMatchObject({
      ok: true,
      value: [georgiaTech],
    });
    await expect(module.refreshSelection()).resolves.toEqual({
      ok: true,
      value: undefined,
      warnings: [],
    });
    await module.select(georgiaTech);
    await expect(module.restoreSelection()).resolves.toMatchObject({
      ok: true,
      value: { universityId: '139755', clubId: 'campus-cats' },
    });
    await expect(module.clearSelection()).resolves.toMatchObject({ ok: true });
  });

  it('requires an unclaimed, claimable school and its approved email domain', async () => {
    const gateway = new InMemoryUniversityOnboarding([georgiaTech, emory]);
    const module = new UniversityOnboardingModule({
      gateway,
      selections: new InMemoryUniversitySelectionStore(),
    });
    await expect(module.requestSetup({
      ...draft,
      presidentEmail: 'president@example.com',
    })).resolves.toMatchObject({
      ok: false,
      error: { code: 'validation' },
    });
    await expect(module.requestSetup(draft)).resolves.toMatchObject({
      ok: true,
      value: { universityId: emory.id },
    });
  });

  it('refreshes an unmapped selection after verification creates its club', async () => {
    const gateway = new InMemoryUniversityOnboarding([emory]);
    const selections = new InMemoryUniversitySelectionStore();
    const module = new UniversityOnboardingModule({ gateway, selections });
    await module.select(emory);
    gateway.mapUniversity(emory.id, {
      id: 'club-139658',
      name: 'Emory Campus Cats',
      emailEnabled: true,
    });

    await expect(
      module.verifySetup('request-139658', 'valid-token'),
    ).resolves.toMatchObject({
      ok: true,
      value: { university: { club: { id: 'club-139658' } } },
    });
    await expect(module.refreshSelection()).resolves.toMatchObject({
      ok: true,
      value: { clubId: 'club-139658' },
    });
  });

  it('reports dependency and local-selection storage failures', async () => {
    const unavailableGateway: UniversityOnboardingPort = {
      search: async () => { throw new Error('offline'); },
      get: async () => { throw new Error('offline'); },
      requestSetup: async () => { throw new Error('offline'); },
      verifySetup: async () => { throw new Error('offline'); },
    };
    const unavailableSelections: UniversitySelectionStore = {
      load: async () => { throw new Error('storage unavailable'); },
      save: async () => { throw new Error('storage unavailable'); },
      clear: async () => { throw new Error('storage unavailable'); },
    };
    const module = new UniversityOnboardingModule({
      gateway: unavailableGateway,
      selections: unavailableSelections,
    });

    await expect(module.search('emory')).resolves.toMatchObject({
      ok: false,
      error: { code: 'dependency_failure' },
    });
    await expect(module.get(emory.id)).resolves.toMatchObject({
      ok: false,
      error: { code: 'dependency_failure' },
    });
    await expect(module.select(emory)).resolves.toMatchObject({
      ok: false,
      error: { code: 'dependency_failure' },
    });
    await expect(module.restoreSelection()).resolves.toMatchObject({
      ok: false,
      error: { code: 'dependency_failure' },
    });
    await expect(module.clearSelection()).resolves.toMatchObject({
      ok: false,
      error: { code: 'dependency_failure' },
    });
  });

  it('distinguishes missing, conflicting, pending, and unclaimable universities', async () => {
    const pending = { ...emory, id: '200', status: 'pending' as const };
    const unclaimable = {
      ...emory,
      id: '201',
      timezone: undefined,
      emailDomains: [],
    };
    const gateway = new InMemoryUniversityOnboarding([
      georgiaTech,
      pending,
      unclaimable,
    ]);
    const module = new UniversityOnboardingModule({
      gateway,
      selections: new InMemoryUniversitySelectionStore(),
    });

    await expect(module.get('missing')).resolves.toMatchObject({
      ok: false,
      error: { code: 'not_found' },
    });
    await expect(module.requestSetup({
      ...draft,
      clubName: '',
    })).resolves.toMatchObject({ ok: false, error: { code: 'validation' } });
    await expect(module.requestSetup({
      ...draft,
      universityId: georgiaTech.id,
    })).resolves.toMatchObject({ ok: false, error: { code: 'conflict' } });
    await expect(module.requestSetup({
      ...draft,
      universityId: pending.id,
    })).resolves.toMatchObject({ ok: false, error: { code: 'conflict' } });
    await expect(module.requestSetup({
      ...draft,
      universityId: unclaimable.id,
    })).resolves.toMatchObject({ ok: false, error: { code: 'forbidden' } });
  });

  it('handles setup and verification gateway failures without losing their messages', async () => {
    const gateway = new InMemoryUniversityOnboarding([emory]);
    gateway.requestSetup = async () => { throw new Error('email service unavailable'); };
    gateway.verifySetup = async () => { throw 'verification unavailable'; };
    const module = new UniversityOnboardingModule({
      gateway,
      selections: new InMemoryUniversitySelectionStore(),
    });

    await expect(module.requestSetup(draft)).resolves.toMatchObject({
      ok: false,
      error: { message: 'email service unavailable' },
    });
    await expect(module.verifySetup('', '')).resolves.toMatchObject({
      ok: false,
      error: { code: 'validation' },
    });
    await expect(module.verifySetup('request-139658', 'token')).resolves.toMatchObject({
      ok: false,
      error: { message: 'Could not verify club setup' },
    });
  });

  it('does not report verification success when persisting its mapping fails', async () => {
    const gateway = new InMemoryUniversityOnboarding([emory]);
    gateway.mapUniversity(emory.id, {
      id: 'club-139658',
      name: 'Emory Campus Cats',
      emailEnabled: true,
    });
    const module = new UniversityOnboardingModule({
      gateway,
      selections: {
        load: async () => undefined,
        save: async () => { throw new Error('storage unavailable'); },
        clear: async () => undefined,
      },
    });

    await expect(
      module.verifySetup('request-139658', 'valid-token'),
    ).resolves.toMatchObject({
      ok: false,
      error: { code: 'dependency_failure' },
    });
  });
});
