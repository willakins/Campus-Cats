import { InMemoryCallableEffects } from '../../adapters/inMemory/InMemoryCallableEffects';
import { InMemoryDocumentStore } from '../../adapters/inMemory/InMemoryDocumentStore';
import {
  COLLECTIONS,
  Role,
  createFirestoreCodecs,
  parseUser,
} from '../../core/domain';
import { UsersModule } from './UsersModule';

const member = parseUser({
  id: 'member-1',
  email: 'member@gatech.edu',
  role: Role.Member,
});
const admin = parseUser({
  id: 'admin-1',
  email: 'admin@gatech.edu',
  role: Role.Admin,
});
const superAdmin = parseUser({
  id: 'super-1',
  email: 'super@gatech.edu',
  role: Role.SuperAdmin,
});
const codecs = createFirestoreCodecs({ fromDate: (date) => date });

async function buildModule() {
  const documents = new InMemoryDocumentStore();
  const effects = new InMemoryCallableEffects(['provisioned-1']);
  for (const user of [member, admin, superAdmin]) {
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
      value: [{ id: 'member-1' }, { id: 'super-1' }],
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
      ok: true,
      value: { role: Role.Admin },
    });
    await expect(module.demote(superAdmin, 'admin-1')).resolves.toMatchObject({
      ok: true,
      value: { role: Role.Member },
    });
    await expect(module.remove(admin, 'member-1')).resolves.toMatchObject({
      ok: true,
    });
    expect(effects.operations).toEqual([
      'update-role:member-1:1',
      'update-role:admin-1:0',
      'remove-user:member-1',
    ]);
  });

  it('denies self-management and actions against equal or higher roles', async () => {
    const { module } = await buildModule();
    await expect(module.remove(admin, 'admin-1')).resolves.toMatchObject({
      ok: false,
      error: { code: 'forbidden' },
    });
    await expect(module.promote(admin, 'super-1')).resolves.toMatchObject({
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
    await expect(module.promote(admin, 'member-1')).resolves.toMatchObject({
      ok: false,
      error: { code: 'dependency_failure' },
    });
    effects.failNext('removeUser', new Error('functions offline'));
    await expect(module.remove(admin, 'member-1')).resolves.toMatchObject({
      ok: false,
      error: { code: 'dependency_failure' },
    });
    documents.failNext('get', new Error('offline'));
    await expect(module.promote(admin, 'member-1')).resolves.toMatchObject({
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
    await expect(module.demote(admin, 'member-1')).resolves.toMatchObject({
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
});
