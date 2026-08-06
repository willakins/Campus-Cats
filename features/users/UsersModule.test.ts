import { InMemoryCallableEffects } from '../../adapters/inMemory/InMemoryCallableEffects';
import { InMemoryDocumentStore } from '../../adapters/inMemory/InMemoryDocumentStore';
import {
  COLLECTIONS,
  Role,
  createFirestoreCodecs,
  parseManagedUser,
} from '../../core/domain';
import { UsersModule } from './UsersModule';

const member = parseManagedUser({
  id: 'member-1',
  email: 'member@gatech.edu',
  role: Role.Member,
});
const admin = parseManagedUser({
  id: 'admin-1',
  email: 'admin@gatech.edu',
  role: Role.Officer,
});
const superAdmin = parseManagedUser({
  id: 'super-1',
  email: 'super@gatech.edu',
  role: Role.VicePresident,
});
const president = parseManagedUser({
  id: 'president-1',
  email: 'president@gatech.edu',
  role: Role.President,
});
const developer = parseManagedUser({
  id: 'developer-1',
  email: 'developer@gatech.edu',
  role: Role.Developer,
});
const codecs = createFirestoreCodecs({ fromDate: (date) => date });

async function buildModule() {
  const documents = new InMemoryDocumentStore();
  const effects = new InMemoryCallableEffects(['provisioned-1']);
  for (const user of [member, admin, superAdmin, president, developer]) {
    await documents.put(COLLECTIONS.users, user.id, codecs.user.encode(user));
  }
  return {
    module: new UsersModule({ documents, effects, codecs }),
    documents,
    effects,
  };
}

