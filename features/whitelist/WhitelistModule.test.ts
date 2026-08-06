import { InMemoryCallableEffects } from '../../adapters/inMemory/InMemoryCallableEffects';
import { InMemoryDocumentStore } from '../../adapters/inMemory/InMemoryDocumentStore';
import { InMemoryWhitelistSubmission } from '../../adapters/inMemory/InMemoryWhitelistSubmission';
import {
  COLLECTIONS,
  Role,
  SequenceIdGenerator,
  createFirestoreCodecs,
  parseUser,
} from '../../core/domain';
import { PasswordGenerator } from '../../core/ports';
import { WhitelistModule } from './WhitelistModule';

const admin = parseUser({
  id: 'admin-1',
  email: 'admin@gatech.edu',
  role: Role.Officer,
});
const member = parseUser({
  id: 'member-1',
  email: 'member@gatech.edu',
  role: Role.Member,
});
const password: PasswordGenerator = { generate: () => 'FixedPassword1!' };

function buildModule() {
  const documents = new InMemoryDocumentStore();
  const effects = new InMemoryCallableEffects(['new-user-1']);
  return {
    module: new WhitelistModule({
      documents,
      effects,
      passwords: password,
      submissions: new InMemoryWhitelistSubmission(
        documents,
        new SequenceIdGenerator(['application-1', 'application-2']),
      ),
      codecs: createFirestoreCodecs({ fromDate: (date) => date }),
    }),
    documents,
    effects,
  };
}

const draft = {
  name: 'Alex Applicant',
  graduationYear: '2025',
  email: 'alex@example.com',
  codeWord: 'meow',
};

describe('WhitelistModule', () => {
  it('accepts a validated unauthenticated application and rejects duplicate email', async () => {
    const { module } = buildModule();
    await expect(module.submit(draft)).resolves.toMatchObject({
      ok: true,
      value: { id: 'application-1' },
    });
    await expect(module.submit(draft)).resolves.toMatchObject({
      ok: false,
      error: { code: 'conflict' },
    });
    await expect(module.submit({ ...draft, name: ' ' })).resolves.toMatchObject({
      ok: false,
      error: { code: 'validation' },
    });
  });

  it('allows only admins to list and deny applications', async () => {
    const { module } = buildModule();
    await module.submit(draft);
    await expect(module.list(member)).resolves.toMatchObject({
      ok: false,
      error: { code: 'forbidden' },
    });
    await expect(module.list(undefined)).resolves.toMatchObject({
      ok: false,
      error: { code: 'unauthenticated' },
    });
    await expect(module.list(admin)).resolves.toMatchObject({
      ok: true,
      value: [{ email: 'alex@example.com' }],
    });
    await expect(module.deny(admin, 'application-1')).resolves.toMatchObject({
      ok: true,
    });
  });

  it('provisions before email and removes the application only after both succeed', async () => {
    const { module, effects, documents } = buildModule();
    await module.submit(draft);

    await expect(module.accept(admin, 'application-1')).resolves.toMatchObject({
      ok: true,
    });
    expect(effects.operations).toEqual([
      'provision:alex@example.com',
      'email:alex@example.com',
    ]);
    await expect(
      documents.get(COLLECTIONS.whitelist, 'application-1'),
    ).resolves.toBeUndefined();
  });

  it('compensates provisioned users when credential email fails', async () => {
    const { module, effects, documents } = buildModule();
    await module.submit(draft);
    effects.failNext('emailWhitelistCredentials', new Error('email offline'));

    await expect(module.accept(admin, 'application-1')).resolves.toEqual({
      ok: false,
      error: {
        code: 'dependency_failure',
        message: 'Could not email credentials; the provisioned user was removed',
      },
    });
    expect(effects.operations).toEqual([
      'provision:alex@example.com',
      'remove-provisioned:new-user-1',
    ]);
    await expect(
      documents.get(COLLECTIONS.whitelist, 'application-1'),
    ).resolves.toBeDefined();
  });

  it('reports partial failure if email and compensation both fail', async () => {
    const { module, effects } = buildModule();
    await module.submit(draft);
    effects.failNext('emailWhitelistCredentials', new Error('email offline'));
    effects.failNext('removeProvisionedUser', new Error('auth offline'));

    await expect(module.accept(admin, 'application-1')).resolves.toMatchObject({
      ok: false,
      error: { code: 'partial_failure' },
    });
  });

  it('covers deny authorization, missing records, and adapter failures', async () => {
    await expect(buildModule().module.deny(undefined, 'missing')).resolves.toMatchObject({
      ok: false,
      error: { code: 'unauthenticated' },
    });
    await expect(buildModule().module.deny(member, 'missing')).resolves.toMatchObject({
      ok: false,
      error: { code: 'forbidden' },
    });
    await expect(buildModule().module.deny(admin, 'missing')).resolves.toMatchObject({
      ok: false,
      error: { code: 'not_found' },
    });

    const failed = buildModule();
    await failed.module.submit(draft);
    failed.documents.failNext('remove', new Error('offline'));
    await expect(failed.module.deny(admin, 'application-1')).resolves.toMatchObject({
      ok: false,
      error: { code: 'dependency_failure' },
    });
  });

  it('covers accept authorization, missing records, and provision failures', async () => {
    await expect(buildModule().module.accept(undefined, 'missing')).resolves.toMatchObject({
      ok: false,
      error: { code: 'unauthenticated' },
    });
    await expect(buildModule().module.accept(member, 'missing')).resolves.toMatchObject({
      ok: false,
      error: { code: 'forbidden' },
    });
    await expect(buildModule().module.accept(admin, 'missing')).resolves.toMatchObject({
      ok: false,
      error: { code: 'not_found' },
    });

    const provisionFailure = buildModule();
    await provisionFailure.module.submit(draft);
    provisionFailure.effects.failNext('provisionWhitelistUser', new Error('offline'));
    await expect(
      provisionFailure.module.accept(admin, 'application-1'),
    ).resolves.toMatchObject({ ok: false, error: { code: 'dependency_failure' } });

    const finalRemoveFailure = buildModule();
    await finalRemoveFailure.module.submit(draft);
    finalRemoveFailure.documents.failNext('remove', new Error('offline'));
    await expect(
      finalRemoveFailure.module.accept(admin, 'application-1'),
    ).resolves.toMatchObject({ ok: false, error: { code: 'partial_failure' } });
  });

  it('maps submission, listing, and record lookup failures', async () => {
    const submitFailure = buildModule();
    submitFailure.documents.failNext('list', new Error('offline'));
    await expect(submitFailure.module.submit(draft)).resolves.toMatchObject({
      ok: false,
      error: { code: 'dependency_failure' },
    });

    const listFailure = buildModule();
    listFailure.documents.failNext('list', new Error('offline'));
    await expect(listFailure.module.list(admin)).resolves.toMatchObject({
      ok: false,
      error: { code: 'dependency_failure' },
    });

    const getFailure = buildModule();
    getFailure.documents.failNext('get', new Error('offline'));
    await expect(getFailure.module.accept(admin, 'application-1')).resolves.toMatchObject({
      ok: false,
      error: { code: 'dependency_failure' },
    });
  });
});
