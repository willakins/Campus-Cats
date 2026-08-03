import { InMemorySession } from '../../adapters/inMemory/InMemorySession';
import { Role, parseUser } from '../../core/domain';
import { SessionModule } from './SessionModule';

const member = parseUser({
  id: 'member-1',
  email: 'member@example.com',
  role: Role.Member,
});

describe('SessionModule', () => {
  it('signs in with email and restores the current account', async () => {
    const session = new InMemorySession();
    session.addEmailAccount('member@example.com', 'password', member);
    const module = new SessionModule({ session });

    await expect(
      module.signInWithEmail('member@example.com', 'password'),
    ).resolves.toMatchObject({ ok: true, value: { id: 'member-1' } });
    await expect(module.restore()).resolves.toMatchObject({
      ok: true,
      value: { id: 'member-1' },
    });
  });

  it('bootstraps a new account as a member', async () => {
    const session = new InMemorySession();
    const module = new SessionModule({ session });

    await expect(
      module.createAccount('new@example.com', 'password'),
    ).resolves.toMatchObject({
      ok: true,
      value: { email: 'new@example.com', role: Role.Member },
    });
  });

  it('represents SAML cancellation without an error', async () => {
    const session = new InMemorySession();
    session.queueSamlResult({ status: 'cancelled' });
    const module = new SessionModule({ session });

    await expect(module.signInWithSaml()).resolves.toEqual({
      ok: true,
      value: { status: 'cancelled' },
      warnings: [],
    });
  });

  it('recovers when an offline SAML attempt is retried', async () => {
    const session = new InMemorySession();
    session.failNext('signInWithSaml', new Error('offline'));
    session.queueSamlResult({ status: 'authenticated', user: member });
    const module = new SessionModule({ session });

    await expect(module.signInWithSaml()).resolves.toMatchObject({
      ok: false,
      error: { code: 'dependency_failure' },
    });
    await expect(module.signInWithSaml()).resolves.toMatchObject({
      ok: true,
      value: { status: 'authenticated', user: { id: 'member-1' } },
    });
  });

  it('registers a push token and logs out through the session port', async () => {
    const session = new InMemorySession(member);
    const module = new SessionModule({ session });

    await expect(module.registerPushToken('ExponentPushToken[test]')).resolves.toMatchObject({
      ok: true,
    });
    await expect(module.signOut()).resolves.toMatchObject({ ok: true });
    expect(session.operations).toEqual([
      'register-token:ExponentPushToken[test]',
      'sign-out',
    ]);
    await expect(module.restore()).resolves.toEqual({
      ok: true,
      value: undefined,
      warnings: [],
    });
  });

  it('validates credentials and reports adapter failures', async () => {
    const session = new InMemorySession();
    const module = new SessionModule({ session });
    await expect(module.signInWithEmail('bad', '')).resolves.toMatchObject({
      ok: false,
      error: { code: 'validation' },
    });
    session.failNext('currentUser', new Error('offline'));
    await expect(module.restore()).resolves.toMatchObject({
      ok: false,
      error: { code: 'dependency_failure' },
    });
  });

  it('validates account creation and push tokens', async () => {
    const module = new SessionModule({ session: new InMemorySession() });
    await expect(module.createAccount('bad', '')).resolves.toMatchObject({
      ok: false,
      error: { code: 'validation' },
    });
    await expect(module.registerPushToken('   ')).resolves.toMatchObject({
      ok: false,
      error: { code: 'validation' },
    });
  });

  it.each([
    ['signInWithEmail', 'authentication_failed'],
    ['createAccount', 'authentication_failed'],
    ['signOut', 'dependency_failure'],
    ['registerPushToken', 'dependency_failure'],
  ] as const)('maps %s adapter failures to typed outcomes', async (operation, code) => {
    const session = new InMemorySession(member);
    const module = new SessionModule({ session });
    session.failNext(operation, new Error('offline'));
    const result = operation === 'signInWithEmail'
      ? module.signInWithEmail('member@example.com', 'password')
      : operation === 'createAccount'
        ? module.createAccount('new@example.com', 'password')
        : operation === 'signOut'
          ? module.signOut()
          : module.registerPushToken('ExponentPushToken[test]');
    await expect(result).resolves.toMatchObject({ ok: false, error: { code } });
  });
});