describe('UsersModule', () => {
  it('lists users for admins without including the actor', async () => {
    const { module } = await buildModule();
    await expect(module.list(admin)).resolves.toMatchObject({
      ok: true,
      value: [
        { id: 'developer-1' },
        { id: 'member-1' },
        { id: 'president-1' },
        { id: 'super-1' },
      ],
    });
    await expect(module.list(member)).resolves.toMatchObject({
      ok: false,
      error: { code: 'forbidden' },
    });
    await expect(module.list(undefined)).resolves.toMatchObject({
      ok: false,
      error: { code: 'unauthenticated' },
    });
  });

  it('routes role changes and deletion through callable effects', async () => {
    const { module, effects } = await buildModule();
    await expect(module.promote(admin, 'member-1')).resolves.toMatchObject({
      ok: false,
      error: { code: 'forbidden' },
    });
    await expect(module.promote(superAdmin, 'member-1')).resolves.toMatchObject({
      ok: true,
      value: { role: Role.Officer },
    });
    await expect(module.demote(superAdmin, 'admin-1')).resolves.toMatchObject({
      ok: true,
      value: { role: Role.Member },
    });
    await expect(module.promote(president, 'admin-1')).resolves.toMatchObject({
      ok: true,
      value: { role: Role.VicePresident },
    });
    await expect(module.demote(president, 'super-1')).resolves.toMatchObject({
      ok: true,
      value: { role: Role.Officer },
    });
    await expect(module.promote(developer, 'super-1')).resolves.toMatchObject({
      ok: false,
      error: { code: 'conflict' },
    });
    await expect(
      module.transferPresidency(president, 'super-1', true),
    ).resolves.toMatchObject({
      ok: true,
    });
    await expect(module.remove(admin, 'member-1')).resolves.toMatchObject({
      ok: true,
    });
    expect(effects.operations).toEqual([
      'update-role:member-1:1',
      'update-role:admin-1:0',
      'update-role:admin-1:2',
      'update-role:super-1:1',
      'transfer-presidency:super-1',
      'remove-user:member-1',
    ]);
  });

  it('denies self-management and actions against equal or higher roles', async () => {
    const { module } = await buildModule();
    await expect(module.remove(admin, 'admin-1')).resolves.toMatchObject({
      ok: false,
      error: { code: 'forbidden' },
    });
    await expect(module.demote(admin, 'super-1')).resolves.toMatchObject({
      ok: false,
      error: { code: 'forbidden' },
    });
    await expect(module.promote(superAdmin, 'admin-1')).resolves.toMatchObject({
      ok: false,
      error: { code: 'forbidden' },
    });
    await expect(module.demote(superAdmin, 'super-1')).resolves.toMatchObject({
      ok: false,
      error: { code: 'forbidden' },
    });
    await expect(module.demote(member, 'member-1')).resolves.toMatchObject({
      ok: false,
      error: { code: 'forbidden' },
    });
  });

  it('reports not-found and callable dependency failures', async () => {
    const { module, effects, documents } = await buildModule();
    await expect(module.remove(admin, 'missing')).resolves.toMatchObject({
      ok: false,
      error: { code: 'not_found' },
    });
    effects.failNext('updateUserRole', new Error('functions offline'));
    await expect(module.promote(superAdmin, 'member-1')).resolves.toMatchObject({
      ok: false,
      error: { code: 'dependency_failure' },
    });
    effects.failNext('removeUser', new Error('functions offline'));
    await expect(module.remove(admin, 'member-1')).resolves.toMatchObject({
      ok: false,
      error: { code: 'dependency_failure' },
    });
    effects.failNext('transferPresidency', new Error('functions offline'));
    await expect(
      module.transferPresidency(president, 'super-1', true),
    ).resolves.toMatchObject({
      ok: false,
      error: { code: 'dependency_failure' },
    });
    documents.failNext('get', new Error('offline'));
    await expect(module.promote(superAdmin, 'member-1')).resolves.toMatchObject({
      ok: false,
      error: { code: 'dependency_failure' },
    });
    documents.failNext('list', new Error('offline'));
    await expect(module.list(admin)).resolves.toMatchObject({
      ok: false,
      error: { code: 'dependency_failure' },
    });
  });

  it('reports role boundaries and missing role-change targets', async () => {
    const { module } = await buildModule();
    await expect(module.promote(admin, 'missing')).resolves.toMatchObject({
      ok: false,
      error: { code: 'not_found' },
    });
    await expect(module.demote(superAdmin, 'member-1')).resolves.toMatchObject({
      ok: false,
      error: { code: 'conflict' },
    });
    await expect(module.remove(undefined, 'member-1')).resolves.toMatchObject({
      ok: false,
      error: { code: 'unauthenticated' },
    });
    await expect(module.remove(member, 'admin-1')).resolves.toMatchObject({
      ok: false,
      error: { code: 'forbidden' },
    });
  });

  it('routes member discipline and ban changes for every power role', async () => {
    const { module, effects } = await buildModule();

    for (const actor of [admin, superAdmin, president, developer]) {
      await expect(
        module.addDisciplinaryNotice(
          actor,
          'member-1',
          '  Posted an inappropriate image  ',
        ),
      ).resolves.toMatchObject({ ok: true });
    }
    await expect(module.setBanned(admin, 'member-1', true)).resolves.toMatchObject({
      ok: true,
    });
    await expect(module.setBanned(superAdmin, 'member-1', false)).resolves.toMatchObject({
      ok: true,
    });

    expect(effects.operations.slice(-6)).toEqual([
      'discipline:member-1:Posted an inappropriate image',
      'discipline:member-1:Posted an inappropriate image',
      'discipline:member-1:Posted an inappropriate image',
      'discipline:member-1:Posted an inappropriate image',
      'ban:member-1',
      'unban:member-1',
    ]);
  });

  it('rejects moderation by members and moderation of power-role accounts', async () => {
    const { module, effects } = await buildModule();

    await expect(
      module.addDisciplinaryNotice(member, 'member-1', 'Notice'),
    ).resolves.toMatchObject({ ok: false, error: { code: 'forbidden' } });
    await expect(
      module.addDisciplinaryNotice(admin, 'super-1', 'Notice'),
    ).resolves.toMatchObject({ ok: false, error: { code: 'forbidden' } });
    await expect(module.setBanned(developer, 'admin-1', true)).resolves.toMatchObject({
      ok: false,
      error: { code: 'forbidden' },
    });
    await expect(
      module.addDisciplinaryNotice(admin, 'member-1', ' '.repeat(2)),
    ).resolves.toMatchObject({ ok: false, error: { code: 'validation' } });
    expect(effects.operations).toEqual([]);
  });

  it('validates every presidential succession precondition', async () => {
    const { module, documents } = await buildModule();
    await documents.put(
      COLLECTIONS.users,
      member.id,
      codecs.user.encode({ ...member, banned: true }),
    );

    await expect(
      module.transferPresidency(undefined, 'super-1', true),
    ).resolves.toMatchObject({ ok: false, error: { code: 'unauthenticated' } });
    await expect(
      module.transferPresidency(president, 'missing', true),
    ).resolves.toMatchObject({ ok: false, error: { code: 'not_found' } });
    await expect(
      module.transferPresidency(president, member.id, true),
    ).resolves.toMatchObject({ ok: false, error: { code: 'conflict' } });
    await expect(
      module.transferPresidency(admin, 'super-1', true),
    ).resolves.toMatchObject({ ok: false, error: { code: 'forbidden' } });
  });

  it('maps missing moderation targets and both ban callable failures', async () => {
    const { module, effects } = await buildModule();

    await expect(
      module.addDisciplinaryNotice(admin, 'missing', 'Notice'),
    ).resolves.toMatchObject({ ok: false, error: { code: 'not_found' } });
    await expect(
      module.setBanned(member, 'member-1', true),
    ).resolves.toMatchObject({ ok: false, error: { code: 'forbidden' } });
    await expect(
      module.setBanned(admin, 'missing', true),
    ).resolves.toMatchObject({ ok: false, error: { code: 'not_found' } });
    effects.failNext('setUserBanned', new Error('offline'));
    await expect(
      module.setBanned(admin, 'member-1', true),
    ).resolves.toMatchObject({ ok: false, error: { code: 'dependency_failure' } });
    effects.failNext('setUserBanned', new Error('offline'));
    await expect(
      module.setBanned(admin, 'member-1', false),
    ).resolves.toMatchObject({ ok: false, error: { code: 'dependency_failure' } });
  });

  it('protects banned, presidential, and developer role boundaries', async () => {
    const { module, documents } = await buildModule();
    await documents.put(
      COLLECTIONS.users,
      member.id,
      codecs.user.encode({ ...member, banned: true }),
    );

    await expect(module.promote(superAdmin, member.id)).resolves.toMatchObject({
      ok: false,
      error: { code: 'conflict' },
    });
    await expect(module.promote(developer, president.id)).resolves.toMatchObject({
      ok: false,
      error: { code: 'forbidden' },
    });
    await expect(module.remove(developer, president.id)).resolves.toMatchObject({
      ok: false,
      error: { code: 'forbidden' },
    });
  });
});
