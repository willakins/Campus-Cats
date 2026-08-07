import { InMemoryCallableEffects } from '../../adapters/inMemory/InMemoryCallableEffects';
import { Role, parseUser } from '../../core/domain';
import { InaturalistAccountsModule } from './InaturalistAccountsModule';

const member = parseUser({
  id: 'member-1',
  email: 'member@gatech.edu',
  role: Role.Member,
});

describe('InaturalistAccountsModule', () => {
  it('requires a signed-in user for every account operation', async () => {
    const module = new InaturalistAccountsModule({
      effects: new InMemoryCallableEffects(),
    });

    await expect(module.begin(undefined)).resolves.toMatchObject({
      ok: false,
      error: { code: 'unauthenticated' },
    });
    await expect(module.status(undefined)).resolves.toMatchObject({
      ok: false,
      error: { code: 'unauthenticated' },
    });
    await expect(module.unlink(undefined)).resolves.toMatchObject({
      ok: false,
      error: { code: 'unauthenticated' },
    });
  });

  it('begins, checks, and unlinks through sanitized callable effects', async () => {
    const effects = new InMemoryCallableEffects();
    effects.inaturalistLinkStatus = {
      status: 'linked',
      account: { inaturalistUserId: 42, login: 'cat_watcher' },
    };
    const module = new InaturalistAccountsModule({ effects });

    await expect(module.begin(member)).resolves.toMatchObject({
      ok: true,
      value: {
        authorizationUrl: 'https://www.inaturalist.org/oauth/authorize',
        attemptId: 'attempt-1',
      },
    });
    await expect(module.status(member, 'attempt-1')).resolves.toEqual({
      ok: true,
      value: effects.inaturalistLinkStatus,
      warnings: [],
    });
    await expect(module.unlink(member)).resolves.toMatchObject({ ok: true });
    expect(effects.operations).toEqual([
      'begin-inaturalist-account-link',
      'inaturalist-account-link-status:attempt-1',
      'unlink-inaturalist-account',
    ]);
  });

  it('maps callable failures to safe dependency messages', async () => {
    const effects = new InMemoryCallableEffects();
    effects.failNext(
      'beginInaturalistAccountLink',
      new Error('provider secret'),
    );
    const module = new InaturalistAccountsModule({ effects });

    await expect(module.begin(member)).resolves.toEqual({
      ok: false,
      error: {
        code: 'dependency_failure',
        message: 'Could not start iNaturalist account linking',
      },
    });
  });
});
