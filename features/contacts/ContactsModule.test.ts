import { InMemoryDocumentStore } from '../../adapters/inMemory/InMemoryDocumentStore';
import {
  Role,
  SequenceIdGenerator,
  createFirestoreCodecs,
  parseUser,
} from '../../core/domain';
import { ContactsModule } from './ContactsModule';

const member = parseUser({
  id: 'member-1',
  email: 'member@gatech.edu',
  role: Role.Member,
});
const admin = parseUser({
  id: 'admin-1',
  email: 'admin@gatech.edu',
  role: Role.Officer,
});

function buildModule() {
  const documents = new InMemoryDocumentStore();
  return {
    module: new ContactsModule({
      documents,
      ids: new SequenceIdGenerator(['contact-1']),
      codecs: createFirestoreCodecs({ fromDate: (date) => date }),
    }),
    documents,
  };
}

describe('ContactsModule', () => {
  it('lets members read contacts and admins manage them', async () => {
    const { module } = buildModule();
    const created = await module.create(admin, {
      name: 'Campus Cats President',
      email: 'cats@gatech.edu',
    });
    expect(created).toMatchObject({ ok: true, value: { id: 'contact-1' } });
    await expect(module.list(member)).resolves.toMatchObject({
      ok: true,
      value: [{ name: 'Campus Cats President' }],
    });
    await expect(
      module.update(admin, 'contact-1', {
        name: 'Campus Cats Officers',
        email: 'officers@gatech.edu',
      }),
    ).resolves.toMatchObject({
      ok: true,
      value: { name: 'Campus Cats Officers' },
    });
    await expect(module.remove(admin, 'contact-1')).resolves.toMatchObject({
      ok: true,
    });
  });

  it('rejects unauthenticated reads, non-admin mutations, and invalid fields', async () => {
    const { module } = buildModule();
    await expect(module.list(undefined)).resolves.toMatchObject({
      ok: false,
      error: { code: 'unauthenticated' },
    });
    await expect(
      module.create(member, { name: 'Officer', email: 'officer@gatech.edu' }),
    ).resolves.toMatchObject({ ok: false, error: { code: 'forbidden' } });
    await expect(
      module.create(undefined, { name: 'Officer', email: 'officer@gatech.edu' }),
    ).resolves.toMatchObject({ ok: false, error: { code: 'unauthenticated' } });
    await expect(
      module.create(admin, { name: ' ', email: 'not-an-email' }),
    ).resolves.toMatchObject({ ok: false, error: { code: 'validation' } });
  });

  it('returns not-found and dependency outcomes', async () => {
    const { module, documents } = buildModule();
    await expect(
      module.update(admin, 'missing', {
        name: 'Officer',
        email: 'officer@gatech.edu',
      }),
    ).resolves.toMatchObject({ ok: false, error: { code: 'not_found' } });
    documents.failNext('list', new Error('offline'));
    await expect(module.list(member)).resolves.toMatchObject({
      ok: false,
      error: { code: 'dependency_failure' },
    });
  });

  it('loads valid contacts alongside legacy blank documents', async () => {
    const { module, documents } = buildModule();
    const warning = jest.spyOn(console, 'warn').mockImplementation();
    await module.create(admin, {
      name: 'Campus Cats President',
      email: 'cats@gatech.edu',
    });
    await documents.put('contact-info', 'legacy-blank', {
      name: '',
      email: '',
    });

    await expect(module.list(member)).resolves.toMatchObject({
      ok: true,
      value: [
        {
          id: 'contact-1',
          name: 'Campus Cats President',
          email: 'cats@gatech.edu',
        },
      ],
    });
    expect(warning).toHaveBeenCalledWith(
      '[contacts] Ignoring invalid contact document: legacy-blank',
      expect.any(String),
    );
    warning.mockRestore();
  });

  it('covers update and delete authorization and validation', async () => {
    const draft = { name: 'Officer', email: 'officer@gatech.edu' };
    const { module } = buildModule();
    await expect(module.update(undefined, 'missing', draft)).resolves.toMatchObject({
      ok: false,
      error: { code: 'unauthenticated' },
    });
    await expect(module.update(member, 'missing', draft)).resolves.toMatchObject({
      ok: false,
      error: { code: 'forbidden' },
    });
    await expect(module.remove(undefined, 'missing')).resolves.toMatchObject({
      ok: false,
      error: { code: 'unauthenticated' },
    });
    await expect(module.remove(member, 'missing')).resolves.toMatchObject({
      ok: false,
      error: { code: 'forbidden' },
    });
    await expect(module.remove(admin, 'missing')).resolves.toMatchObject({
      ok: false,
      error: { code: 'not_found' },
    });

    await module.create(admin, draft);
    await expect(
      module.update(admin, 'contact-1', { name: '', email: 'bad' }),
    ).resolves.toMatchObject({ ok: false, error: { code: 'validation' } });
  });

  it.each([
    ['create', 'put'],
    ['update', 'put'],
    ['update', 'get'],
    ['remove', 'remove'],
  ] as const)('maps %s adapter failures to dependency outcomes', async (method, operation) => {
    const { module, documents } = buildModule();
    const draft = { name: 'Officer', email: 'officer@gatech.edu' };
    if (method !== 'create') await module.create(admin, draft);
    documents.failNext(operation, new Error('offline'));
    const result = method === 'create'
      ? module.create(admin, draft)
      : method === 'update'
        ? module.update(admin, 'contact-1', draft)
        : module.remove(admin, 'contact-1');
    await expect(result).resolves.toMatchObject({
      ok: false,
      error: { code: 'dependency_failure' },
    });
  });
});
