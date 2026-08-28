import type { SessionPort } from '../../core/ports';
import { parseUser } from '../../core/domain';
import {
  DevelopmentSession,
  createSessionGateway,
} from './DevelopmentSession';

const delegate = (): jest.Mocked<SessionPort> => ({
  currentUser: jest.fn(),
  observeCurrentUser: jest.fn(),
  signInWithEmail: jest.fn(),
  createAccount: jest.fn(),
  requestPasswordReset: jest.fn(),
  signInWithSaml: jest.fn(),
  signOut: jest.fn(),
  registerPushToken: jest.fn(),
  acceptTerms: jest.fn(),
});

describe('Development session', () => {
  it('blocks Firebase password-reset emails without calling the delegate', async () => {
    const firebase = delegate();
    const session = new DevelopmentSession(firebase);

    await expect(
      session.requestPasswordReset('production-user@example.com'),
    ).rejects.toThrow('Password-reset emails are disabled in development');
    expect(firebase.requestPasswordReset).not.toHaveBeenCalled();
  });

  it('keeps existing-account sign-in available against development Auth', async () => {
    const firebase = delegate();
    firebase.signInWithEmail.mockResolvedValue(parseUser({
      id: 'member-1',
      email: 'member@example.com',
      role: 1,
      clubId: 'campus-cats',
    }));
    const session = new DevelopmentSession(firebase);

    await session.signInWithEmail('member@example.com', 'password');

    expect(firebase.signInWithEmail).toHaveBeenCalledWith(
      'member@example.com',
      'password',
    );
  });

  it('is selected only for development builds', () => {
    const firebase = delegate();

    expect(createSessionGateway(firebase, 'development')).toBeInstanceOf(
      DevelopmentSession,
    );
    expect(createSessionGateway(firebase, 'production')).toBe(firebase);
  });
});
