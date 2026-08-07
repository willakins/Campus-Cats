import {
  sendPasswordResetEmail,
  signInWithEmailAndPassword,
} from 'firebase/auth';

import { FirebaseSession } from './FirebaseSession';

jest.mock('firebase/auth', () => ({
  createUserWithEmailAndPassword: jest.fn(),
  deleteUser: jest.fn(),
  sendPasswordResetEmail: jest.fn(),
  signInWithCredential: jest.fn(),
  signInWithEmailAndPassword: jest.fn(),
  signOut: jest.fn(),
}));

jest.mock('firebase/firestore', () => ({
  doc: jest.fn(),
  getDoc: jest.fn(),
  setDoc: jest.fn(),
}));

const mockedSendPasswordResetEmail = jest.mocked(sendPasswordResetEmail);
const mockedSignInWithEmailAndPassword = jest.mocked(signInWithEmailAndPassword);

const buildSession = () =>
  new FirebaseSession(
    {} as ConstructorParameters<typeof FirebaseSession>[0],
    {} as ConstructorParameters<typeof FirebaseSession>[1],
    { credential: jest.fn() },
  );

describe('FirebaseSession password reset', () => {
  beforeEach(() => jest.clearAllMocks());

  it('asks Firebase to deliver reset instructions', async () => {
    mockedSendPasswordResetEmail.mockResolvedValue(undefined);

    await expect(
      buildSession().requestPasswordReset('member@example.com'),
    ).resolves.toBeUndefined();
    expect(mockedSendPasswordResetEmail).toHaveBeenCalledWith(
      expect.anything(),
      'member@example.com',
    );
  });

  it('does not reveal whether the requested account exists', async () => {
    mockedSendPasswordResetEmail.mockRejectedValue({ code: 'auth/user-not-found' });

    await expect(
      buildSession().requestPasswordReset('unknown@example.com'),
    ).resolves.toBeUndefined();
  });

  it('preserves actionable Firebase delivery failures', async () => {
    const failure = { code: 'auth/invalid-api-key' };
    mockedSendPasswordResetEmail.mockRejectedValue(failure);

    await expect(
      buildSession().requestPasswordReset('member@example.com'),
    ).rejects.toBe(failure);
  });
});

describe('FirebaseSession banned accounts', () => {
  beforeEach(() => jest.clearAllMocks());

  it('maps Firebase-disabled accounts to the app ban error', async () => {
    mockedSignInWithEmailAndPassword.mockRejectedValue({
      code: 'auth/user-disabled',
    });

    await expect(
      buildSession().signInWithEmail('banned@example.com', 'password'),
    ).rejects.toThrow('This account has been banned from Campus Cats.');
  });
});
